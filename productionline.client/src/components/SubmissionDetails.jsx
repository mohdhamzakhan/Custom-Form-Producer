import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

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
                const response = await fetch(`http://localhost:5182/api/forms/submissions/${submissionId}`);
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

    // Group submission data to combine values with remarks
    const processSubmissionData = () => {
        if (!submission || !submission.submissionData) return [];

        const processedData = {};

        submission.submissionData.forEach(item => {
            if (item.fieldLabel.includes(' (Remark)')) {
                const originalField = item.fieldLabel.replace(' (Remark)', '');
                if (!processedData[originalField]) {
                    processedData[originalField] = { value: '', remark: item.fieldValue };
                } else {
                    processedData[originalField].remark = item.fieldValue;
                }
            } else {
                if (!processedData[item.fieldLabel]) {
                    processedData[item.fieldLabel] = { value: item.fieldValue, remark: '' };
                } else {
                    processedData[item.fieldLabel].value = item.fieldValue;
                }
            }
        });

        return Object.entries(processedData).map(([label, data]) => ({
            label,
            value: data.value,
            remark: data.remark
        }));
    };

    // Get field details by label
    const getFieldByLabel = (label) => {
        if (!formDefinition || !formDefinition.fields) return null;
        return formDefinition.fields.find(f => f.label === label || f.id === label);
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

                <h2 className="text-xl font-semibold mb-4">Submission Data</h2>

                <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Field
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Value
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Remarks
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {processedData.map((field, index) => {
                                const fieldDetails = getFieldByLabel(field.label);
                                return (
                                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">
                                                {fieldDetails?.label || field.label}
                                            </div>
                                            {fieldDetails && (
                                                <div className="text-xs text-gray-500">
                                                    {fieldDetails.type}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {field.value}
                                        </td>
                                        <td className="px-6 py-4">
                                            {field.remark || '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}