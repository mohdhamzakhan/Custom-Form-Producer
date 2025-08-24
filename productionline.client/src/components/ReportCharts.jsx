import {
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
    PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
    ComposedChart, Area, AreaChart, Scatter, ScatterChart
} from "recharts";
import { useMemo } from "react";

const COLORS = [
    "#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#00C49F", "#FFBB28",
    "#FF6384", "#36A2EB", "#9966FF", "#FFCE56", "#4BC0C0"
];

// Chart type configurations
export const CHART_TYPES = {
    bar: {
        label: "📊 Bar Chart",
        requiresXAxis: true,
        requiresYAxis: true,
        allowsMultipleMetrics: true,
        description: "Compare values across categories"
    },
    line: {
        label: "📈 Line Chart",
        requiresXAxis: true,
        requiresYAxis: true,
        allowsMultipleMetrics: true,
        description: "Show trends over time or categories"
    },
    pie: {
        label: "🥧 Pie Chart",
        requiresXAxis: false,
        requiresYAxis: false,
        allowsMultipleMetrics: false,
        description: "Show proportions of a whole"
    },
    area: {
        label: "📊 Area Chart",
        requiresXAxis: true,
        requiresYAxis: true,
        allowsMultipleMetrics: true,
        description: "Show cumulative values over time"
    },
    scatter: {
        label: "⚪ Scatter Plot",
        requiresXAxis: true,
        requiresYAxis: true,
        allowsMultipleMetrics: false,
        description: "Show correlation between two variables"
    },
    combo: {
        label: "📊📈 Bar + Line Combo",
        requiresXAxis: true,
        requiresYAxis: true,
        allowsMultipleMetrics: true,
        description: "Combine bar and line charts"
    }
};

export default function ReportCharts({
    data = [],
    metrics = [],
    type = "bar",
    xField = "Line Name",
    title = "Chart",
    comboConfig = { barMetrics: [], lineMetrics: [] }
}) {
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

    const renderChart = () => {
        switch (type) {
            case "bar":
                return (
                    <BarChart data={chartData}>
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
                );

            case "line":
                return (
                    <LineChart data={chartData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {metrics.map((metric, idx) => (
                            <Line
                                key={metric}
                                type="monotone"
                                dataKey={metric}
                                stroke={COLORS[idx % COLORS.length]}
                                strokeWidth={2}
                                dot={{ r: 4 }}
                            />
                        ))}
                    </LineChart>
                );

            case "area":
                return (
                    <AreaChart data={chartData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {metrics.map((metric, idx) => (
                            <Area
                                key={metric}
                                type="monotone"
                                dataKey={metric}
                                stackId="1"
                                stroke={COLORS[idx % COLORS.length]}
                                fill={COLORS[idx % COLORS.length]}
                                fillOpacity={0.6}
                            />
                        ))}
                    </AreaChart>
                );

            case "scatter":
                return (
                    <ScatterChart data={chartData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Scatter
                            dataKey={metrics[0]}
                            fill={COLORS[0]}
                        />
                    </ScatterChart>
                );

            case "combo":
                return (
                    <ComposedChart data={chartData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {comboConfig.barMetrics?.map((metric, idx) => (
                            <Bar
                                key={`bar-${metric}`}
                                dataKey={metric}
                                fill={COLORS[idx % COLORS.length]}
                            />
                        ))}
                        {comboConfig.lineMetrics?.map((metric, idx) => (
                            <Line
                                key={`line-${metric}`}
                                type="monotone"
                                dataKey={metric}
                                stroke={COLORS[(idx + comboConfig.barMetrics?.length || 0) % COLORS.length]}
                                strokeWidth={3}
                            />
                        ))}
                    </ComposedChart>
                );

            case "pie":
                return (
                    <PieChart>
                        <Tooltip />
                        <Legend />
                        <Pie
                            data={chartData}
                            dataKey={metrics[0]}
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={120}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        >
                            {chartData.map((entry, i) => (
                                <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                            ))}
                        </Pie>
                    </PieChart>
                );

            default:
                return <div className="text-red-500">Unknown chart type: {type}</div>;
        }
    };

    return (
        <div className="bg-white p-4 rounded border shadow">
            <h4 className="font-semibold text-lg mb-4">{title}</h4>
            <ResponsiveContainer width="100%" height={400}>
                {renderChart()}
            </ResponsiveContainer>
        </div>
    );
}