import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ComposedChart, ReferenceArea  // ✅ Add ReferenceArea
} from 'recharts';
import { Settings, Play, Pause, Plus, Trash2, Clock, Users, Target, Timer } from 'lucide-react';
import { APP_CONSTANTS } from "./store";

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

// Add this after your existing useState declarations

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

const marqueeStyle = `
  @keyframes marquee {
    0% { transform: translateX(100%); }
    100% { transform: translateX(-100%); }
  }
  
  .marquee-container {
    overflow: hidden;
    white-space: nowrap;
    padding: 8px 0;
    position: relative;
  }
  
  .marquee-container.light {
    background: linear-gradient(90deg, #1e40af 0%, #3b82f6 100%);
  }
  
  .marquee-container.dark {
    background: linear-gradient(90deg, #1e293b 0%, #334155 100%);
  }
  
  .marquee-text {
    display: inline-block;
    padding-left: 100%;
    animation: marquee 50s linear infinite;
    color: white;
    font-weight: 500;
    font-size: 1.125rem;
  }
`;



const getCurrentShift = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    // Shift A: 6:00 AM to 2:30 PM (360 to 870 minutes)
    if (currentTime >= 360 && currentTime < 870) {
        return 'A';
    }
    // Shift B: 2:30 PM to 11:00 PM (870 to 1380 minutes) 
    if (currentTime >= 870 && currentTime < 1380) {
        return 'B';
    }
    // Shift C: 11:00 PM to 6:00 AM next day
    return 'C';
}



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

const filterDataByShiftTime = (data, shiftStart, shiftEnd) => {
    if (!data || data.length === 0) {
        console.log('❌ No data to filter');
        return [];
    }

    const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const startMinutes = parseTime(shiftStart);
    let endMinutes = parseTime(shiftEnd);

    // Handle overnight shifts
    if (endMinutes <= startMinutes) {
        endMinutes += 24 * 60;
    }

    const filtered = data.filter(item => {
        if (!item.Date) return false;

        const date = new Date(item.Date);
        if (isNaN(date.getTime())) return false;

        let itemMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();

        // Handle overnight comparison
        if (endMinutes > 24 * 60 && itemMinutes < startMinutes) {
            itemMinutes += 24 * 60;
        }

        return itemMinutes >= startMinutes && itemMinutes <= endMinutes;
    });

    console.log(`🔍 Filtered ${filtered.length} items from ${data.length} total`);
    return filtered;
};
function parseTimeToMinutes(timeStr) {
    // Example: "5:40 AM", "11:20 PM"
    const match = timeStr.match(/(\d+):(\d+) (\w+)/);
    if (!match) return 0;
    let [, hourStr, minuteStr, period] = match;
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    return hour * 60 + minute;
}



