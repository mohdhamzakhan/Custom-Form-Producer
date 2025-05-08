﻿import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "./Layout";

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
            setUser(storedUser);
        } else {
            navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
        }
    }, [navigate]);

    // Fetch submission + form details
    useEffect(() => {
        const fetchSubmissionDetails = async () => {
            try {
                const response = await fetch(`http://localhost:5182/api/forms/submissions/${submissionId}`);
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
            if (submission?.form?.approvers) {
                const userApprover = submission.form.approvers.find(a => a.name === user.username);
                if (userApprover) {
                    approvalLevel = userApprover.level;
                }
            }

            const approvalData = {
                approverId: 123, // (you can replace with real user id if available)
                approverName: user.username, // 🔥 from logged-in user
                level: approvalLevel, // Use the correct level for this user
                comments: comments,
                status: status,
            };

            const response = await fetch(`http://localhost:5182/api/forms/submissions/${submissionId}/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(approvalData),
            });

            const data = await response.text();

            if (!response.ok) {
                console.error("Server responded with:", data);
                throw new Error("Approval failed");
            }

            alert("Approval saved successfully!");
            navigate("/reports"); // redirect to report page
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

    if (loading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    Loading submission details...
                </div>
            </Layout>
        );
    }

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
            return Array.isArray(parsed) && typeof parsed[0] === 'object';
        } catch {
            return false;
        }
    };


    const processedData = processSubmissionData();
    const previousApprovals = getSortedApprovals();

    return (
        <Layout>
            <div className="p-4 max-w-3xl mx-auto bg-white rounded-xl shadow-md">
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
                        <div className="space-y-2">
                            {processedData.slice(0, 5).map((item, index) => (
                                <div key={index}>
                                    <p className="text-gray-700">
                                        <strong>{item.label}:</strong>
                                    </p>
                                    {isGridValue(item.value) ? (
                                        <div className="overflow-auto mt-1 border rounded">
                                            <table className="min-w-full text-sm text-left border-collapse border border-gray-300">
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
                                        <p className="ml-4">{item.value}</p>
                                    )}

                                    {item.remark && (
                                        <p className="ml-4 italic text-gray-600">
                                            Remark: {item.remark}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Previous Approvals Section */}
                {previousApprovals.length > 0 && (
                    <div className="mb-6 bg-gray-50 p-4 rounded border">
                        <h3 className="text-lg font-semibold mb-2">Previous Approvals</h3>
                        <div className="space-y-4">
                            {previousApprovals.map((approval, index) => (
                                <div key={index} className="p-3 border-l-4 border-gray-300 bg-white">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium">
                                                {approval.approverName}
                                                <span className="text-sm text-gray-500 ml-2">
                                                    (Level {approval.approvalLevel})
                                                </span>
                                            </p>
                                            <p className={`font-bold ${getStatusColor(approval.status)}`}>
                                                {approval.status}
                                            </p>
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            {formatDate(approval.approvedAt)}
                                        </p>
                                    </div>
                                    {approval.comments && (
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-700">
                                                <span className="font-medium">Comments:</span> {approval.comments}
                                            </p>
                                        </div>
                                    )}
                                </div>
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