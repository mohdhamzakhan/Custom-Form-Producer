import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import { useNavigate } from "react-router-dom";
import "react-datepicker/dist/react-datepicker.css";
import Layout from "./Layout";

export default function ReportPage() {
    const [forms, setForms] = useState([]);
    const [selectedFormId, setSelectedFormId] = useState("");
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

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
        // Fetch available forms to populate dropdown
        const fetchForms = async () => {
            if (!user) return;  // wait until user is loaded
            const response = await fetch(`http://localhost:5182/api/forms/GetALLForm`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(user)
            });
            const data = await response.json();
            setForms(data);
        };

        fetchForms();
    }, [user]);

    const generateReport = async () => {
        if (!selectedFormId || !startDate || !endDate) {
            alert("Please select Form and Date Range.");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`http://localhost:5182/api/reports/production?formId=${selectedFormId}&start=${startDate.toISOString()}&end=${endDate.toISOString()}`);
            if (!response.ok) throw new Error("Failed to fetch report data");

            const data = await response.json();
            setReportData(data);
        } catch (error) {
            console.error(error);
            alert("Error generating report");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
        <div className="max-w-5xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold mb-6">Production Report</h1>

            <div className="flex flex-wrap gap-4 mb-6">
                <div className="w-full md:w-1/3">
                    <label className="block mb-1 text-gray-700">Select Form</label>
                    <select
                        className="border p-2 rounded w-full"
                        value={selectedFormId}
                        onChange={(e) => setSelectedFormId(e.target.value)}
                    >
                        <option value="">Select a form</option>
                        {forms.map((form) => (
                            <option key={form.id} value={form.id}>
                                {form.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block mb-1 text-gray-700">Start Date</label>
                    <DatePicker
                        selected={startDate}
                        onChange={(date) => setStartDate(date)}
                        className="border p-2 rounded w-full"
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Select start date"
                    />
                </div>

                <div>
                    <label className="block mb-1 text-gray-700">End Date</label>
                    <DatePicker
                        selected={endDate}
                        onChange={(date) => setEndDate(date)}
                        className="border p-2 rounded w-full"
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Select end date"
                    />
                </div>

                <div className="flex items-end">
                    <button
                        onClick={generateReport}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded"
                    >
                        Generate Report
                    </button>
                </div>
            </div>

            {loading && <p>Loading report...</p>}

            {reportData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <div className="bg-gray-100 p-6 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-2">MTTB</h2>
                        <p className="text-2xl">{reportData.mttb} hours</p>
                    </div>
                    <div className="bg-gray-100 p-6 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-2">MTTF</h2>
                        <p className="text-2xl">{reportData.mttf} hours</p>
                    </div>
                    <div className="bg-gray-100 p-6 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-2">MTTR</h2>
                        <p className="text-2xl">{reportData.mttr} hours</p>
                    </div>
                </div>
            )}
            </div>
        </Layout>
    );
}
