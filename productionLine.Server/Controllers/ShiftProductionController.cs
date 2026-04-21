// Controllers/ShiftProductionController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using productionLine.Server.Model;
using System.Text.Json;
using System.Text.Json.Serialization;
using static productionLine.Server.Model.FormDbContext;

namespace productionLine.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ShiftProductionController : ControllerBase
    {
        private readonly PrimaryDbContext _primaryContext;
        private readonly SecondaryDbContext _secondaryContext;
        private readonly IMemoryCache _cache;

        public ShiftProductionController(PrimaryDbContext primaryContext, SecondaryDbContext secondaryContext, IMemoryCache cache)
        {
            _primaryContext = primaryContext;
            _secondaryContext = secondaryContext;
            _cache = cache;
        }

        // ============================================================
        // FILE: ShiftProductionController.cs
        // REPLACE the entire GetShiftChartData method with this
        // ============================================================

        [HttpGet("chart-data")]
        public async Task<IActionResult> GetShiftChartData(
            [FromQuery] DateTime selectedDate,
            [FromQuery] string shift,
            [FromQuery] int targetParts,
            [FromQuery] double cycleTimeSeconds,
            [FromQuery] string startTime,
            [FromQuery] string endTime,
            [FromQuery] string breaks,
            [FromQuery] int formId,
            [FromQuery] string groupByField = null)   // <-- ADD THIS NEW PARAM
        {
            try
            {
                Console.WriteLine($"[ShiftProduction] Received request:");
                Console.WriteLine($"  Date: {selectedDate:yyyy-MM-dd} (parsed from query)");
                Console.WriteLine($"  Date kind: {selectedDate.Kind}");
                Console.WriteLine($"  Shift: {shift}");
                Console.WriteLine($"  GroupByField: {groupByField ?? "none"}");

                var queryDate = selectedDate.Date;
                Console.WriteLine($"  Query Date (normalized): {queryDate:yyyy-MM-dd}");

                if (string.IsNullOrWhiteSpace(startTime))
                    return BadRequest(new { error = "startTime parameter is required" });

                if (string.IsNullOrWhiteSpace(endTime))
                    return BadRequest(new { error = "endTime parameter is required" });

                if (targetParts <= 0)
                    return BadRequest(new { error = "targetParts must be greater than 0" });

                if (cycleTimeSeconds <= 0)
                    return BadRequest(new { error = "cycleTimeSeconds must be greater than 0" });

                // Build cache key - include groupByField
                var cacheKey = $"shift_chart_{formId}_{selectedDate:yyyyMMdd}_{shift}_{targetParts}_{cycleTimeSeconds}_{groupByField ?? "none"}";

                if (_cache.TryGetValue(cacheKey, out ShiftChartResponse cachedData))
                {
                    Console.WriteLine($"[ShiftProduction] Returning cached data");
                    return Ok(cachedData);
                }

                // Parse breaks
                var breaksList = new List<BreakConfig>();
                if (!string.IsNullOrEmpty(breaks))
                {
                    try
                    {
                        var parsedBreaks = JsonSerializer.Deserialize<List<BreakConfig>>(breaks) ?? new List<BreakConfig>();
                        breaksList = parsedBreaks
                            .Where(b => !string.IsNullOrWhiteSpace(b.StartTime) && !string.IsNullOrWhiteSpace(b.EndTime))
                            .ToList();
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[ShiftProduction] Error parsing breaks: {ex.Message}");
                    }
                }

                // ============================================================
                // ✅ DATABASE FALLBACK LOGIC WITH DATE THRESHOLD
                // ============================================================
                Console.WriteLine($"[ShiftProduction] Fetching submissions from Primary Database...");
                FormDbContext activeContext = _primaryContext;

                int form = activeContext.ReportTemplates.Where(x => x.Id == formId).Select(y => y.FormId).FirstOrDefault();
                var submissions = form != 0
                    ? await GetFilteredSubmissions(selectedDate, startTime, endTime, form, activeContext)
                    : new List<FormSubmission>();

                // Define the threshold date: April 19, 2026
                DateTime fallbackThreshold = new DateTime(2026, 4, 19);

                // ONLY fallback if 0 submissions AND the queried date is strictly AFTER the threshold
                if (submissions.Count == 0 && queryDate > fallbackThreshold)
                {
                    Console.WriteLine($"[ShiftProduction] No results in Primary and date is after {fallbackThreshold:dd-MM-yyyy}. Falling back to Secondary Database...");
                    activeContext = _secondaryContext; // Swap context globally for the rest of the method

                    form = activeContext.ReportTemplates.Where(x => x.Id == formId).Select(y => y.FormId).FirstOrDefault();
                    submissions = form != 0
                        ? await GetFilteredSubmissions(selectedDate, startTime, endTime, form, activeContext)
                        : new List<FormSubmission>();
                }
                else if (submissions.Count == 0)
                {
                    Console.WriteLine($"[ShiftProduction] No results in Primary. Skipping Secondary DB because date {queryDate:dd-MM-yyyy} is not above {fallbackThreshold:dd-MM-yyyy}.");
                }

                Console.WriteLine($"[ShiftProduction] Found {submissions.Count} submissions in active database.");
                // ============================================================

                var startMinutes = ParseTimeToMinutes(startTime);
                var isOvernight = ParseTimeToMinutes(endTime) <= startMinutes;

                int initialCount = 0;
                if (isOvernight)
                {
                    initialCount = await activeContext.FormSubmissions
                        .AsNoTracking()
                        .Where(s =>
                            s.FormId == form &&
                            (
                                s.SubmittedAt.Date < queryDate ||
                                (s.SubmittedAt.Date == queryDate &&
                                 s.SubmittedAt.Hour * 60 + s.SubmittedAt.Minute < startMinutes)
                            ))
                        .CountAsync();
                }
                else
                {
                    initialCount = await activeContext.FormSubmissions
                        .AsNoTracking()
                        .Where(s =>
                            s.FormId == form &&
                            s.SubmittedAt.Date == queryDate &&
                            s.SubmittedAt.Hour * 60 + s.SubmittedAt.Minute < startMinutes)
                        .CountAsync();
                }

                // Calculate target line
                Console.WriteLine($"[ShiftProduction] Calculating target line...");
                var targetLineData = CalculateTargetLine(targetParts, cycleTimeSeconds, startTime, endTime, breaksList);
                Console.WriteLine($"[ShiftProduction] Generated {targetLineData.Count} target points");

                // ============================================================
                // MULTI-LINE chart data (Grouping)
                // ============================================================
                if (!string.IsNullOrWhiteSpace(groupByField))
                {
                    Console.WriteLine($"[ShiftProduction] Building MULTI-LINE chart data, grouping by: {groupByField}");

                    var groupField = await activeContext.FormFields
                        .AsNoTracking()
                        .FirstOrDefaultAsync(f => f.Label == groupByField && f.FormId == form);

                    if (groupField != null)
                    {
                        var submissionIds = submissions.Select(s => s.Id).ToList();
                        var fieldIdStr = groupField.Id.ToString();
                        var startMinutesForQuery = ParseTimeToMinutes(startTime);
                        var endMinutesForQuery = ParseTimeToMinutes(endTime);
                        var isOvernightForQuery = endMinutesForQuery <= startMinutesForQuery;
                        var nextDateForQuery = queryDate.AddDays(1);

                        var submissionDataList = await (
                             from s in activeContext.FormSubmissions.AsNoTracking()
                             join d in activeContext.FormSubmissionData.AsNoTracking() on s.Id equals d.FormSubmissionId
                             where
                                 s.FormId == form &&
                                 d.FieldLabel == fieldIdStr &&
                                 (
                                     isOvernightForQuery
                                     ? (
                                         (s.SubmittedAt.Date == queryDate && (s.SubmittedAt.Hour * 60 + s.SubmittedAt.Minute) >= startMinutesForQuery)
                                         ||
                                         (s.SubmittedAt.Date == nextDateForQuery && (s.SubmittedAt.Hour * 60 + s.SubmittedAt.Minute) <= endMinutesForQuery)
                                       )
                                     : (
                                         s.SubmittedAt.Date == queryDate &&
                                         (s.SubmittedAt.Hour * 60 + s.SubmittedAt.Minute) >= startMinutesForQuery &&
                                         (s.SubmittedAt.Hour * 60 + s.SubmittedAt.Minute) <= endMinutesForQuery
                                       )
                                 )
                             select new
                             {
                                 d.FormSubmissionId,
                                 d.FieldValue
                             }
                        ).ToListAsync();

                        var submissionLineMap = submissionDataList
                            .GroupBy(d => d.FormSubmissionId)
                            .ToDictionary(
                                g => g.Key,
                                g => g.First().FieldValue?.Trim() ?? "Unknown"
                            );

                        var groupedSubmissions = submissions
                            .GroupBy(s => submissionLineMap.TryGetValue(s.Id, out var ln) ? ln : "Unknown")
                            .ToDictionary(g => g.Key, g => g.ToList());

                        var linesChartData = BuildMultiLineChartData(groupedSubmissions, targetLineData);
                        var lineCount = groupedSubmissions.Count;
                        var totalTargetParts = targetParts * lineCount;
                        var currentProduction = submissions.Count;
                        var efficiency = targetParts > 0 ? (int)Math.Round((double)currentProduction / targetParts / lineCount * 100) : 0;
                        var remainingParts = Math.Max(0, totalTargetParts - currentProduction);

                        var multiLineResponse = new
                        {
                            IsMultiLine = true,
                            Lines = linesChartData,
                            TargetLineData = targetLineData.Select(point => new
                            {
                                time = point.Time,
                                target = point.TargetParts
                            }).ToList(),
                            CurrentProduction = currentProduction,
                            TargetParts = totalTargetParts,
                            Efficiency = efficiency,
                            RemainingParts = remainingParts,
                            LastUpdate = DateTime.Now,
                            InitialCount = initialCount,
                            LineNames = groupedSubmissions.Keys.ToList()
                        };

                        _cache.Set(cacheKey, multiLineResponse, TimeSpan.FromSeconds(30));
                        return Ok(multiLineResponse);
                    }
                }

                // ============================================================
                // SINGLE-LINE chart data (Fallback)
                // ============================================================
                Console.WriteLine($"[ShiftProduction] Building SINGLE-LINE combined chart data...");
                var combinedData = BuildCombinedChartData(submissions, targetLineData);

                var currentProductionSingle = submissions.Count;
                var efficiencySingle = targetParts > 0 ? (int)Math.Round((double)currentProductionSingle / targetParts * 100) : 0;
                var remainingPartsSingle = Math.Max(0, targetParts - currentProductionSingle);

                var response = new ShiftChartResponse
                {
                    ChartData = combinedData,
                    CurrentProduction = currentProductionSingle,
                    TargetParts = targetParts,
                    Efficiency = efficiencySingle,
                    RemainingParts = remainingPartsSingle,
                    LastUpdate = DateTime.Now,
                    InitialCount = initialCount
                };

                _cache.Set(cacheKey, response, TimeSpan.FromSeconds(30));
                return Ok(response);
            }
            catch (ArgumentException argEx)
            {
                Console.WriteLine($"[ShiftProduction] Validation Error: {argEx.Message}");
                return BadRequest(new { error = argEx.Message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ShiftProduction] ERROR: {ex.Message}");
                return StatusCode(500, new
                {
                    error = ex.Message,
                    innerError = ex.InnerException?.Message,
                    stackTrace = ex.StackTrace,
                    type = ex.GetType().Name
                });
            }
        }

        // ============================================================
        // REPLACE the entire BuildMultiLineChartData method with this:
        // ============================================================

        private Dictionary<string, List<object>> BuildMultiLineChartData(
            Dictionary<string, List<FormSubmission>> groupedSubmissions,
            List<ChartDataPoint> targetLineData)
        {
            int ToBucket(int totalMinutes) => (totalMinutes / 5) * 5;

            // STEP 1: Pre-bucket ALL lines' submissions into time maps
            var lineTimeMaps = new Dictionary<string, Dictionary<string, int>>();
            foreach (var (lineName, lineSubmissions) in groupedSubmissions)
            {
                var timeMap = new Dictionary<string, int>();
                foreach (var submission in lineSubmissions)
                {
                    var totalMinutes = submission.SubmittedAt.Hour * 60 + submission.SubmittedAt.Minute;
                    var bucketMinutes = ToBucket(totalMinutes);
                    if (bucketMinutes >= 24 * 60) bucketMinutes = 0;
                    var timeKey = FormatTime(bucketMinutes);
                    timeMap[timeKey] = timeMap.GetValueOrDefault(timeKey) + 1;
                }
                lineTimeMaps[lineName] = timeMap;
            }

            // STEP 2: Pre-compute first/last submission bucket per line
            var lineWindows = new Dictionary<string, (int first, int last, bool hasData)>();
            foreach (var (lineName, lineSubmissions) in groupedSubmissions)
            {
                if (!lineSubmissions.Any())
                {
                    lineWindows[lineName] = (0, 0, false);
                    continue;
                }
                var buckets = lineSubmissions
                    .Select(s => ToBucket(s.SubmittedAt.Hour * 60 + s.SubmittedAt.Minute))
                    .ToList();
                lineWindows[lineName] = (buckets.Min(), buckets.Max(), true);
            }

            // STEP 3: Single pass over target timeline
            var cumulativeTotals = groupedSubmissions.Keys.ToDictionary(k => k, k => 0);
            var pendingFromBreak = groupedSubmissions.Keys.ToDictionary(k => k, k => 0);
            var heldAtBreakStart = groupedSubmissions.Keys.ToDictionary(k => k, k => 0);

            // ✅ NEW: track last non-null cumulative per line so we can carry it forward
            var lastKnownValue = groupedSubmissions.Keys.ToDictionary(k => k, k => (int?)null);

            var lineResults = groupedSubmissions.Keys.ToDictionary(
                k => k,
                k => new List<object>(targetLineData.Count)
            );

            for (int idx = 0; idx < targetLineData.Count; idx++)
            {
                var targetPoint = targetLineData[idx];
                bool isBreak = targetPoint.IsBreak;
                bool wasBreak = idx > 0 && targetLineData[idx - 1].IsBreak;

                // ============================================================
                // REPLACE only the inner foreach loop inside BuildMultiLineChartData
                // (from "foreach (var lineName in groupedSubmissions.Keys)" to its closing brace)
                // ============================================================

                foreach (var lineName in groupedSubmissions.Keys)
                {
                    var timeMap = lineTimeMaps[lineName];
                    var window = lineWindows[lineName];

                    var submissionsInBucket = timeMap.GetValueOrDefault(targetPoint.Time, 0);
                    int? actualParts = null;

                    if (!window.hasData)
                    {
                        // No submissions at all for this line — always null
                        actualParts = null;
                    }
                    else
                    {
                        // Parse chart time bucket
                        var timeParts = targetPoint.Time.Split(new[] { ':', ' ' }, StringSplitOptions.RemoveEmptyEntries);
                        int h = int.Parse(timeParts[0]);
                        if (timeParts[2] == "PM" && h != 12) h += 12;
                        if (timeParts[2] == "AM" && h == 12) h = 0;
                        int chartBucket = ToBucket(h * 60 + int.Parse(timeParts[1]));

                        if (chartBucket < window.first)
                        {
                            // ✅ Before this line's first submission — show 0 (line hasn't started)
                            actualParts = 0;
                        }
                        else if (chartBucket >= window.first && chartBucket <= window.last)
                        {
                            // ✅ Inside this line's active window — normal calculation
                            if (isBreak)
                            {
                                if (!wasBreak) heldAtBreakStart[lineName] = cumulativeTotals[lineName];
                                pendingFromBreak[lineName] += submissionsInBucket;
                                actualParts = heldAtBreakStart[lineName] + pendingFromBreak[lineName];
                            }
                            else
                            {
                                if (wasBreak)
                                {
                                    cumulativeTotals[lineName] += pendingFromBreak[lineName];
                                    pendingFromBreak[lineName] = 0;
                                }
                                cumulativeTotals[lineName] += submissionsInBucket;
                                actualParts = cumulativeTotals[lineName];
                            }

                            // ✅ Always update last known value while inside window
                            lastKnownValue[lineName] = actualParts;
                        }
                        else
                        {
                            // ✅ Past this line's last submission — ALWAYS carry forward last known value
                            // This is what prevents the drop to 0
                            actualParts = lastKnownValue[lineName] ?? cumulativeTotals[lineName];
                        }
                    }

                    lineResults[lineName].Add(new
                    {
                        time = targetPoint.Time,
                        actual = submissionsInBucket,
                        target = targetPoint.TargetParts,
                        cumulative = actualParts
                    });
                }
            }

            // STEP 4: Convert to expected return type
            return lineResults.ToDictionary(
                kvp => kvp.Key,
                kvp => kvp.Value.Cast<object>().ToList()
            );
        }


        private async Task<List<FormSubmission>> GetFilteredSubmissions(
            DateTime selectedDate,
            string startTime,
            string endTime,
            int formID,
            FormDbContext context)
        {
            var startMinutes = ParseTimeToMinutes(startTime);
            var endMinutes = ParseTimeToMinutes(endTime);
            var queryDate = selectedDate.Date;
            var isOvernightShift = endMinutes <= startMinutes;

            IQueryable<FormSubmission> query;

            if (isOvernightShift)
            {
                var nextDate = queryDate.AddDays(1);
                query = context.FormSubmissions
                    .AsNoTracking()
                    .Where(s =>
                        ((s.SubmittedAt.Date == queryDate && s.SubmittedAt.Hour * 60 + s.SubmittedAt.Minute >= startMinutes)
                        ||
                        (s.SubmittedAt.Date == nextDate && s.SubmittedAt.Hour * 60 + s.SubmittedAt.Minute <= endMinutes))
                         && s.FormId == formID
                    );
            }
            else
            {
                query = context.FormSubmissions
                    .AsNoTracking()
                    .Where(s =>
                        s.SubmittedAt.Date == queryDate &&
                        s.SubmittedAt.Hour * 60 + s.SubmittedAt.Minute >= startMinutes &&
                        s.SubmittedAt.Hour * 60 + s.SubmittedAt.Minute <= endMinutes && s.FormId == formID
                    );
            }

            return await query
                .OrderBy(s => s.SubmittedAt)
                .Select(s => new FormSubmission
                {
                    Id = s.Id,
                    SubmittedAt = s.SubmittedAt
                })
                .ToListAsync();
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
                    adjustedMinutes >= range.Start && adjustedMinutes < range.End
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
