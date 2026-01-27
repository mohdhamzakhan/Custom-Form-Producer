import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { processGroupedData, applyRowLevelCalculations } from './groupingDataProcessor';  // ADD THIS
import ReportCharts from "./ReportCharts";
import { APP_CONSTANTS } from "./store";
import "../report_viewer_styles.css";
import LoadingDots from './LoadingDots';
import * as XLSX from 'xlsx';


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
    const [selectedShiftPeriod, setSelectedShiftPeriod] = useState("current");
    const [lastRefreshTime, setLastRefreshTime] = useState(new Date());
    const [maximizedChart, setMaximizedChart] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false); // Add this state
    const [groupingConfig, setGroupingConfig] = useState([]);  // ADD THIS
    const [isGrouped, setIsGrouped] = useState(false);         // ADD THIS
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        // Initialize from localStorage
        const saved = localStorage.getItem('darkMode');
        return saved === 'true';
    });
    const [isExporting, setIsExporting] = useState(false);
    const [showBlankRows, setShowBlankRows] = useState(false);

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

    console.log('🚀 REPORT VIEWER LOADED - calculatedFields:', calculatedFields);


    useEffect(() => {
        const savedMode = localStorage.getItem('darkMode');
        if (savedMode === 'true') {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark');
        }
    }, []);

    useEffect(() => {
        console.log('🎨 Dark mode changed:', isDarkMode); // Debug log

        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            document.documentElement.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
            document.documentElement.classList.remove('dark-mode');
        }
    }, [isDarkMode]);

    const toggleDarkMode = () => {
        console.log('🔄 Toggling dark mode from:', isDarkMode); // Debug log

        setIsDarkMode(prev => {
            const newMode = !prev;
            console.log('✅ New dark mode:', newMode); // Debug log
            localStorage.setItem('darkMode', newMode.toString());
            return newMode;
        });
    };


    useEffect(() => {
        const fetchTemplate = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${APP_CONSTANTS.API_BASE_URL}/api/reports/template/${templateId}`);
                setTemplate(res.data);
                console.log('📋 TEMPLATE LOADED - calculatedFields:', res.data.calculatedFields);
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
                    visible: f.visible || false
                }));

                console.log("Resolved", resolvedFields)

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

                const loadedGroupingConfig = res.data.groupingConfig || [];
                setGroupingConfig(res.data.groupingConfig || []);
                setIsGrouped((res.data.groupingConfig || []).length > 0);
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

    // Add this effect to refetch data when shift period changes
    useEffect(() => {
        const hasShiftChart = chartConfigs.some(chart => chart.type === 'shift');
        if (hasShiftChart && chartConfigs.length > 0) {
            fetchFilteredReport(true);
        }
    }, [selectedShiftPeriod, selectedDate]);


    useEffect(() => {
        const hasShiftChart = chartConfigs.some(chart => chart.type === 'shift');

        if (hasShiftChart && chartConfigs.length > 0) {
            console.log('🔄 Setting up optimized auto-refresh for shift charts');

            let intervalId;

            // Immediate fetch when dependencies change
            fetchFilteredReport(true);

            // Set up auto-refresh interval  
            intervalId = setInterval(() => {
                console.log('🔄 Auto-refreshing shift chart data...');
                fetchFilteredReport(true);
            }, 100000); // Reduced to 10 seconds for better performance

            return () => {
                console.log('🛑 Clearing auto-refresh interval');
                if (intervalId) {
                    clearInterval(intervalId);
                }
            };
        }
    }, [chartConfigs.length, selectedShiftPeriod]); // Only essential dependencies

    useEffect(() => {
        const shiftCharts = chartConfigs.filter(chart => chart.type === 'shift');

        if (shiftCharts.length > 0 && !maximizedChart) {
            console.log('🔍 Auto-maximizing first shift chart');
            // Auto-maximize the first shift chart
            setMaximizedChart(shiftCharts[0].id);
        }
    }, [chartConfigs]);

    const fetchFilteredReport = async (silent = false) => {
        // Prevent overlapping calls
        if (isRefreshing) {
            console.log('⏭️ Skipping fetch - already refreshing');
            return;
        }

        try {
            setIsRefreshing(true);

            if (!silent) {
                setLoading(true);
            }

            console.log('=== FETCH FILTERED REPORT DEBUG ===');
            console.log('calculatedFields state:', calculatedFields);
            console.log('fields state:', fields);

            // Check if we have shift charts
            const hasShiftChart = chartConfigs.some(chart => chart.type === 'shift');

            let res;
            if (hasShiftChart) {
                res = await axios.post(
                    `${APP_CONSTANTS.API_BASE_URL}/api/reports/run-shift/${templateId}`,
                    {
                        shiftPeriod: selectedShiftPeriod,
                        date: selectedDate
                    }
                );
                console.log('📊 RAW REPORT DATA:', res.data.length, 'rows');

                console.log('📊 RAW Shift report data length:', res.data.length); // ✅ ADD THIS
                console.log('📊 Sample data:', res.data.slice(0, 3)); // ✅ ADD THIS

                const { processedData, summaryRows } = processCalculatedFields(
                    res.data,
                    calculatedFields,
                    fields  // This should include ALL fields, not just visible ones
                );

                console.log('✅ PROCESSED data length:', processedData.length); // ✅ ADD THIS

                setReportData(processedData);
                setSummaryRows(summaryRows);
                setLastRefreshTime(new Date());
                setRefreshTrigger(prev => prev + 1); // ✅ ADD THIS LINE
            }

            else {
                // Use regular endpoint
                res = await axios.post(
                    `${APP_CONSTANTS.API_BASE_URL}/api/reports/run/${templateId}`,
                    runtimeFilters
                );

                const { processedData, summaryRows } = processCalculatedFields(
                    res.data,
                    calculatedFields,
                    fields  // This should include ALL fields, not just visible ones
                );


                setReportData(processedData);
                setSummaryRows(summaryRows);

            }

        } catch (err) {
            console.error('❌ Failed to run filtered report:', err);
            setError("Failed to run filtered report: " + (err.message || "Unknown error"));
        } finally {
            setIsRefreshing(false);
            if (!silent) {
                setLoading(false);
            }
        }
    };

    const fetchFilteredReport1 = async () => {
        try {
            //setLoading(true); // Show loading
            setIsRefreshing(true); // Additional loading state
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
            //setLoading(false); // Hide loading
            setIsRefreshing(false); // Hide additional loading state
        }
        finally {
            //setLoading(false); // Hide loading
            setIsRefreshing(false); // Hide additional loading state
        }
    };

    const chartData = useMemo(() => {
        if (!reportData || reportData.length === 0) return [];
        console.log('=== CHART DATA TRANSFORMATION DEBUG ===');
        console.log('reportData:', reportData)

        const hasShiftChart = chartConfigs.some(chart => chart.type === 'shift');

        if (hasShiftChart && reportData[0]?.Count !== undefined && reportData[0]?.Date !== undefined) {
            console.log('✅ Processing shift chart data');

            // For shift charts, use the data directly with Count and Date
            const transformedData = reportData.map((row, index) => ({
                submissionId: row.submissionId || index,
                Date: row.Date,
                Count: row.Count,
                time: new Date(row.Date).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                })
            }));

            console.log('📊 Transformed shift data:', transformedData);
            return transformedData;
        }

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
    }, [
        reportData.length,
        calculatedFields.length,
        chartConfigs.length,
        // Track the actual last data point changes
        reportData.length > 0 ? `${reportData[reportData.length - 1]?.submissionId}_${JSON.stringify(reportData[reportData.length - 1]?.data)}` : null
    ]);

    useEffect(() => {
        // Auto-switch to charts view if shift charts are detected
        const hasShift = chartConfigs.some(chart => chart.type === 'shift');
        if (hasShift && displayMode !== 'charts') {
            setDisplayMode('charts');
        }
    }, [chartConfigs]);

    const formatCellValue = (value, field) => {
        // ✅ handle accidental arrays safely
        if (Array.isArray(value)) {
            return value.join(", ");
        }

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

    const exportStyles = `
.export-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border: 2px solid #059669;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.export-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.export-btn:disabled {
    background: #9ca3af;
    border-color: #6b7280;
    cursor: not-allowed;
    opacity: 0.6;
}

.export-btn.exporting {
    background: #f59e0b;
    border-color: #d97706;
}

.dark-mode .export-btn {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    border-color: #047857;
}

.dark-mode .export-btn:hover:not(:disabled) {
    box-shadow: 0 4px 12px rgba(5, 150, 105, 0.4);
}

/* Blank Rows Toggle Button */
.blank-rows-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
    color: white;
    border: 2px solid #4b5563;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.blank-rows-toggle:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
}

.blank-rows-toggle.active {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    border-color: #dc2626;
}

