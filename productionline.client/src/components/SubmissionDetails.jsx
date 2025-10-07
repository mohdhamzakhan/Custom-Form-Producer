import { useState, useEffect } from "react";
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
        if (!formDefinition || !formDefinition.fields) return fieldId; // fallback to ID if not found

        const field = formDefinition.fields.find(f => f.id === fieldId);
        return field ? field.label : fieldId; // if field is found, return label; else fallback to ID
    };

    // Group submission data to combine values with remarks
    const processSubmissionData = () => {
        if (!submission || !submission.submissionData) return [];

        const processedData = {};

        submission.submissionData.forEach(item => {
            const originalField = getFieldLabel(item.fieldLabel.replace(' (Remark)', ''));
            if (item.fieldLabel.includes(' (Remark)')) {
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
            console.log(processedData)
        });

        return Object.entries(processedData).map(([label, data]) => ({
            label,
            value: data.value,
            remark: data.remark
        }));
    };


    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    // Go back to the reports page
    const handleGoBack = () => {
        navigate(-1);
    };

    // Print submission details
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

    const isGridValue = (value) => {
        console.log(value)
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object';
        } catch {
            return false;
        }
    };

    const getGridColumns = (gridData) => {
        if (!gridData || gridData.length === 0) return [];

        // Get all unique column names from all rows
        const columnSet = new Set();
        gridData.forEach(row => {
            Object.keys(row).forEach(key => columnSet.add(key));
        });

        return Array.from(columnSet);
    };


    const processedData = processSubmissionData();

    return (
        <div className="max-w-1xl mx-auto p-6">
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
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <p className="text-sm text-gray-600">Submission ID</p>
                        <p className="font-semibold">{submission.id}</p>
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

                <h2 className="text-xl font-semibold mb-4">Submitted Data</h2>

                {processedData.map((item, index) => (
                    <div key={index} className="border-b pb-4">
                        <div className="flex flex-col space-y-2">
                            <div className="w-full">
                                <p className="text-sm text-gray-600 mb-1">{item.label}</p>
                                {isGridValue(item.value) ? (
                                    <div className="w-full overflow-x-auto border border-gray-300 rounded">
                                        {(() => {
                                            const gridData = JSON.parse(item.value);
                                            const columns = getGridColumns(gridData);

                                            return (
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-gray-100">
                                                        <tr>
                                                            {columns.map((col, idx) => (
                                                                <th key={idx} className="px-2 py-1 border-b border-r whitespace-nowrap font-medium">
                                                                    {col}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {gridData.map((row, rIdx) => (
                                                            <tr key={rIdx} className="border-b hover:bg-gray-50">
                                                                {columns.map((col, cIdx) => {
                                                                    const cellValue = row[col];
                                                                    return (
                                                                        <td key={cIdx} className="px-2 py-1 border-r whitespace-nowrap">
                                                                            {cellValue !== undefined && cellValue !== null
                                                                                ? (typeof cellValue === 'boolean' ? String(cellValue) : String(cellValue))
                                                                                : ''}
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            );
                                        })()}
                                    </div>
                                ) : (
                                    <div className="font-semibold break-words">
                                        {typeof item.value === 'boolean' ? String(item.value) : item.value}
                                    </div>
                                )}
                            </div>
                            {item.remark && (
                                <div className="w-full bg-gray-50 p-2 rounded">
                                    <p className="text-sm text-gray-600">Remark</p>
                                    <p className="italic text-gray-700 break-words">{item.remark}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

            </div>
        </div>
    );
}
