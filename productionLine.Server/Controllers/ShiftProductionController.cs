// Controllers/ShiftProductionController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using productionLine.Server.Model;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace productionLine.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ShiftProductionController : ControllerBase
    {
        private readonly FormDbContext _context;
        private readonly IMemoryCache _cache;

        public ShiftProductionController(FormDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        [HttpGet("chart-data")]
        public async Task<IActionResult> GetShiftChartData(
    [FromQuery] DateTime selectedDate,
    [FromQuery] string shift,
    [FromQuery] int targetParts,
    [FromQuery] double cycleTimeSeconds,
    [FromQuery] string startTime,
    [FromQuery] string endTime,
    [FromQuery] string breaks,
    [FromQuery] int formId)
        {
            try
            {
                Console.WriteLine($"[ShiftProduction] Received request:");
                Console.WriteLine($"  Date: {selectedDate:yyyy-MM-dd} (parsed from query)");
                Console.WriteLine($"  Date kind: {selectedDate.Kind}");
                Console.WriteLine($"  Shift: {shift}");

                int form = _context.ReportTemplates.Where(x => x.Id == formId).Select(y => y.FormId).FirstOrDefault();

                // ✅ Ensure we're using the date portion only
                var queryDate = selectedDate.Date;
                Console.WriteLine($"  Query Date (normalized): {queryDate:yyyy-MM-dd}");

                // Validate required parameters
                if (string.IsNullOrWhiteSpace(startTime))
                {
                    return BadRequest(new { error = "startTime parameter is required" });
                }

                if (string.IsNullOrWhiteSpace(endTime))
                {
                    return BadRequest(new { error = "endTime parameter is required" });
                }

                if (targetParts <= 0)
                {
                    return BadRequest(new { error = "targetParts must be greater than 0" });
                }

                if (cycleTimeSeconds <= 0)
                {
                    return BadRequest(new { error = "cycleTimeSeconds must be greater than 0" });
                }

                // Log incoming parameters for debugging
                Console.WriteLine($"[ShiftProduction] Received request:");
                Console.WriteLine($"  Date: {selectedDate:yyyy-MM-dd}");
                Console.WriteLine($"  Shift: {shift}");
                Console.WriteLine($"  Target: {targetParts}");
                Console.WriteLine($"  Cycle: {cycleTimeSeconds}");
                Console.WriteLine($"  Start: {startTime}, End: {endTime}");
                Console.WriteLine($"  Breaks: {breaks ?? "null"}");

                // Build cache key
                var cacheKey = $"shift_chart_{formId}_{selectedDate:yyyyMMdd}_{shift}_{targetParts}_{cycleTimeSeconds}";

                // Try to get from cache (30 seconds)
                if (_cache.TryGetValue(cacheKey, out ShiftChartResponse cachedData))
                {
                    Console.WriteLine($"[ShiftProduction] Returning cached data");
                    return Ok(cachedData);
                }

                // ✅ Parse and validate breaks configuration
                var breaksList = new List<BreakConfig>();
                if (!string.IsNullOrEmpty(breaks))
                {
                    try
                    {
                        var parsedBreaks = JsonSerializer.Deserialize<List<BreakConfig>>(breaks) ?? new List<BreakConfig>();

                        // Filter out invalid breaks
                        breaksList = parsedBreaks
                            .Where(b => !string.IsNullOrWhiteSpace(b.StartTime) && !string.IsNullOrWhiteSpace(b.EndTime))
                            .ToList();

                        Console.WriteLine($"[ShiftProduction] Parsed {parsedBreaks.Count} breaks, {breaksList.Count} valid");

                        if (parsedBreaks.Count != breaksList.Count)
                        {
                            Console.WriteLine($"[ShiftProduction] WARNING: {parsedBreaks.Count - breaksList.Count} breaks skipped due to missing times");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[ShiftProduction] Error parsing breaks: {ex.Message}");
                        // Continue with empty breaks list
                    }
                }

                // Fetch and filter submissions by date and shift time
                Console.WriteLine($"[ShiftProduction] Fetching submissions from database...");
                var submissions = await GetFilteredSubmissions(selectedDate, startTime, endTime, form);

                // After: var submissions = await GetFilteredSubmissions(...);

                var startMinutes = ParseTimeToMinutes(startTime);
                var isOvernight = ParseTimeToMinutes(endTime) <= startMinutes;

                int initialCount = 0;

                if (isOvernight)
                {
                    // overnight: count everything before start on day N, plus all of day N-1
                    var prevDate = queryDate.AddDays(-1);

                    initialCount = await _context.FormSubmissions
                        .AsNoTracking()
                        .Where(s =>
                            s.FormId == form &&
                            (
                                s.SubmittedAt.Date < queryDate ||                             // any previous day
                                (s.SubmittedAt.Date == queryDate &&
                                 s.SubmittedAt.Hour * 60 + s.SubmittedAt.Minute < startMinutes)
                            ))
                        .CountAsync();
                }
                else
                {
                    // normal shift: same day, before start
                    initialCount = await _context.FormSubmissions
                        .AsNoTracking()
                        .Where(s =>
                            s.FormId == form &&
                            s.SubmittedAt.Date == queryDate &&
                            s.SubmittedAt.Hour * 60 + s.SubmittedAt.Minute < startMinutes)
                        .CountAsync();
                }


                Console.WriteLine($"[ShiftProduction] Found {submissions.Count} submissions");

                // Calculate target line data
                Console.WriteLine($"[ShiftProduction] Calculating target line...");
                var targetLineData = CalculateTargetLine(
                    targetParts,
                    cycleTimeSeconds,
                    startTime,
                    endTime,
                    breaksList
                );
                Console.WriteLine($"[ShiftProduction] Generated {targetLineData.Count} target points");

                // Build combined chart data with cumulative totals
                Console.WriteLine($"[ShiftProduction] Building combined chart data...");
                var combinedData = BuildCombinedChartData(submissions, targetLineData);

                // Calculate metrics
                var currentProduction = submissions.Count;
                var efficiency = targetParts > 0 ? (int)Math.Round((double)currentProduction / targetParts * 100) : 0;
                var remainingParts = Math.Max(0, targetParts - currentProduction);

                var response = new ShiftChartResponse
                {
                    ChartData = combinedData,
                    CurrentProduction = currentProduction,
                    TargetParts = targetParts,
                    Efficiency = efficiency,
                    RemainingParts = remainingParts,
                    LastUpdate = DateTime.Now,
                    InitialCount = initialCount
                };

                // Cache for 30 seconds
                _cache.Set(cacheKey, response, TimeSpan.FromSeconds(30));

                Console.WriteLine($"[ShiftProduction] Success! Returning {combinedData.Count} data points");
                return Ok(response);
            }
            catch (ArgumentException argEx)
            {
                Console.WriteLine($"[ShiftProduction] Validation Error: {argEx.Message}");
                return BadRequest(new { error = argEx.Message });
            }
            catch (Exception ex)
            {
                // Detailed error logging
                Console.WriteLine($"[ShiftProduction] ERROR: {ex.Message}");
                Console.WriteLine($"[ShiftProduction] Stack Trace: {ex.StackTrace}");

                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[ShiftProduction] Inner Exception: {ex.InnerException.Message}");
                }

                // Return detailed error in development
                return StatusCode(500, new
                {
                    error = ex.Message,
                    innerError = ex.InnerException?.Message,
                    stackTrace = ex.StackTrace,
                    type = ex.GetType().Name
                });
            }
        }




        private async Task<List<FormSubmission>> GetFilteredSubmissions(
    DateTime selectedDate,
    string startTime,
    string endTime,
    int formID)
        {
            try
            {
                var startMinutes = ParseTimeToMinutes(startTime);
                var endMinutes = ParseTimeToMinutes(endTime);

                // ✅ Normalize to date only
                var queryDate = selectedDate.Date;

                Console.WriteLine($"[GetFilteredSubmissions] Querying for date: {queryDate:yyyy-MM-dd}");
                Console.WriteLine($"[GetFilteredSubmissions] Start: {startMinutes} min ({startTime}), End: {endMinutes} min ({endTime})");

                var isOvernightShift = endMinutes <= startMinutes;

                IQueryable<FormSubmission> query;

                if (isOvernightShift)
                {
                    Console.WriteLine($"[GetFilteredSubmissions] Overnight shift detected");

                    // ✅ For overnight shifts, we need submissions from TWO dates:
                    // 1. Current date from startTime onwards (e.g., 11:00 PM onwards on Day 1)
                    // 2. Next date until endTime (e.g., until 6:00 AM on Day 2)

                    var nextDate = queryDate.AddDays(1);

                    query = _context.FormSubmissions
                        .AsNoTracking()
                        .Where(s =>
                            // Part 1: Same day, time >= startTime
                            ((s.SubmittedAt.Date == queryDate &&
                             s.SubmittedAt.Hour * 60 + s.SubmittedAt.Minute >= startMinutes)
                            ||
                            // Part 2: Next day, time <= endTime
                            (s.SubmittedAt.Date == nextDate &&
                             s.SubmittedAt.Hour * 60 + s.SubmittedAt.Minute <= endMinutes))
                             && s.FormId == formID
                        );

                    Console.WriteLine($"[GetFilteredSubmissions] Querying overnight: {queryDate:yyyy-MM-dd} from {startTime} + {nextDate:yyyy-MM-dd} until {endTime}");
                }
                else
                {
                    Console.WriteLine($"[GetFilteredSubmissions] Regular shift");

                    // ✅ Regular shift: same day, between startTime and endTime
                    query = _context.FormSubmissions
                        .AsNoTracking()
                        .Where(s =>
                            s.SubmittedAt.Date == queryDate &&
                            s.SubmittedAt.Hour * 60 + s.SubmittedAt.Minute >= startMinutes &&
                            s.SubmittedAt.Hour * 60 + s.SubmittedAt.Minute <= endMinutes && s.FormId == formID
                        );
                }

                var result = await query
                    .OrderBy(s => s.SubmittedAt)
                    .Select(s => new FormSubmission
                    {
                        Id = s.Id,
                        SubmittedAt = s.SubmittedAt
                    })
                    .ToListAsync();

                Console.WriteLine($"[GetFilteredSubmissions] Found {result.Count} submissions");

                // ✅ Log sample submissions for debugging
                if (result.Any())
                {
                    Console.WriteLine($"[GetFilteredSubmissions] First submission: {result.First().SubmittedAt:yyyy-MM-dd HH:mm:ss}");
                    Console.WriteLine($"[GetFilteredSubmissions] Last submission: {result.Last().SubmittedAt:yyyy-MM-dd HH:mm:ss}");
                }

                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetFilteredSubmissions] ERROR: {ex.Message}");
                throw;
            }
        }




        //    private List<ChartDataPoint> CalculateTargetLine(
        //int targetParts,
        //double cycleTimeSeconds,
        //string startTime,
        //string endTime,
        //List<BreakConfig> breaks)
        //    {
        //        var partsPerSecond = 1.0 / cycleTimeSeconds;
        //        var partsPerInterval = partsPerSecond * 300; // 5-minute intervals

        //        var startMinutes = ParseTimeToMinutes(startTime);
        //        var endMinutes = ParseTimeToMinutes(endTime);

        //        // Handle overnight shifts
        //        if (endMinutes <= startMinutes)
        //        {
        //            endMinutes += 24 * 60;
        //        }

        //        // ✅ Pre-process breaks with names
        //        var breakRanges = breaks
        //            .Where(b => !string.IsNullOrWhiteSpace(b.StartTime) && !string.IsNullOrWhiteSpace(b.EndTime))
        //            .Select(b => {
        //                try
        //                {
        //                    return new
        //                    {
        //                        Start = ParseTimeToMinutes(b.StartTime),
        //                        End = ParseTimeToMinutes(b.EndTime),
        //                        Name = b.Name ?? "Break",  // ✅ Include break name
        //                        IsValid = true
        //                    };
        //                }
        //                catch (Exception ex)
        //                {
        //                    Console.WriteLine($"[CalculateTargetLine] Skipping invalid break: {b.Name} - {ex.Message}");
        //                    return new { Start = 0, End = 0, Name = "", IsValid = false };
        //                }
        //            })
        //            .Where(b => b.IsValid)
        //            .ToList();

        //        Console.WriteLine($"[CalculateTargetLine] Using {breakRanges.Count} valid breaks out of {breaks.Count} total");

        //        var targetData = new List<ChartDataPoint>();
        //        var cumulativeParts = 0.0;

        //        // Generate data points every 5 minutes
        //        for (int minutes = startMinutes; minutes <= endMinutes; minutes += 5)
        //        {
        //            var adjustedMinutes = minutes >= 24 * 60 ? minutes - 24 * 60 : minutes;

        //            // ✅ Check if current time is during a break and get break name
        //            var currentBreak = breakRanges.FirstOrDefault(range =>
        //                adjustedMinutes >= range.Start && adjustedMinutes <= range.End
        //            );

        //            var isDuringBreak = currentBreak != null;
        //            var breakName = isDuringBreak ? currentBreak.Name : null;

        //            // Only add parts if not during break
        //            if (!isDuringBreak)
        //            {
        //                cumulativeParts += partsPerInterval;
        //            }

        //            targetData.Add(new ChartDataPoint
        //            {
        //                Time = FormatTime(adjustedMinutes),
        //                TargetParts = (int)Math.Round(Math.Min(cumulativeParts, targetParts)),
        //                ActualParts = 0,
        //                IsBreak = isDuringBreak,
        //                BreakName = breakName,  // ✅ Set break name
        //                NewPartsInBucket = 0
        //            });
        //        }

        //        return targetData;
        //    }

        private List<ChartDataPoint> CalculateTargetLine(
    int targetParts,
    double cycleTimeSeconds,
    string startTime,
    string endTime,
    List<BreakConfig> breaks)
        {
            var partsPerSecond = 1.0 / cycleTimeSeconds;
            var partsPerInterval = partsPerSecond * 300; // 5-minute intervals
            var startMinutes = ParseTimeToMinutes(startTime);
            var endMinutes = ParseTimeToMinutes(endTime);

            // Handle overnight shifts
            if (endMinutes <= startMinutes)
            {
                endMinutes += 24 * 60;
            }

            // ✅ Pre-process breaks with names
            var breakRanges = breaks
                .Where(b => !string.IsNullOrWhiteSpace(b.StartTime) && !string.IsNullOrWhiteSpace(b.EndTime))
                .Select(b => {
                    try
                    {
                        return new
                        {
                            Start = ParseTimeToMinutes(b.StartTime),
                            End = ParseTimeToMinutes(b.EndTime),
                            Name = b.Name ?? "Break",
                            IsValid = true
                        };
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[CalculateTargetLine] Skipping invalid break: {b.Name} - {ex.Message}");
                        return new { Start = 0, End = 0, Name = "", IsValid = false };
                    }
                })
                .Where(b => b.IsValid)
                .ToList();

            Console.WriteLine($"[CalculateTargetLine] Using {breakRanges.Count} valid breaks out of {breaks.Count} total");

            var targetData = new List<ChartDataPoint>();
            var cumulativeParts = 0.0;

            // Generate data points every 5 minutes
            for (int minutes = startMinutes; minutes <= endMinutes; minutes += 5)
            {
                var adjustedMinutes = minutes >= 24 * 60 ? minutes - 24 * 60 : minutes;

                // ✅ Check if current time is during a break and get break name
                var currentBreak = breakRanges.FirstOrDefault(range =>
                    adjustedMinutes >= range.Start && adjustedMinutes <= range.End
                );

                var isDuringBreak = currentBreak != null;
                var breakName = isDuringBreak ? currentBreak.Name : null;

                // ✅ FIX: Add the data point FIRST with current cumulative (which is 0 at start)
                targetData.Add(new ChartDataPoint
                {
                    Time = FormatTime(adjustedMinutes),
                    TargetParts = (int)Math.Round(Math.Min(cumulativeParts, targetParts)),
                    ActualParts = 0,
                    IsBreak = isDuringBreak,
                    BreakName = breakName,
                    NewPartsInBucket = 0
                });

                // ✅ FIX: THEN increment cumulative parts for the NEXT interval
                // Only add parts if not during break
                if (!isDuringBreak)
                {
                    cumulativeParts += partsPerInterval;
                }
            }

            return targetData;
        }



        //   private List<ChartDataPoint> BuildCombinedChartData(
        //List<FormSubmission> submissions,
        //List<ChartDataPoint> targetLineData)
        //   {
        //       var timeToSubmissionsMap = new Dictionary<string, int>();

        //       foreach (var submission in submissions)
        //       {
        //           var date = submission.SubmittedAt;
        //           var totalMinutes = date.Hour * 60 + date.Minute;
        //           var roundedMinutes = (int)Math.Round(totalMinutes / 5.0) * 5;

        //           if (roundedMinutes >= 24 * 60)
        //           {
        //               roundedMinutes = 0;
        //           }

        //           var timeKey = FormatTime(roundedMinutes);
        //           timeToSubmissionsMap[timeKey] = timeToSubmissionsMap.GetValueOrDefault(timeKey) + 1;
        //       }

        //       var cumulativeTotal = 0;

        //       return targetLineData.Select(targetPoint =>
        //       {
        //           var submissionsInBucket = timeToSubmissionsMap.GetValueOrDefault(targetPoint.Time, 0);
        //           cumulativeTotal += submissionsInBucket;

        //           return new ChartDataPoint
        //           {
        //               Time = targetPoint.Time,
        //               TargetParts = targetPoint.TargetParts,
        //               // ✅ Set actualParts to null during breaks to create gaps
        //               ActualParts = targetPoint.IsBreak ? null : cumulativeTotal,
        //               IsBreak = targetPoint.IsBreak,
        //               NewPartsInBucket = submissionsInBucket
        //           };
        //       }).ToList();
        //   }
        private List<ChartDataPoint> BuildCombinedChartData(
            List<FormSubmission> submissions,
            List<ChartDataPoint> targetLineData)
        {
            int ToBucket(int totalMinutes) => (totalMinutes / 5) * 5;

            // Map submission time "rounded buckets" to counts
            var timeToSubmissionsMap = new Dictionary<string, int>();
            foreach (var submission in submissions)
            {
                var totalMinutes = submission.SubmittedAt.Hour * 60 + submission.SubmittedAt.Minute;
                var bucketMinutes = ToBucket(totalMinutes);

                if (bucketMinutes >= 24 * 60) bucketMinutes = 0;

                var timeKey = FormatTime(bucketMinutes);
                timeToSubmissionsMap[timeKey] = timeToSubmissionsMap.GetValueOrDefault(timeKey) + 1;
            }

            // ✅ CRITICAL FIX: Determine shift start/end from targetLineData to get chronological order
            int? shiftStartBucket = null;
            int? shiftEndBucket = null;

            if (targetLineData.Any())
            {
                // Parse the first and last times from target line data
                var firstTargetTime = targetLineData.First().Time;
                var lastTargetTime = targetLineData.Last().Time;

                shiftStartBucket = ParseTimeToMinutes(firstTargetTime);
                shiftEndBucket = ParseTimeToMinutes(lastTargetTime);

                //Console.WriteLine($"[BuildCombinedChartData] Shift start: {shiftStartBucket} ({firstTargetTime})");
                //Console.WriteLine($"[BuildCombinedChartData] Shift end: {shiftEndBucket} ({lastTargetTime})");
                //Console.WriteLine($"[BuildCombinedChartData] Is overnight shift: {shiftStartBucket > shiftEndBucket}");
            }

            // Helper to parse formatted time string back to minutes
            int ParseTimeToMinutes(string formattedTime)
            {
                var parts = formattedTime.Split(new[] { ':', ' ' }, StringSplitOptions.RemoveEmptyEntries);
                int hour = int.Parse(parts[0]);
                string meridiem = parts[2];
                if (meridiem == "PM" && hour != 12) hour += 12;
                if (meridiem == "AM" && hour == 12) hour = 0;
                int minute = int.Parse(parts[1]);
                return hour * 60 + minute;
            }

            // Bucket edges - NOW ONLY USED FOR DEBUG, NOT FOR WINDOW DETECTION
            int? firstSubmissionBucket = null, lastSubmissionBucket = null;
            if (submissions.Any())
            {
                var buckets = submissions
                    .Select(s => ToBucket(s.SubmittedAt.Hour * 60 + s.SubmittedAt.Minute))
                    .ToList();

                // For overnight shifts, we need chronological order, not numeric order
                if (shiftStartBucket.HasValue && shiftEndBucket.HasValue && shiftStartBucket > shiftEndBucket)
                {
                    // Overnight: separate into late night (>= start) and early morning (<= end)
                    var lateNightBuckets = buckets.Where(b => b >= shiftStartBucket.Value).OrderBy(b => b);
                    var earlyMorningBuckets = buckets.Where(b => b <= shiftEndBucket.Value).OrderBy(b => b);

                    if (lateNightBuckets.Any() && earlyMorningBuckets.Any())
                    {
                        firstSubmissionBucket = lateNightBuckets.First();
                        lastSubmissionBucket = earlyMorningBuckets.Last();
                    }
                    else if (lateNightBuckets.Any())
                    {
                        firstSubmissionBucket = lateNightBuckets.First();
                        lastSubmissionBucket = lateNightBuckets.Last();
                    }
                    else if (earlyMorningBuckets.Any())
                    {
                        firstSubmissionBucket = earlyMorningBuckets.First();
                        lastSubmissionBucket = earlyMorningBuckets.Last();
                    }
                }
                else
                {
                    // Normal shift: simple numeric sort
                    firstSubmissionBucket = buckets.OrderBy(b => b).First();
                    lastSubmissionBucket = buckets.OrderBy(b => b).Last();
                }

                //Console.WriteLine($"[BuildCombinedChartData] Total submissions: {submissions.Count}");
                //Console.WriteLine($"[BuildCombinedChartData] First submission bucket: {firstSubmissionBucket} ({FormatTime(firstSubmissionBucket.Value)})");
                //Console.WriteLine($"[BuildCombinedChartData] Last submission bucket: {lastSubmissionBucket} ({FormatTime(lastSubmissionBucket.Value)})");
            }

            // ✅ FIXED: Improved window logic that properly handles overnight shifts
            bool IsWithinWindow(int start, int end, int value)
            {
                if (start <= end)
                {
                    // Normal shift: simple range check
                    bool result = value >= start && value <= end;
                    return result;
                }
                else
                {
                    // ✅ Overnight shift: value is in range if >= start OR <= end
                    // For example, shift 23:00 (1380) to 06:00 (360)
                    // A value of 0 (midnight) should return true because 0 <= 360
                    bool result = value >= start || value <= end;

                    // Debug logging for overnight shifts
                    if (value >= 1415 || value <= 15) // Around midnight
                    {
                        //Console.WriteLine($"[IsWithinWindow] Overnight: start={start}, end={end}, value={value}, result={result}");
                    }

                    return result;
                }
            }

            var cumulativeTotal = 0;
            var productionHeldDuringBreak = 0;
            var pendingPartsFromBreak = 0;
            var result = new List<ChartDataPoint>();
            bool anyActualSet = false;

            for (int idx = 0; idx < targetLineData.Count; idx++)
            {
                var targetPoint = targetLineData[idx];

                // Parse chart time
                var timeParts = targetPoint.Time.Split(new[] { ':', ' ' }, StringSplitOptions.RemoveEmptyEntries);
                int chartHour = int.Parse(timeParts[0]);
                string meridiem = timeParts[2];
                if (meridiem == "PM" && chartHour != 12) chartHour += 12;
                if (meridiem == "AM" && chartHour == 12) chartHour = 0;
                int chartMinute = int.Parse(timeParts[1]);
                int chartTotalMinute = chartHour * 60 + chartMinute;
                int chartBucket = ToBucket(chartTotalMinute);

                var submissionsInBucket = timeToSubmissionsMap.GetValueOrDefault(targetPoint.Time, 0);

                // ✅ FIXED: Better logic for determining if we're within production window
                bool beforeProduction = false;
                bool inWindow = false;

                if (firstSubmissionBucket.HasValue && lastSubmissionBucket.HasValue)
                {
                    inWindow = IsWithinWindow(firstSubmissionBucket.Value, lastSubmissionBucket.Value, chartBucket);

                    // ✅ CRITICAL FIX: "beforeProduction" should only be true for times OUTSIDE the window
                    // AND before any production has actually started
                    // For overnight shifts, we need to check the actual production range
                    if (!inWindow)
                    {
                        // If we're not in the production window, determine if we're before or after
                        if (firstSubmissionBucket.Value <= lastSubmissionBucket.Value)
                        {
                            // Normal shift: before means less than first
                            beforeProduction = chartBucket < firstSubmissionBucket.Value;
                        }
                        else
                        {
                            // Overnight shift: "before" means in the gap between last and first
                            // Example: first=1380 (11PM), last=360 (6AM)
                            // Gap is 361-1379 (6:05 AM to 10:55 PM)
                            beforeProduction = chartBucket > lastSubmissionBucket.Value && chartBucket < firstSubmissionBucket.Value;
                        }
                    }
                    // If inWindow is true, beforeProduction is always false
                }

                // Result
                int? actualParts = null;
                int newParts = 0;

                if (!inWindow)
                {
                    // ✅ OUTSIDE SHIFT WINDOW - don't show any data
                    actualParts = null;
                    newParts = 0;
                }
                else if (beforeProduction)
                {
                    // ✅ IN SHIFT, BUT BEFORE PRODUCTION STARTED - show 0
                    actualParts = 0;
                    newParts = 0;
                }
                else if (inWindow)
                {
                    // ✅ IN SHIFT AND PRODUCTION HAS STARTED
                    if (targetPoint.IsBreak)
                    {
                        pendingPartsFromBreak += submissionsInBucket;

                        // Capture cumulative at break start only
                        if (idx > 0 && !targetLineData[idx - 1].IsBreak)
                        {
                            productionHeldDuringBreak = cumulativeTotal;
                        }

                        // Actual reflects production during break
                        actualParts = productionHeldDuringBreak + pendingPartsFromBreak;
                        newParts = submissionsInBucket;
                    }
                    else
                    {
                        if (idx > 0 && targetLineData[idx - 1].IsBreak)
                        {
                            cumulativeTotal += pendingPartsFromBreak;
                            pendingPartsFromBreak = 0;
                        }
                        cumulativeTotal += submissionsInBucket;
                        actualParts = cumulativeTotal;
                        newParts = submissionsInBucket;
                    }
                    anyActualSet = true;
                }
                if (actualParts > 0 && result.All(r => r.ActualParts == null))
                {
                    foreach (var dp in result)
                    {
                        dp.ActualParts = 0;
                    }
                }

                result.Add(new ChartDataPoint
                {
                    Time = targetPoint.Time,
                    TargetParts = targetPoint.TargetParts,
                    ActualParts = actualParts,
                    IsBreak = targetPoint.IsBreak,
                    BreakName = targetPoint.BreakName,
                    NewPartsInBucket = newParts
                });

                // ✅ Debug logging for midnight transition
                if (chartBucket >= 1415 || chartBucket <= 15) // 11:55 PM to 12:15 AM range
                {
                    Console.WriteLine($"[Midnight Debug] Time={targetPoint.Time}, Bucket={chartBucket}, " +
                                    $"InWindow={inWindow}, BeforeProduction={beforeProduction}, " +
                                    $"ActualParts={actualParts}, Cumulative={cumulativeTotal}");
                }
            }

            Console.WriteLine($"[BuildCombinedChartData] Generated {result.Count} chart points with {result.Count(r => r.ActualParts.HasValue)} having actual data");
            Console.WriteLine($"[BuildCombinedChartData] Points with actualParts=0: {result.Count(r => r.ActualParts == 0)}");
            Console.WriteLine($"[BuildCombinedChartData] Points with actualParts>0: {result.Count(r => r.ActualParts > 0)}");
            Console.WriteLine($"[BuildCombinedChartData] Points with actualParts=null: {result.Count(r => !r.ActualParts.HasValue)}");

            return result;
        }

        // Note: ParseFormattedTimeToMinutes helper method is no longer needed with simplified approach
        // Note: ParseFormattedTimeToMinutes helper method is no longer needed with simplified approach

        // Note: ParseFormattedTimeToMinutes helper method is no longer needed with simplified approach

        // Note: ParseFormattedTimeToMinutes helper method is no longer needed with simplified approach

        // Note: ParseFormattedTimeToMinutes helper method is no longer needed with simplified approach

        // Note: ParseFormattedTimeToMinutes helper method is no longer needed with simplified approach

        //    private List<ChartDataPoint> BuildCombinedChartData(
        //List<FormSubmission> submissions,
        //List<ChartDataPoint> targetLineData)
        //    {
        //        int ToBucket(int totalMinutes) => (totalMinutes / 5) * 5;

        //        // Map submission time "rounded buckets" to counts
        //        var timeToSubmissionsMap = new Dictionary<string, int>();
        //        foreach (var submission in submissions)
        //        {
        //            var totalMinutes = submission.SubmittedAt.Hour * 60 + submission.SubmittedAt.Minute;
        //            var bucketMinutes = ToBucket(totalMinutes);

        //            if (bucketMinutes >= 24 * 60) bucketMinutes = 0;

        //            var timeKey = FormatTime(bucketMinutes);
        //            timeToSubmissionsMap[timeKey] = timeToSubmissionsMap.GetValueOrDefault(timeKey) + 1;
        //        }

        //        Console.WriteLine($"[BuildCombinedChartData] Processing {submissions.Count} submissions");
        //        Console.WriteLine($"[BuildCombinedChartData] Mapped to {timeToSubmissionsMap.Count} time buckets");

        //        // If no submissions, return empty actual data
        //        if (!submissions.Any())
        //        {
        //            return targetLineData.Select(t => new ChartDataPoint
        //            {
        //                Time = t.Time,
        //                TargetParts = t.TargetParts,
        //                ActualParts = 0,
        //                IsBreak = t.IsBreak,
        //                BreakName = t.BreakName,
        //                NewPartsInBucket = 0
        //            }).ToList();
        //        }

        //        // Build cumulative production data
        //        var cumulativeTotal = 0;
        //        var result = new List<ChartDataPoint>();
        //        bool productionHasStarted = false;

        //        foreach (var targetPoint in targetLineData)
        //        {
        //            var submissionsInBucket = timeToSubmissionsMap.GetValueOrDefault(targetPoint.Time, 0);

        //            // Add new submissions to cumulative (even during breaks)
        //            cumulativeTotal += submissionsInBucket;

        //            // Determine actualParts value
        //            int? actualParts;

        //            if (cumulativeTotal > 0)
        //            {
        //                // Once we have production, always show the cumulative value
        //                productionHasStarted = true;
        //                actualParts = cumulativeTotal;
        //            }
        //            else if (productionHasStarted)
        //            {
        //                // After production starts, maintain the cumulative even with 0 new parts
        //                actualParts = cumulativeTotal;
        //            }
        //            else
        //            {
        //                // Before any production, show 0
        //                actualParts = 0;
        //            }

        //            result.Add(new ChartDataPoint
        //            {
        //                Time = targetPoint.Time,
        //                TargetParts = targetPoint.TargetParts,
        //                ActualParts = actualParts,
        //                IsBreak = targetPoint.IsBreak,
        //                BreakName = targetPoint.BreakName,
        //                NewPartsInBucket = submissionsInBucket
        //            });

        //            // Debug logging
        //            if (submissionsInBucket > 0 || cumulativeTotal > 0)
        //            {
        //                Console.WriteLine($"[BuildCombinedChartData] {targetPoint.Time}: New={submissionsInBucket}, Cumulative={cumulativeTotal}, Actual={actualParts}");
        //            }
        //        }

        //        Console.WriteLine($"[BuildCombinedChartData] Final cumulative: {cumulativeTotal}");
        //        Console.WriteLine($"[BuildCombinedChartData] Generated {result.Count} chart points");

        //        return result;
        //    }

        // Note: ParseFormattedTimeToMinutes helper method is no longer needed with simplified approach

        // ✅ NEW HELPER METHOD: Parse formatted time string back to minutes
        private int ParseFormattedTimeToMinutes(string formattedTime)
        {
            // Example input: "11:55 PM" or "12:10 AM"
            var parts = formattedTime.Split(new[] { ':', ' ' }, StringSplitOptions.RemoveEmptyEntries);

            if (parts.Length != 3)
            {
                throw new ArgumentException($"Invalid formatted time: {formattedTime}");
            }

            int hour = int.Parse(parts[0]);
            int minute = int.Parse(parts[1]);
            string meridiem = parts[2];

            // Convert to 24-hour format
            if (meridiem == "PM" && hour != 12)
            {
                hour += 12;
            }
            else if (meridiem == "AM" && hour == 12)
            {
                hour = 0;
            }

            return hour * 60 + minute;
        }



        private int ParseTimeToMinutes(string timeStr)
        {
            // Add null/empty validation
            if (string.IsNullOrWhiteSpace(timeStr))
            {
                throw new ArgumentException("Time string cannot be null or empty", nameof(timeStr));
            }

            var parts = timeStr.Split(':');

            // Validate format
            if (parts.Length != 2)
            {
                throw new ArgumentException($"Invalid time format: '{timeStr}'. Expected format: 'HH:mm'", nameof(timeStr));
            }

            // Parse with error handling
            if (!int.TryParse(parts[0], out int hours) || !int.TryParse(parts[1], out int minutes))
            {
                throw new ArgumentException($"Invalid time values in: '{timeStr}'", nameof(timeStr));
            }

            // Validate ranges
            if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59)
            {
                throw new ArgumentException($"Time values out of range: '{timeStr}'", nameof(timeStr));
            }

            return hours * 60 + minutes;
        }


        private string FormatTime(int minutes)
        {
            // Normalize minutes to 0-1439 range (24 hours)
            minutes = minutes % (24 * 60);
            if (minutes < 0) minutes += 24 * 60;

            var hours = minutes / 60;
            var mins = minutes % 60;

            // Convert to 12-hour format
            var displayHour = hours == 0 ? 12 : hours > 12 ? hours - 12 : hours;
            var period = hours >= 12 ? "PM" : "AM";

            return $"{displayHour}:{mins:D2} {period}";
        }

    }

    // DTOs
    public class ShiftChartResponse
    {
        public List<ChartDataPoint> ChartData { get; set; }
        public int CurrentProduction { get; set; }
        public int TargetParts { get; set; }
        public int Efficiency { get; set; }
        public int RemainingParts { get; set; }
        public DateTime LastUpdate { get; set; }
        public int InitialCount { get; set; }
    }

    public class ChartDataPoint
    {
        public string Time { get; set; }
        public int TargetParts { get; set; }
        public int? ActualParts { get; set; }
        public bool IsBreak { get; set; }
        public string BreakName { get; set; }  // ✅ Add break name
        public int NewPartsInBucket { get; set; }
    }


    public class BreakConfig
    {
        [JsonPropertyName("startTime")]  // ✅ Match frontend casing
        public string StartTime { get; set; } = "";

        [JsonPropertyName("endTime")]    // ✅ Match frontend casing
        public string EndTime { get; set; } = "";

        [JsonPropertyName("name")]       // ✅ Match frontend casing
        public string Name { get; set; } = "";

        [JsonPropertyName("id")]         // ✅ Match frontend casing
        public long? Id { get; set; }
    }

}
