import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { APP_CONSTANTS } from "./store";
import LoadingDots from './LoadingDots';

export default function SubmissionDetails() {
    const { submissionId } = useParams();
    const navigate = useNavigate();

    const [submission, setSubmission] = useState(null);
    const [formDefinition, setFormDefinition] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Define the table colors ref and function
    const tableColorsRef = useRef({});

    const getTableColor = (fieldId) => {
        const safeFieldId = fieldId || 'unknown';
        if (!tableColorsRef.current[safeFieldId]) {
            const colors = [
                { titleBg: '#2563eb', rowBg: '#eff6ff', borderColor: '#bfdbfe' }, // blue
                { titleBg: '#16a34a', rowBg: '#f0fdf4', borderColor: '#bbf7d0' }, // green
                { titleBg: '#9333ea', rowBg: '#faf5ff', borderColor: '#e9d5ff' }, // purple
                { titleBg: '#db2777', rowBg: '#fdf2f8', borderColor: '#fbcfe8' }, // pink
                { titleBg: '#ca8a04', rowBg: '#fefce8', borderColor: '#fef08a' }, // yellow
                { titleBg: '#4f46e5', rowBg: '#eef2ff', borderColor: '#c7d2fe' }, // indigo
                { titleBg: '#dc2626', rowBg: '#fef2f2', borderColor: '#fecaca' }, // red
                { titleBg: '#ea580c', rowBg: '#fff7ed', borderColor: '#fed7aa' }, // orange
                { titleBg: '#0d9488', rowBg: '#f0fdfa', borderColor: '#99f6e4' }, // teal
                { titleBg: '#0891b2', rowBg: '#ecfeff', borderColor: '#a5f3fc' }  // cyan
            ];

            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            tableColorsRef.current[safeFieldId] = randomColor;
        }
        return tableColorsRef.current[safeFieldId];
    };

    // Fetch submission data on component mount
    useEffect(() => {
        const fetchSubmissionDetails = async () => {
            try {
                const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms/submissions/${submissionId}`);
                if (!response.ok) throw new Error("Failed to fetch submission details");
                const data = await response.json();
                setSubmission(data.submission);
                setFormDefinition(data.formDefinition);
                setLoading(false);
            } catch (err) {
                setError(err.message || "Failed to load submission details");
                setLoading(false);
            }
        };

        fetchSubmissionDetails();
    }, [submissionId]);

    const getFieldLabel = (fieldId) => {
        if (!formDefinition || !formDefinition.fields) return fieldId;

        const field = formDefinition.fields.find(f => f.id === fieldId);
        return field ? field.label : fieldId;
    };

    const processSubmissionData = () => {
        if (!submission || !submission.submissionData) return [];

        const processedData = {};

        submission.submissionData.forEach(item => {
            const originalField = getFieldLabel(item.fieldLabel.replace(' Remark', '').replace(' (Remark)', ''));

            if (item.fieldLabel.includes('Remark') || item.fieldLabel.includes('(Remark)')) {
                if (!processedData[originalField]) {
                    processedData[originalField] = { value: '', remark: item.fieldValue };
                } else {
                    processedData[originalField].remark = item.fieldValue;
                }
            } else {
                if (!processedData[originalField]) {
                    processedData[originalField] = { value: item.fieldValue, remark: '' };
                } else {
                    processedData[originalField].value = item.fieldValue;
                }
            }
        });

        return Object.entries(processedData).map(([label, data]) => ({
            label,
            value: data.value,
            remark: data.remark
        }));
    };

    const isBase64Image = (value) => {
        if (!value) return false;
        if (typeof value !== 'string') {
            return false;
        }

        const isImage = value.startsWith('data:image/png;base64,') ||
            value.startsWith('data:image/jpeg;base64,') ||
            value.startsWith('data:image/jpg;base64,');

        return isImage;
    };

    const isGridValue = (value) => {
        if (!value) return false;
        if (typeof value !== 'string') {
            return false;
        }

        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const firstRow = parsed[0];
                if (typeof firstRow === 'object' && firstRow !== null && !Array.isArray(firstRow)) {
                    return true;
                }
            }
            return false;
        } catch (e) {
            return false;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const handleGoBack = () => {
        navigate(-1);
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <LoadingDots />;

    if (error) {
        return <div className="text-red-500 text-center">{error}</div>;
    }

    if (!submission) {
        return <div className="text-center">Submission not found</div>;
    }

    const getGridColumns = (gridData) => {
        if (!gridData || gridData.length === 0) return [];
        const columnSet = new Set();
        gridData.forEach(row => {
            Object.keys(row).forEach(key => columnSet.add(key));
        });
        return Array.from(columnSet);
    };

    const processedData = processSubmissionData();

    return (
        // FIXED 1: Removed max-w-4xl and added w-full for full page width
        <div className="w-full px-4 sm:px-8 py-6 mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Submission Details</h1>
                <div>
                    <button
                        onClick={handleGoBack}
                        className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded mr-2"
                    >
                        Back
                    </button>
                    <button
                        onClick={handlePrint}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Print
                    </button>
                </div>
            </div>

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded-lg border">
                    <div>
                        <p className="text-sm text-gray-600">Submission ID</p>
                        <p className="font-semibold break-all">{submission.id}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Submitted At</p>
                        <p className="font-semibold">{formatDate(submission.submittedAt)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Form</p>
                        <p className="font-semibold">{formDefinition?.name || 'Unknown Form'}</p>
                    </div>
                </div>

                <h2 className="text-xl font-semibold mb-4 border-b pb-2">Submitted Data</h2>

                {processedData.map((item, index) => (
                    <div key={index} className="border-b pb-6 mb-6 last:border-b-0 last:mb-0">
                        <div className="flex flex-col space-y-3">
                            <div className="w-full">
                                <p className="text-sm text-gray-600 mb-2 font-medium">{item.label}</p>

                                {isBase64Image(item.value) ? (
                                    <div className="border-2 border-blue-200 rounded-lg p-4 bg-gradient-to-br from-blue-50 to-indigo-50 inline-block">
                                        <img
                                            src={item.value}
                                            alt="Signature"
                                            className="w-full h-auto max-h-48 object-contain rounded-lg shadow-sm"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                        <p className="text-xs text-blue-600 mt-2 text-center font-medium">
                                            ✓ Signature/Image
                                        </p>
                                    </div>
                                ) : isGridValue(item.value) ? (
                                    <div className="overflow-x-auto w-full">
                                        {(() => {
                                            try {
                                                const gridData = JSON.parse(item.value);
                                                const columns = getGridColumns(gridData);
                                                const color = getTableColor(item.label);

                                                return (
                                                    <div
                                                        className="rounded-md border overflow-hidden w-full"
                                                        style={{ borderColor: color.borderColor }}
                                                    >
                                                        <table className={`min-w-full text-sm ${columns.length >= 7 ? 'table-fixed' : ''}`}>
                                                            <thead>
                                                                <tr>
                                                                    {columns.map((col, idx) => (
                                                                        <th
                                                                            key={idx}
                                                                            className="px-4 py-3 text-left font-semibold"
                                                                            style={{
                                                                                // Apply fixed width ratios ONLY when there are exactly 5 columns
                                                                                width: columns.length === 5
                                                                                    ? (idx === 0 ? '22%' : idx === 1 ? '38%' : '13.33%')
                                                                                    : 'auto',
                                                                                backgroundColor: color.titleBg,
                                                                                color: '#ffffff',
                                                                                borderBottom: `1px solid ${color.borderColor}`,
                                                                                borderRight: idx < columns.length - 1 ? `1px solid ${color.borderColor}` : 'none'
                                                                            }}
                                                                        >
                                                                            {col}
                                                                        </th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {gridData.map((row, rIdx) => (
                                                                    <tr
                                                                        key={rIdx}
                                                                        className="transition-colors hover:brightness-95"
                                                                        style={{
                                                                            backgroundColor: color.rowBg,
                                                                            borderTop: rIdx > 0 ? `1px solid ${color.borderColor}` : 'none'
                                                                        }}
                                                                    >
                                                                        {columns.map((col, cIdx) => {
                                                                            let cellValue = row[col];

                                                                            if (isBase64Image(cellValue)) {
                                                                                return (
                                                                                    <td
                                                                                        key={cIdx}
                                                                                        className="px-4 py-3 align-top"
                                                                                        style={{ borderRight: cIdx < columns.length - 1 ? `1px solid ${color.borderColor}` : 'none' }}
                                                                                    >
                                                                                        <img
                                                                                            src={cellValue}
                                                                                            alt={`${col} image`}
                                                                                            className="max-w-[200px] max-h-[100px] object-contain bg-white p-1 rounded border"
                                                                                            onError={(e) => {
                                                                                                e.target.style.display = 'none';
                                                                                                e.target.nextSibling.style.display = 'block';
                                                                                            }}
                                                                                        />
                                                                                        <div className="text-red-500 text-sm hidden">
                                                                                            Image failed to load
                                                                                        </div>
                                                                                    </td>
                                                                                );
                                                                            }

                                                                            if (typeof cellValue === 'object' && cellValue !== null) {
                                                                                cellValue = JSON.stringify(cellValue);
                                                                            }

                                                                            return (
                                                                                <td
                                                                                    key={cIdx}
                                                                                    // FIXED 3: Changed whitespace-nowrap to whitespace-pre-wrap and break-words
                                                                                    className="px-4 py-3 text-gray-800 align-top whitespace-pre-wrap break-words min-w-[150px]"
                                                                                    style={{ borderRight: cIdx < columns.length - 1 ? `1px solid ${color.borderColor}` : 'none' }}
                                                                                >
                                                                                    {cellValue !== undefined && cellValue !== null && cellValue !== '' ? (
                                                                                        typeof cellValue === 'boolean' ? (
                                                                                            <span className="font-semibold">{String(cellValue)}</span>
                                                                                        ) : (
                                                                                            String(cellValue)
                                                                                        )
                                                                                    ) : (
                                                                                        <span className="text-gray-400">—</span>
                                                                                    )}
                                                                                </td>
                                                                            );
                                                                        })}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                );
                                            } catch (error) {
                                                return (
                                                    <div className="text-red-600 p-3 bg-red-50 rounded border border-red-200">
                                                        Invalid grid data: {error.message}
                                                    </div>
                                                );
                                            }
                                        })()}
                                    </div>
                                ) : (
                                    <div className="font-semibold text-lg p-4 bg-gray-50 border rounded-lg break-words min-h-[3rem] flex items-center">
                                        {typeof item.value === 'boolean'
                                            ? <span className={`px-3 py-1 rounded-full text-sm font-bold ${item.value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {item.value ? 'Yes' : 'No'}
                                            </span>
                                            : item.value || <span className="text-gray-400">—</span>
                                        }
                                    </div>
                                )}
                            </div>

                            {item.remark && item.remark.trim() !== '' && (
                                <div className="w-full bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-sm">
                                    <p className="text-sm font-medium text-yellow-800 mb-2">Remark</p>
                                    <p className="text-gray-700 break-words whitespace-pre-wrap text-sm">{item.remark}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}