.blank-rows-toggle.active:hover {
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.dark-mode .blank-rows-toggle {
    background: linear-gradient(135deg, #4b5563 0%, #374151 100%);
    border-color: #374151;
}

.dark-mode .blank-rows-toggle.active {
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    border-color: #b91c1c;
}
`;

    const renderSummaryStats = () => {
        if (filteredReportData.length === 0) return null; 
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
    const filteredReportData = useMemo(() => {
        if (!reportData || reportData.length === 0) return [];

        console.log(`✅ Total rows from API: ${reportData.length}`);

        let rows = [...reportData];

        if (!showBlankRows) {
            rows = rows.filter(row => {
                if (row.type === 'group-header' || row.type === 'group-footer') return true;

                const regularFields =
                    row.data?.filter(cell => cell.fieldType !== 'calculated') || [];

                return regularFields.some(
                    cell => cell.value !== '-' && cell.value !== '' && cell.value !== null
                );
            });
        }

        console.log(
            "🧮 Data rows:",
            rows.filter(r => r.type === "data-row").length
        );

        return rows;
    }, [reportData, showBlankRows]);


    const exportToExcel = async () => {
        try {
            setIsExporting(true);

            const wb = XLSX.utils.book_new();

            // ===== SHEET 1: DATA TABLE =====
            const visibleFields = selectedFields.filter(field => {
                if (typeof field === 'object') {
                    return field.visible !== false;
                }
                const fieldObj = fields.find(f => f.id === field);
                return fieldObj ? fieldObj.visible !== false : true;
            });

            // Prepare table data
            const tableData = [];

            // Add headers
            const headers = visibleFields.map(fieldId => {
                const field = fields.find(f => f.id === (fieldId.id || fieldId));
                const cleanedLabel = field?.label?.includes("→")
                    ? field.label.split("→").pop().trim()
                    : field?.label || fieldId;
                return cleanedLabel;
            });

            // Add calculated field headers
            calculatedFields
                .filter(cf => cf.calculationType !== 'columnwise')
                .forEach(cf => headers.push(cf.label));

            tableData.push(headers);

            // Add data rows (using filtered data to exclude blanks)
            filteredReportData.forEach(row => {
                if (row.type === 'group-header') {
                    const groupRow = Array(headers.length).fill('');
                    groupRow[0] = `📁 ${row.groupField}: ${row.groupValue} (${row.rowCount} items)`;
                    tableData.push(groupRow);
                } else if (row.type === 'group-footer') {
                    const footerRow = Array(headers.length).fill('');
                    footerRow[0] = `📊 Subtotal: ${row.groupValue}`;

                    // Add aggregations
                    calculatedFields
                        .filter(cf => cf.calculationType !== 'columnwise')
                        .forEach((cf, i) => {
                            const aggKey = `calc_${cf.id}`;
                            const agg = row.aggregations?.[aggKey];
                            if (agg) {
                                footerRow[visibleFields.length + i] = `${agg.label}: ${agg.value.toFixed(2)}`;
                            }
                        });

                    tableData.push(footerRow);
                } else if (row.type === 'data-row' || !row.type) {
                    const dataRow = [];

                    // Regular fields
                    visibleFields.forEach(fieldId => {
                        const field = fields.find(f => f.id === (fieldId.id || fieldId));
                        const fieldData = row.data?.find(d => d.fieldLabel === field?.label);
                        let value = fieldData?.value || '';

                        // Clean up the value for Excel
                        try {
                            const parsed = JSON.parse(value);
                            if (Array.isArray(parsed)) {
                                value = parsed.join(', ');
                            } else if (typeof parsed === 'object') {
                                value = JSON.stringify(parsed);
                            } else {
                                value = parsed;
                            }
                        } catch {
                            // Use as-is
                        }

                        dataRow.push(value === '—' ? '' : value);
                    });

                    // Calculated fields
                    calculatedFields
                        .filter(cf => cf.calculationType !== 'columnwise')
                        .forEach(cf => {
                            const calcData = row.data?.find(d => d.fieldLabel === cf.label);
                            dataRow.push(calcData?.value || '');
                        });

                    tableData.push(dataRow);
                }
            });

            // Add summary rows if present
            if (summaryRows.length > 0) {
                tableData.push([]); // Empty row separator
                tableData.push(['SUMMARY & TOTALS']);
                tableData.push([]);

                summaryRows.forEach(summary => {
                    tableData.push([summary.label, summary.value, summary.formula]);
                });
            }

            const ws = XLSX.utils.aoa_to_sheet(tableData);

            // Style the header row
            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const address = XLSX.utils.encode_col(C) + "1";
                if (!ws[address]) continue;
                ws[address].s = {
                    font: { bold: true },
                    fill: { fgColor: { rgb: "4472C4" } },
                    alignment: { horizontal: "center" }
                };
            }

            // Auto-size columns
            const colWidths = headers.map(h => ({ wch: Math.max(h.length + 2, 15) }));
            ws['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(wb, ws, "Report Data");

            // ===== SHEET 2: CHART DATA =====
            if (chartData && chartData.length > 0) {
                const chartDataForExcel = [];

                // Get all unique keys from chartData
                const allKeys = [...new Set(chartData.flatMap(item => Object.keys(item)))];

                // Add headers
                chartDataForExcel.push(allKeys);

                // Add data
                chartData.forEach(item => {
                    const row = allKeys.map(key => item[key] || '');
                    chartDataForExcel.push(row);
                });

                const chartWs = XLSX.utils.aoa_to_sheet(chartDataForExcel);

                // Style headers
                for (let C = 0; C < allKeys.length; ++C) {
                    const address = XLSX.utils.encode_col(C) + "1";
                    if (!chartWs[address]) continue;
                    chartWs[address].s = {
                        font: { bold: true },
                        fill: { fgColor: { rgb: "70AD47" } },
                        alignment: { horizontal: "center" }
                    };
                }

                // Auto-size columns
                const chartColWidths = allKeys.map(h => ({ wch: Math.max(String(h).length + 2, 12) }));
                chartWs['!cols'] = chartColWidths;

                XLSX.utils.book_append_sheet(wb, chartWs, "Chart Data");

                // ===== SHEET 3: CHART CONFIGURATIONS =====
                const chartConfigData = [
                    ['Chart Configurations'],
                    [],
                    ['Chart #', 'Title', 'Type', 'Metrics', 'X-Field']
                ];

                chartConfigs.forEach((chart, index) => {
                    chartConfigData.push([
                        index + 1,
                        chart.title || `Chart ${index + 1}`,
                        chart.type,
                        (chart.metrics || []).join(', '),
                        chart.xField || ''
                    ]);
                });

                const configWs = XLSX.utils.aoa_to_sheet(chartConfigData);

                // Style headers
                const configRange = XLSX.utils.decode_range(configWs['!ref']);
                for (let C = configRange.s.c; C <= configRange.e.c; ++C) {
                    const address = XLSX.utils.encode_col(C) + "3";
                    if (!configWs[address]) continue;
                    configWs[address].s = {
                        font: { bold: true },
                        fill: { fgColor: { rgb: "FFC000" } },
                        alignment: { horizontal: "center" }
                    };
                }

                XLSX.utils.book_append_sheet(wb, configWs, "Chart Info");
            }

            // ===== SHEET 4: SUMMARY STATISTICS =====
            const statsData = [
                ['Report Summary Statistics'],
                [],
                ['Metric', 'Value'],
                ['Total Submissions', new Set(filteredReportData.map(r => r.submissionId)).size],
                ['Total Data Rows', filteredReportData.filter(r => r.type === 'data-row' || !r.type).length],
                ['Total Charts', chartConfigs.length],
                ['Generated On', new Date().toLocaleString()],
                ['Report Template ID', templateId],
                [],
                ['Filters Applied'],
            ];

            Object.entries(runtimeFilters).forEach(([key, value]) => {
                if (value) {
                    const field = fields.find(f => f.id === key);
                    statsData.push([field?.label || key, value]);
                }
            });

            const statsWs = XLSX.utils.aoa_to_sheet(statsData);

            // Style title
            statsWs['A1'].s = {
                font: { bold: true, sz: 14 },
                fill: { fgColor: { rgb: "5B9BD5" } },
                alignment: { horizontal: "center" }
            };

            // Merge title cell
            statsWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

            XLSX.utils.book_append_sheet(wb, statsWs, "Summary Stats");

            // Generate filename
            const fileName = `Report_${templateId}_${new Date().toISOString().split('T')[0]}.xlsx`;

            // Write file
            XLSX.writeFile(wb, fileName);

            console.log('✅ Excel export completed successfully');

        } catch (error) {
            console.error('❌ Excel export error:', error);
            setError('Failed to export to Excel: ' + error.message);
        } finally {
            setIsExporting(false);
        }
    };

    const renderViewControls = () => {
        return (
            <div className="view-controls">

                {/* Debug Info (optional - remove in production) */}
                <div style={{
                    background: '#fef3c7',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    border: '1px solid #f59e0b'
                }}>
                    📊 Total: {reportData.length} |
                    ✅ Filtered: {filteredReportData.length} |
                    🗑️ Hidden: {reportData.length - filteredReportData.length} |
                    {isGrouped ? ' 🏷️ GROUPED' : ' 📋 FLAT'}
                </div>
                {/* Export Button - First */}
                <button
                    onClick={exportToExcel}
                    disabled={isExporting || filteredReportData.length === 0}
                    className={`export-btn ${isExporting ? 'exporting' : ''}`}
                    title="Export to Excel with charts"
                >
                    {isExporting ? (
                        <span className="flex items-center gap-2">
                            <span className="animate-spin">⏳</span>
                            Exporting...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            📊 Export to Excel
                        </span>
                    )}
                </button>

                {/* Toggle Blank Rows Button */}
                <button
                    onClick={() => {
                        console.log('🔄 Toggling showBlankRows from:', showBlankRows);
                        setShowBlankRows(!showBlankRows);
                    }}
                    className={`blank-rows-toggle ${!showBlankRows ? 'active' : ''}`}
                    title={showBlankRows ? "Hide blank rows" : "Show blank rows"}
                >
                    {showBlankRows ? '👁️ Show All' : '🧹 Hide Blanks'}
                    <span className="ml-1 text-xs font-normal">
                        ({filteredReportData.length} rows)
                    </span>
                </button>

                {/* Dark Mode Toggle */}
                <button
                    onClick={toggleDarkMode}
                    className={`dark-mode-toggle ${isDarkMode ? 'active' : ''}`}
                    style={{
                        backgroundColor: isDarkMode ? '#fbbf24' : '#374151',
                        color: isDarkMode ? '#1f2937' : 'white',
                        border: `2px solid ${isDarkMode ? '#f59e0b' : '#4b5563'}`,
                        fontWeight: 'bold',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}
                >
                    {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
                </button>

                {/* Rest of existing buttons */}
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
                {groupingConfig.length > 0 && (
                    <button
                        onClick={() => setIsGrouped(!isGrouped)}
                        className={isGrouped ? 'active' : ''}
                    >
                        🏷️ {isGrouped ? 'Grouped' : 'Flat'} View
                    </button>
                )}

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
    };

    const renderExpandedTable = () => {
        console.log('📋 renderExpandedTable called', {
            isGrouped,
            groupingConfigLength: groupingConfig.length,
            filteredDataLength: filteredReportData.length
        });

        if (isGrouped && groupingConfig.length > 0) {
            console.log('🏷️ Rendering grouped table view');
            return renderNewGroupedTable();
        }

        console.log('📊 Rendering flat table view');
        return renderExpandedTableWithSummary(filteredReportData, summaryRows, selectedFields, fields);
    };

    const groupingStyles = `
.group-header-row {
    background: linear-gradient(to right, #f3f4f6, #e5e7eb);
    font-weight: 600;
    border-top: 2px solid #9ca3af;
}

.group-footer-row {
    background: #fef3c7;
    font-weight: 500;
    border-top: 1px solid #fbbf24;
    border-bottom: 2px solid #f59e0b;
}

.group-header-row td,
.group-footer-row td {
    padding: 12px 16px;
}
.report-table td {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.grid-text-cell {
    max-width: 300px !important;
    white-space: normal !important;
    word-break: break-word !important;
}
`;

    const renderNewGroupedTable = () => {
        console.log('🏷️ RENDERING GROUPED TABLE - STARTING AGGREGATION');

        // 🔥 STEP 1: Create one row per submission (collapse multiple grid rows)
        const submissionRows = filteredReportData
            .filter(row => row.type === 'data-row')
            .reduce((acc, row) => {
                const subId = row.submissionId;
                if (!acc[subId]) {
                    acc[subId] = {
                        type: 'data-row',
                        submissionId: subId,
                        data: [...row.data],  // Start with first row's data
                        submittedAt: row.submittedAt,
                        level: row.level || 0,
                        gridRowIndex: 0
                    };
                }
                return acc;
            }, {});

        // 🔥 STEP 2: AGGREGATE ALL GRID FIELDS (not just selectedFields)
        console.log('🔍 FOUND SUBMISSIONS:', Object.keys(submissionRows).length);

        Object.values(submissionRows).forEach(aggRow => {
            console.log(`\n📊 Aggregating submission ${aggRow.submissionId}`);

            // Get ALL unique grid fields from ALL rows of this submission
            const allGridFields = [...new Set(
                filteredReportData
                    .filter(r => r.submissionId === aggRow.submissionId && r.type === 'data-row')
                    .flatMap(r => r.data
                        .filter(d => d.fieldLabel.includes('→'))
                        .map(d => d.fieldLabel)
                    )
            )];

            console.log(`  Grid fields to aggregate: ${allGridFields.join(', ')}`);

            // 🔥 Aggregate each grid field
            allGridFields.forEach(fieldLabel => {
                const aggValue = getFieldValue(
                    fieldLabel,
                    [],
                    fields,
                    filteredReportData,
                    aggRow.submissionId
                );

                console.log(`    ${fieldLabel} → ${aggValue}`);

                // Update ALL matching fields in this row
                aggRow.data = aggRow.data.map(fieldData =>
                    fieldData.fieldLabel === fieldLabel
                        ? { ...fieldData, value: aggValue }
                        : fieldData
                );

                // Add field if it doesn't exist
                const existingField = aggRow.data.find(d => d.fieldLabel === fieldLabel);
                if (!existingField) {
                    aggRow.data.push({ fieldLabel, value: aggValue });
                }
            });
        });

        // 🔥 STEP 3: Combine aggregated data + group headers/footers
        const finalData = [
            ...filteredReportData.filter(r => r.type !== 'data-row'),  // Group headers/footers
            ...Object.values(submissionRows)                            // Aggregated submission rows
        ];

        console.log('✅ FINAL AGGREGATED DATA SAMPLE:');
        finalData
            .filter(r => r.type === 'data-row')
            .slice(0, 1)
            .forEach(row => {
                console.log(`Submission ${row.submissionId}:`,
                    row.data
                        .filter(d => d.fieldLabel.includes('→'))
                        .map(d => `${d.fieldLabel}: ${d.value}`)
                );
            });

        // 🔥 STEP 4: RENDER TABLE WITH AGGREGATED DATA
        return (
            <>
                <style>{`
                ${groupingStyles}
                .report-table td {
                    max-width: 250px !important;
                    white-space: normal !important;
                    word-break: break-word !important;
                    overflow: visible !important;
                }
            `}</style>

                <div className="table-container">
                    <table className="report-table">
                        <thead>
                            <tr>
                                {selectedFields.map((fieldId, i) => {
                                    const field = fields.find(f => f.id === (fieldId.id || fieldId));
                                    const cleanedLabel = field?.label?.includes("→")
                                        ? field.label.split("→").pop().trim()
                                        : field?.label || fieldId;
                                    return (
                                        <th key={i} style={{ minWidth: '120px' }}>
                                            {cleanedLabel}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {finalData.map((row, idx) => {
                                // Group headers
                                if (row.type === 'group-header') {
                                    return (
                                        <tr key={`group-header-${idx}`} className="group-header-row">
                                            <td
                                                colSpan={selectedFields.length}
                                                style={{ paddingLeft: `${row.level * 30}px` }}
                                            >
                                                📁 <strong>{row.groupField}:</strong> {row.groupValue}
                                                <span className="text-gray-500 ml-2">({row.rowCount} items)</span>
                                            </td>
                                        </tr>
                                    );
                                }

                                // Group footers  
                                if (row.type === 'group-footer') {
                                    return (
                                        <tr key={`group-footer-${idx}`} className="group-footer-row">
                                            <td colSpan={1} style={{ paddingLeft: `${row.level * 30}px` }}>
                                                <strong>📊 Subtotal:</strong> {row.groupValue}
                                            </td>
                                            <td colSpan={selectedFields.length - 1}></td>
                                        </tr>
                                    );
                                }

                                // ✅ AGGREGATED DATA ROWS (1 per submission)
                                return (
                                    <tr key={`data-row-${idx}-${row.submissionId}`} className="hover:bg-gray-50">
                                        {selectedFields.map((fieldId, j) => {
                                            const field = fields.find(f => f.id === (fieldId.id || fieldId));
                                            const fieldData = row.data.find(d => d.fieldLabel === field?.label);
                                            const value = fieldData?.value ?? '';

                                            return (
                                                <td
                                                    key={`field-${j}`}
                                                    style={{
                                                        paddingLeft: row.level > 0 ? `${row.level * 30}px` : '16px',
                                                        maxWidth: '250px',
                                                        wordBreak: 'break-word',
                                                        whiteSpace: 'normal'
                                                    }}
                                                    title={value?.toString() || ''}
                                                >
                                                    {/* 🔥 TEMPORARY RAW DISPLAY FOR DEBUG */}
                                                    <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                                                        {typeof value === 'string' && value.includes(' | ')
                                                            ? <span title={value}>{value}</span>
                                                            : value || '—'
                                                        }
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </>
        );
    };


    const renderGroupedTable = () => {
        const grouped = {};
        filteredReportData.forEach(row => {
            if (!grouped[row.submissionId]) grouped[row.submissionId] = [];
            grouped[row.submissionId].push(row);
        });

        const visibleFields = selectedFields.filter(field => {
            if (typeof field === 'object') {
                return field.visible !== false;
            }
            const fieldObj = fields.find(f => f.id === field);
            return fieldObj ? fieldObj.visible !== false : true;
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
                                    {visibleFields.map((field, i) => (
                                        <th key={i}>{typeof field === 'object' ? field.label : field}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, i) => (
                                    <tr key={i}>
                                        {/* ✅ Only show visible field values */}
                                        {visibleFields.map((field, j) => {
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


    const renderChartsView = () => {
        const shiftCharts = chartConfigs.filter(chart => chart.type === 'shift');
        const regularCharts = chartConfigs.filter(chart => chart.type !== 'shift');

        if (chartConfigs.length === 0) {
            return (
                <div className={`text-center py-12 rounded ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'  // ✅ ADD THIS
                    }`}>
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className={`text-xl font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-600'  // ✅ ADD THIS
                        }`}>No Charts Configured</h3>
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>  {/* ✅ ADD THIS */}
                        Charts need to be configured in the report designer.
                    </p>
                </div>
            );
        }

        // If there are shift charts, render them with maximize functionality
        if (shiftCharts.length > 0) {
            return (
                <div className={`shift-charts-container ${maximizedChart ? 'maximized-mode' : ''}`}>
                    {/* Show controls when maximized */}
                    {maximizedChart && (
                        <div className="maximize-controls-overlay">
                            <div className="maximize-controls">
                                {/* Manual Refresh Button */}
                                <button
                                    onClick={handleManualRefresh}
                                    className="refresh-btn"
                                    title="Refresh data"
                                >
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Refresh
                                </button>

                                {/* Exit Maximized Button */}
                                <button
                                    onClick={handleMinimizeChart}
                                    className="minimize-btn"
                                    title="Exit maximized view"
                                >
                                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Exit
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Shift Period Selector - Show when not maximized */}
                    {!maximizedChart && (
                        <div className={`mb-6 flex justify-center items-center gap-4 bg-white p-4 rounded-lg shadow${isDarkMode ? 'bg-gray-800' : 'bg-white'  // ✅ ADD THIS
                            }`}>
                            <label className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'  // ✅ ADD THIS
                                }`}>View Period:</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedShiftPeriod('current')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedShiftPeriod === 'current'
                                            ? 'bg-blue-600 text-white'
                                            : isDarkMode
                                                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'  // ✅ DARK MODE
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'  // ✅ LIGHT MODE
                                        }`}
                                >
                                    Current Shift ({getCurrentShift()})
                                </button>
                                {/* Apply same pattern to all shift buttons */}
                                <button
                                    onClick={() => setSelectedShiftPeriod('A')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedShiftPeriod === 'A'
                                            ? 'bg-blue-600 text-white'
                                            : isDarkMode
                                                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Shift A
                                </button>
                                <button
                                    onClick={() => setSelectedShiftPeriod('B')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedShiftPeriod === 'B'
                                            ? 'bg-blue-600 text-white'
                                            : isDarkMode
                                                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Shift B
                                </button>
                                <button
                                    onClick={() => setSelectedShiftPeriod('C')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedShiftPeriod === 'C'
                                            ? 'bg-blue-600 text-white'
                                            : isDarkMode
                                                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Shift C
                                </button>
                                <button
                                    onClick={() => setSelectedShiftPeriod('fullday')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedShiftPeriod === 'fullday'
                                            ? 'bg-green-600 text-white'
                                            : isDarkMode
                                                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Full Day (24h)
                                </button>
                            </div>
                        </div >
                    )
                    }

                    {/* Render shift charts with maximize button */}
                    {
                        shiftCharts
                            .filter(chart => !maximizedChart || chart.id === maximizedChart)
                            .map((chart, index) => (
                                <div key={`${chart.id}-${index}`}
                                    className={`shift-chart-container ${maximizedChart === chart.id ? 'chart-maximized' : ''} ${maximizedChart ? 'mt-16' : 'mb-8'}`}>
                                    {/* Maximize button - only show when not maximized */}
                                    {!maximizedChart && (
                                        <div className="chart-header-controls">
                                            <button
                                                onClick={() => handleMaximizeChart(chart.id)}
                                                className="maximize-chart-btn"
                                                title="Maximize chart"
                                            >
                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                    {console.log('=== ENHANCED REPORT VIEWER DATA DEBUG ===')}
                                    {console.log('reportData length:', reportData.length)}
                                    {console.log('chartData length:', chartData.length)}
                                    {console.log('chartData sample:', chartData.slice(0, 2))}
                                    {console.log('Is shift chart?', chart.type === 'shift')}
                                    {console.log('Data being passed to ReportCharts:', chartData)}

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
                                        currentShift={getCurrentShift()}
                                        showConfiguration={false}
                                        shiftConfigs={chart.shiftConfigs}
                                        templateId={templateId}
                                        isMaximized={maximizedChart === chart.id}
                                        refreshTrigger={refreshTrigger}
                                        selectedDate={selectedDate}  // ✅ ADD THIS
                                        showDatePicker={showDatePicker && !maximizedChart}  // ✅ CHANGE THIS LINE
                                        onDateChange={handleDateChange}  // ✅ ADD THIS
                                        onToggleDatePicker={() => setShowDatePicker(!showDatePicker)}  // ✅ ADD THIS
                                        isDarkMode={isDarkMode} // ✅ ADD THIS PROP
                                    />
                                </div>
                            ))
                    }
                </div >
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
    const maximizeStyles1 = `
