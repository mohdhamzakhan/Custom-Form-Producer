import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import ReportDisplayOptions from "./ReportDisplayOptions";
import useCalculatedValues from "./hooks/useCalculatedValues";

export default function ReportViewer() {
    const { templateId } = useParams();
    const [filters, setFilters] = useState([]);
    const [runtimeFilters, setRuntimeFilters] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [template, setTemplate] = useState(null);
    const [reportData, setReportData] = useState([]);
    const [calculatedFields, setCalculatedFields] = useState([]);
    const [displayMode, setDisplayMode] = useState('table');
    const [exportOptions, setExportOptions] = useState({ format: 'excel' });
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        const fetchTemplate = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`http://localhost:5182/api/reports/template/${templateId}`);
                setTemplate(res.data);
                setFilters(res.data.filters || []);
                setCalculatedFields(res.data.calculatedFields || []);
                setLoading(false);

                // Automatically fetch data if no runtime filters needed
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
            const res = await axios.post(`http://localhost:5182/api/reports/run/${templateId}`, runtimeFilters);
            setReportData(res.data);
            setLoading(false);
        } catch (err) {
            setError("Failed to run filtered report: " + (err.message || "Unknown error"));
            setLoading(false);
        }
    };

    const headers = reportData.length > 0 ? reportData[0].data.map(d => d.fieldLabel) : [];

    const handleFilterChange = (field, value, isDateRange = false) => {
        if (isDateRange) {
            // For date ranges, we need to handle start and end dates
            const [start, end] = value;
            setRuntimeFilters(prev => ({
                ...prev,
                [field]: `${start},${end}`
            }));
        } else {
            setRuntimeFilters(prev => ({
                ...prev,
                [field]: value
            }));
        }
    };

    const exportReport = async () => {
        try {
            setIsExporting(true);
            // This is a placeholder for the export API
            // You'll need to implement this in your backend
            const res = await axios.post(
                `http://localhost:5182/api/reports/export/${templateId}`,
                {
                    format: exportOptions.format,
                    filters: runtimeFilters,
                    calculatedFields: calculatedFields
                },
                { responseType: 'blob' }
            );

            // Create download link
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${template.name}_report.${exportOptions.format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            setIsExporting(false);
        } catch (err) {
            setError("Failed to export report: " + (err.message || "Unknown error"));
            setIsExporting(false);
        }
    };

    if (loading) return (
        <div className="p-6 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-3">Loading...</span>
        </div>
    );

    if (error) return (
        <div className="bg-red-50 border border-red-200 text-red-600 p-6 rounded">
            <h3 className="font-bold mb-2">Error</h3>
            <p>{error}</p>
            <button
                onClick={() => window.location.reload()}
                className="mt-4 bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded"
            >
                Try Again
            </button>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">{template?.name || "Report Viewer"}</h2>
                <div className="flex gap-2">
                    <div className="relative">
                        <select
                            value={exportOptions.format}
                            onChange={(e) => setExportOptions({ ...exportOptions, format: e.target.value })}
                            className="border p-2 rounded bg-white pr-8"
                            disabled={isExporting}
                        >
                            <option value="excel">Excel</option>
                            <option value="csv">CSV</option>
                            <option value="pdf">PDF</option>
                        </select>
                    </div>
                    <button
                        onClick={exportReport}
                        disabled={isExporting || reportData.length === 0}
                        className={`px-4 py-2 rounded flex items-center ${isExporting || reportData.length === 0
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                    >
                        {isExporting ? (
                            <>
                                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                                Exporting...
                            </>
                        ) : (
                            'Export Report'
                        )}
                    </button>
                </div>
            </div>

            {filters.length > 0 && (
                <div className="mb-6 bg-gray-50 p-4 rounded border">
                    <h3 className="text-lg font-semibold mb-4">Filter Inputs</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Date Range Filters */}
                        {filters.filter(f => f.operator === "between" && (f.type === "date" || !f.type)).map((f, idx) => (
                            <div key={idx} className="flex flex-col">
                                <label className="mb-1 font-medium">{f.fieldLabel} (Date Range)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        className="border p-2 rounded w-1/2"
                                        onChange={e => handleFilterChange(
                                            f.fieldLabel,
                                            [e.target.value, runtimeFilters[f.fieldLabel]?.split(',')[1] || ''],
                                            true
                                        )}
                                    />
                                    <span className="flex items-center">to</span>
                                    <input
                                        type="date"
                                        className="border p-2 rounded w-1/2"
                                        onChange={e => handleFilterChange(
                                            f.fieldLabel,
                                            [runtimeFilters[f.fieldLabel]?.split(',')[0] || '', e.target.value],
                                            true
                                        )}
                                    />
                                </div>
                            </div>
                        ))}

                        {/* Text/Number Filters */}
                        {filters.filter(f => f.operator !== "between").map((f, idx) => (
                            <div key={idx} className="flex flex-col">
                                <label className="mb-1 font-medium">
                                    {f.fieldLabel} ({f.operator})
                                </label>
                                <input
                                    type={f.type === "number" || f.type === "decimal" ? "number" : "text"}
                                    placeholder={`Value for ${f.fieldLabel}`}
                                    value={runtimeFilters[f.fieldLabel] || ''}
                                    onChange={e => handleFilterChange(f.fieldLabel, e.target.value)}
                                    className="border p-2 rounded"
                                />
                            </div>
                        ))}
                    </div>

                    <button
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mt-4"
                        onClick={fetchFilteredReport}
                    >
                        Run Report
                    </button>
                </div>
            )}

            {reportData.length === 0 ? (
                <div className="p-6 text-center border rounded bg-gray-50">
                    <p className="text-gray-500">No data found. {filters.length > 0 && "Try adjusting your filters."}</p>
                </div>
            ) : (
                <ReportDisplayOptions
                    reportData={reportData}
                    headers={headers}
                    calculatedFields={calculatedFields}
                    displayMode={displayMode}
                    setDisplayMode={setDisplayMode}
                />
            )}
        </div>
    );
}