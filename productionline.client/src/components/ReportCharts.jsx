import {
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
    PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer
} from "recharts";
import { useMemo } from "react";

const COLORS = [
    "#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#00C49F", "#FFBB28",
    "#FF6384", "#36A2EB", "#9966FF", "#FFCE56", "#4BC0C0"
];


export default function ReportCharts({ data = [], metrics = [], type = "bar", fields = [], xField = "Line Name", title = "Chart" }) {
    const chartData = useMemo(() => {
        if (!Array.isArray(data) || !Array.isArray(metrics)) return [];

        const grouped = {};

        data.forEach(entry => {
            const xValue = entry.data?.find(d => d.fieldLabel === xField)?.value || "Unknown";

            if (!grouped[xValue]) grouped[xValue] = { name: xValue };

            metrics.forEach(metric => {
                const val = entry.data?.find(d => d.fieldLabel === metric);
                const num = parseFloat(val?.value || "0");
                grouped[xValue][metric] = (grouped[xValue][metric] || 0) + (isNaN(num) ? 0 : num);
            });
        });

        return Object.values(grouped);
    }, [data, metrics, xField]);

    if (!chartData || chartData.length === 0) {
        return <div className="text-gray-500 italic">No chart data available.</div>;
    }

    return (
        <div className="bg-white p-4 rounded border shadow">
            <h4 className="font-semibold text-lg mb-4">{title}</h4>
            <ResponsiveContainer width="100%" height={300}>
                {type === "bar" && (
                    <BarChart data={chartData} width={700} height={400}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {metrics.map((metric, idx) => (
                            <Bar
                                key={metric}
                                dataKey={metric}
                                fill={COLORS[idx % COLORS.length]}
                                label={{ position: "top", fill: "#000", fontSize: 12 }}
                            />
                        ))}
                    </BarChart>
                )}


                {type === "line" && (
                    <LineChart data={chartData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {metrics.map((metric, idx) => (
                            <Line key={metric} type="monotone" dataKey={metric} stroke={COLORS[idx % COLORS.length]} />
                        ))}
                    </LineChart>
                )}

                {type === "pie" && (
                    <PieChart>
                        <Tooltip />
                        <Legend />
                        {metrics.map((metric, idx) => (
                            <Pie
                                key={metric}
                                data={chartData}
                                dataKey={metric}
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={80 + idx * 20}
                                label
                            >
                                {chartData.map((entry, i) => (
                                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                        ))}
                    </PieChart>
                )}

            </ResponsiveContainer>
        </div>
    );
}
