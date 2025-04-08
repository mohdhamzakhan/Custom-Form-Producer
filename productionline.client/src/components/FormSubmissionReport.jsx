import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "./Layout";

export default function FormSubmissionReport() {
    const [forms, setForms] = useState([]);
    const [selectedFormId, setSelectedFormId] = useState("");
    const [formDefinition, setFormDefinition] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Fetch available forms on component mount
    useEffect(() => {
        const fetchForms = async () => {
            try {
                const response = await fetch("http://localhost:5182/api/forms/GetALLForms");
                if (!response.ok) throw new Error("Failed to fetch forms");
                const data = await response.json();
                setForms(data);
            } catch (err) {
                setError(err.message || "Failed to load forms");
            }
        };

        fetchForms();
    }, []);

    // Fetch form definition when a form is selected
    useEffect(() => {
        if (!selectedFormId) return;

        const fetchFormDefinition = async () => {
            setLoading(true);
            try {
                const response = await fetch(`http://localhost:5182/api/forms/GetALLForms/${selectedFormId}`);
                if (!response.ok) throw new Error("Failed to fetch form definition");
                const data = await response.json();
                setFormDefinition(data);

                // After getting the form definition, fetch submissions
                fetchSubmissions(selectedFormId);
            } catch (err) {
                setError(err.message || "Failed to load form definition");
                setLoading(false);
            }
        };

        fetchFormDefinition();
    }, [selectedFormId]);

    // Fetch submissions for the selected form
    const fetchSubmissions = async (formId) => {
        try {
            const response = await fetch(`http://localhost:5182/api/forms/${formId}/submissions`);
            if (!response.ok) throw new Error("Failed to fetch submissions");
            const data = await response.json();
            setSubmissions(data);
            setLoading(false);
        } catch (err) {
            setError(err.message || "Failed to load submissions");
            setLoading(false);
        }
    };

    // Handle form selection change
    const handleFormChange = (e) => {
        setSelectedFormId(e.target.value);
        setFormDefinition(null);
        setSubmissions([]);
        setError(null);
    };

    // Group submission data by submission ID
    const groupSubmissionsBySubmissionId = () => {
        const grouped = {};

        submissions.forEach(submission => {
            if (!grouped[submission.id]) {
                grouped[submission.id] = {
                    id: submission.id,
                    submittedAt: submission.submittedAt,
                    data: {}
                };
            }

            submission.submissionData.forEach(item => {
                // Check if this is a remark field
                if (item.fieldLabel.includes(' (Remark)')) {
                    const originalField = item.fieldLabel.replace(' (Remark)', '');
                    if (!grouped[submission.id].data[originalField]) {
                        grouped[submission.id].data[originalField] = { value: '', remark: item.fieldValue };
                    } else {
                        grouped[submission.id].data[originalField].remark = item.fieldValue;
                    }
                } else {
                    if (!grouped[submission.id].data[item.fieldLabel]) {
                        grouped[submission.id].data[item.fieldLabel] = { value: item.fieldValue, remark: '' };
                    } else {
                        grouped[submission.id].data[item.fieldLabel].value = item.fieldValue;
                    }
                }
            });
        });

        return Object.values(grouped);
    };

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    // Get field label by ID
    const getFieldLabelById = (fieldId) => {
        if (!formDefinition || !formDefinition.fields) return fieldId;

        const field = formDefinition.fields.find(f => f.id === fieldId);
        return field ? field.label : fieldId;
    };

    // View a specific submission in detail
    const viewSubmissionDetails = (submissionId) => {
        navigate(`/submissions/${submissionId}`);
    };

    // Export submissions to CSV
    const exportToCSV = () => {
        if (!submissions.length || !formDefinition) return;

        const groupedSubmissions = groupSubmissionsBySubmissionId();

        // Get all unique field IDs across all submissions
        const allFieldIds = new Set();
        groupedSubmissions.forEach(submission => {
            Object.keys(submission.data).forEach(fieldId => {
                allFieldIds.add(fieldId);
            });
        });

        // Create CSV header
        const headers = ["Submission ID", "Submitted At", ...Array.from(allFieldIds).map(id => {
            const hasRemarks = groupedSubmissions.some(sub =>
                sub.data[id] && sub.data[id].remark && sub.data[id].remark.trim() !== '');

            return [
                getFieldLabelById(id),
                hasRemarks ? `${getFieldLabelById(id)} (Remarks)` : null
            ].filter(Boolean);
        }).flat()];

        // Create CSV rows
        const rows = groupedSubmissions.map(submission => {
            const row = [
                submission.id,
                formatDate(submission.submittedAt)
            ];

            // Add each field's value and remark (if any)
            allFieldIds.forEach(fieldId => {
                const fieldData = submission.data[fieldId] || { value: '', remark: '' };
                row.push(fieldData.value);

                // Check if any submission has a remark for this field
                const hasRemarks = groupedSubmissions.some(sub =>
                    sub.data[fieldId] && sub.data[fieldId].remark && sub.data[fieldId].remark.trim() !== '');

                if (hasRemarks) {
                    row.push(fieldData.remark);
                }
            });

            return row;
        });

        // Combine header and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Create and download the CSV file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${formDefinition.name}_submissions.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Layout>
            <h1 className="text-2xl font-bold mb-6">Form Submission Reports</h1>

            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
                    <p>{error}</p>
                </div>
            )}

            <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="formSelect">
                    Select Form
                </label>
                <select
                    id="formSelect"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={selectedFormId}
                    onChange={handleFormChange}
                >
                    <option value="">-- Select a form --</option>
                    {forms.map(form => (
                        <option key={form.id} value={form.id}>
                            {form.name}
                        </option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center">
                    <p>Loading...</p>
                </div>
            ) : selectedFormId && formDefinition ? (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">{formDefinition.name} Submissions</h2>
                        {submissions.length > 0 && (
                            <button
                                onClick={exportToCSV}
                                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                            >
                                Export to CSV
                            </button>
                        )}
                    </div>

                    {submissions.length === 0 ? (
                        <p>No submissions found for this form.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white border border-gray-200">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="text-left py-3 px-4 border-b">Submission ID</th>
                                        <th className="text-left py-3 px-4 border-b">Submitted At</th>
                                        <th className="text-left py-3 px-4 border-b">Fields</th>
                                        <th className="text-left py-3 px-4 border-b">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupSubmissionsBySubmissionId().map(submission => (
                                        <tr key={submission.id} className="hover:bg-gray-50">
                                            <td className="py-2 px-4 border-b">{submission.id}</td>
                                            <td className="py-2 px-4 border-b">{formatDate(submission.submittedAt)}</td>
                                            <td className="py-2 px-4 border-b">
                                                <div className="max-h-32 overflow-y-auto">
                                                    {Object.entries(submission.data).map(([fieldId, data]) => (
                                                        <div key={fieldId} className="mb-1">
                                                            <strong>{getFieldLabelById(fieldId)}:</strong> {data.value}
                                                            {data.remark && (
                                                                <div className="ml-4 text-sm text-gray-600">
                                                                    <em>Remark: {data.remark}</em>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="py-2 px-4 border-b">
                                                <button
                                                    onClick={() => viewSubmissionDetails(submission.id)}
                                                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center text-gray-500">
                    <p>Select a form to view submissions</p>
                </div>
            )}
        </Layout>
    );
}