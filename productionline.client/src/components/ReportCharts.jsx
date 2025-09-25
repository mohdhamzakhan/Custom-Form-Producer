import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ComposedChart
} from 'recharts';
import { Settings, Play, Pause, Plus, Trash2, Clock, Users, Target, Timer } from 'lucide-react';

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
    },
    shift: {
        label: "Shift Production Chart",
        description: "Real-time production tracking by shifts",
        requiresXAxis: false,
        allowsMultipleMetrics: false,
        isRealTime: true,
        isConfigurable: true
    }
};

const SHIFT_CONFIG = {
    A: {
        name: "Shift A",
        startTime: "06:00",
        endTime: "14:30",
        defaultBreaks: [
            { id: 1, startTime: "09:00", endTime: "09:15", name: "Morning Break" },
            { id: 2, startTime: "11:30", endTime: "12:00", name: "Lunch Break" },
            { id: 3, startTime: "13:00", endTime: "13:15", name: "Afternoon Break" }
        ]
    },
    B: {
        name: "Shift B",
        startTime: "14:30",
        endTime: "23:00",
        defaultBreaks: [
            { id: 1, startTime: "16:30", endTime: "16:45", name: "Evening Break" },
            { id: 2, startTime: "18:30", endTime: "19:00", name: "Dinner Break" },
            { id: 3, startTime: "21:00", endTime: "21:15", name: "Night Break" }
        ]
    },
    C: {
        name: "Shift C",
        startTime: "23:00",
        endTime: "06:00",
        defaultBreaks: [
            { id: 1, startTime: "01:00", endTime: "01:15", name: "Midnight Break" },
            { id: 2, startTime: "03:00", endTime: "03:30", name: "Early Morning Break" },
            { id: 3, startTime: "05:00", endTime: "05:15", name: "Pre-Dawn Break" }
        ]
    }
};

const getCurrentShift = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute; // Convert to minutes from midnight

    // Shift A: 6:00 AM to 2:30 PM (360 to 870 minutes)
    if (currentTime >= 360 && currentTime < 870) return 'A';
    // Shift B: 2:30 PM to 11:00 PM (870 to 1380 minutes)
    if (currentTime >= 870 && currentTime < 1380) return 'B';
    // Shift C: 11:00 PM to 6:00 AM next day
    return 'C';
};

