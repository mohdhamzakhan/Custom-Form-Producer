import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const ReportList = () => {
    const [forms, setForms] = useState([]);
    const [formId, setFormId] = useState("");
    const [reports, setReports] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetch("http://localhost:5182/api/forms")
            .then(res => res.json())
            .then(setForms);
    }, []);

    const loadReports = async (formId) => {
        const res = await fetch(`http://localhost:5182/api/reports/form/${formId}`);
        const data = await res.json();
        setReports(data);
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-4">
            <h1 className="text-2xl font-bold">Saved Reports</h1>

            <div>
                <label>Select Form:</label>
                <select value={formId} onChange={e => {
                    setFormId(e.target.value);
                    loadReports(e.target.value);
                }} className="border p-2 w-full mt-1">
                    <option>Select...</option>
                    {forms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
            </div>

            {reports.length > 0 && (
                <div className="mt-4 space-y-4">
                    {reports.map(r => (
                        <div key={r.id} className="border p-4 rounded bg-white shadow-sm">
                            <h2 className="text-xl font-semibold">{r.name}</h2>
                            <p className="text-sm text-gray-600 mb-2">{r.description}</p>
                            <p className="text-xs italic">Layout: {r.layoutType}</p>
                            <div className="mt-2 flex gap-3">
                                <button
                                    onClick={() => navigate(`/report/view/${r.id}`)}
                                    className="px-3 py-1 bg-blue-500 text-white rounded"
                                >View</button>

                                <button
                                    onClick={() => navigate(`/report/edit/${r.id}`)}
                                    className="px-3 py-1 bg-yellow-400 text-black rounded"
                                >Edit</button>

                                <button
                                    onClick={async () => {
                                        if (window.confirm("Are you sure?")) {
                                            await fetch(`http://localhost:5182/api/reports/${r.id}`, {
                                                method: "DELETE"
                                            });
                                            loadReports(formId);
                                        }
                                    }}
                                    className="px-3 py-1 bg-red-500 text-white rounded"
                                >Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReportList;