.maximized-mode {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: white;
    z-index: 1000;
    overflow-y: auto;
    padding: 20px;
}

.chart-maximized {
    width: calc(100vw - 40px) !important;
    height: calc(100vh - 120px) !important;
    min-height: 85vh !important;
}

.chart-header-controls {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;
}

.maximize-chart-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    color: #4b5563;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
}

.maximize-chart-btn:hover {
    background: #e5e7eb;
    color: #374151;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.maximize-controls-overlay {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1001;
}

.maximize-controls {
    display: flex;
    gap: 12px;
    align-items: center;
}

.refresh-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
}

.refresh-btn:hover {
    background: #2563eb;
}

.minimize-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
}

.minimize-btn:hover {
    background: #dc2626;
}
`;

    // Update your style block to include both styles

    // Add this before your return statement (around line 720)
    const maximizeStyles = `
.maximized-mode {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: white;
    z-index: 1000;
    overflow-y: auto;
    padding: 10px; /* Reduced padding */
}

.chart-maximized {
    width: calc(100vw - 20px) !important;  /* Almost full width */
    height: calc(100vh - 80px) !important; /* Almost full height */
    min-height: 90vh !important;           /* Even more height */
}

/* Make the shift period controls compact in maximized mode */
.maximized-shift-controls {
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1002;
    background: white !important;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 8px 16px !important; /* Compact padding */
}

