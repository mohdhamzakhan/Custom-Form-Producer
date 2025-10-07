﻿import React, { useState, useEffect } from 'react';
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
            { id: 1, startTime: "08:00", endTime: "08:10", name: "Tea Break" },
            { id: 2, startTime: "11:30", endTime: "12:00", name: "Lunch Break" },
            { id: 3, startTime: "13:00", endTime: "13:10", name: "Afternoon Break" },
        ]
    },
    B: {
        name: "Shift B",
        startTime: "14:30",
        endTime: "23:00",
        defaultBreaks: [
            { id: 1, startTime: "16:30", endTime: "16:40", name: "Evening Break" },
            { id: 2, startTime: "20:00", endTime: "20:30", name: "Dinner Break" },
            { id: 3, startTime: "21:30", endTime: "21:40", name: "Night Break" }
        ]
    },
    C: {
        name: "Shift C",
        startTime: "23:00",
        endTime: "06:00",
        defaultBreaks: [
            { id: 1, startTime: "01:00", endTime: "01:30", name: "Midnight Break" },
            { id: 2, startTime: "04:00", endTime: "04:10", name: "Early Morning Break" },
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

// Update the calculateTargetLine function to better handle 06:00 to 06:00 overnight
const calculateTargetLine = (shiftStart, shiftEnd, targetParts, cycleTimeSeconds, breaks) => {
    const targetData = [];
    const shiftStartTime = new Date();
    const [startHour, startMinute] = shiftStart.split(':');
    shiftStartTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);

    const shiftEndTime = new Date();
    const [endHour, endMinute] = shiftEnd.split(':');
    shiftEndTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

    // Handle overnight shifts (including full day 06:00 to 06:00)
    if (shiftEndTime <= shiftStartTime) {
        shiftEndTime.setDate(shiftEndTime.getDate() + 1);
    }

    // Rest of your existing calculateTargetLine code...
    const partsPerSecond = 1 / cycleTimeSeconds;
    const partsPerMinute = partsPerSecond * 60;

    const currentTime = new Date(shiftStartTime);
    let cumulativeParts = 0;

    while (currentTime <= shiftEndTime) {
        const timeLabel = currentTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
        const isDuringBreak = breaks.some(breakItem => {
            const [startH, startM] = breakItem.startTime.split(':');
            const [endH, endM] = breakItem.endTime.split(':');
            let breakStart = parseInt(startH) * 60 + parseInt(startM);
            let breakEnd = parseInt(endH) * 60 + parseInt(endM);

            if (breakEnd < breakStart) {
                breakEnd += 24 * 60;
            }

            let checkTime = currentMinutes;
            if (currentTime.getDate() > shiftStartTime.getDate()) {
                checkTime += 24 * 60;
            }

            return checkTime >= breakStart && checkTime <= breakEnd;
        });

        if (!isDuringBreak) {
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
                    productiveMinutes += 5;
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

        currentTime.setMinutes(currentTime.getMinutes() + 5);
    }

    return targetData;
};

const getFieldKey = (metric, data) => {
    // Check if the metric exists directly in the data
    if (data.length > 0 && data[0].hasOwnProperty(metric)) {
        return metric;
    }

    // For calculated fields, try different variations
    if (metric.startsWith('calc_')) {
        // Try the metric as is
        if (data.length > 0 && data[0].hasOwnProperty(metric)) {
            return metric;
        }

        // Try without the calc_ prefix
        const withoutPrefix = metric.replace('calc_', '');
        if (data.length > 0 && data[0].hasOwnProperty(withoutPrefix)) {
            return withoutPrefix;
        }

        // Try finding by partial match
        if (data.length > 0) {
            const keys = Object.keys(data[0]);
            const matchedKey = keys.find(key =>
                key.includes(withoutPrefix) || withoutPrefix.includes(key)
            );
            if (matchedKey) {
                return matchedKey;
            }
        }
    }

    return metric; // fallback to original
};

const getChartSubtitle = (metrics, calculatedFields) => {
    const hasColumnwise = metrics.some(metric => {
        if (metric.startsWith('calc_')) {
            const calcId = metric.replace('calc_', '');
            const calcField = calculatedFields.find(cf => cf.id == calcId);
            return calcField?.calculationType === 'columnwise';
        }
        return false;
    });

    if (hasColumnwise) {
        return "Note: Summary metrics show as horizontal lines (same value across all data points)";
    }
    return null;
};

const ReportCharts = ({
    data,
    metrics,
    type,
    xField,
    title,
    comboConfig,
    calculatedFields = [],
    selectedShiftPeriod = "current",
    currentShift1 = "A",
    showConfiguration
}) => {
    console.log('ReportCharts rendering with:', {
        data: data?.length,
        metrics,
        type,
        xField,
        title
    });

    console.log('=== DEBUG REPORT CHARTS ===');
    console.log('xField:', xField);
    console.log('Raw data passed to charts:', data);
    console.log('Sample data item:', data[0]);
    console.log('Date field value:', data[0]?.[xField]);
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
    // In ReportCharts.jsx, update the shift case useEffect:

    useEffect(() => {
        if (selectedShiftPeriod === "current") {
            setCurrentShift(currentShift1);
            setShiftConfig(prev => ({
                ...prev,
                shift: currentShift1,
                startTime: SHIFT_CONFIG[currentShift].startTime,
                endTime: SHIFT_CONFIG[currentShift].endTime,
                breaks: SHIFT_CONFIG[currentShift].defaultBreaks.map(b => ({ ...b }))
            }));
        } else if (selectedShiftPeriod === "fullday") {
            // Set full day configuration (06:00 to 06:00 next day - 24 hours)
            setShiftConfig(prev => ({
                ...prev,
                shift: "FULLDAY",
                startTime: "06:00",
                endTime: "06:00", // This represents 06:00 next day
                targetParts: shiftConfig.targetParts * 3, // 3x target for full day (3 shifts)
                breaks: [
                    ...SHIFT_CONFIG.A.defaultBreaks,
                    ...SHIFT_CONFIG.B.defaultBreaks,
                    ...SHIFT_CONFIG.C.defaultBreaks
                ]
            }));
        } else {
            // Specific shift selected
            setCurrentShift(selectedShiftPeriod);
            setShiftConfig(prev => ({
                ...prev,
                shift: selectedShiftPeriod,
                startTime: SHIFT_CONFIG[selectedShiftPeriod].startTime,
                endTime: SHIFT_CONFIG[selectedShiftPeriod].endTime,
                breaks: SHIFT_CONFIG[selectedShiftPeriod].defaultBreaks.map(b => ({ ...b }))
            }));
        }
    }, [selectedShiftPeriod, currentShift]);

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

    const findCalculatedFieldValue = (metric, item, calculatedFields, allData) => {
        if (metric.startsWith('calc_')) {
            const calcId = metric.replace('calc_', '');
            const calcField = calculatedFields?.find(cf => cf.id == calcId);

            if (calcField) {
                if (calcField.calculationType === 'columnwise') {
                    // For columnwise calculations, calculate the aggregated value
                    return calculateColumnwiseValue(calcField, allData);
                } else {
                    // For rowwise calculations, use the individual row value
                    if (calcField.label && item[calcField.label] !== undefined) {
                        return item[calcField.label];
                    }
                }
            }

            // Fallback for existing fields
            const possibleKeys = Object.keys(item).filter(key => {
                const lowerKey = key.toLowerCase();
                return lowerKey.includes('efficiency') ||
                    lowerKey.includes('efficency') ||
                    lowerKey.includes('calc');
            });

            if (possibleKeys.length > 0) {
                return item[possibleKeys[0]];
            }
        }

        return item[metric];
    };

    const calculateRowwiseExpression = (formula, rowData) => {
        try {
            let processedFormula = formula;

            // Extract field references in quotes
            const fieldMatches = formula.match(/"([^"]+)"/g);
            if (fieldMatches) {
                fieldMatches.forEach(match => {
                    const fieldName = match.replace(/"/g, '');
                    const fieldValue = rowData[fieldName];

                    let numericValue = 0;
                    if (fieldValue !== undefined && fieldValue !== null) {
                        numericValue = parseFloat(fieldValue) || 0;
                    }

                    processedFormula = processedFormula.replace(match, numericValue.toString());
                });
            }

            // Safely evaluate the expression
            const result = Function('"use strict"; return (' + processedFormula + ')')();

            if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
                return result;
            }

            return 0;
        } catch (error) {
            console.error('Error calculating rowwise expression:', error);
            return 0;
        }
    };

    const calculateColumnwiseValue = (calcField, allData) => {
        try {
            const { formula, functionType } = calcField;

            if (functionType === 'EXPRESSION') {
                // For expression-based columnwise calculations
                const fieldRefs = formula.match(/"([^"]+)"/g);
                if (!fieldRefs) return 0;

                // Calculate totals for each field referenced in the formula
                let processedFormula = formula;

                fieldRefs.forEach(match => {
                    const fieldName = match.replace(/"/g, '');

                    // Sum up all values for this field across all data
                    const totalValue = allData.reduce((sum, item) => {
                        const value = parseFloat(item[fieldName]) || 0;
                        return sum + value;
                    }, 0);

                    processedFormula = processedFormula.replace(match, totalValue.toString());
                });

                // Evaluate the expression with totals
                const result = Function('"use strict"; return (' + processedFormula + ')')();
                return typeof result === 'number' && !isNaN(result) ? result : 0;
            }

            // Handle other function types (SUM, AVG, etc.)
            const fieldRefs = formula.match(/"([^"]+)"/g);
            if (!fieldRefs || fieldRefs.length === 0) return 0;

            const fieldName = fieldRefs[0].replace(/"/g, '');
            const allValues = allData.map(item => parseFloat(item[fieldName]) || 0);

            switch (functionType) {
                case 'SUM':
                    return allValues.reduce((sum, val) => sum + val, 0);
                case 'AVG':
                    return allValues.length > 0 ? allValues.reduce((sum, val) => sum + val, 0) / allValues.length : 0;
                case 'MIN':
                    return allValues.length > 0 ? Math.min(...allValues) : 0;
                case 'MAX':
                    return allValues.length > 0 ? Math.max(...allValues) : 0;
                case 'COUNT':
                    return allValues.length;
                default:
                    return 0;
            }
        } catch (error) {
            console.error('Error calculating columnwise value:', error);
            return 0;
        }
    };

    // Render different chart types
    switch (type) {
        case 'bar':
            // Debug logging
            console.log('Bar chart - xField:', xField, 'Sample data:', data[0]);

            const isDateField = data.some(item => {
                const value = item[xField];
                if (!value) return false;
                if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) return true;
                if (typeof value === 'string' && value.includes('T')) return true;
                return false;
            });

            let barData;
            if (isDateField) {
                // For date fields, format each date and then group
                const processedData = data.map(item => {
                    const dateValue = item[xField];
                    let formattedDate = dateValue;
                    let sortableDate = new Date();

                    // Handle your ISO date format: 2025-08-10T18:30:00.000Z
                    if (typeof dateValue === 'string' && (dateValue.match(/^\d{4}-\d{2}-\d{2}/) || dateValue.includes('T'))) {
                        sortableDate = new Date(dateValue);
                        if (!isNaN(sortableDate.getTime())) {
                            // SHOW FULL DATE: 10/08/2025 (same as combo chart)
                            formattedDate = `${String(sortableDate.getDate()).padStart(2, '0')}/${String(sortableDate.getMonth() + 1).padStart(2, '0')}/${sortableDate.getFullYear()}`;
                            console.log('Formatted date:', formattedDate);
                        }
                    }

                    return {
                        ...item,
                        [xField]: formattedDate, // This will be "10/08/2025"
                        originalDate: dateValue,
                        sortableDate: sortableDate
                    };
                }).sort((a, b) => a.sortableDate - b.sortableDate);

                // Group by formatted date (if you want to group same dates)
                const grouped = processedData.reduce((acc, item) => {
                    const key = item[xField]; // This is now the formatted date like "10/08/2025"
                    if (!acc[key]) {
                        acc[key] = {
                            ...item,
                            count: 0
                        };
                        metrics.forEach(metric => {
                            acc[key][metric] = 0;
                        });
                    }

                    metrics.forEach(metric => {
                        const value = parseFloat(item[metric]) || 0;
                        acc[key][metric] += value;
                        acc[key].count += 1;
                    });

                    return acc;
                }, {});

                barData = Object.values(grouped);
                console.log('Final bar data:', barData);
            } else {
                // Non-date grouping logic (keep your existing logic)
                const grouped = data.reduce((acc, item) => {
                    const key = item[xField];
                    if (!acc[key]) {
                        acc[key] = { ...item, count: 0 };
                        metrics.forEach(metric => {
                            acc[key][metric] = 0;
                        });
                    }

                    metrics.forEach(metric => {
                        const value = parseFloat(item[metric]) || 0;
                        acc[key][metric] += value;
                        acc[key].count += 1;
                    });

                    return acc;
                }, {});

                barData = Object.values(grouped);
            }

            // Rest of your bar chart JSX with the same tooltip logic as combo
            return (
                <div className="w-full">
                    <ChartTitle />
                    {getChartSubtitle(metrics || [], calculatedFields) && (
                        <div className="mb-2 text-center">
                            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full inline-block">
                                {getChartSubtitle(metrics || [], calculatedFields)}
                            </p>
                        </div>
                    )}
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 90 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey={xField}
                                tick={{ fontSize: 8 }}
                                angle={-45}
                                textAnchor="end"
                                height={90}
                                interval={0}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-white p-3 border rounded shadow-lg">
                                                <p className="font-medium">{isDateField ? `Date: ${label}` : label}</p>
                                                {payload.map((entry, index) => (
                                                    <p key={index} style={{ color: entry.color }}>
                                                        {`${entry.name}: ${entry.value.toLocaleString()}`}
                                                    </p>
                                                ))}
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Legend />
                            {metrics.map((metric, index) => (
                                <Bar
                                    key={metric}
                                    dataKey={metric}
                                    fill={colors[index % colors.length]}
                                    name={`${metric.split(' → ').pop()}`}
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
                            {metrics.map((metric, index) => {
                                const fieldKey = getFieldKey(metric, data);
                                return (
                                    <Line
                                        key={metric}
                                        type="monotone"
                                        dataKey={fieldKey}
                                        stroke={colors[index % colors.length]}
                                        strokeWidth={2}
                                        name={metric.replace('calc_', '')}
                                        connectNulls={false}
                                    />
                                );
                            })}
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

            // 1. In EnhancedReportViewer.js, update the chartData useMemo to include better debugging:

            const chartData = useMemo(() => {
                if (!reportData || reportData.length === 0) return [];

                console.log('=== CHART DATA TRANSFORMATION DEBUG ===');
                console.log('reportData sample:', reportData[0]);
                console.log('calculatedFields:', calculatedFields);

                const transformedData = reportData.map((row, index) => {
                    const chartPoint = { submissionId: row.submissionId || index };

                    (row.data || []).forEach(cell => {
                        const fieldLabel = cell.fieldLabel;
                        let value = cell.value;

                        // Debug calculated fields specifically
                        if (cell.fieldType === 'calculated') {
                            console.log('Processing calculated field:', {
                                fieldLabel,
                                originalValue: value,
                                fieldType: cell.fieldType
                            });
                        }

                        if (value === null || value === undefined || value === '') {
                            chartPoint[fieldLabel] = 0;
                            return;
                        }

                        // Handle calculated field values
                        if (cell.fieldType === 'calculated') {
                            if (typeof value === 'string') {
                                // Remove formatting and convert to number
                                const cleanValue = value.replace(/[%,$\s]/g, '');
                                const numValue = parseFloat(cleanValue);
                                if (!isNaN(numValue) && isFinite(numValue)) {
                                    chartPoint[fieldLabel] = numValue;
                                    console.log('Converted calculated field:', fieldLabel, 'from', value, 'to', numValue);
                                    return;
                                }
                            } else if (typeof value === 'number') {
                                chartPoint[fieldLabel] = value;
                                console.log('Number calculated field:', fieldLabel, '=', value);
                                return;
                            }
                        }

                        // Handle regular fields (existing logic)
                        try {
                            const parsed = JSON.parse(value);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                if (typeof parsed[0] === 'object') {
                                    chartPoint[fieldLabel] = parsed.length;
                                } else {
                                    const numericValues = parsed.map(v => parseFloat(v)).filter(v => !isNaN(v));
                                    chartPoint[fieldLabel] = numericValues.length > 0 ?
                                        numericValues.reduce((a, b) => a + b, 0) : 0;
                                }
                            } else if (typeof parsed === 'number') {
                                chartPoint[fieldLabel] = parsed;
                            } else {
                                chartPoint[fieldLabel] = parsed;
                            }
                        } catch (e) {
                            const numValue = parseFloat(value);
                            if (!isNaN(numValue) && isFinite(numValue)) {
                                chartPoint[fieldLabel] = numValue;
                            } else {
                                chartPoint[fieldLabel] = value;
                            }
                        }
                    });

                    return chartPoint;
                });

                console.log('Final chart data keys for first item:', Object.keys(transformedData[0] || {}));
                console.log('First transformed item:', transformedData[0]);

                return transformedData;
            }, [reportData, calculatedFields]);

        // 2. In ReportCharts.js, replace the combo chart section with this debugging version:

        // Replace the combo chart case in ReportCharts.js with this version that preserves individual dates:

        case 'combo':
            const barMetrics = comboConfig?.barMetrics || [];
            const lineMetrics = comboConfig?.lineMetrics || [];

            const sortedRawData = [...data].sort((a, b) => {
                const aDate = a[xField]; // Original ISO date string
                const bDate = b[xField];

                // If both are date strings, sort by date
                if (typeof aDate === 'string' && typeof bDate === 'string' &&
                    (aDate.includes('T') || aDate.match(/^\d{4}-\d{2}-\d{2}/)) &&
                    (bDate.includes('T') || bDate.match(/^\d{4}-\d{2}-\d{2}/))) {

                    const dateA = new Date(aDate);
                    const dateB = new Date(bDate);

                    if (!isNaN(dateA) && !isNaN(dateB)) {
                        return dateA - dateB;
                    }
                }

                // Fallback: sort by submissionId
                return (a.submissionId || 0) - (b.submissionId || 0);
            });

            console.log('Raw data sorted by date:', sortedRawData.slice(0, 3).map(item => ({
                date: item[xField],
                submissionId: item.submissionId
            })));

            // Data-driven date field detection instead of hardcoding
            const isDateField1 = data.some(item => {
                const value = item[xField];
                if (!value) return false;

                // Check if it's an ISO date format: 2025-08-13T18:30:00.000Z or 2025-08-14
                if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) return true;
                // Check if it's a timestamp with T
                if (typeof value === 'string' && value.includes('T')) return true;
                // Check if it's a year number
                if (typeof value === 'number' && value >= 1900 && value <= 2100) return true;
                // Check if it's already a formatted date
                if (typeof value === 'string' && (value.includes('/') || value.includes('-'))) return true;

                return false;
            });

            // Group and aggregate data by xField - but preserve individual dates
            const groupedComboData = sortedRawData.reduce((acc, item) => {
                let categoryValue;

                // Process date fields to show ACTUAL DATE, not just year
                if (isDateField1) {
                    const dateVal = item[xField];

                    if (dateVal) {
                        // Handle ISO date strings: 2025-08-13T18:30:00.000Z or 2025-08-14
                        if (typeof dateVal === 'string' && dateVal.match(/^\d{4}-\d{2}-\d{2}/)) {
                            const date = new Date(dateVal);
                            if (!isNaN(date.getTime())) {
                                // Show actual date: 13/08/2025 (not just year)
                                categoryValue = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                            } else {
                                categoryValue = dateVal; // Fallback to original
                            }
                        }
                        // Handle ISO date strings with T: 2025-08-13T18:30:00.000Z
                        else if (typeof dateVal === 'string' && dateVal.includes('T')) {
                            const date = new Date(dateVal);
                            if (!isNaN(date.getTime())) {
                                // Show actual date: 13/08/2025 (not just year)
                                categoryValue = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                            } else {
                                categoryValue = dateVal; // Fallback to original
                            }
                        }
                        // If it's already a year number
                        else if (typeof dateVal === 'number') {
                            categoryValue = dateVal.toString();
                        }
                        // If it's already a formatted date string
                        else if (typeof dateVal === 'string' && (dateVal.includes('/') || dateVal.includes('-'))) {
                            categoryValue = dateVal; // Use as-is if already formatted
                        }
                        else {
                            categoryValue = String(dateVal);
                        }
                    } else {
                        categoryValue = `Entry ${item.submissionId || 'Unknown'}`;
                    }
                } else {
                    // Non-date fields use the original value
                    categoryValue = item[xField] || `Entry ${item.submissionId || 'Unknown'}`;
                }

                // Use submissionId to ensure each row gets its own entry instead of grouping
                const uniqueKey = `${categoryValue}_${item.submissionId || Math.random()}`;

                if (!acc[uniqueKey]) {
                    acc[uniqueKey] = {
                        [xField]: categoryValue,
                        originalSubmissionId: item.submissionId,
                        count: 0
                    };

                    // Initialize all metrics
                    [...barMetrics, ...lineMetrics].forEach(metric => {
                        acc[uniqueKey][metric] = 0;
                    });
                }

                // Process metrics (keep your existing logic)
                barMetrics.forEach(metric => {
                    const value = parseFloat(item[metric]) || 0;
                    acc[uniqueKey][metric] = value;
                });

                lineMetrics.forEach(metric => {
                    const actualValue = findCalculatedFieldValue(metric, item, calculatedFields, data);
                    const value = parseFloat(actualValue) || 0;
                    acc[uniqueKey][metric] = value;
                });

                acc[uniqueKey].count = 1;
                return acc;
            }, {});

            // Process the data - since we're not grouping, no averaging needed
            const processedComboData = Object.values(groupedComboData);

            // Sort by submission ID or year
            const sortedComboData = processedComboData;

            console.log('Sorted combo data with individual entries:', sortedComboData);

            return (
                <div className="w-full">
                    <ChartTitle />
                    {getChartSubtitle(metrics || [], calculatedFields) && (
                        <div className="mb-2 text-center">
                            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full inline-block">
                                {getChartSubtitle(metrics || [], calculatedFields)}
                            </p>
                        </div>
                    )}
                    <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={sortedComboData} margin={{ top: 20, right: 30, left: 20, bottom: 90 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey={xField}
                                tick={{ fontSize: 8 }}
                                angle={-45}
                                textAnchor="end"
                                height={90}
                                interval={0}
                            />
                            <YAxis
                                yAxisId="left"
                                tick={{ fontSize: 12 }}
                                label={{ value: 'Quantity', angle: -90, position: 'insideLeft' }}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                tick={{ fontSize: 12 }}
                                label={{ value: 'Efficiency (%)', angle: 90, position: 'insideRight' }}
                                domain={[0, 110]} // Fixed domain for efficiency percentage
                            />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-white p-3 border rounded shadow-lg">
                                                <p className="font-medium">{isDateField1 ? `Date: ${label}` : label}</p>
                                                {payload.map((entry, index) => (
                                                    <p key={index} style={{ color: entry.color }}>
                                                        {`${entry.name}: ${entry.dataKey === 'calc_1756367042383' || lineMetrics.includes(entry.dataKey)
                                                            ? `${entry.value}%`
                                                            : entry.value.toLocaleString()
                                                            }`}
                                                    </p>
                                                ))}
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Legend />

                            {/* Render bars on left axis */}
                            {barMetrics.map((metric, index) => (
                                <Bar
                                    key={`bar-${metric}`}
                                    yAxisId="left"
                                    dataKey={metric}
                                    fill={colors[index % colors.length]}
                                    name={`${metric.split(' → ').pop()}`}
                                />
                            ))}

                            {/* Render lines on right axis */}
                            {lineMetrics.map((metric, index) => (
                                <Line
                                    key={`line-${metric}`}
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey={metric}
                                    stroke={colors[(barMetrics.length + index) % colors.length]}
                                    strokeWidth={3}
                                    name="Efficiency (%)"
                                    connectNulls={false}
                                    dot={{ fill: colors[(barMetrics.length + index) % colors.length], strokeWidth: 2, r: 4 }}
                                />
                            ))}
                        </ComposedChart>
                    </ResponsiveContainer>

                    <div className="mt-4 text-center text-sm text-gray-600">
                        <p>Each bar represents an individual entry • Line shows efficiency percentage per entry</p>
                        <p>Showing {sortedComboData.length} individual data entries</p>
                    </div>
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
                        {showConfiguration && (  // Only show controls in designer
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
                        )}
                    </div>

                    {/* Configuration Panel */}
                    {showConfiguration && showConfig && (
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
                                        step="0.01" // Allows decimal values
                                        value={shiftConfig.cycleTimeSeconds}
                                        onChange={(e) =>
                                            setShiftConfig({
                                                ...shiftConfig,
                                                cycleTimeSeconds: parseFloat(e.target.value) || 0, // Parse as float and handle empty input
                                            })
                                        }
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