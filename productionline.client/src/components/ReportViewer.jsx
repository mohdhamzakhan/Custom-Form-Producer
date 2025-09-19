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

                const calculatedFields = res.data.calculatedFields || [];
                setCalculatedFields(calculatedFields);

                const resolvedFields = (res.data.fields || []).map(f => ({
                    id: f.fieldId || f.id,
                    label: f.fieldLabel || f.label,
                    type: f.type || "text",
                }));

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

                const charts = res.data.chartConfig || [];
                if (charts.length === 0 && res.data.chartConfig) {
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
            const { processedData, summaryRows } = processCalculatedFields(res.data, calculatedFields, fields);

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
        const isDateLikeValue = (value) => {
            if (typeof value !== 'string') return false;

            // Check for common date patterns
            const datePatterns = [
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO datetime: 2025-06-12T18:30:00
                /^\d{4}-\d{2}-\d{2}/, // Date: 2025-06-12
                /^\d{2}\/\d{2}\/\d{4}/, // Date: 12/06/2025
                /^\d{2}-\d{2}-\d{4}/, // Date: 12-06-2025
            ];

            // Test if value matches any date pattern
            const matchesPattern = datePatterns.some(pattern => pattern.test(value));

            // Also check if it's a valid date when parsed
            const isValidDate = !isNaN(Date.parse(value));

            return matchesPattern && isValidDate;
        };
        const transformedData = reportData.map((row, index) => {
            const chartPoint = { submissionId: row.submissionId || index };

            (row.data || []).forEach(cell => {
                const fieldLabel = cell.fieldLabel;
                let value = cell.value;

                if (fieldLabel === 'Date') {
                    console.log('Date processing:', {
                        original: value,
                        type: typeof value,
                        isString: typeof value === 'string',
                        parseFloat: parseFloat(value),
                        isNaN: isNaN(parseFloat(value))
                    });
                }

                if (value === null || value === undefined || value === '') {
                    chartPoint[fieldLabel] = 0;
                    return;
                }

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
                    if (typeof value === 'string' && isDateLikeValue(value)) {
                        chartPoint[fieldLabel] = value; // Keep as date string
                    } else {
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue) && isFinite(numValue)) {
                            chartPoint[fieldLabel] = numValue;
                        } else {
                            chartPoint[fieldLabel] = value;
                        }
                    }
                }
                if (fieldLabel === 'Date') {
                    console.log('Final chart point value:', chartPoint[fieldLabel]);
                }
            });

            return chartPoint;
        });

        return transformedData;
    }, [reportData]);

    

    const resolveFieldReference = (fieldRef, fields) => {
        let field = fields.find(f => f.id === fieldRef);
        if (field) return field;

        field = fields.find(f => f.label === fieldRef);
        if (field) return field;

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

        return (
            <div className="charts-grid space-y-6">
                {chartConfigs.map((chart, index) => (
                    <div key={chart.id || index} className="chart-container">
                        <ReportCharts
                            data={chartData}
                            metrics={chart.metrics}
                            type={chart.type}
                            xField={chart.xField || "submissionId"}
                            title={chart.title || `Chart ${index + 1}`}
                            comboConfig={chart.comboConfig}
                        />
                    </div>
                ))}
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
                                xField={chart.xField || "Line Name"}
                                title={chart.title || `Chart ${index + 1}`}
                                comboConfig={chart.comboConfig}
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
`;

    const processCalculatedFields = (reportData, calculatedFields, fields) => {
        if (!calculatedFields || calculatedFields.length === 0) {
            return {
                processedData: reportData,
                summaryRows: []
            };
        }

        const processedData = [];
        const summaryRows = [];

        for (const row of reportData) {
            const newRow = { ...row };
            const calculatedData = [];

            for (const calcField of calculatedFields) {
                if (calcField.calculationType === 'columnwise') {
                    continue;
                }

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

        for (const calcField of calculatedFields) {
            if (calcField.calculationType === 'columnwise') {
                const summaryValue = calculateColumnwiseSummary(calcField, reportData, fields);
                summaryRows.push({
                    label: calcField.label,
                    value: formatCalculatedValue(summaryValue, calcField),
                    type: calcField.functionType || 'CALCULATION',
                    formula: calcField.formula
                });
            }
        }

        return { processedData, summaryRows };
    };

    const renderExpandedTableWithSummary = (reportData, summaryRows, selectedFields, fields) => {
        const columnFields = selectedFields.filter(field => {
            const fieldType = typeof field === 'object' ? field.type : 'normal';
            return fieldType !== 'calculated' || field.showAsColumn;
        });

        return (
            <>
                <style>{summaryRowsCSS}</style>
                <div className="table-container">
                    <table className="report-table">
                        <thead>
                            <tr>
                                {selectedFields.map((field, i) => {
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
                                    {selectedFields.map((field, j) => {
                                        const fLabel = typeof field === 'object' ? field.label : field;
                                        const fieldData = row.data?.find(d => d.fieldLabel === fLabel);
                                        return <td key={j}>{formatCellValue(fieldData?.value, field)}</td>;
                                    })}
                                </tr>
                            ))}

                            {summaryRows.length > 0 && (
                                <>
                                    <tr className="summary-divider">
                                        <td colSpan={selectedFields.length} className="summary-divider-cell">
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
                                            <td className="summary-value" colSpan={selectedFields.length - 1}>
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
                    return 0;
                case 'grouping':
                    return evaluateGroupingCalculation(formula, rowData, allReportData, functionType, fields);
                default:
                    return evaluateRowwiseCalculation(formula, rowData, functionType, fields);
            }
        } catch (error) {
            return 'Error';
        }
    };

    const evaluateRowwiseCalculation = (formula, rowData, functionType, fields) => {
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
        }).filter(val => !isNaN(val));

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
        const { formula, functionType } = calcField;
        const fieldRefs = extractFieldReferences(formula);

        if (fieldRefs.length === 0) return 0;

        const fieldName = fieldRefs[0];
        const allValues = allReportData.map(row => getFieldValue(fieldName, row.data, fields))
            .filter(val => !isNaN(val) && val !== 0);

        switch (functionType) {
            case 'SUM':
            case 'RUNNING_TOTAL':
                return allValues.reduce((sum, val) => sum + val, 0);
            case 'AVG':
            case 'CUMULATIVE_AVG':
                return allValues.length > 0 ? allValues.reduce((sum, val) => sum + val, 0) / allValues.length : 0;
            case 'COUNT':
                return allValues.length;
            case 'MIN':
                return allValues.length > 0 ? Math.min(...allValues) : 0;
            case 'MAX':
                return allValues.length > 0 ? Math.max(...allValues) : 0;
            case 'PERCENT_OF_TOTAL':
                return 100;
            default:
                return allValues.reduce((sum, val) => sum + val, 0);
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

        if (!fieldData) {
            return 0;
        }

        let value = fieldData.value;

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

                return parsed.reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
            }

            const numValue = parseFloat(parsed);
            return isNaN(numValue) ? 0 : numValue;
        } catch (e) {
            const numValue = parseFloat(value);
            return isNaN(numValue) ? 0 : numValue;
        }
    };

    const formatCalculatedValue = (value, calcField) => {
        if (isNaN(value)) return "Error";

        const { format, precision = 2 } = calcField;

        switch (format) {
            case 'currency':
                return `${value.toFixed(precision)}`;
            case 'percentage':
                return `${value.toFixed(precision)}%`;
            case 'integer':
                return Math.round(value).toString();
            case 'decimal':
            default:
                return value.toFixed(precision);
        }
    };

    if (loading) return <div className="loading">Loading report...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="report-viewer-wrapper">
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