.maximize-controls-overlay {
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 1001;
}

/* Rest of your existing maximize styles... */
.chart-header-controls {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;
}

.maximize-chart-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    color: #4b5563;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
}

.maximize-chart-btn:hover {
    background: #e5e7eb;
    color: #374151;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.maximize-controls {
    display: flex;
    gap: 12px;
    align-items: center;
}

.refresh-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
}

.refresh-btn:hover {
    background: #2563eb;
}

.minimize-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
}

.minimize-btn:hover {
    background: #dc2626;
}
`;

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
        console.log('🚨 isGrouped:', isGrouped);                    // ← ADD
        console.log('🚨 groupingConfig.length:', groupingConfig.length); // ← ADD
        console.log('🚨 calculatedFields:', calculatedFields.length);   // ← ADD
        if (reportData.length > 0) {
            console.log('🔍 INSPECTING FIRST ROW STRUCTURE:');
            console.log('Submission ID:', reportData[0].submissionId);
            console.log('Row keys:', Object.keys(reportData[0]));
            console.log('Has .data property?', !!reportData[0].data);

            if (reportData[0].data) {
                console.log('Data array length:', reportData[0].data.length);
                console.log('First 3 data items:', JSON.stringify(reportData[0].data.slice(0, 3), null, 2));
            }

            // Show ALL property names
            console.log('Full first row structure:', JSON.stringify(reportData[0], null, 2).substring(0, 500));
        }

        if (isGrouped && groupingConfig.length > 0) {
            console.log('🏷️ Processing with grouping...');

            const { flattenedData } = processGroupedData(
                reportData,
                groupingConfig,
                fields,
                calculatedFields
            );

            console.log('📊 Flattened data from grouping:', flattenedData);

            const withCalculations = applyRowLevelCalculations(
                flattenedData,
                calculatedFields,
                fields
            );

            const finalData = withCalculations.map(row => ({
                ...row,
                data: [...(row.data || []), ...calculatedFields.map(calcField => {
                    console.log(`🔥 CALCULATING: ${calcField.label}`);  // ← DEBUG
                    const calculatedValue = evaluateCalculatedField(calcField, row.data || [], reportData, fields);
                    return {
                        fieldLabel: calcField.label,
                        value: formatCalculatedValue(calculatedValue, calcField),
                        fieldType: 'calculated'
                    };
                })]
            }));

            return { processedData: finalData, summaryRows: [] };

            //console.log('✅ Final processed data with calculations:', withCalculations);

            //return {
            //    processedData: withCalculations,
            //    summaryRows: [] // Summaries handled by grouping
            //};
        }

        if (!calculatedFields || calculatedFields.length === 0) {
            return {
                processedData: reportData,
                summaryRows: []
            };
        }

        console.log('📋 Processing without grouping (flat view)...');
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

        // 🔥 BULLETPROOF CALCULATION - REPLACE THE ENTIRE FOR LOOP
        // Inside processCalculatedFields, around line 730
        for (const row of reportData) {
            console.log(`🔥 PROCESSING ROW ${row.submissionId}`);

            // Get ALL field values FIRST (passing full context)
            const fieldValues = {};
            row.data.forEach(cell => {
                // 🔥 PASS allReportData and submissionId for aggregation
                fieldValues[cell.fieldLabel] = getFieldValue(
                    cell.fieldLabel,
                    row.data,
                    fields,
                    reportData,  // ← ADD THIS
                    row.submissionId  // ← ADD THIS
                );
            });

            console.log('📊 FIELD VALUES:', fieldValues);

            // 🔥 ADD CALCULATED FIELDS (with context)
            // 🔥 ADD CALCULATED FIELDS (with context and debugging)
            const calculatedData = calculatedFields.map(calcField => {
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log(`🔥 CALCULATING FIELD: ${calcField.label}`);
                console.log('📋 Calculation Type:', calcField.calculationType);
                console.log('🔧 Function Type:', calcField.functionType);
                console.log('📐 Formula:', calcField.formula);
                console.log('🆔 Submission ID:', row.submissionId);

                // Use context-aware evaluation
                const value = evaluateCalculatedFieldWithContext(
                    calcField,
                    row.data,
                    reportData,
                    fields,
                    row.submissionId
                );

                console.log(`✅ RAW RESULT:`, value, `(type: ${typeof value})`);

                const formattedValue = formatCalculatedValue(value, calcField);
                console.log(`✨ FORMATTED RESULT:`, formattedValue);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

                return {
                    fieldLabel: calcField.label,
                    value: formattedValue,
                    fieldType: 'calculated'
                };
            });
            // ✅ MERGE calculated + original data
            const newRow = {
                ...row,
                data: [...row.data, ...calculatedData]
            };

            console.log('🔎 DEBUG ROW DATA for submission:', row.submissionId);
            row.data.forEach(cell => {
                if (cell.fieldLabel.includes('9686fd45-f92c-428e-add7-898962e5d14b')) {
                    console.log('  Found Production Details field:', {
                        fieldLabel: cell.fieldLabel,
                        value: cell.value,
                        fieldType: cell.fieldType
                    });
                }
            });

            processedData.push(newRow);
            console.log(`✅ ROW FINAL data.length:`, newRow.data.length);
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

    const evaluateCalculatedFieldWithContext = (calcField, rowData, allReportData, fields, submissionId) => {
        const { formula, calculationType, functionType } = calcField;

        try {
            switch (calculationType) {
                case 'rowwise':
                    return evaluateRowwiseWithContext(formula, rowData, functionType, fields, allReportData, submissionId);

                case 'aggregate':
                    return evaluateAggregateCalculation(formula, allReportData, functionType, fields);

                case 'columnwise':
                    return 0; // Summary only

                case 'grouping':
                    return evaluateGroupingCalculation(formula, rowData, allReportData, functionType, fields);

                default:
                    return evaluateRowwiseWithContext(formula, rowData, functionType, fields, allReportData, submissionId);
            }
        } catch (error) {
            console.error('Calculated field evaluation error:', error);
            return 'Error';
        }
    };

    const evaluateRowwiseWithContext = (formula, rowData, functionType, fields, allReportData, submissionId) => {
        // Handle EXPRESSION type
        if (functionType === 'EXPRESSION') {
            return evaluateExpressionWithContext(formula, rowData, fields, 2, 'rowwise', allReportData, submissionId);
        }

        // Handle other function types (existing logic with context)
        const fieldRefs = extractFieldReferences(formula);
        const values = fieldRefs.map(fieldName => {
            return getFieldValue(fieldName, rowData, fields, allReportData, submissionId);  // ← PASS CONTEXT
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

    const splitIfParts = (content) => {
        const parts = [];
        let current = '';
        let depth = 0;
        let inString = false;
        let stringChar = null;

        for (let i = 0; i < content.length; i++) {
            const char = content[i];

            if ((char === '"' || char === "'") && content[i - 1] !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                    stringChar = null;
                }
            }

            if (!inString) {
                if (char === '(') depth++;
                if (char === ')') depth--;

                if (char === ',' && depth === 0) {
                    parts.push(current.trim());
                    current = '';
                    continue;
                }
            }

            current += char;
        }

        if (current) {
            parts.push(current.trim());
        }

        return parts;
    };

    const evaluateExpressionWithContext = (formula, rowData, fields, precision, calculationType = 'rowwise', allReportData = [], submissionId = null) => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🚀 STARTING EXPRESSION EVALUATION');
        console.log('📝 Original formula:', formula);
        console.log('🆔 Submission ID:', submissionId);

        // ✅ Validate formula input
        if (!formula || typeof formula !== 'string') {
            console.error('❌ Invalid formula:', formula);
            return 0;
        }

        // ✅ Remove EXPRESSION wrapper if present
        let expression = formula.trim();
        if (expression.startsWith('EXPRESSION(') && expression.endsWith(')')) {
            expression = expression.slice(11, -1);
            console.log('📝 Unwrapped EXPRESSION:', expression);
        }

        console.log('🔧 Expression to evaluate:', expression);

        // ✅ Handle IF conditions BEFORE field replacement
        const ifMatches = expression.match(/IF\(([^)]+(?:\([^)]*\))?[^)]*)\)/g);
        const ifReplacements = {};

        if (ifMatches) {
            ifMatches.forEach((ifMatch, idx) => {
                const placeholder = `__IF_PLACEHOLDER_${idx}__`;
                ifReplacements[placeholder] = ifMatch;
                expression = expression.replace(ifMatch, placeholder);
            });
            console.log('🔧 IF placeholders created:', Object.keys(ifReplacements));
        }

        // ✅ Extract ONLY quoted field references
        const fieldMatches = expression.match(/"([^"]+)"/g) || [];
        console.log('🔎 Field matches found:', fieldMatches);

        if (fieldMatches.length === 0) {
            console.error('❌ No field references found in expression!');
            return 0;
        }

        // 🔥 Store ONLY quoted field matches as keys
        const fieldValues = {};

        fieldMatches.forEach(match => {
            const fieldLabel = match.replace(/"/g, '');
            console.log(`\n🔍 Processing field: "${fieldLabel}"`);

            let field = fields.find(f => f.label === fieldLabel);
            if (!field && fieldLabel.includes('→')) {
                const baseLabel = fieldLabel.split('→')[0].trim();
                field = fields.find(f => f.label.startsWith(baseLabel));
            }

            if (field) {
                console.log(`  ✅ Found field ID: ${field.id}`);
                const value = getFieldValue(fieldLabel, rowData, fields, allReportData, submissionId);
                fieldValues[match] = value; // 🔥 ONLY quoted key
                console.log(`  📊 Value: ${value}`);
            } else {
                console.error(`  ❌ Field not found: "${fieldLabel}"`);
                fieldValues[match] = 0;
            }
        });

        console.log('\n🗺️ Complete field values map:', fieldValues);

        // ✅ Helper function for IF conditions
        const evaluateValue = (val) => {
            val = val.trim();
            if (val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
            if (val.startsWith('"') && val.endsWith('"')) {
                const fieldName = val.slice(1, -1);
                const matchingKey = Object.keys(fieldValues).find(key => key.replace(/"/g, '') === fieldName);
                return matchingKey ? fieldValues[matchingKey] : 0;
            }
            const numValue = parseFloat(val);
            return !isNaN(numValue) ? numValue : val;
        };

        // 🔥 Process IF conditions using YOUR splitIfParts
        Object.entries(ifReplacements).forEach(([placeholder, ifStatement]) => {
            try {
                const ifContent = ifStatement.match(/IF\((.*)\)/)[1];
                const parts = splitIfParts(ifContent); // ✅ YOUR perfect parser

                if (parts.length === 3) {
                    let [condition, trueVal, falseVal] = parts;

                    // Replace fields in condition
                    fieldMatches.forEach(quotedMatch => {
                        if (condition.includes(quotedMatch)) {
                            const numValue = parseFloat(fieldValues[quotedMatch]) || 0;
                            const escapedMatch = quotedMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            condition = condition.replace(new RegExp(escapedMatch, 'g'), numValue);
                        }
                    });

                    condition = condition.replace(/\s*==\s*/g, ' === ').replace(/\s*=\s*(?!=)/g, ' === ');
                    console.log('🔧 IF condition:', condition);

                    const conditionResult = eval(condition.trim());
                    const result = conditionResult ? evaluateValue(trueVal) : evaluateValue(falseVal);
                    const resultStr = typeof result === 'string' ? `'${result}'` : result;

                    expression = expression.replace(placeholder, resultStr);
                    console.log(`✅ IF → ${result}`);
                }
            } catch (error) {
                console.error('❌ IF error:', error);
                expression = expression.replace(placeholder, '0');
            }
        });

        // 🔥 CRITICAL: Replace ONLY quoted field references
        let finalExpression = expression;
        fieldMatches.forEach(quotedMatch => {
            const value = fieldValues[quotedMatch];
            const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
            console.log(`🔄 Replacing "${quotedMatch}" → ${numValue}`);

            const escapedMatch = quotedMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            finalExpression = finalExpression.replace(new RegExp(escapedMatch, 'g'), numValue);
        });

        console.log('📐 Before functions:', finalExpression);

        // 🔥 SAFETY CHECK
        if (finalExpression.includes('→') || finalExpression.includes('"')) {
            console.error('❌ Field refs remain:', finalExpression);
            return 0;
        }

        // Math functions
        finalExpression = finalExpression
            .replace(/sqrt\(/g, 'Math.sqrt(')
            .replace(/abs\(/g, 'Math.abs(')
            .replace(/round\(/g, 'Math.round(')
            .replace(/floor\(/g, 'Math.floor(')
            .replace(/ceil\(/g, 'Math.ceil(')
            .replace(/pow\(/g, 'Math.pow(')
            .replace(/max\(/g, 'Math.max(')
            .replace(/min\(/g, 'Math.min(')
            .replace(/\^/g, '**');

        console.log('📐 Ready for eval:', finalExpression);

        // 🔥 FINAL EVAL
        try {
            const result = new Function(`'use strict'; return (${finalExpression})`)();
            console.log('✅ Result:', result, `(type: ${typeof result})`);

            if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
                console.log('✅✅✅ SUCCESS:', result);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                return result;
            }
            return 0;
        } catch (error) {
            console.error('❌ Eval error:', error.message);
            console.error('Expression:', finalExpression);
            return 0;
        }
    };

    const renderExpandedTableWithSummary = (reportData, summaryRows, selectedFields, fields) => {
        // Filter selectedFields to exclude any column-wise calculated fields
        const visibleFields = selectedFields.filter(field => {
            if (typeof field === 'object') {
                return field.visible !== false;
            }
            const fieldObj = fields.find(f => f.id === field);
            return fieldObj ? fieldObj.visible !== false : true;
        });

        const displayFields = visibleFields.filter(field => {
            if (typeof field === 'object' && field.type === 'calculated') {
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
                                        <td colSpan={visibleFields.length} className="summary-divider-cell">
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
                                            <td className="summary-value" colSpan={visibleFields.length - 1}>
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

    const getFieldValue = (fieldName, rowData, fields, allReportData = [], currentSubmissionId = null) => {
        console.log(`\n🔍 getFieldValue called for: "${fieldName}"`);
        console.log(`   Submission ID: ${currentSubmissionId}`);

        const isGridField = fieldName.includes('→');

        // ================= GRID MODE =================
        if (isGridField && currentSubmissionId && allReportData.length > 0) {
            const matchingRows = allReportData
                .filter(r => r.submissionId === currentSubmissionId)
                .sort((a, b) => (a.gridRowIndex ?? 0) - (b.gridRowIndex ?? 0));

            console.log(`  Found ${matchingRows.length} grid rows`);

            // 🔥 Collect ALL raw values first
            const allValues = matchingRows.map((row, i) => {
                const fd = row.data?.find(d => d.fieldLabel === fieldName);
                return fd?.value && fd.value !== '-' && fd.value !== 'null' && fd.value !== ''
                    ? fd.value.trim()
                    : null;
            }).filter(v => v !== null);

            console.log(`  Raw values: [${allValues.join(', ')}]`);

            if (allValues.length === 0) {
                console.log(`✅ EMPTY RESULT`);
                return '';
            }

            // 🔥 DETECT: Purely numeric field?
            const allNumeric = allValues.every(v => !isNaN(parseFloat(v)) && isFinite(parseFloat(v)));

            if (allNumeric) {
                // ---------- NUMERIC: SUM ALL ----------
                const total = allValues.reduce((sum, v) => sum + parseFloat(v), 0);
                console.log(`✅ NUMERIC SUM: ${total}`);
                return total;
            }

            // 🔥 TEXT LOGIC: Check for repeats vs unique
            const uniqueValues = [...new Set(allValues)]; // Remove duplicates
            const allSame = uniqueValues.length === 1;

            if (allSame) {
                // ---------- ALL ROWS SAME: Show single value ----------
                console.log(`✅ TEXT SAME: "${uniqueValues[0]}"`);
                return uniqueValues[0];
            } else {
                // ---------- DIFFERENT VALUES: Concatenate ----------
                const concatenated = allValues.join(' | ');
                console.log(`✅ TEXT CONCAT: "${concatenated}"`);
                return concatenated;
            }
        }

        // ================= SINGLE ROW MODE =================
        const fieldData = rowData.find(d => d.fieldLabel === fieldName);
        if (!fieldData || fieldData.value === '-' || fieldData.value === 'null' || fieldData.value === '') {
            return '';
        }

        // Return original value (number or text)
        const num = parseFloat(fieldData.value);
        return isNaN(num) ? fieldData.value.trim() : num;
    };

    const handleMaximizeChart = (chartId) => {
        setMaximizedChart(chartId);
        // Immediate refresh when maximizing
        fetchFilteredReport(true);
    };

    const handleMinimizeChart = () => {
        console.log('🔻 Minimizing chart'); // Add debug log
        setMaximizedChart(null);
    };

    const handleManualRefresh = async () => {
        console.log('🔄 Manual refresh triggered');
        await fetchFilteredReport(false); // Don't use silent mode for manual refresh
    };

    const handleDateChange = (newDate) => {
        setSelectedDate(newDate);
        fetchFilteredReport(true);
    };

    const formatCalculatedValue = (value, calcField) => {
        console.log('🎨 Formatting value:', value, 'Type:', typeof value, 'Format:', calcField.format);

        // ✅ Handle string results from IF conditions
        if (typeof value === 'string') {
            // Check if it's a formula that wasn't evaluated (contains quotes or field references)
            if (value.includes('"') || value.includes('→') || value.includes('(')) {
                console.error('❌ Unevaluated formula detected:', value);
                return "Error";
            }

            // Try to parse it as a number
            const parsed = parseFloat(value);
            if (!isNaN(parsed)) {
                value = parsed;
            } else {
                // It's a legitimate string result (from IF condition)
                return value;
            }
        }

        // ✅ Handle numeric values
        const numValue = typeof value === 'number' ? value : parseFloat(value);

        if (isNaN(numValue) || numValue === null || numValue === undefined) {
            console.error('❌ Invalid calculated value:', value);
            return "0.00";
        }

        const precision = calcField.precision || 2;

        switch (calcField.format) {
            case 'currency':
                return `Rs.${numValue.toFixed(precision)}`;
            case 'percentage':
                return `${numValue.toFixed(precision)}%`;
            case 'integer':
                return Math.round(numValue).toString();
            case 'decimal':
            default:
                return numValue.toFixed(precision);
        }
    };

    if (loading) return <LoadingDots />;

    if (error) return <div className="error">{error}</div>;

    const loadingStyles = `
