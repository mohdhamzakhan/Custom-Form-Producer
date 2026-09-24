import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Layout from "./Layout";
import { APP_CONSTANTS } from "./store";
import LoadingDots from './LoadingDots';

export default function ApprovalPage() {
    const { submissionId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [status, setStatus] = useState("Approved");
    const [comments, setComments] = useState("");
    const [submission, setSubmission] = useState(null);
    const [formDefinition, setFormDefinition] = useState(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

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

            let approvalLevel = 1; // Default to level 1

            if (submission?.form?.approvers?.length) {
                const currentUsername = (user?.[0] || "").toLowerCase();
                const currentUserGroups = (user || []).slice(1).map(g => (g || "").toLowerCase());

                const userApprover = submission.form.approvers.find(a => {
                    const approverName = (a.name || "").toLowerCase();
                    if ((a.type || "").toLowerCase() === "group") {
                        return currentUserGroups.includes(approverName);
                    }
                    return approverName === currentUsername;
                });

                if (userApprover) {
                    approvalLevel = userApprover.level;
                }
            }

            console.log(approvalLevel);

            const approvalData = {
                approverId: 123,
                approverName: user[0],
                level: approvalLevel,
                comments: comments,
                status: status,
            };

            const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms/submissions/${submissionId}/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(approvalData),
            });

            console.log(response);
            const data = await response.text();
            console.log(data);

            if (!response.ok) {
                console.error("Server responded with:", data);
                throw new Error("Approval failed");
            }

            alert("Approval saved successfully!");
            navigate(-1);
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

            const isRemark = fieldId.endsWith(" (Remark)");
            if (isRemark) {
                fieldId = fieldId.replace(" (Remark)", "");
            }

            const fieldLabel = getFieldLabel(fieldId);
            if (!fieldLabel) return;

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

    const getSortedApprovals = () => {
        if (!submission || !submission.approvals) return [];

        return [...submission.approvals].sort((a, b) => {
            if (a.approvalLevel !== b.approvalLevel) {
                return a.approvalLevel - b.approvalLevel;
            }
            return new Date(a.approvedAt) - new Date(b.approvedAt);
        });
    };

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
        const columnSet = new Set();
        gridData.forEach(row => {
            Object.keys(row).forEach(key => columnSet.add(key));
        });
        return Array.from(columnSet);
    };

    const normalizeColor = (color) => {
        if (!color) return undefined;
        return color.startsWith('#') ? color : `#${color}`;
    };

    const getGridColumnStyles = (gridLabel) => {
        const styleMap = {};
        if (!formDefinition || !formDefinition.fields) return styleMap;

        const gridField = formDefinition.fields.find(
            f => f.label === gridLabel && (f.type === 'grid' || f.type === 'questionGrid')
        );
        if (!gridField) return styleMap;

        let columns = gridField.columns;
        if ((!columns || !columns.length) && gridField.columnsJson) {
            try {
                columns = JSON.parse(gridField.columnsJson);
            } catch {
                columns = [];
            }
        }

        (columns || []).forEach(col => {
            styleMap[col.name] = {
                backgroundColor: normalizeColor(col.backgroundColor),
                color: normalizeColor(col.textColor)
            };
        });

        return styleMap;
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

    const processedData = processSubmissionData();
    const previousApprovals = getSortedApprovals();

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
            <div className="p-4 w-full sm:px-8 mx-auto bg-white rounded-xl shadow-md">
                <h2 className="text-2xl font-bold mb-6">Approve Submission</h2>

                {/* Submission Details */}
                <div className="mb-6 bg-gray-50 p-4 rounded border">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Submission ID</p>
                            <p className="font-semibold break-all">{submission.id}</p>
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
                                        <div className="w-full overflow-x-auto">
                                            {(() => {
                                                try {
                                                    const gridData = JSON.parse(item.value);
                                                    const columns = getGridColumns(gridData);
                                                    const columnStyles = getGridColumnStyles(item.label);
                                                    const color = getTableColor(item.label);
                                                    const isFixed = columns.length < 8;

                                                    return (
                                                        <div
                                                            className="rounded-md border overflow-hidden w-full min-w-full"
                                                            style={{ borderColor: color.borderColor }}
                                                        >
                                                            <table className={`min-w-full text-sm text-left ${isFixed ? 'table-fixed' : ''}`}>
                                                                <thead>
                                                                    <tr>
                                                                        {columns.map((col, idx) => (
                                                                            <th
                                                                                key={idx}
                                                                                className="px-4 py-3 font-semibold"
                                                                                style={{
                                                                                    // Removed the columnStyles override so the colorful hex codes are forced
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

                                                                                if (typeof cellValue === 'object' && cellValue !== null) {
                                                                                    cellValue = JSON.stringify(cellValue);
                                                                                }

                                                                                return (
                                                                                    <td
                                                                                        key={cIdx}
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
                                        <p className="text-gray-800 break-words">{item.value}</p>
                                    )}

                                    {item.remark && item.remark.trim() !== '' && (
                                        <div className="mt-2 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r shadow-sm">
                                            <p className="text-xs font-medium text-yellow-800 mb-1">Remark</p>
                                            <p className="text-gray-700 break-words whitespace-pre-wrap text-sm">{item.remark}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

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
                    <label className="block mb-2 font-medium text-gray-700">Status</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full border p-2 rounded focus:ring focus:ring-blue-200"
                    >
                        <option value="Approved">Approve</option>
                        <option value="Rejected">Reject</option>
                    </select>
                </div>

                <div className="mb-4">
                    <label className="block mb-2 font-medium text-gray-700">Comments</label>
                    <textarea
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        className="w-full border p-2 rounded focus:ring focus:ring-blue-200"
                        rows="4"
                        placeholder="Add your approval comments here..."
                    />
                </div>

                <button
                    onClick={handleApproval}
                    className="bg-blue-500 text-white px-6 py-2 rounded font-medium hover:bg-blue-600 transition-colors shadow-sm"
                >
                    Submit Approval
                </button>
            </div>
        </Layout>
    );
}