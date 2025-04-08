import { useState} from "react";
import { useParams } from "react-router-dom";

export default function ApprovalPage() {
    const { submissionId } = useParams();
    const [status, setStatus] = useState("Approved");
    const [comments, setComments] = useState("");

    const handleApproval = async () => {
        try {
            const approvalData = {
                approverId: 123, // <-- number, not string
                approverName: "John Doe",
                level: 1,
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
            window.location.reload();
        } catch (error) {
            console.error("Error approving submission:", error);
            alert("Error approving submission");
        }
    };


    return (
        <div className="p-4 max-w-lg mx-auto bg-white rounded-xl shadow-md">
            <h2 className="text-xl font-bold mb-4">Approve Submission</h2>

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
    );
}