@keyframes bounce {
    0%, 100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-10px);
    }
}

@keyframes pulse {
    0%, 100% {
        opacity: 1;
        transform: scale(1);
    }
    50% {
        opacity: 0.7;
        transform: scale(1.1);
    }
}

.animate-bounce {
    animation: bounce 1s ease-in-out infinite;
}

.animate-pulse {
    animation: pulse 1.5s ease-in-out infinite;
}
`;

    const darkModeStyles = `
/* ============================================
   DARK MODE STYLES - FIXED VERSION
   ============================================ */

/* Base dark mode class */
body.dark-mode,
html.dark-mode,
.dark-mode {
    background-color: #111827 !important;
    color: #f3f4f6 !important;
}

/* Report viewer wrapper */
.report-viewer-wrapper.dark-mode {
    background-color: #111827 !important;
    color: #f3f4f6 !important;
    min-height: 100vh;
}

.report-viewer-wrapper.light-mode {
    background-color: #ffffff !important;
    color: #1f2937 !important;
}

/* Viewer heading */
.dark-mode .viewer-heading {
    color: #f3f4f6 !important;
}

/* Filter section */
.dark-mode .filter-section {
    background-color: #1f2937 !important;
    border: 1px solid #374151 !important;
}

.dark-mode .filter-section h3 {
    color: #f3f4f6 !important;
}

