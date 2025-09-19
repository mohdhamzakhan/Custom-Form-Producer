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
            // Check if xField contains date-like values
            const isDateField = data.some(item => {
                const value = item[xField];
                console.log('Checking date field:', xField, value);

                if (!value) return false;

                // Handle year-only values (like your current case)
                if (typeof value === 'number' && value >= 1900 && value <= 2100) {
                    return true;
                }

                // Handle ISO datetime format
                if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
                    return !isNaN(Date.parse(value));
                }

                // Handle other date formats
                if (typeof value === 'string' && (value.includes('/') || value.includes('-'))) {
                    return !isNaN(Date.parse(value));
                }

                return false;
            });

            console.log('Is date field detected:', isDateField);

            let barData;

            if (isDateField) {
                barData = data.map((item, index) => {
                    const dateValue = item[xField];
                    let formattedDate = dateValue;

                    // Handle year-only values
                    if (typeof dateValue === 'number') {
                        formattedDate = dateValue.toString();
                    }
                    // Handle full ISO datetime
                    else if (typeof dateValue === 'string' && dateValue.includes('T')) {
                        const date = new Date(dateValue);
                        if (!isNaN(date.getTime())) {
                            formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                        }
                    }

                    return {
                        ...item,
                        [xField]: formattedDate,
                        originalDate: dateValue,
                        sortIndex: index // For proper sorting when dates are identical
                    };
                });
            } else {
                // Original grouping logic for non-date fields
                const groupedBarData = data.reduce((acc, item) => {
                    const categoryValue = item[xField] || item.name || 'Unknown';

                    if (!acc[categoryValue]) {
                        acc[categoryValue] = { [xField]: categoryValue };
                    }

                    metrics.forEach(metric => {
                        const metricValue = item[metric];
                        const numericValue = typeof metricValue === 'number' ? metricValue : parseFloat(metricValue) || 0;

                        if (acc[categoryValue][metric]) {
                            acc[categoryValue][metric] += numericValue;
                        } else {
                            acc[categoryValue][metric] = numericValue;
                        }
                    });

                    return acc;
                }, {});

                barData = Object.values(groupedBarData)
                    .sort((a, b) => {
                        const aValue = a[metrics[0]] || 0;
                        const bValue = b[metrics[0]] || 0;
                        return bValue - aValue;
                    });
            }
            console.log('xField value:', xField);
            console.log('First data item:', data[0]);
            console.log('Date field value:', data[0]?.[xField]);
            console.log('Is date field detected:', isDateField);

            console.log('Bar chart processed data:', barData);

            if (barData.length === 0) {
                return (
                    <div className="p-6 text-center bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="text-4xl mb-2">📊</div>
                        <h3 className="text-lg font-medium text-yellow-800 mb-1">No Valid Data</h3>
                        <p className="text-yellow-600 text-sm">No data available for bar chart</p>
                    </div>
                );
            }

            // Custom tick formatter for dates
            const formatXAxisTick = (tickItem) => {
                if (isDateField) {
                    // If it's already formatted (dd/mm/yyyy), return as is
                    if (typeof tickItem === 'string' && tickItem.includes('/')) {
                        return tickItem;
                    }
                    // If it's still a date object or ISO string, format it
                    const date = new Date(tickItem);
                    if (!isNaN(date.getTime())) {
                        return date.toLocaleDateString('en-GB');
                    }
                }
                return tickItem;
            };

            return (
                <div className="w-full">
                    <ChartTitle />
                    <div className="mb-2 text-center">
                        <p className="text-sm text-gray-600">
                            Showing {barData.length} {isDateField ? 'data points' : 'categories'} • {metrics.length} metric{metrics.length > 1 ? 's' : ''}
                        </p>
                    </div>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey={xField || 'name'}
                                tick={{ fontSize: 12 }}
                                tickFormatter={formatXAxisTick}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                interval={0} // Show all ticks for dates
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
            // Group and sum data by the same categories for pie chart
            const groupedData = data.reduce((acc, item) => {
                const categoryValue = item[xField] || item.name || 'Unknown';
                const metricValue = item[metrics[0]]; // Pie charts use only the first metric
                const numericValue = typeof metricValue === 'number' ? metricValue : parseFloat(metricValue) || 0;

                // If category already exists, sum the values
                if (acc[categoryValue]) {
                    acc[categoryValue] += numericValue;
                } else {
                    acc[categoryValue] = numericValue;
                }

                return acc;
            }, {});

            // Transform grouped data into pie chart format
            const pieData = Object.entries(groupedData)
                .map(([category, value]) => ({
                    name: category,
                    value: value
                }))
                .filter(item => item.value > 0) // Filter out zero values
                .sort((a, b) => b.value - a.value); // Sort by value descending

            console.log('Pie chart grouped data:', pieData);

            if (pieData.length === 0) {
                return (
                    <div className="p-6 text-center bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="text-4xl mb-2">📊</div>
                        <h3 className="text-lg font-medium text-yellow-800 mb-1">No Valid Data</h3>
                        <p className="text-yellow-600 text-sm">All values are zero or invalid for pie chart</p>
                    </div>
                );
            }

            return (
                <div className="w-full">
                    <ChartTitle />
                    <div className="mb-2 text-center">
                        <p className="text-sm text-gray-600">
                            Showing {pieData.length} categories • Total: {pieData.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                        </p>
                    </div>
                    <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent, value }) =>
                                    percent > 0.05 ? `${name}: ${(percent * 100).toFixed(1)}%` : '' // Only show labels for slices > 5%
                                }
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
                                    value.toLocaleString(),
                                    metrics[0]
                                ]}
                                labelFormatter={(label) => `Category: ${label}`}
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Show summary table below the chart */}
                    <div className="mt-4 bg-gray-50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Data Summary:</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                            {pieData.slice(0, 8).map((item, index) => (
                                <div key={index} className="flex items-center">
                                    <div
                                        className="w-3 h-3 rounded mr-2"
                                        style={{ backgroundColor: colors[index % colors.length] }}
                                    ></div>
                                    <span className="truncate">
                                        {item.name}: {item.value.toLocaleString()}
                                    </span>
                                </div>
                            ))}
                            {pieData.length > 8 && (
                                <div className="text-gray-500">
                                    +{pieData.length - 8} more...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        case 'combo':
            const barMetrics = comboConfig?.barMetrics || [];
            const lineMetrics = comboConfig?.lineMetrics || [];

            // Sort data by xField if it's a date field for better visualization
            const sortedComboData = [...data].map(item => {
                const dateValue = item[xField];
                let processedItem = { ...item };

                // Format ISO datetime to dd/mm/yyyy if it's a datetime string
                if (typeof dateValue === 'string' && dateValue.includes('T')) {
                    const date = new Date(dateValue);
                    processedItem[xField] = date.toLocaleDateString('en-GB'); // dd/mm/yyyy format
                    processedItem.originalDate = dateValue; // Keep original for sorting
                }

                return processedItem;
            }).sort((a, b) => {
                const aVal = a.originalDate || a[xField];
                const bVal = b.originalDate || b[xField];

                // Try to parse as date first
                const aDate = new Date(aVal);
                const bDate = new Date(bVal);

                if (!isNaN(aDate) && !isNaN(bDate)) {
                    return aDate - bDate;
                }

                // Fall back to string comparison
                return String(aVal).localeCompare(String(bVal));
            });

            console.log("Combo Metrics", comboConfig);
            console.log("Bar Metrics", barMetrics);
            console.log("Line Metrics", lineMetrics);
            console.log("Sorted combo data", sortedComboData);

            return (
                <div className="w-full">
                    <ChartTitle />
                    <div className="mb-2 text-center">
                        <p className="text-sm text-gray-600">
                            {barMetrics.length} bar metric{barMetrics.length !== 1 ? 's' : ''} • {lineMetrics.length} line metric{lineMetrics.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={sortedComboData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                                    name={`${metric} (Bar)`}
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
                                    name={`${metric} (Line)`}
                                    connectNulls={false}
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