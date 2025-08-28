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
    data = []
}) => {
    // CHANGED: Start expanded by default to make configuration visible
    const [isExpanded, setIsExpanded] = useState(true);
    const [previewMode, setPreviewMode] = useState(false);

    const addChart = () => {
        const availableFields = getAvailableFields();
        const newChart = {
            id: Date.now(),
            title: `Chart ${chartConfigs.length + 1}`,
            type: "bar",
            xField: availableFields[0]?.id || "",
            metrics: availableFields.slice(0, 2).map(f => f.id),
            position: { row: 0, col: 0, width: 12, height: 6 },
            comboConfig: { barMetrics: [], lineMetrics: [] }
        };
        setChartConfigs([...chartConfigs, newChart]);
        // CHANGED: Auto-expand and show configuration when adding a chart
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

    const removeChart = (id) => {
        setChartConfigs(prev => prev.filter(chart => chart.id !== id));
    };

    const getAvailableFields = () => {
        // Separate fields for X-axis (all types) and metrics (numeric only)
        const baseFields = selectedFields.map(fieldId => {
            const field = fields.find(f => f.id === fieldId);
            return {
                id: fieldId,
                label: field?.label || fieldId,
                type: field?.type || 'text',
                isNumeric: ['number', 'decimal', 'integer', 'currency', 'percentage'].includes(field?.type)
            };
        }).filter(field => field.type !== 'grid');

        const calcFields = calculatedFields
            .filter(cf => cf.label && cf.formula)
            .map(cf => ({
                id: `calc_${cf.id}`,
                label: `${cf.label} (Calculated)`,
                type: 'calculated',
                calculationType: cf.calculationType,
                isNumeric: true
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

        // Separate fields for different purposes
        const xAxisFields = availableFields;
        const metricFields = availableFields.filter(f => f.isNumeric);

        const regularXFields = xAxisFields.filter(f => f.type !== 'calculated');
        const calculatedXFields = xAxisFields.filter(f => f.type === 'calculated');
        const regularMetricFields = metricFields.filter(f => f.type !== 'calculated');
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
                            onChange={(e) => updateChart(chart.id, { type: e.target.value })}
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
                            {regularXFields.length > 0 && (
                                <optgroup label="📋 Form Fields">
                                    {regularXFields.map(field => (
                                        <option key={field.id} value={field.label}>
                                            {field.label}
                                        </option>
                                    ))}
                                </optgroup>
                            )}

                            {calculatedMetricFields.length > 0 && (
                                <optgroup label="📊 Calculated Fields">
                                    {calculatedMetricFields.map(field => (
                                        <option key={field.id} value={field.id}>
                                            {field.label}
                                        </option>
                                    ))}
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
                        <ReportCharts
                            data={data}
                            metrics={chart.metrics}
                            type={chart.type}
                            xField={chart.xField}
                            title={chart.title}
                            comboConfig={chart.comboConfig}
                            fields={fields}
                            calculatedFields={calculatedFields}
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
                            fields={fields}
                            calculatedFields={calculatedFields}
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