.dark-mode .filter-section label {
    color: #d1d5db !important;
}

.dark-mode .filter-section input,
.dark-mode .filter-section select {
    background-color: #374151 !important;
    color: #f3f4f6 !important;
    border: 1px solid #4b5563 !important;
}

.dark-mode .filter-section input::placeholder {
    color: #9ca3af !important;
}

/* Stats card */
.dark-mode .stats-card {
    background-color: #1f2937 !important;
    border: 1px solid #374151 !important;
}

.dark-mode .stat-number {
    color: #60a5fa !important;
}

/* View controls */
.dark-mode .view-controls {
    background-color: #1f2937 !important;
    padding: 12px !important;
    border-radius: 8px !important;
}

.dark-mode .view-controls button {
    background-color: #374151 !important;
    color: #d1d5db !important;
    border: 1px solid #4b5563 !important;
}

.dark-mode .view-controls button:hover {
    background-color: #4b5563 !important;
    color: #f3f4f6 !important;
}

.dark-mode .view-controls button.active {
    background-color: #3b82f6 !important;
    color: white !important;
}

/* Dark mode toggle button specific styles */
.dark-mode-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 2px solid #e5e7eb !important;
}

.light-mode .dark-mode-toggle {
    background: linear-gradient(135deg, #374151 0%, #4b5563 100%) !important;
    color: white !important;
    border-color: #374151 !important;
}

.light-mode .dark-mode-toggle:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.dark-mode .dark-mode-toggle {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%) !important;
    color: #1f2937 !important;
    border-color: #f59e0b !important;
}

