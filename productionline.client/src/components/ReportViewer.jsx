import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import ReportCharts from "./ReportCharts";
import { APP_CONSTANTS } from "./store";
import "../report_viewer_styles.css";
import LoadingDots from './LoadingDots';


export default function EnhancedReportViewer() {
    const { templateId } = useParams();
    const [filters, setFilters] = useState([]);
    const [runtimeFilters, setRuntimeFilters] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [template, setTemplate] = useState(null);
    const [reportData, setReportData] = useState([]);
    const [fields, setFields] = useState([]);
    const [selectedFields, setSelectedFields] = useState([]);
    const [displayMode, setDisplayMode] = useState("table");
    const [viewMode, setViewMode] = useState("expanded");
    const [chartConfigs, setChartConfigs] = useState([]);
    const [calculatedFields, setCalculatedFields] = useState([]);
    const [summaryRows, setSummaryRows] = useState([]);

    const [isFullscreenMode, setIsFullscreenMode] = useState(false);
    const [fullscreenTimer, setFullscreenTimer] = useState(null);
    const [selectedShiftPeriod, setSelectedShiftPeriod] = useState("current");
    const [lastRefreshTime, setLastRefreshTime] = useState(new Date());

    // Add this function to detect current shift
    const getCurrentShift = () => {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;

        // Shift A: 6:00 AM to 2:30 PM (360 to 870 minutes)
        if (currentTime >= 360 && currentTime < 870) return 'A';
        // Shift B: 2:30 PM to 11:00 PM (870 to 1380 minutes)
        if (currentTime >= 870 && currentTime < 1380) return 'B';
        // Shift C: 11:00 PM to 6:00 AM next day
        return 'C';
    };

    useEffect(() => {
        const fetchTemplate = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${APP_CONSTANTS.API_BASE_URL}/api/reports/template/${templateId}`);
                setTemplate(res.data);
                setFilters(res.data.filters || []);

                console.log("Hamza")
                console.log(res)
                console.log(res.data.filters)

                const calculatedFields = res.data.calculatedFields || [];
                setCalculatedFields(calculatedFields);

                console.log(calculatedFields)

                const resolvedFields = (res.data.fields || []).map(f => ({
                    id: f.fieldId || f.id,
                    label: f.fieldLabel || f.label,
                    type: f.type || "text",
                }));

                // Only add non-column-wise calculated fields to the grid columns
                calculatedFields.forEach(cf => {
                    if (cf.calculationType !== 'columnwise') {
                        resolvedFields.push({
                            id: `calc_${cf.label}`,
                            label: cf.label,
                            type: "calculated"
                        });
                    }
                });

                setFields(resolvedFields);
                setSelectedFields(resolvedFields);

                setTemplate(prev => ({ ...prev, calculatedFields }));
                let charts = res.data.chartConfig;

                if (!charts || charts.length === 0) {
                    // Handle legacy single chart format
                    if (res.data.chartConfig?.title && res.data.chartConfig?.metrics?.length > 0) {
                        charts = [{
                            id: 1,
                            title: res.data.chartConfig.title || "Chart 1",
                            type: res.data.chartConfig.type || "bar",
                            metrics: res.data.chartConfig.metrics || [],
                            xField: res.data.chartConfig.xField,
                            position: { row: 0, col: 0, width: 12, height: 6 },
                            comboConfig: res.data.chartConfig.comboConfig || { barMetrics: [], lineMetrics: [] },
                            // ✅ Handle legacy single shiftConfig
                            shiftConfigs: res.data.chartConfig.shiftConfig ? [res.data.chartConfig.shiftConfig] : null
                        }];
                    }
                } else {
                    // ✅ FIXED: Properly handle multiple chart configurations
                    charts = charts.map(chart => ({
                        id: chart.id || Date.now(),
                        title: chart.title || "Chart",
                        type: chart.type || "bar",
                        metrics: chart.metrics || [],
                        xField: chart.xField,
                        position: chart.position || { row: 0, col: 0, width: 12, height: 6 },
                        comboConfig: chart.comboConfig || { barMetrics: [], lineMetrics: [] },
                        // ✅ CRITICAL FIX: Properly load shiftConfigs from database
                        shiftConfigs: chart.shiftConfigs || (chart.shiftConfig ? [chart.shiftConfig] : null)
                    }));
                }

                console.log("Loaded charts with configurations:", charts);

                const shiftCharts = charts.filter(c => c.type === 'shift');
                if (shiftCharts.length > 0) {
                    console.log("Shift charts found:", shiftCharts);
                    shiftCharts.forEach((chart, index) => {
                        console.log(`Shift Chart ${index + 1} (${chart.title}):`, {
                            hasShiftConfigs: !!chart.shiftConfigs,
                            configCount: chart.shiftConfigs?.length || 0,
                            configurations: chart.shiftConfigs
                        });
                    });
                }

                setChartConfigs(charts);

                setLoading(false);

                // FIX: Pass the calculatedFields directly instead of relying on state
                if (!res.data.filters || res.data.filters.length === 0) {
                    console.log('=== CALLING INITIAL REPORT WITH CALCULATED FIELDS ===');
                    console.log('calculatedFields to pass:', calculatedFields);

                    // Call the report API directly with the fresh calculatedFields
                    try {
                        const reportRes = await axios.post(`${APP_CONSTANTS.API_BASE_URL}/api/reports/run/${templateId}`, {});
                        console.log('=== PROCESSING WITH FRESH DATA ===');
                        console.log('reportData:', reportRes.data);
                        console.log('calculatedFields:', calculatedFields);
                        console.log('fields:', resolvedFields);

                        const { processedData, summaryRows } = processCalculatedFields(reportRes.data, calculatedFields, resolvedFields);

                        console.log('processedData:', processedData);
                        console.log('summaryRows:', summaryRows);

                        setReportData(processedData);
                        setSummaryRows(summaryRows);
                    } catch (reportErr) {
                        setError("Failed to run initial report: " + (reportErr.message || "Unknown error"));
                    }
                }
            } catch (err) {
                setError("Failed to load template: " + (err.message || "Unknown error"));
                setLoading(false);
            }
        };

        fetchTemplate();
    }, [templateId]);

    useEffect(() => {
        const hasShiftChart = chartConfigs.some(chart => chart.type === 'shift');

        if (hasShiftChart && displayMode === 'charts') {
            console.log('🔄 Starting fullscreen timer for shift charts');

            // Clear any existing timer
            if (fullscreenTimer) {
                clearTimeout(fullscreenTimer);
            }

            // Set timer for 2 minutes (120000 ms)
            const timerId = setTimeout(() => {
                console.log('⏰ 2 minutes passed - switching to fullscreen mode');
                setIsFullscreenMode(true);
            }, 120); // 2 minutes

            setFullscreenTimer(timerId);

            // Cleanup timer on unmount or when dependencies change
            return () => {
                if (timerId) {
                    clearTimeout(timerId);
                }
            };
        } else {
            // Reset fullscreen mode if no shift charts
            setIsFullscreenMode(false);
            if (fullscreenTimer) {
                clearTimeout(fullscreenTimer);
                setFullscreenTimer(null);
            }
        }
    }, [chartConfigs, displayMode]);

    // Auto-refresh every 5 minutes for shift charts
    useEffect(() => {
        const hasShiftChart = chartConfigs.some(chart => chart.type === 'shift');

        if (hasShiftChart) {
            console.log('🔄 Setting up auto-refresh for shift charts (5 minutes)');

            const refreshInterval = setInterval(() => {
                console.log('🔄 Auto-refreshing shift chart data...');
                fetchFilteredReport(true);
            }, 3000); // 5 minutes = 300000 milliseconds

            // Cleanup interval on unmount
            return () => {
                console.log('🛑 Clearing auto-refresh interval');
                clearInterval(refreshInterval);
            };
        }
    }, [chartConfigs, runtimeFilters]); // Re-setup interval if charts or filters change

    // Add click handler to exit fullscreen mode
    const handleExitFullscreen = () => {
        console.log('🖱️ Exiting fullscreen mode');
        setIsFullscreenMode(false);

        // Restart the timer
        const hasShiftChart = chartConfigs.some(chart => chart.type === 'shift');
        if (hasShiftChart && displayMode === 'charts') {
            const timerId = setTimeout(() => {
                setIsFullscreenMode(true);
            }, 120000); // 2 minutes
            setFullscreenTimer(timerId);
        }
    };

    const fetchFilteredReport = async (silent = false) => {
        try {
            if (!silent) {
                setLoading(true);
            }
            console.log('=== FETCH FILTERED REPORT DEBUG ===');
            console.log('calculatedFields state:', calculatedFields);
            console.log('fields state:', fields);

            const res = await axios.post(`${APP_CONSTANTS.API_BASE_URL}/api/reports/run/${templateId}`, runtimeFilters);

            console.log('=== PROCESSING FILTERED REPORT ===');
            console.log('reportData:', res.data);

            const { processedData, summaryRows } = processCalculatedFields(res.data, calculatedFields, fields);

            console.log('processedData:', processedData);
            console.log('summaryRows:', summaryRows);

            setReportData(processedData);
            setSummaryRows(summaryRows);
            setLastRefreshTime(new Date()); // Add this line
            if (!silent) {
                setLoading(false);
            }
        } catch (err) {
            setError("Failed to run filtered report: " + (err.message || "Unknown error"));
            if (!silent) {
                setLoading(false);
            }
        }
    };


    const fetchFilteredReport1 = async () => {
        try {
            setLoading(true);
            console.log('=== FETCH FILTERED REPORT DEBUG ===');
            console.log('calculatedFields state:', calculatedFields);
            console.log('fields state:', fields);

            const res = await axios.post(`${APP_CONSTANTS.API_BASE_URL}/api/reports/run/${templateId}`, runtimeFilters);

            console.log('=== PROCESSING FILTERED REPORT ===');
            console.log('reportData:', res.data);

            const { processedData, summaryRows } = processCalculatedFields(res.data, calculatedFields, fields);

            console.log('processedData:', processedData);
            console.log('summaryRows:', summaryRows);

            setReportData(processedData);
            setSummaryRows(summaryRows);
            setLoading(false);
        } catch (err) {
            setError("Failed to run filtered report: " + (err.message || "Unknown error"));
            setLoading(false);
        }
    };

    const chartData = useMemo(() => {
        if (!reportData || reportData.length === 0) return [];

        console.log(...reportData)
        const transformedData = reportData.map((row, index) => {
            const chartPoint = { submissionId: row.submissionId || index };

            (row.data || []).forEach(cell => {
                const fieldLabel = cell.fieldLabel;
                let value = cell.value;

                if (value === null || value === undefined || value === '') {
                    chartPoint[fieldLabel] = 0;
                    return;
                }

                // Handle calculated field values
                if (cell.fieldType === 'calculated') {
                    if (typeof value === 'string') {
                        const cleanValue = value.replace(/[%,$\s]/g, '');
                        const numValue = parseFloat(cleanValue);
                        if (!isNaN(numValue) && isFinite(numValue)) {
                            chartPoint[fieldLabel] = numValue;
                            // ALSO map it to the calc ID format for charts
                            const calcField = calculatedFields.find(cf => cf.label === fieldLabel);
                            if (calcField) {
                                chartPoint[`calc_${calcField.id}`] = numValue;
                            }
                            return;
                        }
                    } else if (typeof value === 'number') {
                        chartPoint[fieldLabel] = value;
                        // ALSO map it to the calc ID format for charts
                        const calcField = calculatedFields.find(cf => cf.label === fieldLabel);
                        if (calcField) {
                            chartPoint[`calc_${calcField.id}`] = value;
                        }
                        return;
                    }
                }

                // Handle regular fields - PRESERVE DATE STRINGS
                try {
                    const parsed = JSON.parse(value);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        if (typeof parsed[0] === 'object') {
                            chartPoint[fieldLabel] = parsed.length;
                        } else {
                            const numericValues = parsed.map(v => parseFloat(v)).filter(v => !isNaN(v));
                            chartPoint[fieldLabel] = numericValues.length > 0 ?
                                numericValues.reduce((a, b) => a + b, 0) : 0;
                        }
                    } else if (typeof parsed === 'number') {
                        chartPoint[fieldLabel] = parsed;
                    } else {
                        chartPoint[fieldLabel] = parsed;
                    }
                } catch (e) {
                    // THIS IS THE KEY FIX - Check if it's a date field before parsing as number
                    const isDateLikeField = fieldLabel.toLowerCase().includes('date') ||
                        fieldLabel.toLowerCase().includes('time') ||
                        fieldLabel.toLowerCase().includes('created') ||
                        fieldLabel.toLowerCase().includes('submitted');

                    const isDateLikeValue = typeof value === 'string' &&
                        (value.includes('T') || value.match(/^\d{4}-\d{2}-\d{2}/));

                    if (isDateLikeField || isDateLikeValue) {
                        // Preserve date strings as-is
                        chartPoint[fieldLabel] = value;
                    } else {
                        // Try to parse as number for non-date fields
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue) && isFinite(numValue)) {
                            chartPoint[fieldLabel] = numValue;
                        } else {
                            chartPoint[fieldLabel] = value;
                        }
                    }
                }
            });

            return chartPoint;
        });

        console.log('=== DEBUG TRANSFORMED CHART DATA ===');
        console.log('Sample transformed data:', transformedData[0]);
        console.log('Date field value:', transformedData[0]?.Date);

        return transformedData;
    }, [reportData, calculatedFields]);

    useEffect(() => {
        // Auto-switch to charts view if shift charts are detected
        const hasShift = chartConfigs.some(chart => chart.type === 'shift');
        if (hasShift && displayMode !== 'charts') {
            setDisplayMode('charts');
        }
    }, [chartConfigs]);

    const formatCellValue = (value, field) => {
        if (!value || value === "-" || value === "") return "—";

        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed) && typeof parsed[0] === "object") {
                return (
                    <table className="mini-grid-table">
                        <thead>
                            <tr>{Object.keys(parsed[0]).map((col, i) => <th key={i}>{col}</th>)}</tr>
                        </thead>
                        <tbody>
                            {parsed.map((row, ri) => (
                                <tr key={ri}>
                                    {Object.values(row).map((cell, ci) => <td key={ci}>{cell || "—"}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            }
        } catch { }

        if (typeof value === "string" && value.includes(", ")) {
            const items = value.split(/, ?/);
            return (
                <ul className="comma-list">
                    {items.map((item, idx) => <li key={idx}>• {item}</li>)}
                </ul>
            );
        }

        return value;
    };

    const renderSummaryStats = () => {
        if (reportData.length === 0) return null;
        const totalSubmissions = new Set(reportData.map(r => r.submissionId)).size;
        const totalItems = reportData.length;
        const chartsCount = chartConfigs.length;

        return (
            <div className="stats-card">
                <div className="flex gap-6">
                    <div className="text-center">
                        <div className="stat-number text-green-600">{totalSubmissions}</div>
                        <div className="text-sm">Submissions</div>
                    </div>
                    <div className="text-center">
                        <div className="stat-number text-blue-600">{totalItems}</div>
                        <div className="text-sm">Total Items</div>
                    </div>
                    <div className="text-center">
                        <div className="stat-number text-purple-600">{chartsCount}</div>
                        <div className="text-sm">Charts</div>
                    </div>
                </div>
            </div>
        );
    };

    const renderViewControls = () => (
        <div className="view-controls">
            <button
                onClick={() => setDisplayMode("table")}
                className={displayMode === 'table' ? 'active' : ''}
            >
                📊 Table
            </button>
            <button
                onClick={() => setDisplayMode("charts")}
                className={displayMode === 'charts' ? 'active' : ''}
            >
                📈 Charts ({chartConfigs.length})
            </button>
            <button
                onClick={() => setDisplayMode("dashboard")}
                className={displayMode === 'dashboard' ? 'active' : ''}
            >
                🎯 Dashboard
            </button>

            {displayMode === 'table' && (
                <>
                    <button
                        onClick={() => setViewMode("expanded")}
                        className={viewMode === 'expanded' ? 'active' : ''}
                    >
                        📋 Expanded
                    </button>
                    <button
                        onClick={() => setViewMode("grouped")}
                        className={viewMode === 'grouped' ? 'active' : ''}
                    >
                        📑 Grouped
                    </button>
                </>
            )}
        </div>
    );

    const renderExpandedTable = () => {
        return renderExpandedTableWithSummary(reportData, summaryRows, selectedFields, fields);
    };

    const renderGroupedTable = () => {
        const grouped = {};
        reportData.forEach(row => {
            if (!grouped[row.submissionId]) grouped[row.submissionId] = [];
            grouped[row.submissionId].push(row);
        });

        return (
            <div className="grouped-view">
                {Object.entries(grouped).map(([submissionId, rows]) => (
                    <div key={submissionId} className="group">
                        <div className="group-header">
                            <h4>Submission #{submissionId}</h4>
                        </div>
                        <table className="report-table">
                            <thead>
                                <tr>
                                    {selectedFields.map((field, i) => (
                                        <th key={i}>{typeof field === 'object' ? field.label : field}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, i) => (
                                    <tr key={i}>
                                        {selectedFields.map((field, j) => {
                                            const fLabel = typeof field === 'object' ? field.label : field;
                                            const fieldData = row.data?.find(d => d.fieldLabel === fLabel);
                                            return <td key={j}>{formatCellValue(fieldData?.value, field)}</td>;
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        );
    };

    const fullscreenStyles = `
    .shift-charts-container.fullscreen-mode {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        z-index: 9999;
        overflow: hidden;
        padding: 0;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }
    
    .chart-fullscreen {
        width: 95vw;
        height: 85vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.03);
        border: 2px solid rgba(100, 200, 255, 0.3);
        border-radius: 20px;
        padding: 30px;
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
        backdrop-filter: blur(10px);
    }
    
    /* Responsive container styling */
    .fullscreen-mode .recharts-responsive-container {
        width: 100% !important;
        height: 100% !important;
        min-height: 500px !important;
        position: relative !important;
        display: block !important;
    }
    
    .fullscreen-mode .recharts-wrapper {
        width: 100% !important;
        height: 100% !important;
        position: relative !important;
        display: block !important;
    }
    
    .fullscreen-mode .recharts-surface {
        width: 100% !important;
        height: 100% !important;
        overflow: visible !important;
    }
    
    /* Chart lines - bright and thick */
    .fullscreen-mode .recharts-line .recharts-curve {
        stroke-width: 5px !important;
        opacity: 1 !important;
        filter: drop-shadow(0 0 8px currentColor);
    }
    
    /* Target line - bright orange/red */
    .fullscreen-mode .recharts-line[stroke*="ff"] .recharts-curve,
    .fullscreen-mode path[stroke*="ff6b35"],
    .fullscreen-mode path[stroke*="ff7300"] {
        stroke: #ff6b35 !important;
        stroke-width: 6px !important;
        filter: drop-shadow(0 0 12px #ff6b35);
    }
    
    /* Actual production line - bright green */
    .fullscreen-mode .recharts-line[stroke*="4ade80"] .recharts-curve,
    .fullscreen-mode .recharts-line[stroke*="82ca9d"] .recharts-curve,
    .fullscreen-mode path[stroke*="4ade80"],
    .fullscreen-mode path[stroke*="82ca9d"] {
        stroke: #4ade80 !important;
        stroke-width: 6px !important;
        filter: drop-shadow(0 0 12px #4ade80);
    }
    
    /* Dots on lines */
    .fullscreen-mode .recharts-dot {
        r: 8 !important;
        stroke-width: 3 !important;
        filter: drop-shadow(0 0 8px currentColor);
    }
    
    /* Chart text - white and larger */
    .fullscreen-mode .recharts-text,
    .fullscreen-mode .recharts-cartesian-axis-tick-value,
    .fullscreen-mode text {
        fill: #ffffff !important;
        font-size: 16px !important;
        font-weight: 600 !important;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    }
    
    /* Axis labels */
    .fullscreen-mode .recharts-label {
        fill: #ffffff !important;
        font-size: 18px !important;
        font-weight: 700 !important;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    }
    
    /* Grid lines - subtle but visible */
    .fullscreen-mode .recharts-cartesian-grid line {
        stroke: rgba(100, 200, 255, 0.15) !important;
        stroke-width: 1px !important;
    }
    
    /* Legend styling */
    .fullscreen-mode .recharts-legend-wrapper {
        position: relative !important;
        margin: 20px 0 !important;
    }
    
    .fullscreen-mode .recharts-legend-item {
        margin: 0 20px !important;
    }
    
    .fullscreen-mode .recharts-legend-item-text {
        fill: #ffffff !important;
        color: #ffffff !important;
        font-size: 18px !important;
        font-weight: 600 !important;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    }
    
    /* Tooltip styling */
    .fullscreen-mode .recharts-tooltip-wrapper {
        z-index: 10000 !important;
    }
    
    .fullscreen-mode .recharts-default-tooltip {
        background: rgba(0, 0, 0, 0.95) !important;
        border: 2px solid rgba(100, 200, 255, 0.5) !important;
        border-radius: 12px !important;
        padding: 15px 20px !important;
        color: white !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(10px);
    }
    
    .fullscreen-mode .recharts-tooltip-label {
        color: #64c8ff !important;
        font-size: 16px !important;
        font-weight: 700 !important;
        margin-bottom: 8px !important;
    }
    
    .fullscreen-mode .recharts-tooltip-item {
        color: white !important;
        font-size: 15px !important;
        font-weight: 500 !important;
        padding: 4px 0 !important;
    }
    
    /* Exit button overlay */
    .fullscreen-exit-overlay {
        position: fixed;
        top: 30px;
        right: 30px;
        z-index: 10001;
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0%, 100% {
            opacity: 0.8;
            transform: scale(1);
        }
        50% {
            opacity: 1;
            transform: scale(1.05);
        }
    }
    
    .exit-fullscreen-btn {
        background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
        color: white;
        border: 2px solid rgba(255, 255, 255, 0.3);
        padding: 15px 25px;
        border-radius: 12px;
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(255, 65, 108, 0.4);
    }
    
    .exit-fullscreen-btn:hover {
        background: linear-gradient(135deg, #ff4b2b 0%, #ff416c 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(255, 65, 108, 0.6);
    }
    
    .exit-fullscreen-btn svg {
        width: 20px;
        height: 20px;
        stroke-width: 3;
    }
    
    /* Title styling in fullscreen */
    .fullscreen-mode .fullscreen-title {
        text-align: center;
        margin-bottom: 20px;
        animation: fadeInDown 0.6s ease-out;
    }
    
    .fullscreen-mode .fullscreen-title h1 {
        font-size: 3rem;
        font-weight: 800;
        background: linear-gradient(135deg, #64c8ff 0%, #4ade80 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 10px;
        text-shadow: 0 0 30px rgba(100, 200, 255, 0.5);
    }
    
    .fullscreen-mode .fullscreen-title p {
        font-size: 1.5rem;
        color: rgba(255, 255, 255, 0.8);
        font-weight: 500;
    }
    
    @keyframes fadeInDown {
        from {
            opacity: 0;
            transform: translateY(-30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    /* Stats overlay in fullscreen */
    .fullscreen-stats-overlay {
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 30px;
        z-index: 10000;
        animation: fadeInUp 0.6s ease-out 0.3s backwards;
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
    
    .fullscreen-stat-card {
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(10px);
        border: 2px solid rgba(100, 200, 255, 0.3);
        border-radius: 16px;
        padding: 20px 30px;
        text-align: center;
        min-width: 150px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }
    
    .fullscreen-stat-card .stat-value {
        font-size: 2.5rem;
        font-weight: 800;
        margin-bottom: 5px;
    }
    
    .fullscreen-stat-card .stat-label {
        font-size: 1rem;
        color: rgba(255, 255, 255, 0.7);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    
    .stat-current {
        background: linear-gradient(135deg, rgba(100, 200, 255, 0.2) 0%, rgba(74, 222, 128, 0.2) 100%);
    }
    
    .stat-current .stat-value {
        color: #64c8ff;
    }
    
    .stat-target {
        background: linear-gradient(135deg, rgba(255, 107, 53, 0.2) 0%, rgba(255, 115, 0, 0.2) 100%);
    }
    
    .stat-target .stat-value {
        color: #ff6b35;
    }
    
    .stat-efficiency {
        background: linear-gradient(135deg, rgba(74, 222, 128, 0.2) 0%, rgba(34, 197, 94, 0.2) 100%);
    }
    
    .stat-efficiency .stat-value {
        color: #4ade80;
    }
    
    .stat-efficiency.warning {
        background: linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%);
    }
    
    .stat-efficiency.warning .stat-value {
        color: #fbbf24;
    }
    
    .stat-efficiency.danger {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%);
    }
    
    .stat-efficiency.danger .stat-value {
        color: #ef4444;
    }
`;
    const renderChartsView = () => {
        const shiftCharts = chartConfigs.filter(chart => chart.type === 'shift');
        const regularCharts = chartConfigs.filter(chart => chart.type !== 'shift');

        // Calculate stats for fullscreen overlay
       
        
        if (chartConfigs.length === 0) {
            return (
                <div className="text-center py-12 bg-gray-50 rounded">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-xl font-medium text-gray-600 mb-2">No Charts Configured</h3>
                    <p className="text-gray-500">Charts need to be configured in the report designer.</p>
                </div>
            );
        }

        // If there are shift charts, render them with fullscreen capability
        if (shiftCharts.length > 0) {
            return (
                <div className={`shift-charts-container ${isFullscreenMode ? 'fullscreen-mode' : ''}`}>
                    {/* ✅ FULLSCREEN EXIT BUTTON - Only show in fullscreen mode */}
                    {isFullscreenMode && (
                        <div className="fullscreen-exit-overlay">
                            <button
                                onClick={handleExitFullscreen}
                                className="exit-fullscreen-btn"
                                title="Click to exit fullscreen"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                                Exit Fullscreen
                            </button>
                        </div>
                    )}

                    {/* ✅ SHIFT CONTROLS - Hide in fullscreen mode */}
                    {!isFullscreenMode && (
                        <>
                            {/* Shift Period Selector */}
                            <div className="mb-6 flex justify-center items-center gap-4 bg-white p-4 rounded-lg shadow">
                                <label className="font-medium text-gray-700">View Period:</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSelectedShiftPeriod('current')}
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedShiftPeriod === 'current'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Current Shift ({getCurrentShift()})
                                    </button>
                                    <button
                                        onClick={() => setSelectedShiftPeriod('A')}
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedShiftPeriod === 'A'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Shift A
                                    </button>
                                    <button
                                        onClick={() => setSelectedShiftPeriod('B')}
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedShiftPeriod === 'B'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Shift B
                                    </button>
                                    <button
                                        onClick={() => setSelectedShiftPeriod('C')}
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedShiftPeriod === 'C'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Shift C
                                    </button>
                                    <button
                                        onClick={() => setSelectedShiftPeriod('fullday')}
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedShiftPeriod === 'fullday'
                                                ? 'bg-green-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Full Day (24h)
                                    </button>
                                </div>
                            </div>

                            {/* Timer Indicator */}
                            <div className="mb-4 text-center">
                                <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                    🕐 Switching to fullscreen in 2 minutes
                                </div>
                            </div>
                        </>
                    )}
                    



                    {/* Render shift charts */}
                    {shiftCharts.map((chart, index) => (
                        <div key={`${chart.id}-${index}`} className={`shift-chart-container ${isFullscreenMode ? 'chart-fullscreen' : 'mb-8'}`}>
                            <ReportCharts
                                data={chartData}
                                metrics={chart.metrics}
                                type={chart.type}
                                xField={chart.xField}
                                submissionId="submissionId"
                                title={chart.title || `Shift Production Chart ${index + 1}`}
                                comboConfig={chart.comboConfig}
                                calculatedFields={calculatedFields}
                                selectedShiftPeriod={selectedShiftPeriod}
                                currentShift1={getCurrentShift()}
                                showConfiguration={false}
                                shiftConfigs={chart.shiftConfigs}
                                isFullscreenMode={isFullscreenMode}
                                // ✅ Pass fullscreen state to chart
                            />
                        </div>
                    ))}

                    {/* Regular charts - Hide in fullscreen mode */}
                    {!isFullscreenMode && regularCharts.length > 0 && (
                        <div className="mt-12 pt-8 border-t-2">
                            <h3 className="text-xl font-semibold mb-4 text-gray-800">Additional Charts</h3>
                            <div className="charts-grid space-y-6">
                                {regularCharts.map((chart, index) => (
                                    <div key={`${chart.id}-${index}`} className="chart-container">
                                        <ReportCharts
                                            data={chartData}
                                            metrics={chart.metrics}
                                            type={chart.type}
                                            xField={chart.xField}
                                            submissionId="submissionId"
                                            title={chart.title || `Chart ${index + 1}`}
                                            comboConfig={chart.comboConfig}
                                            calculatedFields={calculatedFields}
                                            shiftConfigs={chart.shiftConfigs}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // Regular charts rendering (no shift charts)
        return (
            <div className="charts-grid space-y-6">
                {chartConfigs.map((chart, index) => (
                    <div key={`${chart.id}-${index}`} className="chart-container">
                        <ReportCharts
                            data={chartData}
                            metrics={chart.metrics}
                            type={chart.type}
                            xField={chart.xField}
                            submissionId="submissionId"
                            title={chart.title || `Chart ${index + 1}`}
                            comboConfig={chart.comboConfig}
                            calculatedFields={calculatedFields}
                            shiftConfigs={chart.shiftConfigs}
                        />
                    </div>
                ))}
            </div>
        );
    };


    const shiftChartStyles = `
.shift-charts-fullscreen {
    width: 100%;
    min-height: 100vh;
}

.shift-chart-fullscreen-container {
    width: 100%;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    padding: 24px;
}

@media print {
    .shift-chart-fullscreen-container {
        page-break-inside: avoid;
        page-break-after: always;
    }
}
`;

    const DataInspector = ({ data, title = "Data Inspector" }) => {
        const [isExpanded, setIsExpanded] = useState(false);

        if (!data || data.length === 0) return null;

        return (
            <div className="mb-4 border rounded">
                <div
                    className="p-2 bg-gray-100 cursor-pointer flex justify-between items-center"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <span className="font-medium">{title} ({data.length} items)</span>
                    <span>{isExpanded ? '▼' : '▶'}</span>
                </div>
                {isExpanded && (
                    <div className="p-3 text-xs">
                        <div className="mb-2"><strong>Sample Item Keys:</strong></div>
                        <div className="bg-gray-50 p-2 rounded mb-2">
                            {Object.keys(data[0] || {}).join(', ')}
                        </div>
                        <div className="mb-2"><strong>First Item:</strong></div>
                        <pre className="bg-gray-50 p-2 rounded overflow-x-auto text-xs">
                            {JSON.stringify(data[0], null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        );
    };

    const renderDashboardView = () => {
        const shiftCharts = chartConfigs.filter(chart => chart.type === 'shift');

        // If shift charts exist, automatically switch to charts view
        if (shiftCharts.length > 0) {
            return renderChartsView();
        }

        // Original dashboard view code for non-shift charts
        if (chartConfigs.length === 0) {
            return renderChartsView();
        }

        return (
            <div className="dashboard-container">
                <div className="mb-6">
                    {renderSummaryStats()}
                </div>
                <DataInspector data={chartData} title="Chart Data" />

                <div className="grid grid-cols-12 gap-4 auto-rows-min">
                    {chartConfigs.map((chart, index) => (
                        <div
                            key={chart.id || index}
                            className="dashboard-chart-item"
                            style={{
                                gridColumn: `span ${chart.position?.width || 6}`,
                                minHeight: `${(chart.position?.height || 6) * 40}px`
                            }}
                        >
                            <ReportCharts
                                data={chartData}
                                metrics={chart.metrics}
                                type={chart.type}
                                xField={chart.xField || "Date"} // Ensure date field is passed
                                title={chart.title || `Shift Production Chart ${index + 1}`}
                                comboConfig={chart.comboConfig}
                                calculatedFields={calculatedFields}
                                selectedShiftPeriod={selectedShiftPeriod}
                                currentShift={getCurrentShift()}
                                showConfiguration={false}
                                // ✅ CRITICAL FIX: Pass shiftConfigs here too!
                                shiftConfigs={chart.shiftConfigs}
                            />
                        </div>
                    ))}
                </div>

                {reportData.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-3">📋 Data Summary</h3>
                        <div className="overflow-x-auto">
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        {selectedFields.slice(0, 5).map((field, i) => {
                                            const label = typeof field === 'object' ? field.label : field;
                                            return <th key={i}>{label}</th>;
                                        })}
                                        {selectedFields.length > 5 && <th>...</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.slice(0, 10).map((row, i) => (
                                        <tr key={i}>
                                            {selectedFields.slice(0, 5).map((field, j) => {
                                                const fLabel = typeof field === 'object' ? field.label : field;
                                                const fieldData = row.data?.find(d => d.fieldLabel === fLabel);
                                                return <td key={j}>{formatCellValue(fieldData?.value, field)}</td>;
                                            })}
                                            {selectedFields.length > 5 && <td className="text-gray-400">...</td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {reportData.length > 10 && (
                                <div className="text-center py-2 text-gray-500 text-sm">
                                    ... and {reportData.length - 10} more rows
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderActiveFilters = () => {
        const active = filters
            .filter(f => runtimeFilters[f.fieldLabel] && runtimeFilters[f.fieldLabel] !== "")
            .map(f => {
                const val = runtimeFilters[f.fieldLabel];
                const label = fields.find(x => x.id === f.fieldLabel)?.label || f.fieldLabel;
                return `${label}: ${val}`;
            });

        if (active.length === 0) return null;

        return (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded shadow-sm">
                <div className="font-medium mb-1">Active Filters:</div>
                <ul className="list-disc ml-5 text-sm">
                    {active.map((text, i) => <li key={i}>{text}</li>)}
                </ul>
            </div>
        );
    };

    const summaryRowsCSS = `
.summary-divider {
    background: linear-gradient(to right, #f3f4f6, #e5e7eb);
}

.summary-divider-cell {
    padding: 12px 16px !important;
    text-align: center;
    border-top: 2px solid #d1d5db;
    border-bottom: 1px solid #d1d5db;
}

.summary-divider-line {
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    color: #374151;
}

.summary-divider-line::before,
.summary-divider-line::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #9ca3af;
    margin: 0 16px;
}

.summary-row {
    background: #fef3c7 !important;
    font-weight: 500;
}

.summary-row:hover {
    background: #fde68a !important;
}

.summary-label {
    padding: 12px 16px;
    border-right: 1px solid #d97706;
    vertical-align: top;
}

.summary-type {
    font-size: 0.75rem;
    color: #92400e;
    font-weight: normal;
    margin-top: 2px;
}

.summary-value {
    padding: 12px 16px;
    position: relative;
}

.summary-result {
    font-size: 1.1em;
    font-weight: 600;
    color: #1f2937;
}

.summary-formula {
    font-size: 0.75rem;
    color: #6b7280;
    font-family: 'Courier New', monospace;
    margin-top: 4px;
}
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-fadeIn {
    animation: fadeIn 0.3s ease-in-out;
}
`;

    const processCalculatedFields = (reportData, calculatedFields, fields) => {
        console.log('=== PROCESS CALCULATED FIELDS DEBUG ===');
        console.log('calculatedFields:', calculatedFields);
        console.log('fields:', fields);
        if (!calculatedFields || calculatedFields.length === 0) {
            return {
                processedData: reportData,
                summaryRows: []
            };
        }

        const processedData = [];
        const summaryRows = [];

        // Filter out column-wise fields from being added to row data
        const rowwiseFields = calculatedFields.filter(cf => cf.calculationType !== 'columnwise');
        const columnwiseFields = calculatedFields.filter(cf => cf.calculationType === 'columnwise');

        console.log('rowwiseFields:', rowwiseFields);
        console.log('columnwiseFields:', columnwiseFields);

        for (const row of reportData) {
            const newRow = { ...row };
            const calculatedData = [];

            // Only process non-column-wise calculated fields for row data
            for (const calcField of rowwiseFields) {
                const calculatedValue = evaluateCalculatedField(calcField, row.data, reportData, fields);

                calculatedData.push({
                    fieldLabel: calcField.label,
                    value: formatCalculatedValue(calculatedValue, calcField),
                    fieldType: 'calculated'
                });
            }

            newRow.data = [...(newRow.data || []), ...calculatedData];
            processedData.push(newRow);
        }

        // Process column-wise fields for summary rows only
        for (const calcField of columnwiseFields) {
            const summaryValue = calculateColumnwiseSummary(calcField, reportData, fields);
            summaryRows.push({
                label: calcField.label,
                value: formatCalculatedValue(summaryValue, calcField),
                type: calcField.functionType || 'CALCULATION',
                formula: calcField.formula
            });
        }

        return { processedData, summaryRows };
    };

    const renderExpandedTableWithSummary = (reportData, summaryRows, selectedFields, fields) => {
        // Filter selectedFields to exclude any column-wise calculated fields
        const displayFields = selectedFields.filter(field => {
            if (typeof field === 'object' && field.type === 'calculated') {
                // Check if this calculated field is column-wise
                const calcField = calculatedFields.find(cf => cf.label === field.label);
                return !calcField || calcField.calculationType !== 'columnwise';
            }
            return true;
        });

        return (
            <>
                <style>{summaryRowsCSS}</style>
                <div className="table-container">
                    <table className="report-table">
                        <thead>
                            <tr>
                                {displayFields.map((field, i) => {
                                    const label = typeof field === 'object' ? field.label : field;
                                    const cleanedLabel = label.includes("→")
                                        ? label.split("→").pop().trim()
                                        : label;

                                    return <th key={i}>{cleanedLabel}</th>;
                                })}
                            </tr>
                        </thead>

                        <tbody>
                            {reportData.map((row, i) => (
                                <tr key={i}>
                                    {displayFields.map((field, j) => {
                                        const fLabel = typeof field === 'object' ? field.label : field;
                                        const fieldData = row.data?.find(d => d.fieldLabel === fLabel);
                                        return <td key={j}>{formatCellValue(fieldData?.value, field)}</td>;
                                    })}
                                </tr>
                            ))}

                            {summaryRows.length > 0 && (
                                <>
                                    <tr className="summary-divider">
                                        <td colSpan={displayFields.length} className="summary-divider-cell">
                                            <div className="summary-divider-line">
                                                <span>Summary & Totals</span>
                                            </div>
                                        </td>
                                    </tr>

                                    {summaryRows.map((summaryRow, index) => (
                                        <tr key={`summary-${index}`} className="summary-row">
                                            <td className="summary-label">
                                                <strong>{summaryRow.label}</strong>
                                                <div className="summary-type">{summaryRow.type.toUpperCase()}</div>
                                            </td>
                                            <td className="summary-value" colSpan={displayFields.length - 1}>
                                                <span className="summary-result">{summaryRow.value}</span>
                                                <div className="summary-formula">{summaryRow.formula}</div>
                                            </td>
                                        </tr>
                                    ))}
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </>
        );
    };

    const evaluateCalculatedField = (calcField, rowData, allReportData, fields) => {
        const { formula, calculationType, functionType } = calcField;

        try {
            switch (calculationType) {
                case 'rowwise':
                    return evaluateRowwiseCalculation(formula, rowData, functionType, fields);

                case 'aggregate':
                    return evaluateAggregateCalculation(formula, allReportData, functionType, fields);

                case 'columnwise':
                    // For column-wise, we don't calculate per row, only in summary
                    return 0;

                case 'grouping':
                    return evaluateGroupingCalculation(formula, rowData, allReportData, functionType, fields);

                default:
                    return evaluateRowwiseCalculation(formula, rowData, functionType, fields);
            }
        } catch (error) {
            console.error('Calculated field evaluation error:', error);
            return 'Error';
        }
    };

    const evaluateExpression = (expression, rowData, fields) => {
        try {
            // Replace field references with actual values
            let processedExpression = expression;

            // Find all field references in quotes
            const fieldMatches = expression.match(/"([^"]+)"/g);
            if (fieldMatches) {
                fieldMatches.forEach(match => {
                    const fieldName = match.replace(/"/g, '');
                    const value = getFieldValue(fieldName, rowData, fields);
                    // Replace the quoted field reference with the numeric value
                    processedExpression = processedExpression.replace(match, value.toString());
                });
            }

            // Clean up the expression - remove any EXPRESSION() wrapper if present
            if (processedExpression.startsWith('EXPRESSION(') && processedExpression.endsWith(')')) {
                processedExpression = processedExpression.slice(11, -1);
            }

            // Handle mathematical functions
            processedExpression = processedExpression
                .replace(/sqrt\(/g, 'Math.sqrt(')
                .replace(/abs\(/g, 'Math.abs(')
                .replace(/round\(/g, 'Math.round(')
                .replace(/floor\(/g, 'Math.floor(')
                .replace(/ceil\(/g, 'Math.ceil(')
                .replace(/pow\(/g, 'Math.pow(')
                .replace(/max\(/g, 'Math.max(')
                .replace(/min\(/g, 'Math.min(')
                .replace(/\^/g, '**'); // Convert ^ to ** for exponentiation

            // Handle IF statements - simple IF(condition, trueValue, falseValue)
            const ifMatches = processedExpression.match(/IF\(([^,]+),([^,]+),([^)]+)\)/g);
            if (ifMatches) {
                ifMatches.forEach(ifMatch => {
                    const parts = ifMatch.slice(3, -1).split(',');
                    if (parts.length === 3) {
                        const condition = parts[0].trim();
                        const trueValue = parts[1].trim();
                        const falseValue = parts[2].trim();

                        // Evaluate the condition
                        const conditionResult = Function('"use strict"; return (' + condition + ')')();
                        const result = conditionResult ?
                            Function('"use strict"; return (' + trueValue + ')')() :
                            Function('"use strict"; return (' + falseValue + ')')();

                        processedExpression = processedExpression.replace(ifMatch, result.toString());
                    }
                });
            }

            // Safely evaluate the mathematical expression
            const result = Function('"use strict"; return (' + processedExpression + ')')();

            // Check if result is a valid number
            if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
                return result;
            }

            return 0;
        } catch (error) {
            console.error('Expression evaluation error:', error, 'Expression:', expression);
            return 0;
        }
    };

    const evaluateRowwiseCalculation = (formula, rowData, functionType, fields) => {
        // Handle EXPRESSION type
        if (functionType === 'EXPRESSION') {
            return evaluateExpression(formula, rowData, fields);
        }

        // Handle other function types (existing logic)
        const fieldRefs = extractFieldReferences(formula);
        const values = fieldRefs.map(fieldName => {
            return getFieldValue(fieldName, rowData, fields);
        });

        switch (functionType) {
            case 'ADD':
                return values.reduce((sum, val) => sum + val, 0);
            case 'SUBTRACT':
                return values.length >= 2 ? values[0] - values[1] : 0;
            case 'MULTIPLY':
                return values.reduce((product, val) => product * val, 1);
            case 'DIVIDE':
                return values.length >= 2 && values[1] !== 0 ? values[0] / values[1] : 0;
            case 'PERCENTAGE':
                return values.length >= 2 && values[1] !== 0 ? (values[0] / values[1]) * 100 : 0;
            case 'EFFICIENCY':
                if (values.length >= 3) {
                    return ((values[0] / values[1]) / values[2]) * 100;
                }
                return 0;
            case 'CONCATENATE':
                return fieldRefs.map(fieldName => {
                    const fieldData = rowData.find(d => d.fieldLabel === fieldName);
                    return fieldData?.value || '';
                }).join(' ');
            default:
                return values.reduce((sum, val) => sum + val, 0);
        }
    };

    const evaluateAggregateCalculation = (formula, allReportData, functionType, fields) => {
        const fieldRefs = extractFieldReferences(formula);
        if (fieldRefs.length === 0) return 0;

        const fieldName = fieldRefs[0];
        const allValues = allReportData.map(row => {
            return getFieldValue(fieldName, row.data, fields);
        }).filter(val => val !== "—" && !isNaN(val) && val !== null && val !== undefined && val !== '');

        switch (functionType) {
            case 'SUM':
                return allValues.reduce((sum, val) => sum + val, 0);
            case 'AVG':
                return allValues.length > 0 ? allValues.reduce((sum, val) => sum + val, 0) / allValues.length : 0;
            case 'MIN':
                return allValues.length > 0 ? Math.min(...allValues) : 0;
            case 'MAX':
                return allValues.length > 0 ? Math.max(...allValues) : 0;
            case 'COUNT':
                return allValues.length;
            case 'COUNT_DISTINCT':
                return [...new Set(allValues)].length;
            default:
                return allValues.reduce((sum, val) => sum + val, 0);
        }
    };

    const evaluateGroupingCalculation = (formula, currentRowData, allReportData, functionType, fields) => {
        const fieldRefs = extractFieldReferences(formula);

        switch (functionType) {
            case 'GROUP_SUM':
                if (fieldRefs.length >= 2) {
                    const [valueField, groupField] = fieldRefs;
                    const currentGroupValue = getFieldValue(groupField, currentRowData, fields);

                    const groupRows = allReportData.filter(row =>
                        getFieldValue(groupField, row.data, fields) === currentGroupValue
                    );

                    return groupRows.reduce((sum, row) =>
                        sum + getFieldValue(valueField, row.data, fields), 0
                    );
                }
                return 0;
            case 'EFFICIENCY':
                return evaluateRowwiseCalculation(formula, currentRowData, functionType, fields);
            default:
                return 0;
        }
    };

    const calculateColumnwiseSummary = (calcField, allReportData, fields) => {
        const { formula, functionType, calculationType } = calcField;

        // Handle EXPRESSION type for column-wise calculations
        if (functionType === 'EXPRESSION') {
            return evaluateColumnwiseExpression(formula, allReportData, fields);
        }

        // Handle predefined functions
        const fieldRefs = extractFieldReferences(formula);
        if (fieldRefs.length === 0) return 0;

        const fieldName = fieldRefs[0];

        console.log(fieldName)
        const allValues = allReportData.map(row => getFieldValue(fieldName, row.data, fields))
            .filter(val => !isNaN(val) && val !== null && val !== undefined);

        console.log("Values", allValues)
        switch (functionType) {
            case 'SUM':
            case 'RUNNING_TOTAL':
                return allValues.reduce((sum, val) => sum + val, 0);

            case 'AVG':
            case 'CUMULATIVE_AVG':
                if (allValues.length === 0) return 0;
                const sum = allValues.reduce((sum, val) => sum + val, 0);
                return sum / allValues.length;

            case 'COUNT':
                return allValues.length;

            case 'MIN':
                return allValues.length > 0 ? Math.min(...allValues) : 0;

            case 'MAX':
                return allValues.length > 0 ? Math.max(...allValues) : 0;

            case 'PERCENT_OF_TOTAL':
                return 100; // This represents the total percentage

            case 'RANK':
                // For ranking in summary, show the count of ranked items
                return allValues.length;

            case 'MOVING_AVG':
                // For moving average summary, return overall average
                if (allValues.length === 0) return 0;
                return allValues.reduce((sum, val) => sum + val, 0) / allValues.length;

            case 'DIFFERENCE':
                // For difference summary, return total change from first to last
                if (allValues.length < 2) return 0;
                return allValues[allValues.length - 1] - allValues[0];

            default:
                return allValues.reduce((sum, val) => sum + val, 0);
        }
    };

    const evaluateColumnwiseExpression = (expression, allReportData, fields) => {
        try {
            // For column-wise expressions, we need to aggregate the data first
            let processedExpression = expression;

            // Remove EXPRESSION wrapper if present
            if (processedExpression.startsWith('EXPRESSION(') && processedExpression.endsWith(')')) {
                processedExpression = processedExpression.slice(11, -1);
            }

            // Find field references and replace with aggregated values
            const fieldMatches = expression.match(/"([^"]+)"/g);
            if (fieldMatches) {
                fieldMatches.forEach(match => {
                    const fieldName = match.replace(/"/g, '');

                    // Get all values for this field
                    const allValues = allReportData.map(row => getFieldValue(fieldName, row.data, fields))
                        .filter(val => !isNaN(val) && val !== null && val !== undefined);

                    // For column-wise, we typically want the sum unless specified otherwise
                    const aggregatedValue = allValues.reduce((sum, val) => sum + val, 0);

                    processedExpression = processedExpression.replace(match, aggregatedValue.toString());
                });
            }

            // Handle mathematical functions
            processedExpression = processedExpression
                .replace(/sqrt\(/g, 'Math.sqrt(')
                .replace(/abs\(/g, 'Math.abs(')
                .replace(/round\(/g, 'Math.round(')
                .replace(/floor\(/g, 'Math.floor(')
                .replace(/ceil\(/g, 'Math.ceil(')
                .replace(/pow\(/g, 'Math.pow(')
                .replace(/max\(/g, 'Math.max(')
                .replace(/min\(/g, 'Math.min(')
                .replace(/\^/g, '**');

            // Handle special column functions
            processedExpression = processedExpression.replace(/AVG\(([^)]+)\)/g, (match, fieldRef) => {
                const cleanFieldRef = fieldRef.replace(/"/g, '');
                const allValues = allReportData.map(row => getFieldValue(cleanFieldRef, row.data, fields))
                    .filter(val => !isNaN(val));
                const avg = allValues.length > 0 ? allValues.reduce((sum, val) => sum + val, 0) / allValues.length : 0;
                return avg.toString();
            });

            processedExpression = processedExpression.replace(/COUNT\(([^)]+)\)/g, (match, fieldRef) => {
                const cleanFieldRef = fieldRef.replace(/"/g, '');
                const allValues = allReportData.map(row => getFieldValue(cleanFieldRef, row.data, fields))
                    .filter(val => val !== null && val !== undefined);
                return allValues.length.toString();
            });

            // Handle IF statements
            const ifMatches = processedExpression.match(/IF\(([^,]+),([^,]+),([^)]+)\)/g);
            if (ifMatches) {
                ifMatches.forEach(ifMatch => {
                    const parts = ifMatch.slice(3, -1).split(',');
                    if (parts.length === 3) {
                        const condition = parts[0].trim();
                        const trueValue = parts[1].trim();
                        const falseValue = parts[2].trim();

                        try {
                            const conditionResult = Function('"use strict"; return (' + condition + ')')();
                            const result = conditionResult ?
                                Function('"use strict"; return (' + trueValue + ')')() :
                                Function('"use strict"; return (' + falseValue + ')')();

                            processedExpression = processedExpression.replace(ifMatch, result.toString());
                        } catch (e) {
                            console.error('IF evaluation error:', e);
                            processedExpression = processedExpression.replace(ifMatch, '0');
                        }
                    }
                });
            }

            // Safely evaluate the expression
            const result = Function('"use strict"; return (' + processedExpression + ')')();

            if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
                return result;
            }

            return 0;
        } catch (error) {
            console.error('Column-wise expression evaluation error:', error, 'Expression:', expression);
            return 0;
        }
    };

    const extractFieldReferences = (formula) => {
        const regex = /"([^"]+)"/g;
        const matches = [];
        let match;

        while ((match = regex.exec(formula)) !== null) {
            matches.push(match[1]);
        }

        return matches;
    };

    const getFieldValue = (fieldName, rowData, fields) => {
        if (!rowData || !Array.isArray(rowData)) return 0;

        const fieldData = rowData.find(d => {
            if (d.fieldLabel === fieldName) return true;

            const field = fields.find(f => f.label === fieldName);
            if (field && d.fieldLabel === field.id) return true;

            if (field && field.id.includes(':')) {
                const baseFieldId = field.id.split(':')[0];
                return d.fieldLabel === baseFieldId;
            }

            return false;
        });

        if (!fieldData) return 0;

        let value = fieldData.value;

        // Handle empty, null, undefined, or '-' values as 0
        if (value === '-' || value === '' || value === null || value === undefined) {
            return 0;
        }

        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                const columnName = fieldName.includes('→') ?
                    fieldName.split('→').pop().trim() : fieldName;

                if (typeof parsed[0] === 'object' && parsed[0][columnName] !== undefined) {
                    return parsed.reduce((sum, row) => {
                        const val = parseFloat(row[columnName]) || 0;
                        return sum + val;
                    }, 0);
                }

                return parsed.reduce((sum, val) => {
                    const numVal = parseFloat(val);
                    return sum + (isNaN(numVal) ? 0 : numVal);
                }, 0);
            }

            const numValue = parseFloat(parsed);
            return isNaN(numValue) ? 0 : numValue;
        } catch (e) {
            const numValue = parseFloat(value);
            return isNaN(numValue) ? 0 : numValue;
        }
    };


    const formatCalculatedValue = (value, calcField) => {
        if (value === null || value === undefined || isNaN(value)) {
            console.log('Invalid calculated value:', value, 'for field:', calcField.label);
            return "0"; // Return "0" instead of "Error" to ensure numeric parsing works
        }

        const { format, precision = 2 } = calcField;

        switch (format) {
            case 'currency':
                return value.toFixed(precision); // Remove currency symbol for charts
            case 'percentage':
                return value.toFixed(precision); // Remove % symbol for charts, add it in display
            case 'integer':
                return Math.round(value).toString();
            case 'decimal':
            default:
                return value.toFixed(precision);
        }
    };

    if (loading) return <LoadingDots />;

    if (error) return <div className="error">{error}</div>;

    return (
        <>
            <style>{shiftChartStyles}</style>
            <style>{fullscreenStyles}</style>
            <div className="report-viewer-wrapper">
                {!isFullscreenMode && (
                    <>
                        <h2 className="viewer-heading">📊 Enhanced Report Viewer</h2>

                        {filters.length > 0 && (
                            <div className="filter-section mb-6 bg-white p-4 rounded shadow">
                                <h3 className="font-semibold mb-3 text-gray-800">🔍 Apply Filters</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filters.map((filter, idx) => {
                                        const field = fields.find(f => f.id === filter.fieldLabel || f.label === filter.fieldLabel);

                                        if (filter.operator === "between" && filter.type === "date") {
                                            const [start, end] = (runtimeFilters[filter.fieldLabel] || "").split(",") || ["", ""];
                                            return (
                                                <div key={idx} className="flex flex-col">
                                                    <label className="text-sm font-medium text-gray-700 mb-1">
                                                        {field?.label || filter.fieldLabel} (From - To)
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="date"
                                                            value={start || ""}
                                                            onChange={(e) => {
                                                                const newStart = e.target.value;
                                                                setRuntimeFilters(prev => ({
                                                                    ...prev,
                                                                    [filter.fieldLabel]: `${newStart},${end || ""}`
                                                                }));
                                                            }}
                                                            className="border px-2 py-1 rounded flex-1"
                                                        />
                                                        <input
                                                            type="date"
                                                            value={end || ""}
                                                            onChange={(e) => {
                                                                const newEnd = e.target.value;
                                                                setRuntimeFilters(prev => ({
                                                                    ...prev,
                                                                    [filter.fieldLabel]: `${start || ""},${newEnd}`
                                                                }));
                                                            }}
                                                            className="border px-2 py-1 rounded flex-1"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Check if filter has options (dropdown field)
                                        if (filter.options && filter.options.length > 0) {
                                            return (
                                                <div key={idx} className="flex flex-col">
                                                    <label className="text-sm font-medium text-gray-700 mb-1">
                                                        {field?.label || filter.fieldLabel}
                                                    </label>
                                                    <select
                                                        value={runtimeFilters[filter.fieldLabel] || ""}
                                                        onChange={(e) =>
                                                            setRuntimeFilters(prev => ({
                                                                ...prev,
                                                                [filter.fieldLabel]: e.target.value
                                                            }))
                                                        }
                                                        className="border px-2 py-1 rounded bg-white"
                                                    >
                                                        <option value="">-- Select an option --</option>
                                                        {filter.options.map((option, optionIdx) => (
                                                            <option key={optionIdx} value={option}>
                                                                {option}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            );
                                        }

                                        // Default text input for other filter types
                                        return (
                                            <div key={idx} className="flex flex-col">
                                                <label className="text-sm font-medium text-gray-700 mb-1">
                                                    {field?.label || filter.fieldLabel}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={runtimeFilters[filter.fieldLabel] || ""}
                                                    onChange={(e) =>
                                                        setRuntimeFilters(prev => ({
                                                            ...prev,
                                                            [filter.fieldLabel]: e.target.value
                                                        }))
                                                    }
                                                    className="border px-2 py-1 rounded"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 text-right">
                                    <button
                                        onClick={fetchFilteredReport}
                                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                    >
                                        ▶️ Run Report
                                    </button>
                                    {Object.keys(runtimeFilters).length > 0 && (
                                        <button
                                            onClick={() => {
                                                setRuntimeFilters({});
                                                fetchFilteredReport();
                                            }}
                                            className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded text-sm font-medium mb-4 ml-2"
                                        >
                                            🧹 Clear All Filters
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {renderActiveFilters()}
                        {renderSummaryStats()}
                        {renderViewControls()}
                    </>
                )}
                <div className="main-content">
                    {displayMode === "table" ? (
                        viewMode === "expanded" ? renderExpandedTable() : renderGroupedTable()
                    ) : displayMode === "charts" ? (
                        renderChartsView()
                    ) : (
                        renderDashboardView()
                    )}
                </div>
            </div>
        </>
    );
}