const calculateTargetLine = (shiftStart, shiftEnd, targetParts, cycleTimeSeconds, breaks) => {
    const targetData = [];
    const shiftStartTime = new Date();
    const [startHour, startMinute] = shiftStart.split(':');
    shiftStartTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);

    const shiftEndTime = new Date();
    const [endHour, endMinute] = shiftEnd.split(':');
    shiftEndTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

    // Handle overnight shifts
    if (shiftEndTime < shiftStartTime) {
        shiftEndTime.setDate(shiftEndTime.getDate() + 1);
    }

    // Calculate parts per minute
    const partsPerSecond = 1 / cycleTimeSeconds;
    const partsPerMinute = partsPerSecond * 60;

    // Generate target line data points every 5 minutes
    const currentTime = new Date(shiftStartTime);
    let cumulativeParts = 0;

    while (currentTime <= shiftEndTime) {
        const timeLabel = currentTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        // Check if current time is during a break
        const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
        const isDuringBreak = breaks.some(breakItem => {
            const [startH, startM] = breakItem.startTime.split(':');
            const [endH, endM] = breakItem.endTime.split(':');
            let breakStart = parseInt(startH) * 60 + parseInt(startM);
            let breakEnd = parseInt(endH) * 60 + parseInt(endM);

            // Handle overnight break times
            if (breakEnd < breakStart) {
                breakEnd += 24 * 60;
            }

            let checkTime = currentMinutes;
            if (currentTime.getDate() > shiftStartTime.getDate()) {
                checkTime += 24 * 60;
            }

            return checkTime >= breakStart && checkTime <= breakEnd;
        });

        // Calculate cumulative parts based on elapsed productive time
        if (!isDuringBreak) {
            // Calculate how many productive minutes have passed from shift start to current time
            let productiveMinutes = 0;
            const tempTime = new Date(shiftStartTime);

            while (tempTime < currentTime) {
                const tempMinutes = tempTime.getHours() * 60 + tempTime.getMinutes();
                const isTempDuringBreak = breaks.some(breakItem => {
                    const [startH, startM] = breakItem.startTime.split(':');
                    const [endH, endM] = breakItem.endTime.split(':');
                    let breakStart = parseInt(startH) * 60 + parseInt(startM);
                    let breakEnd = parseInt(endH) * 60 + parseInt(endM);

                    if (breakEnd < breakStart) {
                        breakEnd += 24 * 60;
                    }

                    let checkTempTime = tempMinutes;
                    if (tempTime.getDate() > shiftStartTime.getDate()) {
                        checkTempTime += 24 * 60;
                    }

                    return checkTempTime >= breakStart && checkTempTime <= breakEnd;
                });

                if (!isTempDuringBreak) {
                    productiveMinutes += 5; // Count 5 minutes of production
                }

                tempTime.setMinutes(tempTime.getMinutes() + 5);
            }

            cumulativeParts = productiveMinutes * partsPerMinute;
        }

        targetData.push({
            time: timeLabel,
            targetParts: Math.round(Math.min(cumulativeParts, targetParts)),
            actualParts: 0,
            isBreak: isDuringBreak
        });

        // Move to next 5-minute interval
        currentTime.setMinutes(currentTime.getMinutes() + 5);
    }

    return targetData;
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

    // State for shift chart configuration
    const [currentShift, setCurrentShift] = useState(getCurrentShift());
    const [shiftConfig, setShiftConfig] = useState({
        shift: currentShift,
        startTime: SHIFT_CONFIG[currentShift].startTime,
        endTime: SHIFT_CONFIG[currentShift].endTime,
        targetParts: 100,
        cycleTimeSeconds: 30,
        breaks: SHIFT_CONFIG[currentShift].defaultBreaks.map(b => ({ ...b }))
    });
    const [realTimeData, setRealTimeData] = useState([]);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [showConfig, setShowConfig] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    // Auto-refresh effect for shift charts
    useEffect(() => {
        let interval;
        if (autoRefresh && type === 'shift') {
            const fetchRealTimeData = async () => {
                try {
                    // Replace with your actual API endpoint
                    const response = await fetch('/api/shift-production-data');
                    if (response.ok) {
                        const newData = await response.json();
                        setRealTimeData(newData);
                    } else {
                        // Fallback to simulated data
                        const simulatedData = generateSimulatedData();
                        setRealTimeData(simulatedData);
                    }
                    setLastUpdate(new Date());
                } catch (error) {
                    console.error('Failed to fetch real-time data:', error);
                    // Fallback to simulated data
                    const simulatedData = generateSimulatedData();
                    setRealTimeData(simulatedData);
                    setLastUpdate(new Date());
                }
            };

            // Initial load
            fetchRealTimeData();

            // Set up interval
            interval = setInterval(fetchRealTimeData, 60000); // Refresh every 1 minute
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [autoRefresh, type, shiftConfig]);

    const generateSimulatedData = () => {
        const targetData = calculateTargetLine(
            shiftConfig.startTime,
            shiftConfig.endTime,
            shiftConfig.targetParts,
            shiftConfig.cycleTimeSeconds,
            shiftConfig.breaks
        );

        return targetData.map((point, index) => {
            // Simulate actual production with some variance
            const efficiency = 0.85 + Math.random() * 0.3; // 85-115% efficiency
            const actualParts = Math.round(point.targetParts * efficiency);
            return {
                ...point,
                actualParts: Math.max(0, actualParts)
            };
        });
    };


    // Shift configuration handlers
    const handleShiftChange = (newShift) => {
        const shiftDefaults = SHIFT_CONFIG[newShift];
        setShiftConfig({
            ...shiftConfig,
            shift: newShift,
            startTime: shiftDefaults.startTime,
            endTime: shiftDefaults.endTime,
            breaks: shiftDefaults.defaultBreaks.map(b => ({ ...b }))
        });
        setCurrentShift(newShift);
    };

    const addBreak = () => {
        const newBreak = {
            id: Date.now(),
            startTime: "12:00",
            endTime: "12:15",
            name: `Break ${shiftConfig.breaks.length + 1}`
        };
        setShiftConfig({
            ...shiftConfig,
            breaks: [...shiftConfig.breaks, newBreak]
        });
    };

    const removeBreak = (breakId) => {
        setShiftConfig({
            ...shiftConfig,
            breaks: shiftConfig.breaks.filter(b => b.id !== breakId)
        });
    };

    const updateBreak = (breakId, field, value) => {
        setShiftConfig({
            ...shiftConfig,
            breaks: shiftConfig.breaks.map(b =>
                b.id === breakId ? { ...b, [field]: value } : b
            )
        });
    };

    const resetToDefaults = () => {
        const shiftDefaults = SHIFT_CONFIG[currentShift];
        setShiftConfig({
            shift: currentShift,
            startTime: shiftDefaults.startTime,
            endTime: shiftDefaults.endTime,
            targetParts: 100,
            cycleTimeSeconds: 30,
            breaks: shiftDefaults.defaultBreaks.map(b => ({ ...b }))
        });
    };

    // Validate props for non-shift charts
    if (type !== 'shift') {
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
                                tick={{ fontSize: 10 }}
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
                                dataKey="time"
                                tick={{ fontSize: 9 }}
                                angle={-45}
                                textAnchor="end"
                                height={90}
                                interval={0}  // Show ALL 5-minute marks
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

        case 'shift':
            // Calculate chart data for shift production
            const targetLineData = calculateTargetLine(
                shiftConfig.startTime,
                shiftConfig.endTime,
                shiftConfig.targetParts,
                shiftConfig.cycleTimeSeconds,
                shiftConfig.breaks
            );

            // Merge target data with real-time data
            const combinedData = targetLineData.map((targetPoint, index) => {
                const realTimePoint = realTimeData[index] || {};
                return {
                    ...targetPoint,
                    actualParts: realTimePoint.actualParts || 0
                };
            });

            const shiftInfo = SHIFT_CONFIG[shiftConfig.shift];
            const currentProduction = combinedData[combinedData.length - 1]?.actualParts || 0;
            const efficiency = Math.round((currentProduction / shiftConfig.targetParts) * 100);

            return (
                <div className="w-full max-w-7xl mx-auto p-6 bg-white rounded-lg shadow-lg">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <ChartTitle />
                            {!title && (
                                <>
                                    <h1 className="text-2xl font-bold text-gray-800">Shift Production Monitor</h1>
                                    <p className="text-gray-600">Real-time production tracking and target analysis</p>
                                </>
                            )}
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-full ${autoRefresh ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="text-sm text-gray-600">
                                    {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                                </span>
                            </div>
                            <button
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className={`p-2 rounded-lg ${autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                            >
                                {autoRefresh ? <Pause size={20} /> : <Play size={20} />}
                            </button>
                            <button
                                onClick={() => setShowConfig(!showConfig)}
                                className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                            >
                                <Settings size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Configuration Panel */}
                    {showConfig && (
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-800">Configuration</h3>
                                <button
                                    onClick={resetToDefaults}
                                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                >
                                    Reset to Defaults
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Shift Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Users className="inline w-4 h-4 mr-1" />
                                        Select Shift
                                    </label>
                                    <select
                                        value={shiftConfig.shift}
                                        onChange={(e) => handleShiftChange(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="A">Shift A (06:00 - 14:30)</option>
                                        <option value="B">Shift B (14:30 - 23:00)</option>
                                        <option value="C">Shift C (23:00 - 06:00)</option>
                                    </select>
                                </div>

                                {/* Shift Timing */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Clock className="inline w-4 h-4 mr-1" />
                                        Shift Start Time
                                    </label>
                                    <input
                                        type="time"
                                        value={shiftConfig.startTime}
                                        onChange={(e) => setShiftConfig({ ...shiftConfig, startTime: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                    <label className="block text-sm font-medium text-gray-700 mt-2 mb-2">Shift End Time</label>
                                    <input
                                        type="time"
                                        value={shiftConfig.endTime}
                                        onChange={(e) => setShiftConfig({ ...shiftConfig, endTime: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Production Settings */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Target className="inline w-4 h-4 mr-1" />
                                        Target Parts per Shift
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={shiftConfig.targetParts}
                                        onChange={(e) => setShiftConfig({ ...shiftConfig, targetParts: parseInt(e.target.value) })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                    <label className="block text-sm font-medium text-gray-700 mt-2 mb-2">
                                        <Timer className="inline w-4 h-4 mr-1" />
                                        Cycle Time (seconds)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={shiftConfig.cycleTimeSeconds}
                                        onChange={(e) => setShiftConfig({ ...shiftConfig, cycleTimeSeconds: parseInt(e.target.value) })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Break Management */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-medium text-gray-700">Breaks</label>
                                        <button
                                            onClick={addBreak}
                                            className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {shiftConfig.breaks.map((breakItem) => (
                                            <div key={breakItem.id} className="p-2 bg-white rounded border">
                                                <div className="flex justify-between items-center mb-1">
                                                    <input
                                                        type="text"
                                                        value={breakItem.name}
                                                        onChange={(e) => updateBreak(breakItem.id, 'name', e.target.value)}
                                                        className="text-xs font-medium bg-transparent border-none p-0 focus:outline-none"
                                                    />
                                                    <button
                                                        onClick={() => removeBreak(breakItem.id)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1">
                                                    <input
                                                        type="time"
                                                        value={breakItem.startTime}
                                                        onChange={(e) => updateBreak(breakItem.id, 'startTime', e.target.value)}
                                                        className="text-xs p-1 border rounded"
                                                    />
                                                    <input
                                                        type="time"
                                                        value={breakItem.endTime}
                                                        onChange={(e) => updateBreak(breakItem.id, 'endTime', e.target.value)}
                                                        className="text-xs p-1 border rounded"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Current Shift Info */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-semibold text-blue-800">
                                    {shiftInfo.name}
                                </h3>
                                <p className="text-blue-600">
                                    {shiftConfig.startTime} - {shiftConfig.endTime} •
                                    Target: {shiftConfig.targetParts} parts •
                                    Cycle: {shiftConfig.cycleTimeSeconds}s •
                                    Breaks: {shiftConfig.breaks.length}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-blue-600">Last Updated</div>
                                <div className="text-blue-800 font-medium">
                                    {lastUpdate.toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Production Chart */}
                    <div className="mb-6">
                        <ResponsiveContainer width="100%" height={500}>
                            <LineChart data={combinedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="time"
                                    tick={{ fontSize: 11 }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                />
                                <YAxis
                                    tick={{ fontSize: 12 }}
                                    label={{ value: 'Parts Produced', angle: -90, position: 'insideLeft' }}
                                />
                                <Tooltip
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-white p-3 border rounded shadow-lg">
                                                    <p className="font-medium">{`Time: ${label}`}</p>
                                                    {payload.map((entry, index) => (
                                                        <p key={index} style={{ color: entry.color }}>
                                                            {`${entry.name}: ${entry.value} parts`}
                                                        </p>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Legend />

                                {/* Target Line (Fixed) */}
                                <Line
                                    type="monotone"
                                    dataKey="targetParts"
                                    stroke="#ff7300"
                                    strokeWidth={3}
                                    strokeDasharray="5 5"
                                    name="Target Production"
                                    dot={false}
                                />

                                {/* Actual Line (Real-time) */}
                                <Line
                                    type="monotone"
                                    dataKey="actualParts"
                                    stroke="#82ca9d"
                                    strokeWidth={3}
                                    name="Actual Production"
                                    connectNulls={false}
                                    dot={{ fill: '#82ca9d', strokeWidth: 2, r: 3 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Production Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                            <div className="text-2xl font-bold text-blue-800">
                                {currentProduction}
                            </div>
                            <div className="text-sm text-blue-600">Current Production</div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                            <div className="text-2xl font-bold text-orange-800">
                                {shiftConfig.targetParts}
                            </div>
                            <div className="text-sm text-orange-600">Target Parts</div>
                        </div>
                        <div className={`bg-gradient-to-br p-4 rounded-lg border ${efficiency >= 100
                                ? 'from-green-50 to-green-100 border-green-200'
                                : efficiency >= 80
                                    ? 'from-yellow-50 to-yellow-100 border-yellow-200'
                                    : 'from-red-50 to-red-100 border-red-200'
                            }`}>
                            <div className={`text-2xl font-bold ${efficiency >= 100
                                    ? 'text-green-800'
                                    : efficiency >= 80
                                        ? 'text-yellow-800'
                                        : 'text-red-800'
                                }`}>
                                {efficiency}%
                            </div>
                            <div className={`text-sm ${efficiency >= 100
                                    ? 'text-green-600'
                                    : efficiency >= 80
                                        ? 'text-yellow-600'
                                        : 'text-red-600'
                                }`}>
                                Efficiency
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                            <div className="text-2xl font-bold text-purple-800">
                                {Math.max(0, shiftConfig.targetParts - currentProduction)}
                            </div>
                            <div className="text-sm text-purple-600">Remaining Parts</div>
                        </div>
                    </div>

                    {/* Break Schedule */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Break Schedule</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {shiftConfig.breaks.map((breakItem, index) => (
                                <div key={breakItem.id} className="flex items-center p-2 bg-white rounded border">
                                    <div className="w-2 h-2 bg-red-400 rounded-full mr-3"></div>
                                    <div>
                                        <div className="text-sm font-medium">{breakItem.name}</div>
                                        <div className="text-xs text-gray-600">
                                            {breakItem.startTime} - {breakItem.endTime}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
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