.dark-mode .dark-mode-toggle:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
}

/* Report table */
.dark-mode .report-table,
.dark-mode .table-container {
    background-color: #1f2937 !important;
}

.dark-mode .report-table {
    border: 1px solid #374151 !important;
}

.dark-mode .report-table thead {
    background-color: #374151 !important;
}

.dark-mode .report-table th {
    color: #f3f4f6 !important;
    border: 1px solid #4b5563 !important;
    background-color: #374151 !important;
}

.dark-mode .report-table td {
    color: #d1d5db !important;
    border: 1px solid #374151 !important;
    background-color: #1f2937 !important;
}

.dark-mode .report-table tbody tr:hover {
    background-color: #374151 !important;
}

.dark-mode .report-table tbody tr:hover td {
    background-color: #374151 !important;
}

/* Chart containers */
.dark-mode .chart-container,
.dark-mode .shift-chart-container {
    background-color: #1f2937 !important;
    border: 1px solid #374151 !important;
    border-radius: 12px !important;
    padding: 20px !important;
}

.dark-mode .dashboard-chart-item {
    background-color: #1f2937 !important;
    border: 1px solid #374151 !important;
    border-radius: 12px !important;
    padding: 16px !important;
}

/* Main content area */
.dark-mode .main-content {
    background-color: #111827 !important;
}

/* Grouped view */
.dark-mode .group {
    background-color: #1f2937 !important;
    border: 1px solid #374151 !important;
}

.dark-mode .group-header {
    background-color: #374151 !important;
    border-bottom: 1px solid #4b5563 !important;
}

.dark-mode .group-header h4 {
    color: #f3f4f6 !important;
}

/* Summary rows */
.dark-mode .summary-divider {
    background: linear-gradient(to right, #374151, #4b5563) !important;
}

.dark-mode .summary-divider-cell {
    border-top: 2px solid #4b5563 !important;
    border-bottom: 1px solid #4b5563 !important;
}

.dark-mode .summary-row {
    background-color: #422006 !important;
}

.dark-mode .summary-row:hover {
    background-color: #451a03 !important;
}

.dark-mode .summary-row td {
    background-color: #422006 !important;
}

.dark-mode .summary-row:hover td {
    background-color: #451a03 !important;
}

.dark-mode .summary-label {
    border-right: 1px solid #92400e !important;
}

.dark-mode .summary-type {
    color: #fcd34d !important;
}

.dark-mode .summary-result {
    color: #fde68a !important;
}

.dark-mode .summary-formula {
    color: #a3a3a3 !important;
}

/* Buttons */
.dark-mode button {
    background-color: #374151 !important;
    color: #d1d5db !important;
    border: 1px solid #4b5563 !important;
}

.dark-mode button:hover {
    background-color: #4b5563 !important;
}

.dark-mode .bg-blue-600 {
    background-color: #2563eb !important;
}

.dark-mode .bg-red-100 {
    background-color: #7f1d1d !important;
}

/* Maximize controls */
.dark-mode .maximize-controls-overlay {
    background: transparent !important;
}

.dark-mode .refresh-btn {
    background-color: #2563eb !important;
}

.dark-mode .minimize-btn {
    background-color: #dc2626 !important;
}

.dark-mode .maximize-chart-btn {
    background-color: #374151 !important;
    border-color: #4b5563 !important;
    color: #d1d5db !important;
}

/* Empty states and messages */
.dark-mode .text-center.py-12,
.dark-mode .text-center.bg-gray-50 {
    background-color: #1f2937 !important;
    color: #d1d5db !important;
}

/* Scrollbars for dark mode */
.dark-mode ::-webkit-scrollbar {
    width: 12px;
    height: 12px;
    background-color: #1f2937;
}

.dark-mode ::-webkit-scrollbar-track {
    background: #1f2937;
}

.dark-mode ::-webkit-scrollbar-thumb {
    background: #4b5563;
    border-radius: 6px;
}

.dark-mode ::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
}

/* Mini grid table */
.dark-mode .mini-grid-table {
    background-color: #374151 !important;
    border-color: #4b5563 !important;
}

.dark-mode .mini-grid-table th {
    background-color: #4b5563 !important;
    color: #f3f4f6 !important;
}

.dark-mode .mini-grid-table td {
    color: #d1d5db !important;
    border-color: #4b5563 !important;
}

/* Shift period selector buttons */
.dark-mode .mb-6.flex button {
    background-color: #374151 !important;
    color: #d1d5db !important;
}

.dark-mode .mb-6.flex button.bg-blue-600 {
    background-color: #2563eb !important;
    color: white !important;
}

/* Override any white backgrounds */
.dark-mode div,
.dark-mode section,
.dark-mode article {
    background-color: inherit;
}

/* Ensure proper text color inheritance */
.dark-mode * {
    color: inherit;
}

.dark-mode h1, .dark-mode h2, .dark-mode h3, 
.dark-mode h4, .dark-mode h5, .dark-mode h6 {
    color: #f3f4f6 !important;
}

.dark-mode p {
    color: #d1d5db !important;
}

/* Animations */
.report-viewer-wrapper,
.report-viewer-wrapper * {
    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}

/* Maximized mode dark mode fixes */
.dark-mode .maximized-mode {
    background-color: #111827 !important;
}

.dark-mode .chart-maximized {
    background-color: #1f2937 !important;
}

/* Shift period selector in maximized view */
.dark-mode .maximize-controls-overlay {
    background: transparent !important;
}

/* Date picker in dark mode */
.dark-mode input[type="date"] {
    background-color: #374151 !important;
    color: #f3f4f6 !important;
    border-color: #4b5563 !important;
}

.dark-mode input[type="date"]::-webkit-calendar-picker-indicator {
    filter: invert(1);
}

