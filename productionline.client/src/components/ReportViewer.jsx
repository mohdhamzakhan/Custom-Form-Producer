import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import ReportCharts from "./ReportCharts";
import { APP_CONSTANTS } from "./store";
import "../report_viewer_styles.css";

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

    useEffect(() => {
        const fetchTemplate = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${APP_CONSTANTS.API_BASE_URL}/api/reports/template/${templateId}`);
                setTemplate(res.data);
                setFilters(res.data.filters || []);

                // Add this line to load calculated fields
                const calculatedFields = res.data.calculatedFields || [];

                const resolvedFields = (res.data.fields || []).map(f => ({
                    id: f.fieldId || f.id,
                    label: f.fieldLabel || f.label,
                    type: f.type || "text",
                }));

                // Add calculated fields to the fields list for display
                calculatedFields.forEach(cf => {
                    resolvedFields.push({
                        id: `calc_${cf.label}`,
                        label: cf.label,
                        type: "calculated"
                    });
                });

                setFields(resolvedFields);
                setSelectedFields(resolvedFields);

                setTemplate(prev => ({ ...prev, calculatedFields }));

                // Handle multiple chart configurations
                const charts = res.data.chartConfig || [];
                console.log(charts)
                if (charts.length === 0 && res.data.chartConfig) {
                    // Backward compatibility - convert single chart to array
                    charts.push({
                        id: 1,
                        title: res.data.chartConfig.title || "Chart 1",
                        type: res.data.chartConfig.type || "bar",
                        metrics: res.data.chartConfig.metrics || [],
                        xField: res.data.chartConfig.xField,
                        position: { row: 0, col: 0, width: 12, height: 6 },
                        comboConfig: res.data.chartConfig.comboConfig || { barMetrics: [], lineMetrics: [] }
                    });
                }
                setChartConfigs(charts);

                setLoading(false);

                if (!res.data.filters || res.data.filters.length === 0) {
                    fetchFilteredReport();
                }
            } catch (err) {
                setError("Failed to load template: " + (err.message || "Unknown error"));
                setLoading(false);
            }
        };

        fetchTemplate();
    }, [templateId]);

    const fetchFilteredReport = async () => {
        try {
            setLoading(true);
            const res = await axios.post(`${APP_CONSTANTS.API_BASE_URL}/api/reports/run/${templateId}`, runtimeFilters);

            // Process calculated fields with separation
            const { processedData, summaryRows } = processCalculatedFields(res.data, calculatedFields, fields);
            console.log('Processed report data:', processedData);
            console.log('Summary rows:', summaryRows);

            setReportData(processedData);
            setSummaryRows(summaryRows); // You'll need to add this state
            setLoading(false);
        } catch (err) {
            setError("Failed to run filtered report: " + (err.message || "Unknown error"));
            setLoading(false);
        }
    };

    const chartData = useMemo(() => {
        if (!reportData || reportData.length === 0) return [];

        console.log('=== CHART DATA TRANSFORMATION DEBUG ===');
        console.log('Raw reportData:', reportData);

        const transformedData = reportData.map((row, index) => {
            const chartPoint = { submissionId: row.submissionId || index };

            console.log(`Processing row ${index}:`, row);

            // Process each data field
            (row.data || []).forEach(cell => {
                const fieldLabel = cell.fieldLabel;
                let value = cell.value;

                console.log(`  Field: ${fieldLabel}, Raw Value: ${value}`);

                // Handle different value types
                if (value === null || value === undefined || value === '') {
                    chartPoint[fieldLabel] = 0;
                    return;
                }

                // Try to parse JSON (for grid/complex data)
                try {
                    const parsed = JSON.parse(value);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        // For arrays, try to sum numeric values or take first item
                        if (typeof parsed[0] === 'object') {
                            // Grid data - we'll handle this differently
                            console.log(`    Grid data detected for ${fieldLabel}:`, parsed);
                            chartPoint[fieldLabel] = parsed.length; // For now, use count
                        } else {
                            // Array of primitives
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
                    // Not JSON, handle as primitive value
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue) && isFinite(numValue)) {
                        chartPoint[fieldLabel] = numValue;
                        console.log(`    Converted to number: ${numValue}`);
                    } else {
                        chartPoint[fieldLabel] = value;
                        console.log(`    Kept as string: ${value}`);
                    }
                }
            });

            console.log(`  Final chart point for row ${index}:`, chartPoint);
            return chartPoint;
        });

        console.log('=== FINAL TRANSFORMED DATA ===');
        console.log('Transformed data:', transformedData);

        // Show sample data analysis
        if (transformedData.length > 0) {
            const samplePoint = transformedData[0];
            console.log('Sample data point keys:', Object.keys(samplePoint));
            console.log('Sample values:');
            Object.entries(samplePoint).forEach(([key, value]) => {
                console.log(`  ${key}: ${value} (${typeof value})`);
            });
        }

        console.log('=====================================');
        return transformedData;
    }, [reportData]);

    const resolveFieldReference = (fieldRef, fields) => {
        // First try direct match with field ID
        let field = fields.find(f => f.id === fieldRef);
        if (field) return field;

        // Then try match with field label
        field = fields.find(f => f.label === fieldRef);
        if (field) return field;

        // For grid fields, try to find parent
        if (typeof fieldRef === 'string' && fieldRef.includes(':')) {
            const parentId = fieldRef.split(':')[0];
            field = fields.find(f => f.id === parentId);
            if (field) return field;
        }

        return null;
    };

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

    //const renderExpandedTable = () => (
    //    <div className="table-container">
    //        <table className="report-table">
    //            <thead>
    //                <tr>
    //                    {selectedFields.map((field, i) => {
    //                        const label = typeof field === 'object' ? field.label : field;
    //                        const cleanedLabel = label.includes("→")
    //                            ? label.split("→").pop().trim()
    //                            : label;

    //                        return <th key={i}>{cleanedLabel}</th>;
    //                    })}
    //                </tr>
    //            </thead>

    //            <tbody>
    //                {reportData.map((row, i) => (
    //                    <tr key={i}>
    //                        {selectedFields.map((field, j) => {
    //                            const fLabel = typeof field === 'object' ? field.label : field;
    //                            const fieldData = row.data?.find(d => d.fieldLabel === fLabel);
    //                            return <td key={j}>{formatCellValue(fieldData?.value, field)}</td>;
    //                        })}
    //                    </tr>
    //                ))}
    //            </tbody>
    //        </table>
    //    </div>
    //);
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

    // Add this to your renderChartsView function in ReportViewer.jsx
    const renderChartsView = () => {
        if (chartConfigs.length === 0) {
            return (
                <div className="text-center py-12 bg-gray-50 rounded">
                    <div className="text-6xl mb-4">📈</div>
                    <h3 className="text-xl font-medium text-gray-600 mb-2">No Charts Configured</h3>
                    <p className="text-gray-500">Charts need to be configured in the report designer.</p>
                </div>
            );
        }

        const ChartDataDebugWrapper = ({ data, metrics, type, xField, title, comboConfig, children }) => {
            console.log('=== CHART DATA FLOW DEBUG ===');
            console.log('Props received by ReportCharts:');
            console.log('  data:', data);
            console.log('  data type:', typeof data);
            console.log('  data length:', data?.length);
            console.log('  metrics:', metrics);
            console.log('  type:', type);
            console.log('  xField:', xField);
            console.log('  title:', title);
            console.log('  comboConfig:', comboConfig);

            // Validate data structure
            if (data && data.length > 0) {
                console.log('First data item keys:', Object.keys(data[0]));
                console.log('First data item:', data[0]);

                // Check if metrics exist in first item
                metrics?.forEach(metric => {
                    const value = data[0][metric];
                    console.log(`  Metric "${metric}": ${value} (${typeof value})`);
                });
            }

            console.log('===============================');

            return null; // This is just for debugging
        };

        return (
            <div className="charts-grid space-y-6">
                {chartConfigs.map((chart, index) => {
                    console.log(`=== RENDERING CHART ${index} ===`);
                    console.log('Chart config:', chart);
                    console.log('Available data:', chartData);

                    // Check if metrics exist in data
                    const dataKeys = chartData.length > 0 ? Object.keys(chartData[0]) : [];
                    const metricsFound = chart.metrics.filter(metric => dataKeys.includes(metric));
                    const metricsNotFound = chart.metrics.filter(metric => !dataKeys.includes(metric));

                    console.log('Metrics found in data:', metricsFound);
                    console.log('Metrics NOT found in data:', metricsNotFound);
                    console.log('X-field exists:', dataKeys.includes(chart.xField));

                    // Sample values for found metrics
                    if (chartData.length > 0) {
                        console.log('Sample metric values:');
                        chart.metrics.forEach(metric => {
                            const sampleValue = chartData[0][metric];
                            console.log(`  ${metric}: ${sampleValue} (${typeof sampleValue})`);
                        });
                    }

                    console.log('================================');

                    return (
                        <div key={chart.id || index} className="chart-container">
                            {/* Enhanced debug info */}
                            <div className="mb-4 p-3 bg-blue-50 border rounded text-sm">
                                <div className="font-semibold mb-2">Chart Debug Info:</div>
                                <div><strong>Title:</strong> {chart.title}</div>
                                <div><strong>Type:</strong> {chart.type}</div>
                                <div><strong>Data Points:</strong> {chartData.length}</div>
                                <div><strong>Metrics:</strong> {chart.metrics.join(', ')}</div>
                                <div><strong>X-Field:</strong> {chart.xField}</div>
                                <div className="mt-2">
                                    <strong>Metrics Status:</strong>
                                    <div className="ml-4">
                                        {chart.metrics.map(metric => {
                                            const found = dataKeys.includes(metric);
                                            const sampleValue = chartData.length > 0 ? chartData[0][metric] : 'N/A';
                                            return (
                                                <div key={metric} className={found ? 'text-green-600' : 'text-red-600'}>
                                                    {found ? '✓' : '✗'} {metric}
                                                    {found && ` (sample: ${sampleValue})`}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <ChartDataDebugWrapper
                                data={chartData}
                                metrics={chart.metrics}
                                type={chart.type}
                                xField={chart.xField || "submissionId"}
                                title={chart.title || `Chart ${index + 1}`}
                                comboConfig={chart.comboConfig}
                            />

                            <ReportCharts
                                data={chartData}
                                metrics={chart.metrics}
                                type={chart.type}
                                xField={chart.xField || "submissionId"}
                                title={chart.title || `Chart ${index + 1}`}
                                comboConfig={chart.comboConfig}
                            />
                        </div>
                    );
                })}
            </div>
        );
    };

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
        if (chartConfigs.length === 0) {
            return renderChartsView(); // Fallback to charts view if no dashboard layout
        }

        return (
            <div className="dashboard-container">
                {/* Summary Stats Row */}
                <div className="mb-6">
                    {renderSummaryStats()}
                </div>
                <DataInspector data={chartData} title="Chart Data" />

                {/* Charts Grid Layout */}
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
                                xField={chart.xField || "Line Name"}
                                title={chart.title || `Chart ${index + 1}`}
                                comboConfig={chart.comboConfig}
                            />
                        </div>
                    ))}
                </div>

                {/* Compact Table Summary */}
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
`;

    if (loading) return <div className="loading">Loading report...</div>;
    if (error) return <div className="error">{error}</div>;
    // Add this function in your ReportViewer.jsx
    //const processCalculatedFields = (reportData, calculatedFields, fields) => {
    //    if (!calculatedFields || calculatedFields.length === 0) return reportData;

    //    console.log('Processing calculated fields:', calculatedFields);

    //    return reportData.map(row => {
    //        const processedRow = { ...row };

    //        calculatedFields.forEach(calcField => {
    //            const { label, formula, calculationType, format, precision } = calcField;

    //            try {
    //                let result = 0;

    //                if (calculationType === "rowwise") {
    //                    result = processRowwiseFormula(formula, row.data, fields);
    //                } else if (calculationType === "aggregate") {
    //                    result = processAggregateFormula(formula, reportData, fields);
    //                } else if (calculationType === "grouping") {
    //                    result = processGroupingFormula(formula, reportData, row, fields);
    //                } else if (calculationType === "columnwise") {
    //                    result = processColumnwiseFormula(formula, reportData, row, fields);
    //                }

    //                // Format the result
    //                const formattedResult = formatCalculatedValue(result, format, precision);

    //                // Add the calculated field to the row data
    //                if (!processedRow.data) processedRow.data = [];
    //                processedRow.data.push({
    //                    fieldLabel: label,
    //                    value: formattedResult
    //                });

    //            } catch (error) {
    //                console.error(`Error calculating field ${label}:`, error);
    //                if (!processedRow.data) processedRow.data = [];
    //                processedRow.data.push({
    //                    fieldLabel: label,
    //                    value: "Error"
    //                });
    //            }
    //        });

    //        return processedRow;
    //    });
    //};
    const processRowwiseFormula = (formula, rowData, fields) => {
        console.log('Processing rowwise formula:', formula);
        console.log('Row data:', rowData);

        let processedFormula = formula;

        // Handle different function types
        if (formula.startsWith('ADD(')) {
            const fieldNames = extractFieldNamesFromFormula(formula);
            const values = fieldNames.map(fieldName => getFieldValue(fieldName, rowData, fields));
            return values.reduce((a, b) => a + b, 0);
        } else if (formula.startsWith('SUBTRACT(')) {
            const fieldNames = extractFieldNamesFromFormula(formula);
            const values = fieldNames.map(fieldName => getFieldValue(fieldName, rowData, fields));
            return values.length >= 2 ? values[0] - values[1] : 0;
        } else if (formula.startsWith('MULTIPLY(')) {
            const fieldNames = extractFieldNamesFromFormula(formula);
            const values = fieldNames.map(fieldName => getFieldValue(fieldName, rowData, fields));
            return values.reduce((a, b) => a * b, 1);
        } else if (formula.startsWith('DIVIDE(')) {
            const fieldNames = extractFieldNamesFromFormula(formula);
            const values = fieldNames.map(fieldName => getFieldValue(fieldName, rowData, fields));
            return values.length >= 2 && values[1] !== 0 ? values[0] / values[1] : 0;
        } else if (formula.startsWith('PERCENTAGE(')) {
            const fieldNames = extractFieldNamesFromFormula(formula);
            const values = fieldNames.map(fieldName => getFieldValue(fieldName, rowData, fields));
            return values.length >= 2 && values[1] !== 0 ? (values[0] / values[1]) * 100 : 0;
        } else if (formula.startsWith('EFFICIENCY(')) {
            const fieldNames = extractFieldNamesFromFormula(formula);
            const values = fieldNames.map(fieldName => getFieldValue(fieldName, rowData, fields));
            if (values.length >= 3) {
                return ((values[0] / values[1]) / values[2]) * 100;
            }
            return 0;
        }

        // Fallback: Replace field references and evaluate
        const fieldRegex = /"([^"]+)"/g;
        processedFormula = processedFormula.replace(fieldRegex, (match, fieldName) => {
            return getFieldValue(fieldName, rowData, fields);
        });

        try {
            return eval(processedFormula);
        } catch (e) {
            console.error('Formula evaluation error:', e);
            return 0;
        }
    };
    const processAggregateFormula = (formula, allData, fields) => {
        console.log('Processing aggregate formula:', formula);

        if (formula.startsWith('SUM(')) {
            const fieldNames = extractFieldNamesFromFormula(formula);
            if (fieldNames.length > 0) {
                const fieldName = fieldNames[0];
                const allValues = allData.map(row => getFieldValue(fieldName, row.data, fields));
                return allValues.reduce((a, b) => a + b, 0);
            }
        } else if (formula.startsWith('AVG(')) {
            const fieldNames = extractFieldNamesFromFormula(formula);
            if (fieldNames.length > 0) {
                const fieldName = fieldNames[0];
                const allValues = allData.map(row => getFieldValue(fieldName, row.data, fields));
                const sum = allValues.reduce((a, b) => a + b, 0);
                return allValues.length > 0 ? sum / allValues.length : 0;
            }
        } else if (formula.startsWith('COUNT(')) {
            const fieldNames = extractFieldNamesFromFormula(formula);
            if (fieldNames.length > 0) {
                const fieldName = fieldNames[0];
                return allData.filter(row => {
                    const value = getFieldValue(fieldName, row.data, fields);
                    return value !== null && value !== undefined && value !== '';
                }).length;
            }
        } else if (formula.startsWith('MIN(')) {
            const fieldNames = extractFieldNamesFromFormula(formula);
            if (fieldNames.length > 0) {
                const fieldName = fieldNames[0];
                const allValues = allData.map(row => getFieldValue(fieldName, row.data, fields));
                return Math.min(...allValues);
            }
        } else if (formula.startsWith('MAX(')) {
            const fieldNames = extractFieldNamesFromFormula(formula);
            if (fieldNames.length > 0) {
                const fieldName = fieldNames[0];
                const allValues = allData.map(row => getFieldValue(fieldName, row.data, fields));
                return Math.max(...allValues);
            }
        }

        return 0;
    };
    const processGroupingFormula = (formula, allData, currentRow, fields) => {
        // For grouping, we'll implement basic GROUP_SUM, GROUP_AVG etc.
        // This is simplified - you might want more sophisticated grouping logic

        if (formula.startsWith('GROUP_SUM(')) {
            const fieldNames = extractFieldNamesFromFormula(formula);
            if (fieldNames.length >= 2) {
                const [valueField, groupField] = fieldNames;
                const currentGroupValue = getFieldValue(groupField, currentRow.data, fields);

                // Find all rows with same group value
                const groupRows = allData.filter(row =>
                    getFieldValue(groupField, row.data, fields) === currentGroupValue
                );

                const groupSum = groupRows.reduce((sum, row) =>
                    sum + getFieldValue(valueField, row.data, fields), 0
                );

                return groupSum;
            }
        } else if (formula.startsWith('EFFICIENCY(')) {
            return processRowwiseFormula(formula, currentRow.data, fields);
        }

        return 0;
    };
    const processColumnwiseFormula = (formula, allData, fields) => {
        console.log('Processing columnwise formula for summary:', formula);

        if (formula.startsWith('SUM(')) {
            const fieldNames = extractFieldNamesFromFormula(formula);
            if (fieldNames.length > 0) {
                const fieldName = fieldNames[0];
                const allValues = allData.map(row => getFieldValue(fieldName, row.data, fields));
                return allValues.reduce((a, b) => a + b, 0);
            }
        } else if (formula.startsWith('AVG(')) {
            const fieldNames = extractFieldNamesFromFormula(formula);
            if (fieldNames.length > 0) {
                const fieldName = fieldNames[0];
                const allValues = allData.map(row => getFieldValue(fieldName, row.data, fields));
                const validValues = allValues.filter(v => !isNaN(v) && v !== 0);
                return validValues.length > 0 ? validValues.reduce((a, b) => a + b, 0) / validValues.length : 0;
            }
        } else if (formula.startsWith('COUNT(')) {
            const fieldNames = extractFieldNamesFromFormula(formula);
            if (fieldNames.length > 0) {
                const fieldName = fieldNames[0];
                return allData.filter(row => {
                    const value = getFieldValue(fieldName, row.data, fields);
                    return value !== null && value !== undefined && value !== '' && value !== 0;
                }).length;
            }
        } else if (formula.startsWith('MIN(')) {
            const fieldNames = extractFieldNamesFromFormula(formula);
            if (fieldNames.length > 0) {
                const fieldName = fieldNames[0];
                const allValues = allData.map(row => getFieldValue(fieldName, row.data, fields))
                    .filter(v => !isNaN(v));
                return allValues.length > 0 ? Math.min(...allValues) : 0;
            }
        } else if (formula.startsWith('MAX(')) {
            const fieldNames = extractFieldNamesFromFormula(formula);
            if (fieldNames.length > 0) {
                const fieldName = fieldNames[0];
                const allValues = allData.map(row => getFieldValue(fieldName, row.data, fields))
                    .filter(v => !isNaN(v));
                return allValues.length > 0 ? Math.max(...allValues) : 0;
            }
        } else if (formula.startsWith('TOTAL_EFFICIENCY(')) {
            // Calculate overall efficiency across all rows
            const fieldNames = extractFieldNamesFromFormula(formula);
            if (fieldNames.length >= 2) {
                const [outputField, inputField] = fieldNames;
                const totalOutput = allData.reduce((sum, row) =>
                    sum + getFieldValue(outputField, row.data, fields), 0);
                const totalInput = allData.reduce((sum, row) =>
                    sum + getFieldValue(inputField, row.data, fields), 0);

                const targetValue = fieldNames.length >= 3 ? parseFloat(fieldNames[2]) : 1;
                return totalInput > 0 ? ((totalOutput / totalInput) / targetValue) * 100 : 0;
            }
        }

        return 0;
    };

    const extractFieldNamesFromFormula = (formula) => {
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

        // Find the field data by label
        const fieldData = rowData.find(d => {
            // Try direct match first
            if (d.fieldLabel === fieldName) return true;

            // Try to find by field label from fields array
            const field = fields.find(f => f.label === fieldName);
            if (field && d.fieldLabel === field.id) return true;

            // For grid fields, try base field match
            if (field && field.id.includes(':')) {
                const baseFieldId = field.id.split(':')[0];
                return d.fieldLabel === baseFieldId;
            }

            return false;
        });

        if (!fieldData) {
            console.warn(`Field not found: ${fieldName}`);
            return 0;
        }

        let value = fieldData.value;

        // Handle grid data (JSON arrays)
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                // For grid data, try to extract column value
                const columnName = fieldName.includes('→') ?
                    fieldName.split('→').pop().trim() : fieldName;

                if (typeof parsed[0] === 'object' && parsed[0][columnName] !== undefined) {
                    // Sum all values in this column
                    return parsed.reduce((sum, row) => {
                        const val = parseFloat(row[columnName]) || 0;
                        return sum + val;
                    }, 0);
                }

                // If it's an array of primitives, sum them
                return parsed.reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
            }

            // Single parsed value
            const numValue = parseFloat(parsed);
            return isNaN(numValue) ? 0 : numValue;
        } catch (e) {
            // Not JSON, try to parse as number
            const numValue = parseFloat(value);
            return isNaN(numValue) ? 0 : numValue;
        }
    };
    const formatCalculatedValue = (value, format, precision = 2) => {
        if (isNaN(value)) return "Error";

        switch (format) {
            case 'currency':
                return `$${value.toFixed(precision)}`;
            case 'percentage':
                return `${value.toFixed(precision)}%`;
            case 'integer':
                return Math.round(value).toString();
            case 'decimal':
            default:
                return value.toFixed(precision);
        }
    };
    const extractValues = (formula) => {
        const matches = formula.match(/[\d.]+/g);
        return matches ? matches.map(Number) : [];
    };
    const processCalculatedFields = (reportData, calculatedFields, fields) => {
        if (!calculatedFields || calculatedFields.length === 0) {
            return { processedData: reportData, summaryRows: [] };
        }

        console.log('Processing calculated fields:', calculatedFields);

        // Separate calculations by type
        const rowwiseCalcs = calculatedFields.filter(cf => cf.calculationType === "rowwise");
        const aggregateCalcs = calculatedFields.filter(cf => cf.calculationType === "aggregate");
        const groupingCalcs = calculatedFields.filter(cf => cf.calculationType === "grouping");
        const columnwiseCalcs = calculatedFields.filter(cf => cf.calculationType === "columnwise");

        // Process row-wise and grouping calculations (add as columns)
        const processedData = reportData.map(row => {
            const processedRow = { ...row };

            [...rowwiseCalcs, ...groupingCalcs].forEach(calcField => {
                const { label, formula, calculationType, format, precision } = calcField;

                try {
                    let result = 0;

                    if (calculationType === "rowwise") {
                        result = processRowwiseFormula(formula, row.data, fields);
                    } else if (calculationType === "grouping") {
                        result = processGroupingFormula(formula, reportData, row, fields);
                    }

                    const formattedResult = formatCalculatedValue(result, format, precision);

                    if (!processedRow.data) processedRow.data = [];
                    processedRow.data.push({
                        fieldLabel: label,
                        value: formattedResult
                    });

                } catch (error) {
                    console.error(`Error calculating field ${label}:`, error);
                    if (!processedRow.data) processedRow.data = [];
                    processedRow.data.push({
                        fieldLabel: label,
                        value: "Error"
                    });
                }
            });

            return processedRow;
        });

        // Process column-wise and aggregate calculations (create summary rows)
        const summaryRows = [];

        [...aggregateCalcs, ...columnwiseCalcs].forEach(calcField => {
            const { label, formula, calculationType, format, precision } = calcField;

            try {
                let result = 0;

                if (calculationType === "aggregate") {
                    result = processAggregateFormula(formula, reportData, fields);
                } else if (calculationType === "columnwise") {
                    result = processColumnwiseFormula(formula, reportData, fields);
                }

                const formattedResult = formatCalculatedValue(result, format, precision);

                summaryRows.push({
                    label: label,
                    value: formattedResult,
                    type: calculationType,
                    formula: formula
                });

            } catch (error) {
                console.error(`Error calculating summary field ${label}:`, error);
                summaryRows.push({
                    label: label,
                    value: "Error",
                    type: calculationType,
                    formula: formula
                });
            }
        });

        return { processedData, summaryRows };
    };
    const renderExpandedTableWithSummary = (reportData, summaryRows, selectedFields, fields) => {
        // Filter selectedFields to exclude calculated fields that should be in summary
        const columnFields = selectedFields.filter(field => {
            const fieldType = typeof field === 'object' ? field.type : 'normal';
            return fieldType !== 'calculated' || field.showAsColumn;
        });

        return (
            <div className="table-container">
                <table className="report-table">
                    <thead>
                        <tr>
                            {columnFields.map((field, i) => {
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
                                {columnFields.map((field, j) => {
                                    const fLabel = typeof field === 'object' ? field.label : field;
                                    const fieldData = row.data?.find(d => d.fieldLabel === fLabel);
                                    return <td key={j}>{formatCellValue(fieldData?.value, field)}</td>;
                                })}
                            </tr>
                        ))}

                        {/* Summary Rows Section */}
                        {summaryRows.length > 0 && (
                            <>
                                <tr className="summary-divider">
                                    <td colSpan={columnFields.length} className="summary-divider-cell">
                                        <div className="summary-divider-line">
                                            <span>📊 Summary & Totals</span>
                                        </div>
                                    </td>
                                </tr>

                                {summaryRows.map((summaryRow, index) => (
                                    <tr key={`summary-${index}`} className="summary-row">
                                        <td className="summary-label">
                                            <strong>{summaryRow.label}</strong>
                                            <div className="summary-type">{summaryRow.type.toUpperCase()}</div>
                                        </td>
                                        <td className="summary-value" colSpan={columnFields.length - 1}>
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
        );
    };


    return (
        <div className="report-viewer-wrapper">
            <h2 className="viewer-heading">📊 Enhanced Report Viewer</h2>

            {/* Filters Section */}
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

            {/* Main Content */}
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
    );
}