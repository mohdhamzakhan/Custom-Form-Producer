import { useEffect, useState } from "react";
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

    if (loading) return <div className="loading">Loading report...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="report-viewer-wrapper">
            <h2 className="viewer-heading">📊 Report Viewer</h2>
            {renderSummaryStats()}
            {renderViewControls()}
            {displayMode === "table"
                ? viewMode === "expanded"
                    ? renderExpandedTable()
                    : renderGroupedTable()
                : (
                    <ReportCharts
                        submissionData={reportData.map(r => ({
                            submissionData: (r.data || []).map(cell => ({
                                fieldLabel: cell.fieldLabel,
                                fieldValue: cell.value
                            }))
                        }))}
                        fields={fields}
                        selectedFields={selectedFields.map(f => typeof f === "string" ? f : f.id)}
                    />
                )}
        </div>
    );
}
