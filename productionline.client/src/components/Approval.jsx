import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "./Layout";
import { APP_CONSTANTS } from "./store";
import LoadingDots from './LoadingDots';

export default function ApprovalPage() {
    const { submissionId } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState("Approved");
    const [comments, setComments] = useState("");
    const [submission, setSubmission] = useState(null);
    const [formDefinition, setFormDefinition] = useState(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);


    // Fetch current user
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
            }
        } else {
            navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
        }
    }, [navigate, location]);


    // Fetch submission + form details
    useEffect(() => {
        const fetchSubmissionDetails = async () => {
            try {
                const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms/submissions/${submissionId}`);
                if (!response.ok) throw new Error("Failed to fetch submission details");
                const data = await response.json();

                setSubmission(data.submission);
                setFormDefinition(data.formDefinition);
                setLoading(false);
            } catch (error) {
                console.error(error);
                setLoading(false);
            }
        };

        fetchSubmissionDetails();
    }, [submissionId]);

    const handleApproval = async () => {
        try {
            if (!user) return alert("User not found!");

            // Find the user's approval level
            let approvalLevel = 1; // Default to level 1

            if (submission?.form?.approvers?.length) {
                const currentUser = (user?.[0] || "").toLowerCase();

                const userApprover = submission.form.approvers.find(
                    a => (a.name || "").toLowerCase() === currentUser
                );

                if (userApprover) {
                    approvalLevel = userApprover.level;
                }
            }


            console.log(approvalLevel)

            const approvalData = {

                approverId: 123, // (you can replace with real user id if available)
                approverName: user[0], // 🔥 from logged-in user
                level: approvalLevel, // Use the correct level for this user
                comments: comments,
                status: status,
            };


            const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms/submissions/${submissionId}/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(approvalData),
            });
            console.log(response)
            const data = await response.text();
            console.log(data)

            if (!response.ok) {
                console.error("Server responded with:", data);
                throw new Error("Approval failed");
            }

            alert("Approval saved successfully!");
            navigate(-1);; // redirect to report page
        } catch (error) {
            console.error("Error approving submission:", error);
            alert("Error approving submission");
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const getFieldLabel = (fieldId) => {
        if (!formDefinition || !formDefinition.fields) return fieldId;
        const field = formDefinition.fields.find(f => f.id === fieldId);
        return field ? field.label : fieldId;
    };

    const processSubmissionData = () => {
        if (!submission || !submission.submissionData || !formDefinition || !formDefinition.fields) return [];

        const processedData = {};

        submission.submissionData.forEach(item => {
            let fieldId = item.fieldLabel;

            // 🔥 If this is a remark, remove ' (Remark)' from fieldLabel
            const isRemark = fieldId.endsWith(" (Remark)");
            if (isRemark) {
                fieldId = fieldId.replace(" (Remark)", ""); // clean fieldId
            }

            const fieldLabel = getFieldLabel(fieldId); // Now lookup with clean ID
            if (!fieldLabel) return; // if not found, skip

            if (isRemark) {
                if (!processedData[fieldLabel]) {
                    processedData[fieldLabel] = { value: '', remark: item.fieldValue };
                } else {
                    processedData[fieldLabel].remark = item.fieldValue;
                }
            } else {
                if (!processedData[fieldLabel]) {
                    processedData[fieldLabel] = { value: item.fieldValue, remark: '' };
                } else {
                    processedData[fieldLabel].value = item.fieldValue;
                }
            }
        });

        return Object.entries(processedData).map(([label, data]) => ({
            label,
            value: data.value,
            remark: data.remark
        }));
    };

    // Sort approvals by level (and then by date if needed)
    const getSortedApprovals = () => {
        if (!submission || !submission.approvals) return [];

        return [...submission.approvals].sort((a, b) => {
            // Sort by approval level first
            if (a.approvalLevel !== b.approvalLevel) {
                return a.approvalLevel - b.approvalLevel;
            }
            // If same level, sort by date
            return new Date(a.approvedAt) - new Date(b.approvedAt);
        });
    };

    // Get a color class based on approval status
    const getStatusColor = (status) => {
        switch (status) {
            case "Approved": return "text-green-600";
            case "Rejected": return "text-red-600";
            default: return "text-gray-600";
        }
    };

    if (loading) return <LoadingDots />;


    if (!submission) {
        return (
            <Layout>
                <div className="text-center text-red-500">Submission not found</div>
            </Layout>
        );
    }
    const isGridValue = (value) => {
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

    const getStatusBadge = status => {
        switch (status) {
            case "Approved":
                return "bg-green-100 text-green-700";
            case "Rejected":
                return "bg-red-100 text-red-700";
            case "Pending":
                return "bg-yellow-100 text-yellow-700";
            default:
                return "bg-gray-100 text-gray-600";
        }
    };

    // ---------------------------
    // Build approval lists
    // ---------------------------
    const processedData = processSubmissionData();
    const previousApprovals = getSortedApprovals();

    // ---------------------------
    // Group by Approval Level
    // ---------------------------
    const groupedApprovals = Object.values(
        previousApprovals.reduce((acc, item) => {
            acc[item.approvalLevel] = acc[item.approvalLevel] || {
                level: item.approvalLevel,
                items: []
            };
            acc[item.approvalLevel].items.push(item);
            return acc;
        }, {})
    );


    return (
        <Layout>
            <div className="p-4 max-w-1xl mx-auto bg-white rounded-xl shadow-md">
                <h2 className="text-2xl font-bold mb-6">Approve Submission</h2>

                {/* Submission Details */}
                <div className="mb-6 bg-gray-50 p-4 rounded border">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Submission ID</p>
                            <p className="font-semibold">{submission.id}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Submitted At</p>
                            <p className="font-semibold">{formatDate(submission.submittedAt)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Form Name</p>
                            <p className="font-semibold">{formDefinition?.name}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Submitted By</p>
                            <p className="font-semibold">{submission.submittedBy || "Unknown"}</p>
                        </div>
                    </div>

                    {/* Important Fields */}
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-2">Important Fields</h3>
                        <div className="space-y-4">
                            {processedData.map((item, index) => (
                                <div key={index} className="border-b pb-3">
                                    <p className="text-gray-700 font-medium mb-1">
                                        {item.label}
                                    </p>
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
                                        <p className="ml-4 break-words">{item.value}</p>
                                    )}

                                    {item.remark && (
                                        <div className="ml-4 mt-2 bg-gray-50 p-2 rounded">
                                            <p className="text-sm text-gray-600">Remark:</p>
                                            <p className="italic text-gray-700 break-words">
                                                {item.remark}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Previous Approvals Section */}
                {/* Previous Approvals Section */}
                {groupedApprovals.length > 0 && (
                    <div className="mb-6 rounded-lg border bg-gray-50 p-5">
                        <h3 className="text-lg font-semibold mb-4">
                            Previous Approvals
                        </h3>

                        <div className="space-y-4">
                            {groupedApprovals.map(group => (
                                <details key={group.level} className="rounded border bg-white">

                                    <summary className="cursor-pointer px-4 py-3 flex justify-between items-center font-medium">
                                        <span>Level {group.level}</span>
                                        <span className="text-sm text-gray-500">
                                            {group.items.length} record(s)
                                        </span>
                                    </summary>

                                    <div className="p-4 space-y-3">
                                        {group.items.map((approval, idx) => (
                                            <div key={idx} className="rounded border p-3 bg-gray-50">

                                                <div className="flex justify-between">
                                                    <p className="font-semibold">
                                                        {approval.approverName}
                                                    </p>

                                                    <p className="text-sm text-gray-500">
                                                        {approval.approvedAt
                                                            ? formatDate(approval.approvedAt)
                                                            : "—"}
                                                    </p>
                                                </div>

                                                <span
                                                    className={`inline-block mt-1 rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                                                        approval.status
                                                    )}`}
                                                >
                                                    {approval.status}
                                                </span>

                                                {approval.comments && (
                                                    <p className="mt-2 text-sm text-gray-700">
                                                        <span className="font-medium">Comments:</span>{" "}
                                                        {approval.comments}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                </details>
                            ))}
                        </div>
                    </div>
                )}

                {/* Approval Form */}
                <div className="mb-4">
                    <label className="block mb-2">Status</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full border p-2 rounded"
                    >
                        <option value="Approved">Approve</option>
                        <option value="Rejected">Reject</option>
                    </select>
                </div>

                <div className="mb-4">
                    <label className="block mb-2">Comments</label>
                    <textarea
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        className="w-full border p-2 rounded"
                        rows="4"
                    />
                </div>

                <button
                    onClick={handleApproval}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    Submit Approval
                </button>
            </div>
        </Layout>
    );
}