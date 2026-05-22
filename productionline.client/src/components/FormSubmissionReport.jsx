import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "./Layout";
import { APP_CONSTANTS } from "./store";

const getUrlParam = (name) => {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
};

// ✅ Pagination component defined OUTSIDE the main component
function Pagination({ page, totalPages, totalCount, pageSize, onPageChange }) {
    if (totalPages <= 1) return null;

    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalCount);

    const getPages = () => {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push("...");
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
            if (page < totalPages - 2) pages.push("...");
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <span>Showing {start}–{end} of {totalCount} submissions</span>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                    className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
                >
                    ‹ Prev
                </button>
                {getPages().map((p, i) =>
                    p === "..." ? (
                        <span key={`ellipsis-${i}`} className="px-2">…</span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange(p)}
                            className={`px-3 py-1 rounded border ${p === page
                                    ? "bg-blue-500 text-white border-blue-500"
                                    : "border-gray-300 hover:bg-gray-100"
                                }`}
                        >
                            {p}
                        </button>
                    )
                )}
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === totalPages}
                    className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
                >
                    Next ›
                </button>
            </div>
        </div>
    );
}

export default function FormSubmissionReport() {
    const [forms, setForms] = useState([]);
    const [formDefinition, setFormDefinition] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [selectedFormId, setSelectedFormId] = useState(getUrlParam("formId") || "");
    const [viewMode, setViewMode] = useState(getUrlParam("view") || "byForm");
    const [myStatusFilter, setMyStatusFilter] = useState("all");

    // ✅ Pagination state defined directly here, no separate hook needed
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const resetPage = () => setPage(1);

    const navigate = useNavigate();

    // ✅ Shared pagination handler — pass this to every <Pagination>
    const handlePageChange = (newPage) => {
        if (viewMode === "byForm") fetchSubmissions(selectedFormId, newPage);
        else if (viewMode === "pendingOnly") fetchAllPendingSubmissions(user, newPage);
        else if (viewMode === "rejectedOnly") fetchRejectedSubmissions(user, newPage);
        else if (viewMode === "mySubmissions") fetchMySubmissions(user, myStatusFilter, newPage);
    };

    useEffect(() => {
        const storedUserData = localStorage.getItem("user");
        if (storedUserData && storedUserData !== "undefined") {
            const storedUser = JSON.parse(storedUserData);
            if (storedUser.expiry && Date.now() > storedUser.expiry) {
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
            if (value) searchParams.set(key, value);
            else searchParams.delete(key);
        });
        window.history.pushState({}, '', `${window.location.pathname}?${searchParams.toString()}`);
    };

    const fetchSubmissions = async (formId, pageNum = 1) => {
        setLoading(true);
        try {
            const response = await fetch(
                `${APP_CONSTANTS.API_BASE_URL}/api/forms/${formId}/submissions?page=${pageNum}&pageSize=${PAGE_SIZE}`
            );
            if (!response.ok) throw new Error("Failed to fetch submissions");
            const data = await response.json();
            setSubmissions(data.items);
            setTotalPages(data.totalPages);
            setTotalCount(data.totalCount);
            setPage(pageNum);
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const fetchAllPendingSubmissions = async (userNames, pageNum = 1) => {
        try {
            const response = await fetch(
                `${APP_CONSTANTS.API_BASE_URL}/api/forms/pending-submissions?page=${pageNum}&pageSize=${PAGE_SIZE}`,
                { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(userNames) }
            );
            if (!response.ok) throw new Error("Failed to fetch pending submissions");
            const data = await response.json();
            setSubmissions(data.items);
            setTotalPages(data.totalPages);
            setTotalCount(data.totalCount);
            setPage(pageNum);
        } catch (err) {
            setError(err.message);
        }
    };

    const fetchRejectedSubmissions = async (userNames, pageNum = 1) => {
        try {
            const response = await fetch(
                `${APP_CONSTANTS.API_BASE_URL}/api/forms/rejected-submissions?page=${pageNum}&pageSize=${PAGE_SIZE}`,
                { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(userNames) }
            );
            if (!response.ok) throw new Error("Failed to fetch rejected submissions");
            const data = await response.json();
            setSubmissions(data.items);
            setTotalPages(data.totalPages);
            setTotalCount(data.totalCount);
            setPage(pageNum);
        } catch (err) {
            setError(err.message);
        }
    };

    const fetchMySubmissions = async (userNames, status = "all", pageNum = 1) => {
        const username = userNames[0];
        try {
            const url = `${APP_CONSTANTS.API_BASE_URL}/api/forms/${username}/my-submissions?page=${pageNum}&pageSize=${PAGE_SIZE}`
                + (status !== "all" ? `&status=${status}` : "");
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch your submissions");
            const data = await response.json();
            setSubmissions(data.items);
            setTotalPages(data.totalPages);
            setTotalCount(data.totalCount);
            setPage(pageNum);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleFormChange = (e) => {
        const formId = e.target.value;
        setSelectedFormId(formId);
        setFormDefinition(null);
        setSubmissions([]);
        setError(null);
        resetPage();
        if (formId) updateUrlParams({ view: viewMode, formId: formId });
        else updateUrlParams({ view: viewMode });
    };

    const groupSubmissionsBySubmissionId = () => {
        if (viewMode === "pendingOnly") {
            return submissions.map(s => ({
                id: s.id,
                submittedAt: s.submittedAt,
                approvals: s.approvals || [],
                formId: s.formId,
                formName: s.formName,
                data: {}
            }));
        }

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
            (submission.submissionData || []).forEach(item => {
                if (item.fieldLabel.includes(" (Remark)")) {
                    const originalField = item.fieldLabel.replace(" (Remark)", "");
                    if (!grouped[submission.id].data[originalField]) {
                        grouped[submission.id].data[originalField] = { value: "", remark: item.fieldValue };
                    } else {
                        grouped[submission.id].data[originalField].remark = item.fieldValue;
                    }
                } else {
                    if (!grouped[submission.id].data[item.fieldLabel]) {
                        grouped[submission.id].data[item.fieldLabel] = { value: item.fieldValue, remark: "" };
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
        return new Date(dateString).toLocaleString();
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
        groupedSubmissions.forEach(s => Object.keys(s.data).forEach(id => allFieldIds.add(id)));
        const headers = ["Submission ID", "Submitted At", ...Array.from(allFieldIds).map(id => {
            const hasRemarks = groupedSubmissions.some(sub => sub.data[id]?.remark?.trim());
            return [getFieldLabelById(id), hasRemarks ? `${getFieldLabelById(id)} (Remarks)` : null].filter(Boolean);
        }).flat()];
        const rows = groupedSubmissions.map(submission => {
            const row = [submission.id, formatDate(submission.submittedAt)];
            allFieldIds.forEach(fieldId => {
                const fieldData = submission.data[fieldId] || { value: '', remark: '' };
                row.push(fieldData.value);
                if (groupedSubmissions.some(sub => sub.data[fieldId]?.remark?.trim())) row.push(fieldData.remark);
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
        return submission.approvals.some(a => user.includes(a.approverName) && a.status === "Approved");
    };

    function canUserApprove(submission, user) {
        if (!submission?.approvals || !user?.length) return false;
        const formApprovers = submission.approvals.map(a => ({ name: a.approverName, level: a.approvalLevel }));
        const approvals = submission.approvals;
        const username = user[0];
        const userGroups = user.slice(1);
        const matchingApprover = formApprovers.find(a =>
            a.name.toLowerCase() === username.toLowerCase() ||
            userGroups.some(g => g.toLowerCase() === a.name.toLowerCase())
        );
        if (!matchingApprover) return false;
        const userLevel = matchingApprover.level;
        if (approvals.every(a => a.status === "Approved")) return false;
        if (approvals.some(a =>
            (a.approverName.toLowerCase() === username.toLowerCase() || userGroups.includes(a.approverName)) &&
            a.status === "Approved"
        )) return false;
        if (approvals.some(a => a.status === "Rejected")) return false;
        if (userLevel === 1) return true;
        for (let level = 1; level < userLevel; level++) {
            if (!formApprovers.some(ap => ap.level === level)) continue;
            if (!approvals.some(a => {
                const ap = formApprovers.find(ap => ap.name === a.approverName);
                return ap && ap.level === level && a.status === "Approved";
            })) return false;
        }
        return true;
    }

    const canEditSubmission = (submission) => {
        if (!submission.approvals || submission.approvals.length === 0) return true;
        if (submission.approvals.some(a => a.approvalLevel >= 2)) return false;
        return !submission.approvals.some(a => a.status === "Approved" || a.status === "Rejected");
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
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${viewMode === "byForm" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                        onClick={() => {
                            setViewMode("byForm");
                            resetPage();
                            updateUrlParams({ view: "byForm", formId: selectedFormId });
                        }}
                    >
                        View by Form
                    </button>
                    <button
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${viewMode === "pendingOnly" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                        onClick={() => {
                            setSelectedFormId(""); setFormDefinition(null); setSubmissions([]); setError(null);
                            resetPage();
                            setViewMode("pendingOnly");
                            updateUrlParams({ view: "pendingOnly" });
                            fetchAllPendingSubmissions(user);
                        }}
                    >
                        My Pending Approvals
                    </button>
                    <button
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${viewMode === "rejectedOnly" ? "border-red-500 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                        onClick={() => {
                            setSelectedFormId(""); setFormDefinition(null); setSubmissions([]); setError(null);
                            resetPage();
                            setViewMode("rejectedOnly");
                            updateUrlParams({ view: "rejectedOnly" });
                            fetchRejectedSubmissions(user);
                        }}
                    >
                        Rejected Approvals
                    </button>
                    <button
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${viewMode === "mySubmissions" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                        onClick={() => {
                            setSelectedFormId(""); setFormDefinition(null); setSubmissions([]); setError(null);
                            setMyStatusFilter("all");
                            resetPage();
                            setViewMode("mySubmissions");
                            updateUrlParams({ view: "mySubmissions" });
                            fetchMySubmissions(user, "all");
                        }}
                    >
                        My Submissions
                    </button>
                </nav>
            </div>

            {viewMode === "byForm" && (
                <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="formSelect">Select Form</label>
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

            ) : viewMode === "mySubmissions" ? (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">My Submissions</h2>
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
                            <select
                                className="border rounded py-1.5 px-3 text-sm text-gray-700 shadow-sm"
                                value={myStatusFilter}
                                onChange={(e) => {
                                    setMyStatusFilter(e.target.value);
                                    resetPage();
                                    fetchMySubmissions(user, e.target.value, 1);
                                }}
                            >
                                <option value="all">All</option>
                                <option value="Approved">Approved</option>
                                <option value="Pending">Pending</option>
                                <option value="Rejected">Rejected</option>
                                <option value="NotSent">Not sent for approval</option>
                            </select>
                        </div>
                    </div>
                    {submissions.length === 0 ? (
                        <p className="text-gray-500">No submissions found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white border border-gray-200">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="text-left py-3 px-4 border-b">Submission ID</th>
                                        <th className="text-left py-3 px-4 border-b">Form Name</th>
                                        <th className="text-left py-3 px-4 border-b">Submitted At</th>
                                        <th className="text-left py-3 px-4 border-b">Status</th>
                                        <th className="text-left py-3 px-4 border-b">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {submissions.map(submission => (
                                        <tr key={submission.id} className="hover:bg-gray-50">
                                            <td className="py-2 px-4 border-b">{submission.id}</td>
                                            <td className="py-2 px-4 border-b">{submission.formName}</td>
                                            <td className="py-2 px-4 border-b">{formatDate(submission.submittedAt)}</td>
                                            <td className="py-2 px-4 border-b">
                                                {submission.derivedStatus === "NotSent" ? (
                                                    <span className="text-blue-500 font-semibold">Not yet sent for approval</span>
                                                ) : submission.derivedStatus === "Approved" ? (
                                                    <span className="text-green-600 font-semibold">
                                                        {submission.approvals?.length === 1 && submission.approvals[0].approverName === "System Approval" ? "Auto Approved" : "Approved"}
                                                    </span>
                                                ) : submission.derivedStatus === "Rejected" ? (
                                                    <span className="text-red-600 font-semibold">
                                                        Rejected by {submission.approvals?.find(a => a.status === "Rejected")?.approverName}
                                                    </span>
                                                ) : (
                                                    <span className="text-yellow-600 font-semibold">
                                                        Pending at {submission.approvals?.find(a => a.status === "Pending")?.approverName || "next approver"}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2 px-4 border-b">
                                                {canEditSubmission(submission) && (
                                                    <button
                                                        onClick={() => navigate(`/form/${submission.formName}/${submission.id}`)}
                                                        className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-1 px-3 rounded text-sm"
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
                            {/* ✅ Pagination for My Submissions */}
                            <Pagination
                                page={page}
                                totalPages={totalPages}
                                totalCount={totalCount}
                                pageSize={PAGE_SIZE}
                                onPageChange={handlePageChange}
                            />
                        </div>
                    )}
                </div>

            ) : (viewMode === "pendingOnly" || viewMode === "rejectedOnly" || (selectedFormId && formDefinition)) ? (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">
                            {viewMode === "byForm" ? formDefinition?.name : viewMode === "rejectedOnly" ? "Rejected Approvals" : "Pending Approvals"}
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
                                                {canEditSubmission(submission) && (
                                                    <button
                                                        onClick={() => {
                                                            const formName = submission.formName || selectedFormId || "UNKNOWN_FORM";
                                                            navigate(`/form/${formName}/${submission.id}`);
                                                        }}
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
                            {/* ✅ Pagination for Pending / Rejected / By Form */}
                            <Pagination
                                page={page}
                                totalPages={totalPages}
                                totalCount={totalCount}
                                pageSize={PAGE_SIZE}
                                onPageChange={handlePageChange}
                            />
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