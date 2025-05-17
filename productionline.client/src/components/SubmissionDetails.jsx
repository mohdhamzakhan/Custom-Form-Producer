import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import APP_CONSTANTS from "./store";

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

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                Loading submission details...
            </div>
        );
    }

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
            return Array.isArray(parsed) && typeof parsed[0] === 'object';
        } catch {
            return false;
        }
    };


    const processedData = processSubmissionData();

    return (
        <div className="max-w-4xl mx-auto p-6">
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

                {processedData.length === 0 ? (
                    <div className="text-gray-500">No submission data available.</div>
                ) : (
                    <div className="space-y-6">
                        {processedData.map((item, index) => (
                            <div key={index} className="border-b pb-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm text-gray-600">{item.label}</p>
                                        <p className="font-semibold break-words">{isGridValue(item.value) ? (
                                            <div className="overflow-auto">
                                                <table className="min-w-full text-sm text-left border border-gray-300">
                                                    <thead className="bg-gray-100">
                                                        <tr>
                                                            {Object.keys(JSON.parse(item.value)[0] || {}).map((col, idx) => (
                                                                <th key={idx} className="px-4 py-2 border">{col}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {JSON.parse(item.value).map((row, rIdx) => (
                                                            <tr key={rIdx} className="border-t">
                                                                {Object.values(row).map((cell, cIdx) => (
                                                                    <td key={cIdx} className="px-4 py-2 border">{cell}</td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                                <p className="font-semibold break-words">{isGridValue(item.value) ? (
                                                    <div className="overflow-auto mt-2">
                                                        <table className="min-w-full text-sm text-left border border-gray-300">
                                                            <thead className="bg-gray-100">
                                                                <tr>
                                                                    {Object.keys(JSON.parse(item.value)[0] || {}).map((col, idx) => (
                                                                        <th key={idx} className="px-4 py-2 border">{col}</th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {JSON.parse(item.value).map((row, rIdx) => (
                                                                    <tr key={rIdx} className="border-t">
                                                                        {Object.values(row).map((cell, cIdx) => (
                                                                            <td key={cIdx} className="px-4 py-2 border">{cell}</td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <p className="font-semibold break-words mt-1">{item.value}</p>
                                                )}
</p>
                                        )}
</p>
                                    </div>
                                    {item.remark && (
                                        <div className="text-right max-w-sm">
                                            <p className="text-sm text-gray-600">Remark</p>
                                            <p className="italic text-gray-700 break-words">{item.remark}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
