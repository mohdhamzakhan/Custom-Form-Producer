import React, { useState } from "react";
import { Plus, X, BarChart3, Settings, Eye, Users, Clock, Target, Timer, Trash2 } from "lucide-react";
import { CHART_TYPES } from "./ReportCharts";
import ReportCharts from "./ReportCharts";

const SHIFT_CONFIG = {
    A: {
        name: "Shift A",
        startTime: "06:00",
        endTime: "14:30",
        modelNumber: "",  // Add this
        message: "",      // Add this
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
        modelNumber: "",  // Add this
        message: "",      // Add this
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
        modelNumber: "",  // Add this
        message: "",      // Add this
        defaultBreaks: [
            { id: 1, startTime: "01:00", endTime: "01:30", name: "Midnight Break" },
            { id: 2, startTime: "04:00", endTime: "04:10", name: "Early Morning Break" },
        ]
    }
};


const MultiChartBuilder = ({
    chartConfigs,
    setChartConfigs,
    selectedFields,
    fields,
    calculatedFields,
    data = []
}) => {
    // CHANGED: Start expanded by default to make configuration visible
    const [isExpanded, setIsExpanded] = useState(true);
    const [previewMode, setPreviewMode] = useState(false);
    const [showConfig, setShowConfig] = useState(true);

    const initializeShiftConfigs = () => {
        return Object.keys(SHIFT_CONFIG).map(shiftKey => ({
            shift: shiftKey,
            name: SHIFT_CONFIG[shiftKey].name,
            startTime: SHIFT_CONFIG[shiftKey].startTime,
            endTime: SHIFT_CONFIG[shiftKey].endTime,
            targetParts: 100,
            cycleTimeSeconds: 30,
            modelNumber: SHIFT_CONFIG[shiftKey].modelNumber || "",  // Add this
            message: SHIFT_CONFIG[shiftKey].message || "",          // Add this
            breaks: SHIFT_CONFIG[shiftKey].defaultBreaks.map(breakItem => ({
                ...breakItem,
                id: Date.now() + Math.random()
            })),
            groupByField: "", 
        }));
    };


    React.useEffect(() => {
        let hasChanges = false;
        const updatedCharts = chartConfigs.map(chart => {
            if (chart.type === 'shift' && !chart.shiftConfigs) {
                hasChanges = true;
                return {
                    ...chart,
                    shiftConfigs: initializeShiftConfigs()
                };
            }
            return chart;
        });

        if (hasChanges) {
            setChartConfigs(updatedCharts);
        }
    }, [chartConfigs.length, chartConfigs.map(c => `${c.id}-${c.type}-${!!c.shiftConfigs}`).join(',')]);


    // Ensure shift charts have shiftConfig initialized
    React.useEffect(() => {
        const updatedCharts = chartConfigs.map(chart => {
            if (chart.type === 'shift' && !chart.shiftConfig) {
                return {
                    ...chart,
                    shiftConfig: {
                        targetParts: 100,
                        cycleTimeSeconds: 30,
                        shift: 'A',
                        startTime: '06:00',
                        endTime: '14:30',
                        breaks: [
                            { id: Date.now(), startTime: "08:00", endTime: "08:10", name: "Tea Break" },
                            { id: Date.now() + 1, startTime: "11:30", endTime: "12:00", name: "Lunch Break" }
                        ]
                    }
                };
            }
            return chart;
        });

        // Only update if something actually changed
        if (JSON.stringify(updatedCharts) !== JSON.stringify(chartConfigs)) {
            setChartConfigs(updatedCharts);
        }
    }, [chartConfigs]);

    const addChart = () => {
        const availableFields = getAvailableFields();
        const newChart = {
            id: Date.now(),
            title: `Chart ${chartConfigs.length + 1}`,
            type: "bar",
            metrics: [],
            xField: null,
            position: {
                row: chartConfigs.length * 6,
                col: 0,
                width: 12,
                height: 6
            },
            comboConfig: {
                barMetrics: [],
                lineMetrics: []
            }
            // Don't initialize shiftConfig here - it will be added when type changes to 'shift'
        };
        setChartConfigs([...chartConfigs, newChart]);
        setIsExpanded(true);
        setPreviewMode(false);
    };

    const updateChart = (id, updates) => {
        setChartConfigs(prev =>
            prev.map(chart =>
                chart.id === id ? { ...chart, ...updates } : chart
            )
        );
    };

    const handleChartTypeChange = (id, newType) => {
        setChartConfigs(prev => prev.map(chart => {
            if (chart.id !== id) return chart;

            if (newType === 'shift' && !chart.shiftConfigs) {
                return {
                    ...chart,
                    type: newType,
                    shiftConfigs: initializeShiftConfigs()
                };
            } else if (newType !== 'shift') {
                const { shiftConfigs, ...rest } = chart;
                return {
                    ...rest,
                    type: newType
                };
            }

            return {
                ...chart,
                type: newType
            };
        }));
    };

    const updateShiftConfig = (chartId, shiftKey, updates) => {
        setChartConfigs(prev => prev.map(chart => {
            if (chart.id !== chartId) return chart;

            const newShiftConfigs = chart.shiftConfigs.map(config =>
                config.shift === shiftKey ? { ...config, ...updates } : config
            );

            return { ...chart, shiftConfigs: newShiftConfigs };
        }));
    };

    const removeChart = (id) => {
        setChartConfigs(prev => prev.filter(chart => chart.id !== id));
    };

    const getAvailableFields = () => {
        // Get all base fields from selectedFields
        const baseFields = selectedFields.map(fieldId => {
            const field = fields.find(f => f.id === fieldId);
            return {
                id: fieldId,
                label: field?.label || fieldId,
                type: field?.type || 'text',
                isNumeric: field ? ['number', 'decimal', 'integer', 'currency', 'percentage'].includes(field.type) : false
            };
        }).filter(field => field.type !== 'grid');

        //console.log('Base fields before filtering:', baseFields);
        //console.log('Selected fields:', selectedFields);
        //console.log('Fields array:', fields);

        const calcFields = calculatedFields
            .filter(cf => cf.label && cf.formula)
            .map(cf => ({
                id: `calc_${cf.id}`,
                label: `${cf.label} ${cf.calculationType === 'columnwise' ? '(Summary)' : '(Per Row)'}`,
                type: 'calculated',
                calculationType: cf.calculationType,
                isNumeric: true,
                isColumnwise: cf.calculationType === 'columnwise'
            }));

        //console.log('Calculated fields:', calcFields);

        return [...baseFields, ...calcFields];
    };


    const validateChart = (chart) => {
        const chartType = CHART_TYPES[chart.type];
        if (!chartType) return "Invalid chart type";

        if (chartType.requiresXAxis && !chart.xField) {
            return "X-axis field is required";
        }

        if (chart.metrics.length === 0) {
            return "At least one metric is required";
        }

        if (!chartType.allowsMultipleMetrics && chart.metrics.length > 1) {
            return "This chart type only allows one metric";
        }

        // NEW: Check for columnwise calculated fields in charts
        const hasColumnwiseFields = chart.metrics.some(metric => {
            if (metric.startsWith('calc_')) {
                const calcId = metric.replace('calc_', '');
                const calcField = calculatedFields?.find(cf => cf.id == calcId);
                return calcField && calcField.calculationType === 'columnwise';
            }
            return false;
        });

        if (hasColumnwiseFields) {
            return "Warning: Columnwise calculated fields show individual row calculations, not summary values";
        }

        return null;
    };

    const addBreak = (chartId, shiftKey) => {
        const newBreak = {
            id: Date.now(),
            name: "New Break",
            startTime: "10:00",
            endTime: "10:10"
        };

        setChartConfigs(prev => prev.map(chart => {
            if (chart.id !== chartId) return chart;

            const newShiftConfigs = chart.shiftConfigs.map(config =>
                config.shift === shiftKey
                    ? { ...config, breaks: [...config.breaks, newBreak] }
                    : config
            );

            return { ...chart, shiftConfigs: newShiftConfigs };
        }));
    };

    const removeBreak = (chartId, shiftKey, breakId) => {
        setChartConfigs(prev => prev.map(chart => {
            if (chart.id !== chartId) return chart;

            const newShiftConfigs = chart.shiftConfigs.map(config =>
                config.shift === shiftKey
                    ? { ...config, breaks: config.breaks.filter(b => b.id !== breakId) }
                    : config
            );

            return { ...chart, shiftConfigs: newShiftConfigs };
        }));
    };

    const updateBreak = (chartId, shiftKey, breakId, field, value) => {
        setChartConfigs(prev => prev.map(chart => {
            if (chart.id !== chartId) return chart;

            const newShiftConfigs = chart.shiftConfigs.map(config =>
                config.shift === shiftKey
                    ? {
                        ...config,
                        breaks: config.breaks.map(breakItem =>
                            breakItem.id === breakId
                                ? { ...breakItem, [field]: value }
                                : breakItem
                        )
                    }
                    : config
            );

            return { ...chart, shiftConfigs: newShiftConfigs };
        }));
    };

    const resetToDefaults = (chartId) => {
        setChartConfigs(prev => prev.map(chart => {
            if (chart.id !== chartId) return chart;
            return {
                ...chart,
                shiftConfigs: initializeShiftConfigs()
            };
        }));
    };

    const handleShiftChange = (chartId, shiftKey, newShiftKey) => {
        if (newShiftKey === shiftKey) return;

        setChartConfigs(prev => prev.map(chart => {
            if (chart.id !== chartId) return chart;

            const newShiftConfigs = chart.shiftConfigs.map(config => {
                if (config.shift === shiftKey) {
                    return {
                        ...config,
                        shift: newShiftKey,
                        name: SHIFT_CONFIG[newShiftKey].name,
                        startTime: SHIFT_CONFIG[newShiftKey].startTime,
                        endTime: SHIFT_CONFIG[newShiftKey].endTime,
                        modelNumber: "",  // Add this - reset when changing shifts
                        message: "",      // Add this - reset when changing shifts
                        groupByField: "",
                        breaks: SHIFT_CONFIG[newShiftKey].defaultBreaks.map(breakItem => ({
                            ...breakItem,
                            id: Date.now() + Math.random()
                        }))
                    };
                }
                return config;
            });

            return { ...chart, shiftConfigs: newShiftConfigs };
        }));
    };

    const updateChartConfig = (chartId, updates) => {
        setChartConfigs(prev =>
            prev.map(chart =>
                chart.id === chartId ? { ...chart, ...updates } : chart
            )
        );
    };

    const renderShiftConfiguration = (chart) => {
        if (chart.type !== 'shift' || !chart.shiftConfigs) return null;

        return (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-blue-800">
                        ⚙️ Shift Configuration
                    </h4>

                    <div className="flex items-center space-x-4">
                        {/* Show / Hide Chart Toggle */}
                        <label className="flex items-center gap-2 text-sm text-blue-700">
                            <input
                                type="checkbox"
                                checked={chart.showChart !== false}
                                onChange={(e) =>
                                    updateChartConfig(chart.id, {
                                        showChart: e.target.checked
                                    })
                                }
                            />
                            Show Chart
                        </label>

                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => resetToDefaults(chart.id)}
                                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                                Reset to Defaults
                            </button>
                            <button
                                onClick={() => setShowConfig(!showConfig)}
                                className="px-3 py-1 text-sm bg-blue-200 text-blue-700 rounded hover:bg-blue-300"
                            >
                                {showConfig ? 'Hide Config' : 'Show Config'}
                            </button>
                        </div>
                    </div>
                </div>

                {showConfig && (
                    <div className="space-y-6">
                        {chart.shiftConfigs.map((shiftConfig) => (
                            <div key={shiftConfig.shift} className="p-4 bg-white border border-blue-300 rounded-lg">
                                <h5 className="font-semibold text-blue-700 mb-4">
                                    🕒 {shiftConfig.name} Configuration
                                </h5>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {/* Shift Selection */}
                                    <div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                <Users className="inline w-4 h-4 mr-1" />
                                                Select Shift
                                            </label>
                                            <select
                                                value={shiftConfig.shift}
                                                onChange={(e) => handleShiftChange(chart.id, shiftConfig.shift, e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="A">Shift A (06:00 - 14:30)</option>
                                                <option value="B">Shift B (14:30 - 23:00)</option>
                                                <option value="C">Shift C (23:00 - 06:00)</option>
                                            </select>
                                        </div>

                                        {/* Model Number - Add this new field */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                <Target className="inline w-4 h-4 mr-1" />
                                                Model Number
                                            </label>
                                            <input
                                                type="text"
                                                value={shiftConfig.modelNumber || ""}
                                                onChange={(e) => updateShiftConfig(chart.id, shiftConfig.shift, {
                                                    modelNumber: e.target.value
                                                })}
                                                placeholder="Enter model number"
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
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
                                            onChange={(e) => updateShiftConfig(chart.id, shiftConfig.shift, { startTime: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                        <label className="block text-sm font-medium text-gray-700 mt-2 mb-2">Shift End Time</label>
                                        <input
                                            type="time"
                                            value={shiftConfig.endTime}
                                            onChange={(e) => updateShiftConfig(chart.id, shiftConfig.shift, { endTime: e.target.value })}
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
                                            onChange={(e) => updateShiftConfig(chart.id, shiftConfig.shift, { targetParts: parseInt(e.target.value) })}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                        <label className="block text-sm font-medium text-gray-700 mt-2 mb-2">
                                            <Timer className="inline w-4 h-4 mr-1" />
                                            Cycle Time (seconds)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            step="0.01"
                                            value={shiftConfig.cycleTimeSeconds}
                                            onChange={(e) =>
                                                updateShiftConfig(chart.id, shiftConfig.shift, {
                                                    cycleTimeSeconds: parseFloat(e.target.value) || 0
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
                                                onClick={() => addBreak(chart.id, shiftConfig.shift)}
                                                className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {shiftConfig.breaks.map((breakItem) => (
                                                <div key={breakItem.id} className="p-2 bg-gray-50 rounded border">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <input
                                                            type="text"
                                                            value={breakItem.name}
                                                            onChange={(e) => updateBreak(chart.id, shiftConfig.shift, breakItem.id, 'name', e.target.value)}
                                                            className="text-xs font-medium bg-transparent border-none p-0 focus:outline-none flex-1"
                                                        />
                                                        <button
                                                            onClick={() => removeBreak(chart.id, shiftConfig.shift, breakItem.id)}
                                                            className="text-red-500 hover:text-red-700 ml-2"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-1">
                                                        <input
                                                            type="time"
                                                            value={breakItem.startTime}
                                                            onChange={(e) => updateBreak(chart.id, shiftConfig.shift, breakItem.id, 'startTime', e.target.value)}
                                                            className="text-xs p-1 border rounded"
                                                        />
                                                        <input
                                                            type="time"
                                                            value={breakItem.endTime}
                                                            onChange={(e) => updateBreak(chart.id, shiftConfig.shift, breakItem.id, 'endTime', e.target.value)}
                                                            className="text-xs p-1 border rounded"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <label className="block text-sm font-semibold text-green-800 mb-2">
                                            🏭 Production Line Grouping
                                        </label>
                                        <p className="text-xs text-green-600 mb-2">
                                            Select a form field to split the chart into multiple lines (one per production line / machine).
                                            Leave empty to show a single combined line.
                                        </p>
                                        <select
                                            value={shiftConfig.groupByField || ""}
                                            onChange={(e) => updateShiftConfig(chart.id, shiftConfig.shift, {
                                                groupByField: e.target.value
                                            })}
                                            className="w-full p-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                                        >
                                            <option value="">-- Single line (no grouping) --</option>
                                            {fields.map(field => (
                                                <option key={field.id} value={field.label}>
                                                    {field.label} ({field.type})
                                                </option>
                                            ))}
                                        </select>
                                        {shiftConfig.groupByField && (
                                            <div className="mt-2 p-2 bg-green-100 rounded text-xs text-green-700">
                                                ✅ Chart will show separate lines for each value of <strong>"{shiftConfig.groupByField}"</strong>
                                            </div>
                                        )}
                                    </div>

                                    {/* Message - Add this section after the grid */}
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <Timer className="inline w-4 h-4 mr-1" />
                                            Shift Message
                                        </label>
                                        <textarea
                                            value={shiftConfig.message || ""}
                                            onChange={(e) => updateShiftConfig(chart.id, shiftConfig.shift, {
                                                message: e.target.value
                                            })}
                                            placeholder="Enter shift message or notes"
                                            rows="3"
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                                        />
                                    </div>

                                    {/* Group By Field - Production Line */}
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Group By (Production Line Field)
                                        </label>
                                        <select
                                            value={shiftConfig.groupByField || ""}
                                            onChange={(e) => updateShiftConfig(chart.id, shiftConfig.shift, {
                                                groupByField: e.target.value
                                            })}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">-- No grouping (single line) --</option>
                                            {fields.map(field => (
                                                <option key={field.id} value={field.label}>
                                                    {field.label}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Select the field that identifies the production line (e.g. "Line Name", "Machine")
                                        </p>
                                    </div>
                                </div>

                                {/* Production Rate Display */}
                                <div className="mt-4 p-3 bg-blue-50 rounded border">
                                    <div className="text-sm text-gray-600">Production Rate for {shiftConfig.name}</div>
                                    <div className="text-lg font-bold text-blue-600">
                                        {shiftConfig.cycleTimeSeconds > 0
                                            ? Math.round(3600 / shiftConfig.cycleTimeSeconds)
                                            : 0} parts/hour
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderChartConfiguration = (chart) => {
        const chartType = CHART_TYPES[chart.type];
        const availableFields = getAvailableFields();
        const validation = validateChart(chart);

        // Separate fields for different purposes
        const xAxisFields = availableFields;
        const metricFields = availableFields.filter(f => f.isNumeric);

        const regularXFields = xAxisFields.filter(f => f.type !== 'calculated');
        const calculatedXFields = xAxisFields.filter(f => f.type === 'calculated');
        const regularMetricFields = selectedFields.map(fieldId => {
            const field = fields.find(f => f.id === fieldId);
            return {
                id: fieldId,
                label: field?.label || fieldId,
                type: field?.type || 'text'
            };
        }).filter(field => {
            // Include more field types - basically everything except grids
            return field.type !== 'grid' && field.type !== 'file' && field.type !== 'signature';
        });
        const calculatedMetricFields = metricFields.filter(f => f.type === 'calculated');


        return (
            <div key={chart.id} className="bg-white border-2 border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                    <input
                        type="text"
                        value={chart.title}
                        onChange={(e) => updateChart(chart.id, { title: e.target.value })}
                        className="text-lg font-medium bg-transparent border-2 border-gray-300 focus:border-blue-500 rounded px-3 py-2 focus:outline-none"
                        placeholder="Chart Title"
                    />
                    <button
                        onClick={() => removeChart(chart.id)}
                        className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {validation && (
                    <div className="bg-red-50 border-2 border-red-200 rounded p-3 mb-4">
                        <p className="text-red-700 text-sm font-medium">{validation}</p>
                    </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
                    <h6 className="font-medium text-blue-800 mb-2 flex items-center">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Chart Configuration
                    </h6>
                    <div className="text-blue-700 text-sm space-y-1">
                        <p><strong>Regular Fields:</strong> Use raw form data (quantities, amounts, dates)</p>
                        <p><strong>Calculated Fields:</strong> Use computed values (totals, averages, efficiency)</p>
                        <p><strong>Tip:</strong> You can mix both regular and calculated fields in the same chart</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                    {/* Chart Type */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Chart Type
                        </label>
                        <select
                            value={chart.type}
                            onChange={(e) => handleChartTypeChange(chart.id, e.target.value)}
                            className="w-full border-2 border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {Object.entries(CHART_TYPES).map(([key, config]) => (
                                <option key={key} value={key}>
                                    {config.label}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-600 mt-1">{chartType?.description}</p>
                    </div>

                    {/* X-Axis Field */}
                    {chartType?.requiresXAxis && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                X-Axis Field (Categories)
                            </label>
                            <select
                                value={chart.xField}
                                onChange={(e) => updateChart(chart.id, { xField: e.target.value })}
                                className="w-full border-2 border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Select X-Axis Field</option>

                                {regularXFields.length > 0 && (
                                    <optgroup label="📋 Form Fields">
                                        {regularXFields.map(field => (
                                            <option key={field.id} value={field.label}>
                                                {field.label}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}

                                {calculatedXFields.length > 0 && (
                                    <optgroup label="📊 Calculated Fields">
                                        {calculatedXFields.map(field => (
                                            <option key={field.id} value={field.id}>
                                                {field.label}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>
                            <p className="text-xs text-gray-600 mt-1">
                                Choose the field that creates categories on X-axis
                            </p>
                        </div>
                    )}

                    {/* Metrics */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Metrics (Values to Plot)
                        </label>
                        <select
                            multiple
                            value={chart.metrics}
                            onChange={(e) => {
                                const selectedMetrics = Array.from(e.target.selectedOptions, option => option.value);
                                updateChart(chart.id, { metrics: selectedMetrics });
                            }}
                            className="w-full border-2 border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            size={Math.min(metricFields.length + 2, 8)}
                        >
                            {console.log("Metrics ", regularMetricFields)}
                            {regularMetricFields.length > 0 && (
                                <optgroup label="📋 Form Fields (Varies per entry)">
                                    {regularMetricFields.map(field => (
                                        <option key={field.id} value={field.label}>
                                            {field.label}
                                        </option>
                                    ))}
                                </optgroup>
                            )}

                            {calculatedMetricFields.length > 0 && (
                                <optgroup label="📊 Calculated Fields">
                                    {calculatedMetricFields.map(field => {
                                        const calcId = field.id.replace('calc_', '');
                                        const calcField = calculatedFields.find(cf => cf.id == calcId);
                                        const isColumnwise = calcField?.calculationType === 'columnwise';

                                        return (
                                            <option
                                                key={field.id}
                                                value={field.id}
                                                style={{
                                                    fontStyle: isColumnwise ? 'italic' : 'normal',
                                                    color: isColumnwise ? '#6b7280' : 'inherit'
                                                }}
                                            >
                                                {field.label} {isColumnwise ? '(Flat line - same value for all)' : '(Varies per entry)'}
                                            </option>
                                        );
                                    })}
                                </optgroup>
                            )}
                        </select>
                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <p className="text-xs text-yellow-700 font-medium">
                                💡 {chartType?.allowsMultipleMetrics ? "Hold Ctrl/Cmd to select multiple metrics" : "Select one metric"}
                            </p>
                            <p className="text-xs text-yellow-600 mt-1">
                                You can mix regular fields and calculated fields together!
                            </p>
                        </div>
                    </div>
                </div>

                {/* Combo Chart Configuration */}
                {chart.type === 'combo' && (
                    <div className="border-t-2 pt-4">
                        <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Combo Chart Configuration
                        </h4>

                        <div className="bg-indigo-50 border border-indigo-200 rounded p-3 mb-3">
                            <p className="text-indigo-700 text-sm">
                                <strong>💡 Tip:</strong> Assign metrics to bars or lines based on their scale.
                                Use bars for counts/totals and lines for percentages/rates.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    📊 Bar Metrics (Left Y-axis)
                                </label>
                                <select
                                    multiple
                                    value={chart.comboConfig.barMetrics}
                                    onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                                        updateChart(chart.id, {
                                            comboConfig: { ...chart.comboConfig, barMetrics: selected }
                                        });
                                    }}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    size={4}
                                >
                                    {chart.metrics.map(metric => {
                                        const field = availableFields.find(f => f.id === metric);
                                        return (
                                            <option key={metric} value={metric}>
                                                {field?.label || metric}
                                            </option>
                                        );
                                    })}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Good for: Quantities, Counts, Totals</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    📈 Line Metrics (Right Y-axis)
                                </label>
                                <select
                                    multiple
                                    value={chart.comboConfig.lineMetrics}
                                    onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                                        updateChart(chart.id, {
                                            comboConfig: { ...chart.comboConfig, lineMetrics: selected }
                                        });
                                    }}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    size={4}
                                >
                                    {chart.metrics.map(metric => {
                                        const field = availableFields.find(f => f.id === metric);
                                        return (
                                            <option key={metric} value={metric}>
                                                {field?.label || metric}
                                            </option>
                                        );
                                    })}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Good for: Percentages, Rates, Efficiency</p>
                            </div>
                        </div>
                    </div>
                )}

                {renderShiftConfiguration(chart)}

                {/* Chart Preview */}
                {previewMode && !validation && (
                    <div className="border-t-2 pt-4">
                        <div className="bg-gray-50 p-3 rounded mb-3">
                            <h6 className="font-medium text-gray-700 mb-2">Chart Preview</h6>
                            <p className="text-sm text-gray-600">
                                📊 This chart includes: {chart.metrics.length} metric(s)
                                {calculatedMetricFields.some(cf => chart.metrics.includes(cf.id)) && (
                                    <span className="text-blue-600 font-medium"> (includes calculated fields)</span>
                                )}
                            </p>
                        </div>
                        {chart.showChart !== false && (
                            <ReportCharts
                                key={chart.id}
                                data={data}
                                metrics={chart.metrics}
                                type={chart.type}
                                xField={chart.xField}
                                title={chart.title}
                                comboConfig={chart.comboConfig}
                                fields={fields}
                                calculatedFields={calculatedFields}
                                shiftConfigs={chart.shiftConfigs}
                            />
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderPreview = () => {
        if (chartConfigs.length === 0) {
            return (
                <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No charts configured yet</h3>
                    <p className="text-gray-500">Add some charts to see the preview</p>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {chartConfigs.map(chart => {
                    const validation = validateChart(chart);
                    if (validation) {
                        return (
                            <div key={chart.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <h3 className="font-medium text-red-800">{chart.title}</h3>
                                <p className="text-red-600 text-sm">{validation}</p>
                            </div>
                        );
                    }

                    return (
                        <ReportCharts
                            key={chart.id}
                            data={data}
                            metrics={chart.metrics}
                            type={chart.type}
                            xField={chart.xField}
                            title={chart.title}
                            comboConfig={chart.comboConfig}
                            fields={fields}
                            calculatedFields={calculatedFields}
                            shiftConfigs={chart.shiftConfigs}  // This will include modelNumber and message
                        />

                    );
                })}
            </div>
        );
    };

    return (
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                    <h3 className="text-xl font-bold text-gray-900">Chart Configuration</h3>
                    <span className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full font-medium">
                        {chartConfigs.length} chart{chartConfigs.length !== 1 ? 's' : ''}
                    </span>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={addChart}
                        disabled={getAvailableFields().length === 0}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Add Chart</span>
                    </button>

                    <button
                        onClick={() => setPreviewMode(!previewMode)}
                        className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md border ${previewMode
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Eye className="h-4 w-4" />
                        <span>{previewMode ? 'Configure' : 'Preview'}</span>
                    </button>

                    {chartConfigs.length > 0 && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
                        >
                            {isExpanded ? <X className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
                        </button>
                    )}
                </div>
            </div>

            {getAvailableFields().length === 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-yellow-800 font-medium">
                        Please select some numeric fields first to create charts
                    </p>
                </div>
            )}

            {/* CHANGED: Always show content when expanded, make it more prominent */}
            {isExpanded && (
                <div className="space-y-6">
                    {previewMode ? (
                        renderPreview()
                    ) : (
                        <>
                            {chartConfigs.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                    <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-xl font-medium text-gray-900 mb-2">No charts configured yet</h3>
                                    <p className="text-gray-500 mb-6">Click "Add Chart" to create your first visualization</p>
                                    <button
                                        onClick={addChart}
                                        disabled={getAvailableFields().length === 0}
                                        className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        <Plus className="h-5 w-5" />
                                        <span>Add Your First Chart</span>
                                    </button>
                                </div>
                            ) : (
                                chartConfigs.map(renderChartConfiguration)
                            )}
                        </>
                    )}
                </div>
            )}

            {!isExpanded && chartConfigs.length > 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">
                        Click the settings icon above to configure your charts
                    </p>
                </div>
            )}
        </div>
    );
};

export default MultiChartBuilder;