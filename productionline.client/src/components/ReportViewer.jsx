import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import ReportCharts from "./ReportCharts";
import { APP_CONSTANTS } from "./store";
import "../report_viewer_styles.css";

export default function ReportViewer() {
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
    const [chartConfig, setChartConfig] = useState({ type: "bar", metrics: [] });

    useEffect(() => {
        const fetchTemplate = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${APP_CONSTANTS.API_BASE_URL}/api/reports/template/${templateId}`);
                setTemplate(res.data);
                setFilters(res.data.filters || []);

                const resolvedFields = (res.data.fields || []).map(f => ({
                    id: f.fieldId || f.id,
                    label: f.fieldLabel || f.label,
                    type: f.type || "text",
                }));

                setFields(resolvedFields);
                setSelectedFields(resolvedFields);

                // Set default chart config if not provided
                setChartConfig({
                    type: res.data.chartConfig?.type || "bar",
                    metrics: res.data.chartConfig?.metrics || []
                });

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
            setReportData(res.data);
            setLoading(false);
        } catch (err) {
            setError("Failed to run filtered report: " + (err.message || "Unknown error"));
            setLoading(false);
        }
    };

    // Memoize the chart data to prevent infinite re-renders
    const chartData = useMemo(() => {
        if (!reportData || reportData.length === 0) return [];

        console.log('Recreating chart data...', reportData.length, 'items');

        // Transform the data to the format expected by ReportCharts
        const transformedData = reportData.map(row => ({
            submissionId: row.submissionId,
            submissionData: (row.data || []).map(cell => ({
                fieldLabel: cell.fieldLabel,
                fieldValue: cell.value
            }))
        }));

        return transformedData;
    }, [reportData]);

    // Memoize selected field IDs
    const selectedFieldIds = useMemo(() => {
        return selectedFields.map(f => typeof f === "string" ? f : f.id);
    }, [selectedFields]);

    // Memoize chart config to prevent object recreation
    const memoizedChartConfig = useMemo(() => ({
        type: chartConfig?.type || "bar",
        metrics: chartConfig?.metrics || []
    }), [chartConfig?.type, chartConfig?.metrics]);

    const formatCellValue = (value, field) => {
        if (!value || value === "-" || value === "") return "—";

        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed) && typeof parsed[0] === "object") {
                // Already JSON object grid → render as table
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

        // NEW: if it's a comma-separated value
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
                </div>
            </div>
        );
    };

    const renderViewControls = () => (
        <div className="view-controls">
            <button onClick={() => setDisplayMode("table")} className={displayMode === 'table' ? 'active' : ''}>📊 Table</button>
            <button onClick={() => setDisplayMode("chart")} className={displayMode === 'chart' ? 'active' : ''}>📈 Charts</button>

            {displayMode === 'table' && (
                <>
                    <button onClick={() => setViewMode("expanded")} className={viewMode === 'expanded' ? 'active' : ''}>📋 Expanded</button>
                    <button onClick={() => setViewMode("grouped")} className={viewMode === 'grouped' ? 'active' : ''}>📑 Grouped</button>
                </>
            )}
        </div>
    );

    const renderExpandedTable = () => (
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
                </tbody>
            </table>
        </div>
    );

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

    if (loading) return <div className="loading">Loading report...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="report-viewer-wrapper">
            <h2 className="viewer-heading">📊 Report Viewer</h2>
            {filters.length > 0 && (
                <div className="filter-section mb-6 bg-white p-4 rounded shadow">
                    <h3 className="font-semibold mb-3 text-gray-800">🔍 Apply Filters</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filters.map((filter, idx) => {
                            const field = fields.find(f => f.id === filter.fieldLabel || f.label === filter.fieldLabel);

                            // BETWEEN (date range)
                            if (filter.operator === "between" && filter.type === "date") {
                                const [start, end] = (runtimeFilters[filter.fieldLabel] || "").split(",") || ["", ""];
                                return (
                                    <div key={idx} className="flex flex-col">
                                        <label className="text-sm font-medium text-gray-700 mb-1">{field?.label || filter.fieldLabel} (From - To)</label>
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

                            // Default text input
                            return (
                                <div key={idx} className="flex flex-col">
                                    <label className="text-sm font-medium text-gray-700 mb-1">{field?.label || filter.fieldLabel}</label>
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
                                    fetchFilteredReport(); // reload without filters
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

            {displayMode === "table"
                ? viewMode === "expanded"
                    ? renderExpandedTable()
                    : renderGroupedTable()
                : (
                    <div key="chart-container">
                        {console.log('Rendering ReportCharts with:', {
                            chartDataLength: chartData.length,
                            fieldsLength: fields.length,
                            selectedFieldsLength: selectedFieldIds.length,
                            chartType: memoizedChartConfig.type,
                            metricsLength: memoizedChartConfig.metrics.length
                        })}
                        <ReportCharts
                            data={reportData}
                            metrics={chartConfig.metrics}
                            type={chartConfig.type}
                            xField={chartConfig.xField || "Line Name"}
                            title={chartConfig.title || "Report Chart"}
                        />
                    </div>
                )}
        </div>
    );
}