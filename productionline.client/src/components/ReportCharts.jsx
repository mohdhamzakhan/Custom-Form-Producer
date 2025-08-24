import React from 'react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ComposedChart
} from 'recharts';

// Define chart types that your app supports
export const CHART_TYPES = {
    bar: {
        label: "Bar Chart",
        description: "Compare values across categories",
        requiresXAxis: true,
        allowsMultipleMetrics: true
    },
    line: {
        label: "Line Chart",
        description: "Show trends over time",
        requiresXAxis: true,
        allowsMultipleMetrics: true
    },
    pie: {
        label: "Pie Chart",
        description: "Show parts of a whole",
        requiresXAxis: false,
        allowsMultipleMetrics: false
    },
    combo: {
        label: "Combo Chart",
        description: "Combine bars and lines",
        requiresXAxis: true,
        allowsMultipleMetrics: true
    }
};

const ReportCharts = ({
    data,
    metrics,
    type,
    xField,
    title,
    comboConfig
}) => {
    console.log('ReportCharts rendering with:', {
        data: data?.length,
        metrics,
        type,
        xField,
        title
    });

    // Validate props
    if (!data || data.length === 0) {
        return (
            <div className="p-6 text-center bg-gray-50 border rounded-lg">
                <div className="text-4xl mb-2">📊</div>
                <h3 className="text-lg font-medium text-gray-700 mb-1">No Data Available</h3>
                <p className="text-gray-500 text-sm">No data points found for this chart</p>
            </div>
        );
    }

    if (!metrics || metrics.length === 0) {
        return (
            <div className="p-6 text-center bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-4xl mb-2">⚠️</div>
                <h3 className="text-lg font-medium text-yellow-800 mb-1">No Metrics Selected</h3>
                <p className="text-yellow-600 text-sm">Please select metrics to display</p>
            </div>
        );
    }

    // Colors for charts
    const colors = [
        '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe',
        '#00c49f', '#ffbb28', '#ff8042', '#8dd1e1', '#d084d0'
    ];

    // Chart title component
    const ChartTitle = () => (
        title ? (
            <div className="mb-4 text-center">
                <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
            </div>
        ) : null
    );

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border rounded shadow-lg">
                    {label && <p className="font-medium">{`${label}`}</p>}
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color }}>
                            {`${entry.name}: ${typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}`}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Render different chart types
    switch (type) {
        case 'bar':
            return (
                <div className="w-full">
                    <ChartTitle />
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey={xField || 'name'}
                                tick={{ fontSize: 12 }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            {metrics.map((metric, index) => (
                                <Bar
                                    key={metric}
                                    dataKey={metric}
                                    fill={colors[index % colors.length]}
                                    name={metric}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );

        case 'line':
            return (
                <div className="w-full">
                    <ChartTitle />
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey={xField || 'name'}
                                tick={{ fontSize: 12 }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            {metrics.map((metric, index) => (
                                <Line
                                    key={metric}
                                    type="monotone"
                                    dataKey={metric}
                                    stroke={colors[index % colors.length]}
                                    strokeWidth={2}
                                    name={metric}
                                    connectNulls={false}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            );

        case 'pie':
            // For pie charts, we need to transform the data differently
            const pieData = data.map((item, index) => {
                const value = item[metrics[0]]; // Pie charts use only the first metric
                return {
                    name: item[xField] || item.name || `Item ${index + 1}`,
                    value: typeof value === 'number' ? value : parseFloat(value) || 0,
                    originalItem: item
                };
            }).filter(item => item.value > 0); // Filter out zero values

            console.log('Pie chart data:', pieData);

            return (
                <div className="w-full">
                    <ChartTitle />
                    <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                outerRadius={120}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value, name) => [
                                    typeof value === 'number' ? value.toLocaleString() : value,
                                    metrics[0]
                                ]}
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            );

        case 'combo':
            const barMetrics = comboConfig?.barMetrics || [];
            const lineMetrics = comboConfig?.lineMetrics || [];

            return (
                <div className="w-full">
                    <ChartTitle />
                    <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey={xField || 'name'}
                                tick={{ fontSize: 12 }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />

                            {/* Render bars */}
                            {barMetrics.map((metric, index) => (
                                <Bar
                                    key={`bar-${metric}`}
                                    dataKey={metric}
                                    fill={colors[index % colors.length]}
                                    name={metric}
                                />
                            ))}

                            {/* Render lines */}
                            {lineMetrics.map((metric, index) => (
                                <Line
                                    key={`line-${metric}`}
                                    type="monotone"
                                    dataKey={metric}
                                    stroke={colors[(barMetrics.length + index) % colors.length]}
                                    strokeWidth={2}
                                    name={metric}
                                />
                            ))}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            );

        default:
            return (
                <div className="p-6 text-center bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-4xl mb-2">❌</div>
                    <h3 className="text-lg font-medium text-red-800 mb-1">Unsupported Chart Type</h3>
                    <p className="text-red-600 text-sm">Chart type "{type}" is not supported</p>
                </div>
            );
    }
};

export default ReportCharts;