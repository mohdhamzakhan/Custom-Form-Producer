import React, { useState } from "react";
import { Plus, X, BarChart3, Settings, Eye } from "lucide-react";
import { CHART_TYPES } from "./ReportCharts";
import ReportCharts from "./ReportCharts";

const MultiChartBuilder = ({
    chartConfigs,
    setChartConfigs,
    selectedFields,
    fields,
    calculatedFields,
    data = [] // Add data prop for chart rendering
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);

    const addChart = () => {
        const availableFields = getAvailableFields();
        const newChart = {
            id: Date.now(),
            title: `Chart ${chartConfigs.length + 1}`,
            type: "bar",
            xField: availableFields[0]?.id || "",
            metrics: availableFields.slice(0, 2).map(f => f.id), // Pre-select first 2 fields
            position: { row: 0, col: 0, width: 12, height: 6 },
            comboConfig: { barMetrics: [], lineMetrics: [] }
        };
        setChartConfigs([...chartConfigs, newChart]);
    };

    const updateChart = (id, updates) => {
        setChartConfigs(prev =>
            prev.map(chart =>
                chart.id === id ? { ...chart, ...updates } : chart
            )
        );
    };

    const removeChart = (id) => {
        setChartConfigs(prev => prev.filter(chart => chart.id !== id));
    };

    const getAvailableFields = () => {
        const baseFields = selectedFields.map(fieldId => {
            const field = fields.find(f => f.id === fieldId);
            return {
                id: fieldId,
                label: field?.label || fieldId,
                type: field?.type || 'text'
            };
        }).filter(field => field.type !== 'grid'); // Exclude grid fields

        const calcFields = calculatedFields.map(cf => ({
            id: `calc_${cf.id}`,
            label: cf.label,
            type: 'calculated'
        }));

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

        return null;
    };

    const renderChartConfiguration = (chart) => {
        const chartType = CHART_TYPES[chart.type];
        const availableFields = getAvailableFields();
        const validation = validateChart(chart);

        return (
            <div key={chart.id} className="bg-white border rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                    <input
                        type="text"
                        value={chart.title}
                        onChange={(e) => updateChart(chart.id, { title: e.target.value })}
                        className="text-lg font-medium bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2"
                        placeholder="Chart Title"
                    />
                    <button
                        onClick={() => removeChart(chart.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {validation && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                        <p className="text-red-700 text-sm">{validation}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Chart Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Chart Type
                        </label>
                        <select
                            value={chart.type}
                            onChange={(e) => updateChart(chart.id, { type: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {Object.entries(CHART_TYPES).map(([key, config]) => (
                                <option key={key} value={key}>
                                    {config.label}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">{chartType?.description}</p>
                    </div>

                    {/* X-Axis Field */}
                    {chartType?.requiresXAxis && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                X-Axis Field
                            </label>
                            <select
                                value={chart.xField}
                                onChange={(e) => updateChart(chart.id, { xField: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select X-Axis Field</option>
                                {availableFields.map(field => (
                                    <option key={field.id} value={field.id}>
                                        {field.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Metrics */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Metrics
                        </label>
                        <select
                            multiple
                            value={chart.metrics}
                            onChange={(e) => {
                                const selectedMetrics = Array.from(e.target.selectedOptions, option => option.value);
                                updateChart(chart.id, { metrics: selectedMetrics });
                            }}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            size={Math.min(availableFields.length, 4)}
                        >
                            {availableFields.map(field => (
                                <option key={field.id} value={field.id}>
                                    {field.label}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            {chartType?.allowsMultipleMetrics ? "Hold Ctrl/Cmd to select multiple" : "Select one metric"}
                        </p>
                    </div>
                </div>

                {/* Combo Chart Configuration */}
                {chart.type === 'combo' && (
                    <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Combo Chart Configuration</h4>
                        <p className="text-xs text-gray-500 mb-3">Select which metrics show as bars vs lines in the combo chart</p>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bar Metrics</label>
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
                                    size={3}
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
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Line Metrics</label>
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
                                    size={3}
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
                            </div>
                        </div>
                    </div>
                )}

                {/* Chart Preview */}
                {previewMode && !validation && (
                    <div className="border-t pt-4">
                        <ReportCharts
                            data={data}
                            metrics={chart.metrics}
                            type={chart.type}
                            xField={chart.xField}
                            title={chart.title}
                            comboConfig={chart.comboConfig}
                        />
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
                        />
                    );
                })}
            </div>
        );
    };

    return (
        <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-medium text-gray-900">Charts</h3>
                    <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                        {chartConfigs.length}
                    </span>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={addChart}
                        disabled={getAvailableFields().length === 0}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Add Chart</span>
                    </button>

                    <button
                        onClick={() => setPreviewMode(!previewMode)}
                        className={`flex items-center space-x-1 px-3 py-1.5 text-sm rounded-md border ${previewMode
                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Eye className="h-4 w-4" />
                        <span>{previewMode ? 'Configure' : 'Preview'}</span>
                    </button>

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1.5 text-gray-500 hover:text-gray-700"
                    >
                        {isExpanded ? <X className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {getAvailableFields().length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                    <p className="text-yellow-700 text-sm">
                        Please select some fields first to create charts
                    </p>
                </div>
            )}

            {isExpanded && (
                <div className="space-y-4">
                    {previewMode ? (
                        renderPreview()
                    ) : (
                        <>
                            {chartConfigs.length === 0 ? (
                                <div className="text-center py-8">
                                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No charts configured yet</h3>
                                    <p className="text-gray-500 mb-4">Click "Add Chart" to create your first visualization</p>
                                </div>
                            ) : (
                                chartConfigs.map(renderChartConfiguration)
                            )}
                        </>
                    )}
                </div>
            )}

            {!isExpanded && chartConfigs.length > 0 && (
                <div className="text-center py-4">
                    <p className="text-gray-500 text-sm">
                        Click "Configure" to set up your charts or "Preview" to see the layout
                    </p>
                </div>
            )}
        </div>
    );
};

export default MultiChartBuilder;
