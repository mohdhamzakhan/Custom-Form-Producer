import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const ReportViewer = () => {
    const { id } = useParams();
    const [report, setReport] = useState(null);
    const [data, setData] = useState([]);

    useEffect(() => {
        fetch(`http://localhost:5182/api/reports/${id}`)
            .then(res => res.json())
            .then(r => {
                setReport(r);
                fetch(`http://localhost:5182/api/formsubmissions/form/${r.formId}`)
                    .then(res => res.json())
                    .then(setData);
            });
    }, [id]);

    const parseCustomField = (expression, row) => {
        let safeExpr = expression;
        Object.keys(row).forEach(key => {
            const value = isNaN(row[key]) ? `"${row[key]}"` : row[key];
            safeExpr = safeExpr.replaceAll(`{${key}}`, value);
        });

        try {
            return eval(safeExpr);
        } catch {
            return "❌";
        }
    };

    if (!report) return <div className="p-6">Loading report...</div>;

    const config = JSON.parse(report.definitionJson);
    const allColumns = [...(config.selectedFields || []), ...(config.customFields || []).map(f => f.label)];

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold">{report.name}</h1>
            <p className="text-sm text-gray-600 mb-4">{report.description}</p>

            {report.layoutType === "list" ? (
                <table className="w-full border-collapse bg-white shadow-sm">
                    <thead>
                        <tr>
                            {allColumns.map(col => (
                                <th key={col} className="border p-2 bg-gray-100 text-left">{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <tr key={i}>
                                {config.selectedFields.map(field => (
                                    <td key={field} className="border p-2">{row[field]}</td>
                                ))}
                                {config.customFields.map((field, idx) => (
                                    <td key={idx} className="border p-2 text-blue-700 font-semibold">
                                        {parseCustomField(field.expression, row)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="space-y-4">
                    {data.map((row, i) => (
                        <div key={i} className="p-4 border bg-white shadow-sm rounded">
                            {config.selectedFields.map(field => (
                                <div key={field}>
                                    <strong>{field}:</strong> {row[field]}
                                </div>
                            ))}
                            {config.customFields.map((field, idx) => (
                                <div key={idx}>
                                    <strong>{field.label}:</strong> {parseCustomField(field.expression, row)}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReportViewer;
