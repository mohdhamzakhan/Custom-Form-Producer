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
                var cacheKey = $"shift_chart_{selectedDate:yyyyMMdd}_{shift}_{targetParts}_{cycleTimeSeconds}";

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
                    LastUpdate = DateTime.Now
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
                            Name = b.Name ?? "Break",  // ✅ Include break name
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

                // Only add parts if not during break
                if (!isDuringBreak)
                {
                    cumulativeParts += partsPerInterval;
                }

                targetData.Add(new ChartDataPoint
                {
                    Time = FormatTime(adjustedMinutes),
                    TargetParts = (int)Math.Round(Math.Min(cumulativeParts, targetParts)),
                    ActualParts = 0,
                    IsBreak = isDuringBreak,
                    BreakName = breakName,  // ✅ Set break name
                    NewPartsInBucket = 0
                });
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

            // Bucket edges
            int? firstSubmissionBucket = null, lastSubmissionBucket = null;
            if (submissions.Any())
            {
                var buckets = submissions
                    .Select(s => ToBucket(s.SubmittedAt.Hour * 60 + s.SubmittedAt.Minute))
                    .OrderBy(m => m)
                    .ToList();

                firstSubmissionBucket = buckets.First();
                lastSubmissionBucket = buckets.Last();
            }

            // Window logic: handles both normal and overnight shifts
            bool IsWithinWindow(int start, int end, int value)
            {
                if (start <= end)
                    return value >= start && value <= end;
                else
                    return value >= start || value <= end; // Overnight
            }

            var cumulativeTotal = 0;
            var productionHeldDuringBreak = 0;
            var pendingPartsFromBreak = 0;
            var result = new List<ChartDataPoint>();
            bool anyActualSet = false;

            for (int idx = 0; idx < targetLineData.Count; idx++)
            {
                var targetPoint = targetLineData[idx];

                var timeParts = targetPoint.Time.Split(new[] { ':', ' ' }, StringSplitOptions.RemoveEmptyEntries);
                int chartHour = int.Parse(timeParts[0]);
                string meridiem = timeParts[2];
                if (meridiem == "PM" && chartHour != 12) chartHour += 12;
                if (meridiem == "AM" && chartHour == 12) chartHour = 0;
                int chartMinute = int.Parse(timeParts[1]);
                int chartTotalMinute = chartHour * 60 + chartMinute;
                int chartBucket = ToBucket(chartTotalMinute);

                var submissionsInBucket = timeToSubmissionsMap.GetValueOrDefault(targetPoint.Time, 0);

                // Conditions
                bool beforeProduction = firstSubmissionBucket.HasValue && chartBucket < firstSubmissionBucket.Value
                                        && !IsWithinWindow(firstSubmissionBucket.Value, lastSubmissionBucket ?? firstSubmissionBucket.Value, chartBucket);

                bool inWindow = false;
                if (firstSubmissionBucket.HasValue && lastSubmissionBucket.HasValue)
                {
                    inWindow = IsWithinWindow(firstSubmissionBucket.Value, lastSubmissionBucket.Value, chartBucket);
                }

                // Result
                int? actualParts = null;
                int newParts = 0;

                if (beforeProduction)
                {
                    actualParts = 0;
                    newParts = 0;
                }
                else if (inWindow)
                {
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
                else
                {
                    // Only null after production has started and ended (for chart gap)
                    actualParts = anyActualSet ? (int?)null : 0;
                    newParts = 0;
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
            }

            Console.WriteLine($"[BuildCombinedChartData] Generated {result.Count} chart points with {result.Count(r => r.ActualParts.HasValue)} having actual data");

            return result;
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
