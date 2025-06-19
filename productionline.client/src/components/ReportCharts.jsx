// components/ReportCharts.jsx
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { useEffect, useState } from 'react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function ReportCharts({ submissionData, fields, selectedFields }) {
    const [chartData, setChartData] = useState([]);
    const [chartType, setChartType] = useState('bar');
    const [selectedMetric, setSelectedMetric] = useState(""); // grid column or field

    useEffect(() => {
        if (!submissionData.length || !selectedMetric) return;

        const rows = [];

        submissionData.forEach((submission) => {
            selectedFields.forEach(fieldId => {
                const field = fields.find(f => f.id === fieldId);
                const baseFieldId = fieldId.split(":")[0];
                const fieldData = submission.submissionData.find(d => d.fieldLabel === baseFieldId);

                if (fieldData?.fieldValue) {
                    try {
                        const parsed = JSON.parse(fieldData.fieldValue);

                        if (Array.isArray(parsed) && typeof parsed[0] === "object") {
                            parsed.forEach(row => {
                                if (row[selectedMetric]) {
                                    rows.push({ name: row["Model No"] || "Row", value: Number(row[selectedMetric]) || 0 });
                                }
                            });
                        } else if (field.label === selectedMetric) {
                            rows.push({ name: field.label, value: Number(parsed) || 0 });
                        }
                    } catch {
                        if (field.label === selectedMetric) {
                            rows.push({ name: field.label, value: Number(fieldData.fieldValue) || 0 });
                        }
                    }
                }
            });
        });

        setChartData(rows);
    }, [submissionData, fields, selectedFields, selectedMetric]);

    const renderChart = () => {
        if (!chartData.length) return <p className="text-gray-400">No data available</p>;

        switch (chartType) {
            case 'pie':
                return (
                    <PieChart width={400} height={300}>
                        <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            outerRadius={100}
                            fill="#8884d8"
                            label
                        >
                            {chartData.map((_, i) => (
                                <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                );
            case 'line':
                return (
                    <LineChart width={500} height={300} data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="value" stroke="#8884d8" />
                    </LineChart>
                );
            default:
                return (
                    <BarChart width={500} height={300} data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#82ca9d" />
                    </BarChart>
                );
        }
    };

    const metricOptions = [];

    selectedFields.forEach(fid => {
        const field = fields.find(f => f.id === fid);
        if (field?.label) {
            if (fid.includes(":")) {
                const label = field.label.split("→").pop().trim();
                if (!metricOptions.includes(label)) metricOptions.push(label);
            } else {
                if (!metricOptions.includes(field.label)) metricOptions.push(field.label);
            }
        }
    });

    return (
        <div className="border rounded p-4 mt-4 bg-white">
            <div className="flex items-center gap-4 mb-4">
                <select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                    className="border p-2 rounded"
                >
                    <option value="">Select Metric</option>
                    {metricOptions.map((label, idx) => (
                        <option key={idx} value={label}>{label}</option>
                    ))}
                </select>

                <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                    className="border p-2 rounded"
                >
                    <option value="bar">Bar</option>
                    <option value="pie">Pie</option>
                    <option value="line">Line</option>
                </select>
            </div>

            <div className="flex justify-center">
                {renderChart()}
            </div>
        </div>
    );
}
