import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "./Layout"

export default function FormSubmissionReport() {
    const [forms, setForms] = useState([]);
    const [selectedFormId, setSelectedFormId] = useState("");
    const [formDefinition, setFormDefinition] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    // Fetch available forms on component mount
    useEffect(() => {
        const storedUserData = localStorage.getItem("user");
        if (storedUserData && storedUserData !== "undefined") {
            const storedUser = JSON.parse(storedUserData);
            const names = [storedUser.username, ...storedUser.groups]; // Combine user + groups
            setUser(names);
        } else {
            navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
        }
    }, [navigate, location]);  // <-- Add navigate and location here


    useEffect(() => {
        const fetchForms = async () => {
            if (!user) return;  // wait until user is loaded

            try {
                const response = await fetch(`http://localhost:5182/api/forms/GetALLForm`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(user)
                });

                const data = await response.json();
                setForms(data);
            } catch (err) {
                setError(err.message || "Failed to load forms");
            }
        };

        fetchForms();
    }, [user]);  // <-- run when user is set


    // Fetch form definition when a form is selected
    useEffect(() => {
        if (!selectedFormId) return;

        const fetchFormDefinition = async () => {
            setLoading(true);
            try {
                const response = await fetch(`http://localhost:5182/api/forms/GetALLForms/${selectedFormId}`);
                if (!response.ok) throw new Error("Unable to retirve the data may be there is no submission");
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
                    data: {},
                    approvals: submission.approvals,
                    form: submission.form  // Make sure this is included!
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
    const hasUserApproved = (submission) => {
        if (!submission.approvals || !user || user.length === 0) return false;

        return submission.approvals.some(approval =>
            user.includes(approval.approverName) && approval.status === "Approved"
        );
    };

    function canUserApprove(submission, user) {
        // Make sure we have all the required data
        console.log(submission)
        console.log(user)
        if (!submission || !submission.form || !submission.form.approvers || !user || user.length === 0) {
            return false;
        }

        const formApprovers = submission.form.approvers || [];
        const approvals = submission.approvals || [];

        // First, identify if the current user is an approver (either by username or group)
        // user[0] is the username, the rest are groups
        const username = user[0];
        const userGroups = user.slice(1);

        // Find if the user is an approver (either directly or via group)
        const matchingApprover = formApprovers.find(a =>
            a.name === username || userGroups.includes(a.name)
        );

        if (!matchingApprover) {
            return false; // User is not an approver
        }

        const userLevel = matchingApprover.level;

        // Check if the user has already approved this submission
        const hasAlreadyApproved = approvals.some(approval =>
            (approval.approverName === username || userGroups.includes(approval.approverName)) &&
            approval.status === "Approved"
        );

        if (hasAlreadyApproved) {
            return false;
        }

        // Check if any submission has been rejected
        const hasBeenRejected = approvals.some(approval => approval.status === "Rejected");
        if (hasBeenRejected) {
            return false;
        }

        // For level 1, they can always approve if they haven't already
        if (userLevel === 1) {
            return true;
        }

        // For higher levels, check if ALL previous levels have at least one approval
        for (let level = 1; level < userLevel; level++) {
            // Check if this level has at least one approval
            const levelHasApproval = approvals.some(approval => {
                // Find the approver that made this approval
                const approvingUser = formApprovers.find(a => a.name === approval.approverName);
                // Check if they are of the correct level and have approved
                return approvingUser && approvingUser.level === level && approval.status === "Approved";
            });

            if (!levelHasApproval) {
                return false; // Missing approval for a previous level
            }
        }

        // If we got here, all previous levels are approved and user hasn't approved yet
        return true;
    }




    


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
                                        {/*<th className="text-left py-3 px-4 border-b">Fields</th>*/}
                                        <th className="text-left py-3 px-4 border-b">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupSubmissionsBySubmissionId().map(submission => (
                                        <tr key={submission.id} className="hover:bg-gray-50">
                                            <td className="py-2 px-4 border-b">{submission.id}</td>
                                            <td className="py-2 px-4 border-b">{formatDate(submission.submittedAt)}</td>

                                            <td className="py-2 px-4 border-b">
                                                {canUserApprove(submission, user) ? (
                                                    <button
                                                        onClick={() => navigate(`/submissions/${submission.id}/approve`)}
                                                        className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded text-sm"
                                                    >
                                                        Approve
                                                    </button>
                                                ) : hasUserApproved(submission) ? (
                                                    <span className="text-green-600 font-semibold">Approved</span>
                                                ) : submission.approvals.some(a => a.status === "Rejected") ? (
                                                    <span className="text-red-600 font-semibold">
                                                        Rejected by {submission.approvals.find(a => a.status === "Rejected")?.approverName}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 font-semibold">Waiting for previous approval</span>
                                                )}

                                                <button
                                                    onClick={() => viewSubmissionDetails(submission.id)}
                                                    className="ml-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm"
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