const ReportCharts = React.memo(({
    data,
    metrics,
    type,
    xField,
    title,
    comboConfig,
    calculatedFields = [],
    selectedShiftPeriod = "current",
    currentShift1 = "A",
    showConfiguration = true,
    shiftConfigs: passedShiftConfig = null,
    isFullscreenMode = false,
    isMaximized = false,
    templateId,
    lastUpdate = new Date(),
    selectedDate = new Date().toISOString().split('T')[0],  // ✅ ADD THIS
    showDatePicker = false,  // ✅ ADD THIS
    onDateChange = () => { },  // ✅ ADD THIS
    onToggleDatePicker = () => { },  // ✅ ADD THIS
    isDarkMode = false  // ✅ ADD THIS
}) => {
    console.log('=== ReportCharts Debug ===');
    console.log('selectedShiftPeriod:', selectedShiftPeriod);
    console.log('currentShift1:', currentShift1);
    console.log('passedShiftConfig:', passedShiftConfig);
    console.log('passedShiftConfig type:', typeof passedShiftConfig);
    console.log('passedShiftConfig isArray:', Array.isArray(passedShiftConfig));

    const [realTimeData, setRealTimeData] = useState([]);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [showConfig, setShowConfig] = useState(true);

    const [configVisible, setConfigVisible] = useState(showConfiguration !== false);
    const [configTimer, setConfigTimer] = useState(null);

    if (passedShiftConfig && Array.isArray(passedShiftConfig)) {
        console.log('Shift configs details:');
        passedShiftConfig.forEach((config, index) => {
            console.log(`  Shift ${index}: ${config.shift} - Target: ${config.targetParts}`);
        });
    }

    const theme = {
        // Background colors
        bg: {
            primary: isDarkMode ? 'bg-gray-900' : 'bg-white',
            secondary: isDarkMode ? 'bg-gray-800' : 'bg-gray-50',
            card: isDarkMode ? 'bg-gray-800' : 'bg-white',
            empty: isDarkMode ? 'bg-gray-800' : 'bg-gray-50',
        },
        // Text colors
        text: {
            primary: isDarkMode ? 'text-white' : 'text-gray-800',
            secondary: isDarkMode ? 'text-gray-300' : 'text-gray-600',
            muted: isDarkMode ? 'text-gray-400' : 'text-gray-500',
        },
        // Border colors
        border: {
            default: isDarkMode ? 'border-gray-700' : 'border-gray-200',
            light: isDarkMode ? 'border-gray-600' : 'border-gray-300',
        },
        // Chart colors
        chart: {
            grid: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
            axisText: isDarkMode ? '#d1d5db' : '#374151',
            tooltipBg: isDarkMode ? '#1f2937' : '#ffffff',
            tooltipBorder: isDarkMode ? '#374151' : '#e5e7eb',
        },
        // Gradient backgrounds for cards
        gradients: {
            blue: isDarkMode
                ? 'from-blue-900 to-blue-800 border-blue-700'
                : 'from-blue-50 to-blue-100 border-blue-200',
            orange: isDarkMode
                ? 'from-orange-900 to-orange-800 border-orange-700'
                : 'from-orange-50 to-orange-100 border-orange-200',
            green: isDarkMode
                ? 'from-green-900 to-green-800 border-green-700'
                : 'from-green-50 to-green-100 border-green-200',
            yellow: isDarkMode
                ? 'from-yellow-900 to-yellow-800 border-yellow-700'
                : 'from-yellow-50 to-yellow-100 border-yellow-200',
            red: isDarkMode
                ? 'from-red-900 to-red-800 border-red-700'
                : 'from-red-50 to-red-100 border-red-200',
            purple: isDarkMode
                ? 'from-purple-900 to-purple-800 border-purple-700'
                : 'from-purple-50 to-purple-100 border-purple-200',
        }
    };


    const getActiveShiftConfig = () => {
        console.log('=== getActiveShiftConfig Debug ===');
        console.log('selectedShiftPeriod:', selectedShiftPeriod);
        console.log('currentShift1:', currentShift1);

        if (!passedShiftConfig || !Array.isArray(passedShiftConfig)) {
            console.log('❌ No shift configs available');
            return null;
        }

        if (selectedShiftPeriod === 'current') {
            const actualCurrentShift = getCurrentShift();
            console.log('🕐 Actual current shift (from time):', actualCurrentShift);
            console.log('📥 Passed currentShift1 prop:', currentShift1);

            // Use the actual current shift from time, not the prop
            const shiftToUse = actualCurrentShift; // or currentShift1 - depends on what you want
            console.log('🎯 Using shift:', shiftToUse);

            const currentConfig = passedShiftConfig.find(config => {
                console.log(`Comparing config.shift "${config.shift}" === "${shiftToUse}"`);
                return config.shift === shiftToUse;
            });

            console.log('✅ Found current config:', currentConfig);
            return currentConfig || passedShiftConfig[0];
        }

        // If selectedShiftPeriod is 'fullday', combine all shifts
        if (selectedShiftPeriod === 'fullday') {
            console.log('Calculating fullday config');
            const totalTarget = passedShiftConfig.reduce((sum, config) => {
                console.log(`Adding ${config.targetParts} from shift ${config.shift}`);
                return sum + (config.targetParts || 0);
            }, 0);
            console.log('Total target parts:', totalTarget);

            const fullDayConfig = {
                shift: 'Full Day',
                name: 'Full Day (24h)',
                targetParts: totalTarget,
                cycleTimeSeconds: passedShiftConfig[0]?.cycleTimeSeconds || 30,
                startTime: '06:00',
                endTime: '05:59',
                breaks: passedShiftConfig.flatMap(config => config.breaks || [])
            };
            console.log('Full day config:', fullDayConfig);
            return fullDayConfig;
        }

        // Otherwise, find the specific shift (A, B, C)
        console.log('Looking for specific shift:', selectedShiftPeriod);
        const specificConfig = passedShiftConfig.find(config => config.shift === selectedShiftPeriod);
        console.log('Found specific config:', specificConfig);
        const result = specificConfig || passedShiftConfig[0];
        console.log('Returning specific config:', result);
        return result;
    };

    const activeShiftConfig = getActiveShiftConfig();
    console.log('Final activeShiftConfig:', activeShiftConfig);

    // ✅ DEBUG: Check what values are being used for display
    if (type === 'shift') {
        console.log('=== Shift Chart Display Values ===');
        console.log('Title:', title);
        console.log('Shift Name:', activeShiftConfig?.name || activeShiftConfig?.shift || 'Unknown');
        console.log('Start Time:', activeShiftConfig?.startTime || 'Unknown');
        console.log('End Time:', activeShiftConfig?.endTime || 'Unknown');
        console.log('Target Parts:', activeShiftConfig?.targetParts || 'Unknown');
        console.log('Cycle Time:', activeShiftConfig?.cycleTimeSeconds || 'Unknown');
        console.log('Breaks Count:', activeShiftConfig?.breaks?.length || 0);
    }



    console.log('Active shift config:', activeShiftConfig);


    console.log('=== DEBUG REPORT CHARTS ===');
    console.log('xField:', xField);
    console.log('Raw data passed to charts:', data);
    console.log('Sample data item:', data[0]);
    console.log('Date field value:', data[0]?.[xField]);

    // State for shift chart configuration
    const [currentShift, setCurrentShift] = useState(getCurrentShift());

    // ✅ FIXED: Remove the problematic initialization and add useEffect
    const [shiftConfig, setShiftConfig] = useState(() => {
        // Simple fallback initialization - will be updated by useEffect
        const shift = getCurrentShift();
        return {
            shift: shift,
            startTime: SHIFT_CONFIG[shift].startTime,
            endTime: SHIFT_CONFIG[shift].endTime,
            targetParts: 100,
            cycleTimeSeconds: 30,
            breaks: SHIFT_CONFIG[shift].defaultBreaks.map(b => ({ ...b }))
        };
    });

    // ✅ ADD: Sync shiftConfig state with activeShiftConfig whenever it changes
    useEffect(() => {
        const currentActiveConfig = getActiveShiftConfig();

        if (currentActiveConfig) {
            console.log('🔄 Syncing shiftConfig state with activeShiftConfig:', currentActiveConfig);
            setShiftConfig({
                shift: currentActiveConfig.shift || getCurrentShift(),
                name: currentActiveConfig.name || `Shift ${currentActiveConfig.shift}`,
                startTime: currentActiveConfig.startTime || SHIFT_CONFIG[getCurrentShift()].startTime,
                endTime: currentActiveConfig.endTime || SHIFT_CONFIG[getCurrentShift()].endTime,
                targetParts: currentActiveConfig.targetParts || 100,
                cycleTimeSeconds: currentActiveConfig.cycleTimeSeconds || 30,
                breaks: currentActiveConfig.breaks || SHIFT_CONFIG[getCurrentShift()].defaultBreaks.map(b => ({ ...b }))
            });
        }
    }, [passedShiftConfig, selectedShiftPeriod, currentShift1]); // Re-run when any of these change



    // Auto-refresh effect for shift charts
    // In ReportCharts.jsx, update the shift case useEffect:

    useEffect(() => {
        if (passedShiftConfig && type === 'shift') {
            console.log('Syncing with passed config:', passedShiftConfig);
            setShiftConfig({
                shift: passedShiftConfig.shift || shiftConfig.shift,
                startTime: passedShiftConfig.startTime || shiftConfig.startTime,
                endTime: passedShiftConfig.endTime || shiftConfig.endTime,
                targetParts: passedShiftConfig.targetParts || shiftConfig.targetParts,
                cycleTimeSeconds: passedShiftConfig.cycleTimeSeconds || shiftConfig.cycleTimeSeconds,
                breaks: passedShiftConfig.breaks || shiftConfig.breaks
            });
        }
    }, [passedShiftConfig, type]);

    useEffect(() => {
        if (selectedShiftPeriod === "current") {
            setCurrentShift(currentShift1);
            setShiftConfig(prev => ({
                ...prev,
                shift: currentShift1,
                startTime: SHIFT_CONFIG[currentShift1].startTime,
                endTime: SHIFT_CONFIG[currentShift1].endTime,
                breaks: SHIFT_CONFIG[currentShift1].defaultBreaks.map(b => ({ ...b }))
            }));
        } else if (selectedShiftPeriod === "fullday") {
            setShiftConfig(prev => ({
                ...prev,
                shift: "FULLDAY",
                startTime: "06:00",
                endTime: "06:00",
                targetParts: prev.targetParts * 3,
                breaks: [
                    ...SHIFT_CONFIG.A.defaultBreaks,
                    ...SHIFT_CONFIG.B.defaultBreaks,
                    ...SHIFT_CONFIG.C.defaultBreaks
                ]
            }));
        } else {
            setCurrentShift(selectedShiftPeriod);
            setShiftConfig(prev => ({
                ...prev,
                shift: selectedShiftPeriod,
                startTime: SHIFT_CONFIG[selectedShiftPeriod].startTime,
                endTime: SHIFT_CONFIG[selectedShiftPeriod].endTime,
                breaks: SHIFT_CONFIG[selectedShiftPeriod].defaultBreaks.map(b => ({ ...b }))
            }));
        }
    }, [selectedShiftPeriod, currentShift1]);

    useEffect(() => {
        if (type === 'shift' && configVisible && showConfiguration === false) {
            const timer = setTimeout(() => {
                setConfigVisible(false);
            }, 120000);

            setConfigTimer(timer);

            return () => clearTimeout(timer);
        }
    }, [configVisible, type, showConfiguration]);

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
    const colors = isDarkMode ? [
        '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa',
        '#2dd4bf', '#fb923c', '#ec4899', '#38bdf8', '#c084fc'
    ] : [
        '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe',
        '#00c49f', '#ffbb28', '#ff8042', '#8dd1e1', '#d084d0'
    ];

    // Chart title component
    const ChartTitle = () => (
        title ? (
            <div className="mb-4 text-center">
                <h3 className={`text-xl font-semibold ${theme.text.primary}`}>
                    {title}
                </h3>
            </div>
        ) : null
    );


    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div
                    className={`p-3 rounded shadow-lg ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border`}
                >
                    {label && (
                        <p className={`font-medium ${theme.text.primary}`}>
                            {`${label}`}
                        </p>
                    )}
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

    //const filteredShiftData = useMemo(() => {
    //    const filtered = filterDataByShiftTime(
    //        data,
    //        activeShiftConfig.startTime,
    //        activeShiftConfig.endTime
    //    );

    //    // ✅ ADD THIS DEBUG
    //    console.log('🔍 Filtered data sample:', filtered.slice(0, 5).map(item => ({
    //        Date: item.Date,
    //        Count: item.Count,
    //        formatted: new Date(item.Date).toLocaleTimeString()
    //    })));

    //    return filtered;
    //}, [
    //    data.length,
    //    activeShiftConfig.startTime,
    //    activeShiftConfig.endTime,
    //    // Track both last Date AND last Count to detect new submissions
    //    data.length > 0 ? `${data[data.length - 1]?.Date}_${data[data.length - 1]?.Count}` : null
    //]);



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
                <div className={`w-full ${theme.bg.primary} p-4 rounded-lg`}>
                    <ChartTitle />
                    {getChartSubtitle(metrics || [], calculatedFields) && (
                        <div className="mb-2 text-center">
                            <p className={`text-xs px-3 py-1 rounded-full inline-block ${isDarkMode
                                ? 'text-yellow-400 bg-yellow-900/30'
                                : 'text-amber-600 bg-amber-50'
                                }`}>
                                {getChartSubtitle(metrics || [], calculatedFields)}
                            </p>
                        </div>
                    )}
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 90 }}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke={theme.chart.grid}
                            />
                            <XAxis
                                dataKey={xField}
                                tick={{ fontSize: 8, fill: theme.chart.axisText }}
                                angle={-45}
                                textAnchor="end"
                                height={90}
                                interval={0}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: theme.chart.axisText }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                wrapperStyle={{ color: theme.chart.axisText }}
                            />
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
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke={theme.chart.grid}
                            />
                            <XAxis
                                dataKey={xField || 'name'}
                                tick={{ fontSize: 12 }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis tick={{ fontSize: 12, fill: theme.chart.axisText }} />
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
            const [shiftChartData, setShiftChartData] = useState(null);
            const [shiftMetrics, setShiftMetrics] = useState(null);
            const [shiftLoading, setShiftLoading] = useState(true);
            const [shiftError, setShiftError] = useState(null);
            function parseTimeToMinutes(timeStr) {
                // Example: "5:40 AM", "11:20 PM"
                const match = timeStr.match(/(\d+):(\d+) (\w+)/);
                if (!match) return 0;
                let [, hourStr, minuteStr, period] = match;
                let hour = parseInt(hourStr, 10);
                const minute = parseInt(minuteStr, 10);
                if (period === "PM" && hour !== 12) hour += 12;
                if (period === "AM" && hour === 12) hour = 0;
                return hour * 60 + minute;
            }
            function isViewingToday(selectedDate) {
                const today = new Date();
                const selected = new Date(selectedDate);
                return (
                    today.getFullYear() === selected.getFullYear() &&
                    today.getMonth() === selected.getMonth() &&
                    today.getDate() === selected.getDate()
                );
            }

            function getCurrentChartBucketIndex(shiftChartData) {
                const now = new Date();
                let hour = now.getHours();
                let minute = now.getMinutes();
                minute = Math.floor(minute / 5) * 5;
                if (minute === 60) {
                    minute = 0;
                    hour = (hour + 1) % 24;
                }
                let period = hour >= 12 ? "PM" : "AM";
                let displayHour = hour % 12;
                if (displayHour === 0) displayHour = 12;
                const nowLabel = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
                const nowBucketMinutes = parseTimeToMinutes(nowLabel);

                let idx = -1;
                for (let i = 0; i < shiftChartData.length; i++) {
                    if (parseTimeToMinutes(shiftChartData[i].time) <= nowBucketMinutes) {
                        idx = i;
                    }
                }
                if (idx === -1) idx = shiftChartData.length - 1;
                return idx;
            }

            // Fetch data from backend API
            useEffect(() => {
                // ✅ Clear any existing intervals when dependencies change
                let interval = null;
                let isCancelled = false;


                const fetchShiftData = async () => {
                    // ✅ Don't fetch if this effect was cancelled
                    if (isCancelled) return;

                    setShiftLoading(true);
                    setShiftError(null);

                    try {
                        console.log('🔄 Fetching shift data for date:', selectedDate);
                        console.log('Active shift config:', activeShiftConfig);

                        if (!activeShiftConfig?.startTime || !activeShiftConfig?.endTime) {
                            throw new Error('Shift configuration is missing start/end times');
                        }

                        const params = new URLSearchParams({
                            selectedDate: selectedDate,
                            shift: activeShiftConfig.shift || 'A',
                            targetParts: activeShiftConfig.targetParts || 0,
                            cycleTimeSeconds: activeShiftConfig.cycleTimeSeconds || 1,
                            startTime: activeShiftConfig.startTime,
                            endTime: activeShiftConfig.endTime,
                            breaks: JSON.stringify(
                                (activeShiftConfig.breaks || []).filter(b => b.startTime && b.endTime)
                            ),
                            formId: templateId
                        });

                        console.log('📤 Request URL:', `/api/ShiftProduction/chart-data?${params.toString()}`);

                        const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/ShiftProduction/chart-data?${params}`);

                        if (!response.ok) {
                            const errorText = await response.text();
                            console.error('❌ Server response:', errorText);
                            throw new Error(`Server error: ${response.status}`);
                        }

                        const data = await response.json();

                        const processedChartData = data.chartData.map((point, index) => {
                            if (point.isBreak && index > 0) {
                                // During breaks, maintain the previous cumulative value
                                const previousPoint = data.chartData[index - 1];
                                return {
                                    ...point,
                                    actualParts: previousPoint.actualParts || point.actualParts
                                };
                            }
                            return point;
                        });

                        // ✅ Only update state if not cancelled
                        if (!isCancelled) {
                            console.log('✅ Backend response received:', data);

                            setShiftChartData(data.chartData);
                            setShiftMetrics({
                                currentProduction: data.currentProduction,
                                targetParts: data.targetParts,
                                efficiency: data.efficiency,
                                remainingParts: data.remainingParts,
                                initialCount: data.initialCount ?? 0,
                            });
                        }

                    } catch (err) {
                        if (!isCancelled) {
                            console.error('❌ Error fetching shift data:', err);
                            setShiftError(err.message);
                        }
                    } finally {
                        if (!isCancelled) {
                            setShiftLoading(false);
                        }
                    }
                };

                if (activeShiftConfig && activeShiftConfig.startTime && activeShiftConfig.endTime) {
                    // ✅ Fetch immediately
                    fetchShiftData();

                    // ✅ Set up auto-refresh every 30 seconds
                    interval = setInterval(() => {
                        console.log('🔄 Auto-refresh triggered');
                        fetchShiftData();
                    }, 30000);
                } else {
                    setShiftError('Invalid shift configuration - missing start/end times');
                    setShiftLoading(false);
                }

                // ✅ Cleanup function - runs when dependencies change or component unmounts
                return () => {
                    console.log('🧹 Cleaning up previous fetch and interval');
                    isCancelled = true;
                    if (interval) {
                        clearInterval(interval);
                    }
                };

            }, [
                selectedDate,
                // ✅ Use optional chaining to prevent errors
                activeShiftConfig?.shift,
                activeShiftConfig?.targetParts,
                activeShiftConfig?.cycleTimeSeconds,
                activeShiftConfig?.startTime,
                activeShiftConfig?.endTime,
                JSON.stringify(activeShiftConfig?.breaks || [])
            ]);



            // Inject marquee styles
            React.useEffect(() => {
                const styleId = 'marquee-style';
                if (!document.getElementById(styleId)) {
                    const style = document.createElement('style');
                    style.id = styleId;
                    style.textContent = marqueeStyle;
                    document.head.appendChild(style);
                }
                return () => {
                    const existingStyle = document.getElementById(styleId);
                    if (existingStyle) {
                        existingStyle.remove();
                    }
                };
            }, []);

            // Loading state
            if (shiftLoading && !shiftChartData) {
                return (
                    <div className="w-full p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading production data...</p>
                    </div>
                );
            }
            console.log("Error", shiftError)
            // Error state
            if (shiftError) {
                return (
                    <div className="w-full p-6 bg-red-50 border border-red-200 rounded-lg">
                        <h3 className="text-red-800 font-semibold mb-2">Error Loading Data</h3>
                        <p className="text-red-600">{shiftError}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            Retry
                        </button>
                    </div>
                );
            }

            // No data state
            if (!shiftChartData || shiftChartData.length === 0) {
                return (
                    <div className="w-full p-12 text-center bg-gray-50 rounded-lg">
                        <div className="text-6xl mb-4">📊</div>
                        <h3 className="text-xl font-medium text-gray-600 mb-2">No Data Available</h3>
                        <p className="text-gray-500">No production data found for the selected shift period</p>
                    </div>
                );
            }



            // Render shift chart with backend data
            return (
                <div
                    className={`w-full max-w-full mx-auto
      ${isMaximized ? 'h-screen flex flex-col' : 'p-6 rounded-lg shadow-lg'}
      ${isDarkMode ? 'bg-gray-800' : 'bg-white'}
    `}
                >

                    {/* Header Section */}
                    {!isMaximized && (
                        <div className="flex justify-between items-center mb-6">
                            {/* Date Picker Toggle */}
                            {!isMaximized && (
                                <button
                                    onClick={onToggleDatePicker}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${showDatePicker
                                        ? 'bg-green-600 text-white'
                                        : isDarkMode  // ✅ ADD DARK MODE CHECK
                                            ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    📅 {showDatePicker ? 'Hide' : 'Show'} Date Picker
                                </button>
                            )}

                            {/* Date Picker Input */}
                            {showDatePicker && (
                                <div className="flex items-center gap-2">
                                    <label className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'  // ✅ ADD THIS
                                        }`}>Select Date:</label>
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => {
                                            console.log('📅 Date changed to:', e.target.value);
                                            onDateChange(e.target.value);
                                        }}
                                        max={new Date().toISOString().split('T')[0]}
                                        className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode  // ✅ ADD THIS
                                            ? 'bg-gray-700 border-gray-600 text-gray-200'
                                            : 'bg-white border-gray-300 text-gray-900'
                                            }`}
                                    />
                                    <button
                                        onClick={() => {
                                            const today = new Date().toISOString().split('T')[0];
                                            console.log('📅 Reset to today:', today);
                                            onDateChange(today);
                                        }}
                                        className={`px-3 py-2 rounded-lg font-medium text-sm ${isDarkMode  // ✅ ADD THIS
                                            ? 'bg-blue-700 text-blue-100 hover:bg-blue-600'
                                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                            }`}
                                    >
                                        Today
                                    </button>
                                </div>
                            )}

                            {/* Current Date Display */}
                            <div className={`text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'  // ✅ ADD THIS
                                }`}>
                                Showing data for: <span className={`font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'  // ✅ ADD THIS
                                    }`}>
                                    {new Date(selectedDate).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </span>
                            </div>
                        </div>
                    )}


                    {/* Current Shift Info */}
                    {!isFullscreenMode && (
                        <div className={`mb-6 p-4 rounded-lg border ${isDarkMode
                            ? 'bg-gradient-to-r from-gray-800 to-gray-700 border-gray-600'
                            : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                            }`}>
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-blue-300' : 'text-blue-800'
                                        }`}>
                                        {activeShiftConfig.name} {activeShiftConfig.modelNumber && `[${activeShiftConfig.modelNumber}]`}
                                    </h3>
                                    <p className={isDarkMode ? 'text-gray-300' : 'text-blue-600'}>
                                        {activeShiftConfig.startTime} - {activeShiftConfig.endTime} •
                                        Target: {activeShiftConfig.targetParts} parts •
                                        Cycle: {activeShiftConfig.cycleTimeSeconds}s •
                                        Breaks: {activeShiftConfig.breaks?.length || 0}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-blue-600">Last Updated</div>
                                    <div className="text-blue-800 font-medium">
                                        {new Date().toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Production Chart */}
                    <div className={`mb-6 ${isFullscreenMode ? 'flex-1' : ''}`} style={{
                        transform: 'translateZ(0)',
                        WebkitTransform: 'translateZ(0)',
                        willChange: 'transform',
                        position: 'relative'
                    }}>
                        {/* ✅ Add "Time Elapsed" label as HTML element */}
                        {shiftChartData && (() => {
                            const currentTimeIndex = isViewingToday(selectedDate)
                                ? getCurrentChartBucketIndex(shiftChartData)
                                : shiftChartData.length - 1;

                            if (currentTimeIndex > 0) {
                                return (
                                    <div style={{
                                        position: 'absolute',
                                        top: isFullscreenMode ? '40px' : '30px',
                                        left: isFullscreenMode ? '60px' : '40px',
                                        zIndex: 10,
                                        backgroundColor: isFullscreenMode ? 'rgba(74, 222, 128, 0.9)' : 'rgba(74, 222, 128, 0.7)',
                                        color: isFullscreenMode ? '#ffffff' : '#16a34a',
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        fontWeight: 'bold',
                                        fontSize: isFullscreenMode ? '18px' : '14px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                        pointerEvents: 'none'
                                    }}>
                                        ⏱️ Time Elapsed
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        <ResponsiveContainer
                            width="100%"
                            height={isFullscreenMode ? "60vh" : 500}
                        >
                            <LineChart
                                data={shiftChartData}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke={isFullscreenMode ? "rgba(255,255,255,0.3)" : "#ccc"}
                                />

                                {/* ✅ Add highlighted area for elapsed time */}
                                {shiftChartData && (() => {
                                    const areas = [];

                                    const currentTimeIndex = isViewingToday(selectedDate)
                                        ? getCurrentChartBucketIndex(shiftChartData)
                                        : shiftChartData.length - 1;




                                    // Add elapsed time highlight (from start to current time)
                                    if (currentTimeIndex > 0) {
                                        areas.push(
                                            <ReferenceArea
                                                key="elapsed-time"
                                                x1={shiftChartData[0].time}
                                                x2={shiftChartData[currentTimeIndex].time}
                                                fill={isDarkMode ? "#10b981" : "#4ade80"}
                                                fillOpacity={isDarkMode ? 0.4 : 0.2}
                                                ifOverflow="visible"
                                                label={{
                                                    position: "insideTopLeft",
                                                    fill: isFullscreenMode ? "#ffffff" : "#16a34a",
                                                    fontSize: isFullscreenMode ? 18 : 12,
                                                    fontWeight: "bold"
                                                }}
                                            />

                                        );
                                    }

                                    // Add break time highlights
                                    let breakStart = null;


                                    shiftChartData.forEach((point, index) => {
                                        if (point.isBreak && breakStart === null) {
                                            breakStart = index;
                                        } else if (!point.isBreak && breakStart !== null) {
                                            areas.push(
                                                <ReferenceArea
                                                    key={`break-${breakStart}`}
                                                    x1={shiftChartData[breakStart].time}
                                                    x2={shiftChartData[index - 1].time}
                                                    fill="#ffcccc"
                                                    fillOpacity={isFullscreenMode ? 0.6 : 0.5}  // ✅ Increase opacity in fullscreen
                                                    label={{
                                                        value: "BREAK",
                                                        position: "insideTop",
                                                        fill: isDarkMode ? "#ffffff" : "#ff0000",  // ✅ White text in fullscreen
                                                        fontSize: isFullscreenMode ? 16 : 11,  // ✅ Bigger font in fullscreen
                                                        fontWeight: "bold"
                                                    }}
                                                />
                                            );
                                            breakStart = null;
                                        }
                                    });

                                    // Handle break at the end
                                    if (breakStart !== null) {
                                        areas.push(
                                            <ReferenceArea
                                                key={`break-${breakStart}`}
                                                x1={shiftChartData[breakStart].time}
                                                x2={shiftChartData[shiftChartData.length - 1].time}
                                                fill="#ffcccc"
                                                fillOpacity={isFullscreenMode ? 0.6 : 0.5}  // ✅ Increase opacity in fullscreen
                                                label={{
                                                    value: "BREAK",
                                                    position: "insideTop",
                                                    fill: isDarkMode ? "#ffffff" : "#ff0000",  // ✅ White text in fullscreen
                                                    fontSize: isFullscreenMode ? 16 : 11,  // ✅ Bigger font in fullscreen
                                                    fontWeight: "bold"
                                                }}
                                            />
                                        );
                                    }

                                    return areas;
                                })()}


                                <XAxis
                                    dataKey="time"
                                    tick={{ fontSize: isFullscreenMode ? 14 : 12, fill: isFullscreenMode ? 'white' : '#666' }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                />
                                <YAxis
                                    tick={{ fontSize: isFullscreenMode ? 14 : 12, fill: isFullscreenMode ? 'white' : '#666' }}
                                    label={{
                                        value: 'Cumulative Parts Produced',
                                        angle: -90,
                                        position: 'insideLeft',
                                        style: {
                                            fill: isFullscreenMode ? 'white' : '#666',
                                            fontSize: 14
                                        }
                                    }}
                                />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            const actual = Number(data?.actualParts ?? data?.actual ?? 0);
                                            const target = Number(data?.targetParts ?? 0);

                                            const currentPct =
                                                target > 0 ? ((actual / target) * 100).toFixed(1) : 0;
                                            return (
                                                <div style={{
                                                    backgroundColor: isDarkMode ? '#1f2937' : 'white',
                                                    color: isDarkMode ? '#f3f4f6' : '#111827',
                                                    padding: '10px',
                                                    border: `2px solid ${isDarkMode ? '#374151' : '#ccc'}`,
                                                    borderRadius: '8px',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                                }}>
                                                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px', color: '#1d4ed8' }}>
                                                        {data.time} {/* Indigo-700 */}
                                                    </p>

                                                    <p style={{ margin: '5px 0', color: '#22c55e', fontSize: '13px' }}>
                                                        Actual: {data.actualParts} {/* Green-500 */}
                                                    </p>

                                                    <p style={{ margin: '5px 0', color: '#f97316', fontSize: '13px' }}>
                                                        Target: {data.targetParts} {/* Orange-500 */}
                                                    </p>

                                                    <p style={{ margin: '5px 0', color: '#0ea5e9', fontSize: '13px' }}>
                                                        Current Percentage: {currentPct}% {/* Sky-500 */}
                                                    </p>

                                                    {data.newPartsInBucket > 0 && (
                                                        <p style={{ margin: '5px 0', color: '#22c55e', fontSize: '13px' }}>
                                                            New parts: +{data.newPartsInBucket} {/* Same green as Actual */}
                                                        </p>
                                                    )}

                                                    {console.log("Break Data", data)}
                                                    {data.isBreak && (
                                                        <p style={{
                                                            margin: '5px 0',
                                                            color: '#ff0000',
                                                            fontWeight: 'bold',
                                                            backgroundColor: '#ffeeee',
                                                            padding: '3px 6px',
                                                            borderRadius: '4px'
                                                        }}>
                                                            ⏸️ {data.breakName || 'BREAK TIME'}  {/* ✅ Show break name */}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Legend />

                                {/* Target Line */}
                                <Line
                                    type="monotone"
                                    dataKey="targetParts"
                                    stroke={isFullscreenMode ? "#ff6b35" : "#ff7300"}
                                    strokeWidth={isFullscreenMode ? 5 : 3}
                                    strokeDasharray="8 8"
                                    name="Target Production"
                                    dot={false}
                                />

                                {/* Actual Production Line */}
                                {/*<Line*/}
                                {/*    type="monotone"*/}
                                {/*    dataKey="actualParts"*/}
                                {/*    stroke={isFullscreenMode ? "#4ade80" : "#82ca9d"}*/}
                                {/*    strokeWidth={isFullscreenMode ? 5 : 3}*/}
                                {/*    name="Actual Production (Cumulative)"*/}
                                {/*    connectNulls={false}*/}
                                {/*    dot={{*/}
                                {/*        fill: isFullscreenMode ? '#4ade80' : '#82ca9d',*/}
                                {/*        strokeWidth: 3,*/}
                                {/*        r: isFullscreenMode ? 6 : 3*/}
                                {/*    }}*/}
                                {/*/>*/}
                                <Line
                                    type="monotone"
                                    dataKey="actualParts"
                                    stroke="#10b981"
                                    strokeWidth={isFullscreenMode ? 4 : 3}
                                    name="Actual Production"
                                    connectNulls={false}
                                    dot={(props) => {
                                        const { cx, cy, payload } = props;
                                        // Only show dot if there's real production (not zero, not null)
                                        if (payload.actualParts && payload.actualParts > 0) {
                                            return (
                                                <circle
                                                    cx={cx}
                                                    cy={cy}
                                                    r={isFullscreenMode ? 6 : 4}
                                                    fill="#10b981"
                                                    stroke="#fff"
                                                    strokeWidth={2}
                                                />
                                            );
                                        }
                                        return null;
                                    }}
                                    activeDot={{ r: isFullscreenMode ? 8 : 6 }}
                                />

                            </LineChart>

                        </ResponsiveContainer>
                    </div>

                    {/* Production Summary Cards - Using Backend Metrics */}
                    {!isFullscreenMode && shiftMetrics && (
                        <div className="mb-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {/* Current Production */}
                                <div
                                    className={`p-4 rounded-lg border shadow-sm ${isDarkMode
                                            ? 'bg-slate-800 border-slate-500 text-blue-200'
                                            : 'bg-blue-50 border-blue-300 text-blue-900'
                                        }`}
                                >
                                    <div className="text-2xl font-bold">
                                        {shiftMetrics.currentProduction}
                                    </div>
                                    <div className="mt-1 text-sm">
                                        Current Production
                                    </div>
                                </div>

                                {/* Target Parts */}
                                <div
                                    className={`p-4 rounded-lg border shadow-sm ${isDarkMode
                                            ? 'bg-orange-900 border-orange-700 text-orange-100'
                                            : 'bg-orange-50 border-orange-300 text-orange-900'
                                        }`}
                                >
                                    <div className="text-2xl font-bold">
                                        {shiftMetrics.targetParts}
                                    </div>
                                    <div className="mt-1 text-sm">
                                        Target Parts
                                    </div>
                                </div>

                                {/* Efficiency */}
                                <div
                                    className={`p-4 rounded-lg border shadow-sm ${shiftMetrics.efficiency >= 100
                                            ? isDarkMode
                                                ? 'bg-emerald-900 border-emerald-700 text-emerald-100'
                                                : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                            : shiftMetrics.efficiency >= 80
                                                ? isDarkMode
                                                    ? 'bg-yellow-900 border-yellow-700 text-yellow-100'
                                                    : 'bg-yellow-50 border-yellow-300 text-yellow-900'
                                                : isDarkMode
                                                    ? 'bg-red-900 border-red-700 text-red-100'
                                                    : 'bg-red-50 border-red-300 text-red-900'
                                        }`}
                                >
                                    <div className="text-2xl font-bold">
                                        {shiftMetrics.efficiency}%
                                    </div>
                                    <div className="mt-1 text-sm">
                                        Current %
                                    </div>
                                </div>

                                {/* Remaining Parts */}
                                <div
                                    className={`p-4 rounded-lg border shadow-sm ${isDarkMode
                                            ? 'bg-purple-900 border-purple-700 text-purple-100'
                                            : 'bg-purple-50 border-purple-300 text-purple-900'
                                        }`}
                                >
                                    <div className="text-2xl font-bold">
                                        {shiftMetrics.remainingParts}
                                    </div>
                                    <div className="mt-1 text-sm">
                                        Remaining Parts
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}


                    {/* Marquee Message */}
                    {activeShiftConfig?.message && (
                        <div className="mb-6">
                            <div className={`marquee-container ${isDarkMode ? 'dark' : 'light'} rounded-lg shadow-lg`}>
                                <div className="marquee-text">
                                    <span className="mr-8">🔔</span>
                                    {activeShiftConfig.message}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Break Schedule */}
                    {isMaximized && activeShiftConfig.breaks && activeShiftConfig.breaks.length > 0 && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Break Schedule</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {activeShiftConfig.breaks.map((breakItem, idx) => (
                                    <div key={breakItem.id || idx} className="flex items-center p-2 bg-white rounded border">
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
                    )}
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
}, (prevProps, nextProps) => {
    // Return TRUE to PREVENT re-render, FALSE to ALLOW re-render

    // For shift charts, be more selective about what triggers re-renders
    if (prevProps.type === 'shift' && nextProps.type === 'shift') {
        const shouldSkipRender = (
            prevProps.selectedShiftPeriod === nextProps.selectedShiftPeriod &&
            prevProps.selectedDate === nextProps.selectedDate &&
            prevProps.showDatePicker === nextProps.showDatePicker &&
            prevProps.isMaximized === nextProps.isMaximized &&
            prevProps.isFullscreenMode === nextProps.isFullscreenMode &&
            // Only check shift config essentials, not every detail
            prevProps.shiftConfigs?.[0]?.shift === nextProps.shiftConfigs?.[0]?.shift &&
            prevProps.shiftConfigs?.[0]?.startTime === nextProps.shiftConfigs?.[0]?.startTime &&
            prevProps.shiftConfigs?.[0]?.endTime === nextProps.shiftConfigs?.[0]?.endTime
        );
        return shouldSkipRender;
    }

    // For other chart types, use original logic
    const shouldSkipRender = (
        prevProps.type === nextProps.type &&
        prevProps.data.length === nextProps.data.length &&
        prevProps.selectedShiftPeriod === nextProps.selectedShiftPeriod &&
        prevProps.refreshTrigger === nextProps.refreshTrigger &&
        prevProps.selectedDate === nextProps.selectedDate &&
        prevProps.showDatePicker === nextProps.showDatePicker &&
        prevProps.shiftConfigs?.[0]?.targetParts === nextProps.shiftConfigs?.[0]?.targetParts &&
        prevProps.data[prevProps.data.length - 1]?.Date === nextProps.data[nextProps.data.length - 1]?.Date &&
        prevProps.data[prevProps.data.length - 1]?.Count === nextProps.data[nextProps.data.length - 1]?.Count
    );

    return shouldSkipRender;
});
export default ReportCharts;