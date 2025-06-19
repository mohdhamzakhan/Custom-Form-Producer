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
    const [selectedMetrics, setSelectedMetrics] = useState([]);

    useEffect(() => {
        if (!submissionData.length || !selectedMetrics.length) return;

        const rows = [];

        submissionData.forEach((submission, index) => {
            const row = { name: `Row ${index + 1}` };

            selectedMetrics.forEach(metric => {
                selectedFields.forEach(fieldId => {
                    const field = fields.find(f => f.id === fieldId);
                    const baseFieldId = fieldId.split(":")[0];
                    const fieldData = submission.submissionData.find(d => d.fieldLabel === baseFieldId);

                    if (fieldData?.fieldValue) {
                        try {
                            const parsed = JSON.parse(fieldData.fieldValue);

                            if (Array.isArray(parsed) && typeof parsed[0] === "object") {
                                const values = parsed.map(row => Number(row[metric]) || 0);
                                if (values.length > 0) {
                                    row[metric] = values.reduce((a, b) => a + b, 0);
                                }
                            } else if (field.label === metric) {
                                row[metric] = Number(parsed) || 0;
                            }
                        } catch {
                            if (field.label === metric) {
                                row[metric] = Number(fieldData.fieldValue) || 0;
                            }
                        }
                    }
                });
            });

            rows.push(row);
        });

        setChartData(rows);
    }, [submissionData, fields, selectedFields, selectedMetrics]);


    const renderChart = () => {
        if (!chartData.length) return <p className="text-gray-400">No data available</p>;

        switch (chartType) {
            case 'line':
                return (
                    <LineChart width={600} height={350} data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {selectedMetrics.map((metric, idx) => (
                            <Line
                                key={metric}
                                type="monotone"
                                dataKey={metric}
                                stroke={COLORS[idx % COLORS.length]}
                            />
                        ))}
                    </LineChart>
                );
            case 'pie':
                if (selectedMetrics.length !== 1) {
                    return <p className="text-red-500">Select one metric for pie chart</p>;
                }
                return (
                    <PieChart width={400} height={300}>
                        <Pie
                            data={chartData}
                            dataKey={selectedMetrics[0]}
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
            default:
                return (
                    <BarChart width={600} height={350} data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {selectedMetrics.map((metric, idx) => (
                            <Bar key={metric} dataKey={metric} fill={COLORS[idx % COLORS.length]} />
                        ))}
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
                    multiple
                    className="border p-2 rounded h-32"
                    value={selectedMetrics}
                    onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, o => o.value);
                        setSelectedMetrics(selected);
                    }}
                >
                    <option value="">Select Metrics</option>
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