/* Summary cards - ensure proper colors */
.dark-mode .bg-gradient-to-br.from-orange-50 {
    background: linear-gradient(to bottom right, #7c2d12, #9a3412) !important;
}

.dark-mode .border-orange-200 {
    border-color: #c2410c !important;
}

.dark-mode .text-orange-800 {
    color: #fdba74 !important;
}

.dark-mode .text-orange-600 {
    color: #fb923c !important;
}

/* Fix for "No Charts Configured" message */
.dark-mode .text-gray-600 {
    color: #d1d5db !important;
}

.dark-mode .text-gray-500 {
    color: #9ca3af !important;
}

/* Ensure all text inherits proper color */
.dark-mode .text-center {
    color: inherit !important;
}
`;

    // ✅ ADD THIS HELPER FUNCTION - Split IF statement parts properly
    //const splitIfParts = (content) => {
    //    const parts = [];
    //    let current = '';
    //    let depth = 0;
    //    let inString = false;
    //    let stringChar = null;

    //    for (let i = 0; i < content.length; i++) {
    //        const char = content[i];

    //        if ((char === '"' || char === "'") && content[i - 1] !== '\\') {
    //            if (!inString) {
    //                inString = true;
    //                stringChar = char;
    //            } else if (char === stringChar) {
    //                inString = false;
    //                stringChar = null;
    //            }
    //        }

    //        if (!inString) {
    //            if (char === '(') depth++;
    //            if (char === ')') depth--;

    //            if (char === ',' && depth === 0) {
    //                parts.push(current.trim());
    //                current = '';
    //                continue;
    //            }
    //        }

    //        current += char;
    //    }

    //    if (current) {
    //        parts.push(current.trim());
    //    }

    //    return parts;
    //};

    const evaluateExpression = (expression, rowData, fields) => {
        try {
            let processedExpression = expression;

            // ✅ Handle IF conditions BEFORE field replacement to preserve string literals
            const ifMatches = expression.match(/IF\(([^)]+(?:\([^)]*\))?[^)]*)\)/g);
            const ifReplacements = {};

            if (ifMatches) {
                ifMatches.forEach((ifMatch, idx) => {
                    const placeholder = `__IF_PLACEHOLDER_${idx}__`;
                    ifReplacements[placeholder] = ifMatch;
                    processedExpression = processedExpression.replace(ifMatch, placeholder);
                });
            }

            // ✅ Build a comprehensive field values map
            const fieldMatches = expression.match(/"([^"]+)"/g) || [];
            const fieldValues = {};

            // Inside evaluateExpression function
            fieldMatches.forEach(match => {
                const fieldLabel = match.replace(/"/g, '');
                const field = fields.find(f => f.label === fieldLabel);

                if (field) {
                    const baseFieldId = field.id.split(':')[0];
                    const fieldData = submission.submissionData?.find(d => d.fieldLabel === baseFieldId);

                    let value = null;

                    if (fieldData) {
                        try {
                            const parsed = JSON.parse(fieldData.fieldValue || "null");
                            if (Array.isArray(parsed)) {
                                const columnName = field.label.split('→').pop().trim();

                                // 🔥 FIX: Use getFieldValue with full context for aggregation
                                value = getFieldValue(
                                    field.label,
                                    submission.submissionData,
                                    fields,
                                    allSubmissions,  // ← Pass full data
                                    submission.submissionId  // ← Pass submission ID
                                );
                            } else {
                                value = parsed;
                            }
                        } catch {
                            value = fieldData.fieldValue;
                        }
                    }

                    fieldValues[match] = value;
                    fieldValues[fieldLabel] = value;
                }
            });

            console.log('Field values map:', fieldValues); // ✅ DEBUG LOG

            // ✅ IMPROVED: Helper function to evaluate a value (field reference, string literal, or number)
            const evaluateValue = (val) => {
                val = val.trim();

                console.log('Evaluating value:', val); // ✅ DEBUG LOG

                // Check if it's a string literal (surrounded by single quotes)
                if (val.startsWith("'") && val.endsWith("'")) {
                    const stringValue = val.slice(1, -1);
                    console.log('String literal:', stringValue); // ✅ DEBUG LOG
                    return stringValue;
                }

                // Check if it's a field reference (surrounded by double quotes)
                if (val.startsWith('"') && val.endsWith('"')) {
                    const fieldName = val.slice(1, -1);
                    const fieldValue = fieldValues[fieldName];
                    console.log('Field reference:', fieldName, '-> value:', fieldValue); // ✅ DEBUG LOG

                    if (fieldValue !== null && fieldValue !== undefined) {
                        return fieldValue;
                    }

                    // If not found in map, try to get it directly
                    const field = fields.find(f => f.label === fieldName);
                    const fieldData = rowData.find(d => {
                        if (d.fieldLabel === fieldName) return true;
                        if (field && d.fieldLabel === field.id) return true;
                        if (field && field.id.includes(':')) {
                            const baseFieldId = field.id.split(':')[0];
                            return d.fieldLabel === baseFieldId;
                        }
                        return false;
                    });

                    if (fieldData) {
                        try {
                            const parsed = JSON.parse(fieldData.value);
                            console.log('Found field data (parsed):', parsed); // ✅ DEBUG LOG
                            return typeof parsed === 'string' ? parsed : String(parsed);
                        } catch {
                            console.log('Found field data (raw):', fieldData.value); // ✅ DEBUG LOG
                            return fieldData.value;
                        }
                    }

                    console.warn('Field not found:', fieldName); // ✅ DEBUG LOG
                    return fieldName; // Return field name if value not found
                }

                // Check if it's a number
                const numValue = parseFloat(val);
                if (!isNaN(numValue)) {
                    console.log('Number value:', numValue); // ✅ DEBUG LOG
                    return numValue;
                }

                console.log('Returning as-is:', val); // ✅ DEBUG LOG
                return val;
            };

            // Restore IF conditions and evaluate them
            Object.entries(ifReplacements).forEach(([placeholder, ifStatement]) => {
                // Parse IF(condition, trueValue, falseValue)
                const ifContent = ifStatement.match(/IF\((.*)\)/)[1];
                const parts = splitIfParts(ifContent);

                console.log('IF statement parts:', parts); // ✅ DEBUG LOG

                if (parts.length === 3) {
                    let [condition, trueVal, falseVal] = parts;

                    // Replace field references in condition with actual values
                    Object.entries(fieldValues).forEach(([fieldRef, value]) => {
                        if (condition.includes(fieldRef)) {
                            // For string comparisons, wrap value in quotes
                            if (typeof value === 'string') {
                                condition = condition.replace(new RegExp(fieldRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `'${value}'`);
                            } else if (value === null) {
                                condition = condition.replace(new RegExp(fieldRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'null');
                            } else {
                                condition = condition.replace(new RegExp(fieldRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
                            }
                        }
                    });

                    console.log('Condition after replacement:', condition); // ✅ DEBUG LOG

                    // Clean up the condition (replace == with ===, handle = vs ==)
                    condition = condition.replace(/\s*==\s*/g, ' === ').replace(/\s*=\s*(?!=)/g, ' === ');

                    try {
                        // Evaluate condition safely
                        const conditionResult = eval(condition.trim());
                        console.log('Condition result:', conditionResult); // ✅ DEBUG LOG

                        // ✅ Evaluate trueVal and falseVal (could be field references or literals)
                        let result;
                        if (conditionResult) {
                            console.log('Evaluating TRUE branch:', trueVal); // ✅ DEBUG LOG
                            result = evaluateValue(trueVal);
                        } else {
                            console.log('Evaluating FALSE branch:', falseVal); // ✅ DEBUG LOG
                            result = evaluateValue(falseVal);
                        }

                        console.log('Final result:', result); // ✅ DEBUG LOG

                        // ✅ Handle the result based on its type
                        if (typeof result === 'string') {
                            processedExpression = processedExpression.replace(placeholder, `'${result}'`);
                        } else {
                            processedExpression = processedExpression.replace(placeholder, result);
                        }
                    } catch (error) {
                        console.error('IF condition evaluation error:', error, 'Condition:', condition);
                        const fallbackResult = evaluateValue(falseVal);
                        if (typeof fallbackResult === 'string') {
                            processedExpression = processedExpression.replace(placeholder, `'${fallbackResult}'`);
                        } else {
                            processedExpression = processedExpression.replace(placeholder, fallbackResult);
                        }
                    }
                }
            });

            // If the final expression is a string literal, return it directly
            const stringMatch = processedExpression.match(/^['"](.*)['"]$/);
            if (stringMatch) {
                return stringMatch[1];
            }

            // Replace remaining field references with numeric values
            Object.entries(fieldValues).forEach(([fieldRef, value]) => {
                if (processedExpression.includes(fieldRef)) {
                    const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
                    processedExpression = processedExpression.replace(new RegExp(fieldRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), numValue);
                }
            });

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

            // Evaluate the final expression
            const result = eval(processedExpression);

            // If result is a string, return it as-is
            if (typeof result === 'string') {
                return result;
            }

            // If result is a number, return it
            return result;
        } catch (error) {
            console.error('Expression evaluation error:', error, 'Expression:', expression);
            return "Error";
        }
    };

    return (
        <>
            <style>{loadingStyles + exportStyles}</style>
            <style>{shiftChartStyles + maximizeStyles + darkModeStyles}</style>
            <div
                className={`report-viewer-wrapper ${isDarkMode ? 'dark-mode' : 'light-mode'}`}
                style={{
                    backgroundColor: isDarkMode ? '#111827' : '#ffffff',
                    minHeight: '100vh',
                    color: isDarkMode ? '#f3f4f6' : '#1f2937'
                }}
            >
                {/* ✅ ADD DEBUG INDICATOR */}
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
                                onClick={fetchFilteredReport1}
                                disabled={isRefreshing}
                                className={`px-4 py-2 rounded font-medium transition-colors ${isRefreshing
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                    } text-white`}
                            >
                                {isRefreshing ? (
                                    <span className="flex items-center gap-3">
                                        <span className="relative flex items-center">
                                            <span className="text-2xl animate-bounce">👨‍💼</span>
                                            <span className="text-xl ml-1">➡️</span>
                                            <span className="text-2xl ml-1 animate-pulse">🗄️</span>
                                        </span>
                                        <span>Collecting Data from Database...</span>
                                    </span>
                                ) : (
                                    '▶️ Run Report'
                                )}
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