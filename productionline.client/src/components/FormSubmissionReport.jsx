import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "./Layout";
import { APP_CONSTANTS } from "./store";

const getUrlParam = (name) => {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
};
export default function FormSubmissionReport() {
    const [forms, setForms] = useState([]);
    const [formDefinition, setFormDefinition] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [selectedFormId, setSelectedFormId] = useState(getUrlParam("formId") || "");
    const [viewMode, setViewMode] = useState(getUrlParam("view") || "byForm");

    const navigate = useNavigate();

    useEffect(() => {
        const storedUserData = localStorage.getItem("user");

        if (storedUserData && storedUserData !== "undefined") {
            const storedUser = JSON.parse(storedUserData);

            // ⏳ Check if session has expired
            if (storedUser.expiry && Date.now() > storedUser.expiry) {
                // Session expired
                localStorage.removeItem("user");
                localStorage.removeItem("meaiFormToken");
                navigate(`/login?expired=true`);
            } else {
                const names = [storedUser.username, ...storedUser.groups];
                setUser(names);
                fetchAllPendingSubmissions(names);
            }
        } else {
            navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
        }
    }, [navigate, location]);


    useEffect(() => {
        const fetchForms = async () => {
            if (!user) return;

            try {
                const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms/GetALLForm`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(user)
                });

                const data = await response.json();
                setForms(data);
            } catch (err) {
                setError(err.message || "Failed to load forms");
            }
        };

        fetchForms();
    }, [user]);

    // Add this useEffect to handle when user comes back via back button
    useEffect(() => {
        if (selectedFormId && viewMode === "byForm" && user && !formDefinition) {
            const fetchFormDefinition = async () => {
                setLoading(true);
                try {
                    const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms/GetALLForms/${selectedFormId}`);
                    if (!response.ok) throw new Error("Unable to retrieve form data");

                    const data = await response.json();
                    setFormDefinition(data);
                    fetchSubmissions(selectedFormId);
                } catch (err) {
                    setError(err.message || "Failed to load form definition");
                    setLoading(false);
                }
            };

            fetchFormDefinition();
        }
    }, [selectedFormId, viewMode, user, formDefinition]);

    useEffect(() => {
        const handlePopState = () => {
            setViewMode(getUrlParam("view") || "byForm");
            setSelectedFormId(getUrlParam("formId") || "");
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    

    const updateUrlParams = (params) => {
        const searchParams = new URLSearchParams(window.location.search);
        Object.entries(params).forEach(([key, value]) => {
            if (value) {
                searchParams.set(key, value);
            } else {
                searchParams.delete(key);
            }
        });
        const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
        window.history.pushState({}, '', newUrl);
    };

    const fetchSubmissions = async (formId) => {
        try {
            const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms/${formId}/submissions`);
            if (!response.ok) throw new Error("Failed to fetch submissions");
            const data = await response.json();
            setSubmissions(data);
            setLoading(false);
        } catch (err) {
            setError(err.message || "Failed to load submissions");
            setLoading(false);
        }
    };

    const fetchAllPendingSubmissions = async (userNames) => {
        try {
            const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms/pending-submissions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(userNames)
            });

            if (!response.ok) throw new Error("Failed to fetch pending submissions");

            const data = await response.json();

            console.log(data)
            setSubmissions(data);
        } catch (err) {
            setError(err.message || "Failed to fetch pending approvals");
        }
    };

    const handleFormChange = (e) => {
        const formId = e.target.value;  // You had this line
        setSelectedFormId(formId);      // This is correct
        setFormDefinition(null);
        setSubmissions([]);
        setError(null);

        // Fix: Use formId variable, not undefined formId
        if (formId) {
            updateUrlParams({ view: viewMode, formId: formId });
        } else {
            updateUrlParams({ view: viewMode });
        }
    };

    const groupSubmissionsBySubmissionId = () => {
        const grouped = {};
        submissions.forEach(submission => {
            if (!grouped[submission.id]) {
                grouped[submission.id] = {
                    id: submission.id,
                    submittedAt: submission.submittedAt,
                    data: {},
                    approvals: submission.approvals,
                    form: submission.form
                };
            }

            submission.submissionData.forEach(item => {
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

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const getFieldLabelById = (fieldId) => {
        if (!formDefinition || !formDefinition.fields) return fieldId;
        const field = formDefinition.fields.find(f => f.id === fieldId);
        return field ? field.label : fieldId;
    };

    const viewSubmissionDetails = (submissionId) => {
        navigate(`/submissions/${submissionId}`);
    };

    const exportToCSV = () => {
        if (!submissions.length || (viewMode === "byForm" && !formDefinition)) return;

        const groupedSubmissions = groupSubmissionsBySubmissionId();
        const allFieldIds = new Set();

        groupedSubmissions.forEach(submission => {
            Object.keys(submission.data).forEach(fieldId => {
                allFieldIds.add(fieldId);
            });
        });

        const headers = ["Submission ID", "Submitted At", ...Array.from(allFieldIds).map(id => {
            const hasRemarks = groupedSubmissions.some(sub =>
                sub.data[id]?.remark?.trim());
            return [
                getFieldLabelById(id),
                hasRemarks ? `${getFieldLabelById(id)} (Remarks)` : null
            ].filter(Boolean);
        }).flat()];

        const rows = groupedSubmissions.map(submission => {
            const row = [submission.id, formatDate(submission.submittedAt)];
            allFieldIds.forEach(fieldId => {
                const fieldData = submission.data[fieldId] || { value: '', remark: '' };
                row.push(fieldData.value);
                const hasRemarks = groupedSubmissions.some(sub => sub.data[fieldId]?.remark?.trim());
                if (hasRemarks) row.push(fieldData.remark);
            });
            return row;
        });

        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${formDefinition?.name || "submissions"}_submissions.csv`);
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
        if (!submission?.approvals || !user?.length) return false;

        const formApprovers = submission.approvals.map(a => ({
            name: a.approverName,
            level: a.approvalLevel
        }));
        const approvals = submission.approvals;

        const username = user[0];
        const userGroups = user.slice(1);

        const matchingApprover = formApprovers.find(a =>
            a.name === username || userGroups.includes(a.name)
        );
        if (!matchingApprover) return false;

        const userLevel = matchingApprover.level;

        // ✅ Skip if already fully approved
        const allApproved = approvals.every(a => a.status === "Approved");
        if (allApproved) return false;

        const hasAlreadyApproved = approvals.some(a =>
            (a.approverName === username || userGroups.includes(a.approverName)) &&
            a.status === "Approved"
        );
        if (hasAlreadyApproved) return false;

        if (approvals.some(a => a.status === "Rejected")) return false;

        if (userLevel === 1) return true;

        for (let level = 1; level < userLevel; level++) {
            const levelHasApproval = approvals.some(a => {
                const approvingUser = formApprovers.find(ap => ap.name === a.approverName);
                return approvingUser && approvingUser.level === level && a.status === "Approved";
            });
            if (!levelHasApproval) return false;
        }

        return true;
    }

    const canEditSubmission = (submission) => {
        // Can edit if:
        // 1. No approvals yet, OR
        // 2. Has approvals but none are approved yet (all are pending)
        if (!submission.approvals || submission.approvals.length === 0) {
            return true;
        }

        // Check if any approval has been given (Approved or Rejected)
        const hasDecision = submission.approvals.some(a =>
            a.status === "Approved" || a.status === "Rejected"
        );

        return !hasDecision;
    };

    return (
        <Layout>
            <h1 className="text-2xl font-bold mb-6">Form Submission Reports</h1>

            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
                    <p>{error}</p>
                </div>
            )}

            <div className="mb-6 border-b border-gray-300">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${viewMode === "byForm"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                        onClick={() => {
                            setViewMode("byForm");
                            updateUrlParams({ view: "byForm", formId: selectedFormId });
                        }}
                    >
                        View by Form
                    </button>
                    <button
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${viewMode === "pendingOnly"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                        onClick={() => {
                            setSelectedFormId("");
                            setFormDefinition(null);
                            setSubmissions([]);
                            setError(null);
                            setViewMode("pendingOnly");
                            updateUrlParams({ view: "pendingOnly" });
                            fetchAllPendingSubmissions(user);
                        }}
                    >
                        My Pending Approvals
                    </button>
                </nav>
            </div>

            {viewMode === "byForm" && (
                <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="formSelect">
                        Select Form
                    </label>
                    <select
                        id="formSelect"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
                        value={selectedFormId}
                        onChange={handleFormChange}
                    >
                        <option value="">-- Select a form --</option>
                        {forms.map(form => (
                            <option key={form.id} value={form.id}>{form.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center"><p>Loading...</p></div>
            ) : (viewMode === "pendingOnly" || (selectedFormId && formDefinition)) ? (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">
                            {viewMode === "byForm" ? formDefinition?.name : "Pending Submissions"}
                        </h2>
                        {viewMode === "byForm" && submissions.length > 0 && formDefinition && (
                            <button onClick={exportToCSV} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                                Export to CSV
                            </button>
                        )}
                    </div>

                    {submissions.length === 0 ? (
                        <p>No submissions found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white border border-gray-200">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="text-left py-3 px-4 border-b">Submission ID</th>
                                        <th className="text-left py-3 px-4 border-b">Submitted At</th>
                                        <th className="text-left py-3 px-4 border-b">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupSubmissionsBySubmissionId().map(submission => (
                                        <tr key={submission.id} className="hover:bg-gray-50">
                                            <td className="py-2 px-4 border-b">{submission.id}</td>
                                            <td className="py-2 px-4 border-b">{formatDate(submission.submittedAt)}</td>
                                            <td className="py-2 px-4 border-b">
                                                {submission.approvals.length === 0 ? (
                                                    <span className="text-blue-500 font-semibold">Not yet sent for approval</span>
                                                ) : submission.approvals.length === 1 && submission.approvals[0].approverName === "System Approval" ? (
                                                    <span className="text-green-600 font-semibold">Auto Approved</span>
                                                ) : submission.approvals.every(a => a.status === "Approved") ? (
                                                    <span className="text-green-600 font-semibold">Approved</span>
                                                ) : submission.approvals.some(a => a.status === "Rejected") ? (
                                                    <span className="text-red-600 font-semibold">
                                                        Rejected by {submission.approvals.find(a => a.status === "Rejected")?.approverName}
                                                    </span>
                                                ) : canUserApprove(submission, user) ? (
                                                    <button
                                                        onClick={() => navigate(`/submissions/${submission.id}/approve`)}
                                                        className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded text-sm"
                                                    >
                                                        Approve
                                                    </button>
                                                ) : submission.approvals.some(a => a.status === "Pending") ? (
                                                    <span className="text-yellow-600 font-semibold">
                                                        Pending at {submission.approvals.find(a => a.status === "Pending")?.approverName || 'next approver'}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 font-semibold">Waiting for previous approval</span>
                                                )}

                                                {/* Add Edit button - shows only if submission can be edited */}
                                                {canEditSubmission(submission) && (
                                                    <button
                                                        onClick={() => navigate(`/form/${submission.form.name}/${submission.id}`)}
                                                        className="ml-2 bg-orange-500 hover:bg-orange-700 text-white font-bold py-1 px-3 rounded text-sm"
                                                    >
                                                        Edit
                                                    </button>
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
