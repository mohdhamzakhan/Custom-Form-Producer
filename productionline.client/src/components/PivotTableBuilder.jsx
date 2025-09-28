import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Plus, X, Settings, Table, BarChart3 } from 'lucide-react';

const PivotTableBuilder = ({
    pivotConfigs,
    setPivotConfigs,
    selectedFields,
    fields,
    calculatedFields,
    data
}) => {
    const [expanded, setExpanded] = useState(true);

    const addPivotTable = () => {
        const newPivot = {
            id: Date.now(),
            title: `Pivot Table ${pivotConfigs.length + 1}`,
            rows: [],
            columns: [],
            values: [],
            aggregation: 'sum', // sum, avg, count, min, max
            showTotals: true,
            showGrandTotal: true
        };
        setPivotConfigs([...pivotConfigs, newPivot]);
    };

    const removePivotTable = (id) => {
        setPivotConfigs(pivotConfigs.filter(p => p.id !== id));
    };

    const updatePivotConfig = (id, updates) => {
        setPivotConfigs(pivotConfigs.map(p =>
            p.id === id ? { ...p, ...updates } : p
        ));
    };

    const availableFields = useMemo(() => {
        const regularFields = selectedFields.map(fieldId => {
            const field = fields.find(f => f.id === fieldId);
            return field ? {
                id: fieldId,
                label: field.label,
                type: field.type || 'text'
            } : null;
        }).filter(Boolean);

        const calcFields = calculatedFields.map(cf => ({
            id: `calc_${cf.id}`,
            label: cf.label,
            type: 'number'
        }));

        return [...regularFields, ...calcFields];
    }, [selectedFields, fields, calculatedFields]);

    const generatePivotData = (pivotConfig) => {
        if (!data || !data.length || !pivotConfig.values.length) return null;

        const processedData = data.map((submission, index) => {
            const row = {};

            // Process regular fields and calculated fields
            availableFields.forEach(field => {
                if (field.id.startsWith('calc_')) {
                    const calcFieldId = field.id.replace('calc_', '');
                    const calcField = calculatedFields.find(cf => cf.id == calcFieldId);
                    if (calcField) {
                        row[field.id] = parseFloat(calculateFieldValue(calcField, submission, fields, data, index)) || 0;
                    }
                } else {
                    const originalField = fields.find(f => f.id === field.id);
                    if (originalField) {
                        const baseFieldId = field.id.split(':')[0];
                        const fieldData = submission.submissionData.find(d => d.fieldLabel === baseFieldId);

                        if (fieldData) {
                            try {
                                const parsed = JSON.parse(fieldData.fieldValue);
                                if (Array.isArray(parsed)) {
                                    const columnName = originalField.label.includes('→')
                                        ? originalField.label.split('→').pop().trim()
                                        : originalField.label;
                                    row[field.id] = parsed.reduce((sum, rowData) =>
                                        sum + (parseFloat(rowData[columnName]) || 0), 0
                                    );
                                } else {
                                    row[field.id] = isNaN(parsed) ? parsed : parseFloat(parsed) || 0;
                                }
                            } catch {
                                row[field.id] = isNaN(fieldData.fieldValue) ? fieldData.fieldValue : parseFloat(fieldData.fieldValue) || 0;
                            }
                        } else {
                            row[field.id] = 0;
                        }
                    }
                }
            });

            return row;
        });

        return createPivotTable(processedData, pivotConfig);
    };

    const createPivotTable = (data, config) => {
        const { rows, columns, values, aggregation } = config;

        if (!rows.length && !columns.length) return null;

        const pivotData = {};
        const rowKeys = new Set();
        const colKeys = new Set();

        // Process data to create pivot structure
        data.forEach(record => {
            const rowKey = rows.map(r => record[r] || 'N/A').join(' | ');
            const colKey = columns.map(c => record[c] || 'N/A').join(' | ');

            rowKeys.add(rowKey);
            colKeys.add(colKey);

            if (!pivotData[rowKey]) {
                pivotData[rowKey] = {};
            }
            if (!pivotData[rowKey][colKey]) {
                pivotData[rowKey][colKey] = [];
            }

            values.forEach(valueField => {
                pivotData[rowKey][colKey].push(record[valueField] || 0);
            });
        });

        // Calculate aggregated values
        const aggregatedData = {};
        Object.keys(pivotData).forEach(rowKey => {
            aggregatedData[rowKey] = {};
            Object.keys(pivotData[rowKey]).forEach(colKey => {
                const valueArrays = pivotData[rowKey][colKey];
                aggregatedData[rowKey][colKey] = calculateAggregation(valueArrays, aggregation);
            });
        });

        return {
            data: aggregatedData,
            rowKeys: Array.from(rowKeys),
            colKeys: Array.from(colKeys)
        };
    };

    const calculateAggregation = (values, type) => {
        if (!values.length) return 0;

        switch (type) {
            case 'sum':
                return values.reduce((a, b) => a + b, 0);
            case 'avg':
                return values.reduce((a, b) => a + b, 0) / values.length;
            case 'count':
                return values.length;
            case 'min':
                return Math.min(...values);
            case 'max':
                return Math.max(...values);
            default:
                return values.reduce((a, b) => a + b, 0);
        }
    };

    // Placeholder for calculateFieldValue - you'll need to import this from your main component
    const calculateFieldValue = (calcField, submission, fields, allSubmissions, currentIndex) => {
        // This should match your existing calculateFieldValue function
        // For now, returning a placeholder
        return Math.random() * 100;
    };

    return (
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
            <div
                className="flex items-center justify-between cursor-pointer mb-4"
                onClick={() => setExpanded(!expanded)}
            >
                <h3 className="text-lg font-semibold flex items-center">
                    <Table className="w-5 h-5 mr-2" />
                    Pivot Tables ({pivotConfigs.length})
                    {expanded ? <ChevronDown className="w-4 h-4 ml-2" /> : <ChevronRight className="w-4 h-4 ml-2" />}
                </h3>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        addPivotTable();
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center"
                >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Pivot Table
                </button>
            </div>

            {expanded && (
                <div className="space-y-6">
                    {pivotConfigs.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                            <Table className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No pivot tables configured</p>
                            <p className="text-sm">Click "Add Pivot Table" to create your first pivot table</p>
                        </div>
                    ) : (
                        pivotConfigs.map((pivot, index) => (
                            <PivotTableConfig
                                key={pivot.id}
                                pivot={pivot}
                                index={index}
                                availableFields={availableFields}
                                onUpdate={(updates) => updatePivotConfig(pivot.id, updates)}
                                onRemove={() => removePivotTable(pivot.id)}
                                pivotData={generatePivotData(pivot)}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

const PivotTableConfig = ({ pivot, index, availableFields, onUpdate, onRemove, pivotData }) => {
    const [showPreview, setShowPreview] = useState(false);

    const addField = (type, fieldId) => {
        const currentFields = pivot[type] || [];
        if (!currentFields.includes(fieldId)) {
            onUpdate({ [type]: [...currentFields, fieldId] });
        }
    };

    const removeField = (type, fieldId) => {
        const currentFields = pivot[type] || [];
        onUpdate({ [type]: currentFields.filter(id => id !== fieldId) });
    };

    const getFieldLabel = (fieldId) => {
        const field = availableFields.find(f => f.id === fieldId);
        return field ? field.label : fieldId;
    };

    return (
        <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    <Settings className="w-4 h-4 mr-2 text-gray-500" />
                    <input
                        type="text"
                        value={pivot.title}
                        onChange={(e) => onUpdate({ title: e.target.value })}
                        className="font-medium text-lg border-none outline-none bg-transparent"
                        placeholder="Pivot Table Title"
                    />
                </div>
                <button
                    onClick={onRemove}
                    className="text-red-500 hover:text-red-700"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Rows Configuration */}
                <div>
                    <h4 className="font-medium mb-2 text-blue-600">Rows</h4>
                    <div className="min-h-[100px] border-2 border-dashed border-blue-200 rounded p-3">
                        {pivot.rows.map(fieldId => (
                            <div key={fieldId} className="flex items-center justify-between bg-blue-50 px-2 py-1 rounded mb-1">
                                <span className="text-sm">{getFieldLabel(fieldId)}</span>
                                <button
                                    onClick={() => removeField('rows', fieldId)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        <select
                            onChange={(e) => {
                                if (e.target.value) {
                                    addField('rows', e.target.value);
                                    e.target.value = '';
                                }
                            }}
                            className="w-full mt-2 border rounded px-2 py-1 text-sm"
                        >
                            <option value="">+ Add Row Field</option>
                            {availableFields
                                .filter(f => !pivot.rows.includes(f.id))
                                .map(field => (
                                    <option key={field.id} value={field.id}>
                                        {field.label}
                                    </option>
                                ))
                            }
                        </select>
                    </div>
                </div>

                {/* Columns Configuration */}
                <div>
                    <h4 className="font-medium mb-2 text-green-600">Columns</h4>
                    <div className="min-h-[100px] border-2 border-dashed border-green-200 rounded p-3">
                        {pivot.columns.map(fieldId => (
                            <div key={fieldId} className="flex items-center justify-between bg-green-50 px-2 py-1 rounded mb-1">
                                <span className="text-sm">{getFieldLabel(fieldId)}</span>
                                <button
                                    onClick={() => removeField('columns', fieldId)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        <select
                            onChange={(e) => {
                                if (e.target.value) {
                                    addField('columns', e.target.value);
                                    e.target.value = '';
                                }
                            }}
                            className="w-full mt-2 border rounded px-2 py-1 text-sm"
                        >
                            <option value="">+ Add Column Field</option>
                            {availableFields
                                .filter(f => !pivot.columns.includes(f.id))
                                .map(field => (
                                    <option key={field.id} value={field.id}>
                                        {field.label}
                                    </option>
                                ))
                            }
                        </select>
                    </div>
                </div>

                {/* Values Configuration */}
                <div>
                    <h4 className="font-medium mb-2 text-purple-600">Values</h4>
                    <div className="min-h-[100px] border-2 border-dashed border-purple-200 rounded p-3">
                        {pivot.values.map(fieldId => (
                            <div key={fieldId} className="flex items-center justify-between bg-purple-50 px-2 py-1 rounded mb-1">
                                <span className="text-sm">{getFieldLabel(fieldId)}</span>
                                <button
                                    onClick={() => removeField('values', fieldId)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        <select
                            onChange={(e) => {
                                if (e.target.value) {
                                    addField('values', e.target.value);
                                    e.target.value = '';
                                }
                            }}
                            className="w-full mt-2 border rounded px-2 py-1 text-sm"
                        >
                            <option value="">+ Add Value Field</option>
                            {availableFields
                                .filter(f => f.type === 'number' || f.id.startsWith('calc_'))
                                .filter(f => !pivot.values.includes(f.id))
                                .map(field => (
                                    <option key={field.id} value={field.id}>
                                        {field.label}
                                    </option>
                                ))
                            }
                        </select>
                    </div>
                </div>
            </div>

            {/* Configuration Options */}
            <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div>
                        <label className="text-sm font-medium mr-2">Aggregation:</label>
                        <select
                            value={pivot.aggregation}
                            onChange={(e) => onUpdate({ aggregation: e.target.value })}
                            className="border rounded px-2 py-1 text-sm"
                        >
                            <option value="sum">Sum</option>
                            <option value="avg">Average</option>
                            <option value="count">Count</option>
                            <option value="min">Minimum</option>
                            <option value="max">Maximum</option>
                        </select>
                    </div>
                    <label className="flex items-center text-sm">
                        <input
                            type="checkbox"
                            checked={pivot.showTotals}
                            onChange={(e) => onUpdate({ showTotals: e.target.checked })}
                            className="mr-1"
                        />
                        Show Totals
                    </label>
                    <label className="flex items-center text-sm">
                        <input
                            type="checkbox"
                            checked={pivot.showGrandTotal}
                            onChange={(e) => onUpdate({ showGrandTotal: e.target.checked })}
                            className="mr-1"
                        />
                        Grand Total
                    </label>
                </div>
                <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center"
                >
                    <BarChart3 className="w-3 h-3 mr-1" />
                    {showPreview ? 'Hide' : 'Show'} Preview
                </button>
            </div>

            {/* Preview */}
            {showPreview && pivotData && (
                <div className="mt-4 border-t pt-4">
                    <PivotTablePreview pivotData={pivotData} config={pivot} />
                </div>
            )}
        </div>
    );
};

const PivotTablePreview = ({ pivotData, config }) => {
    const { data, rowKeys, colKeys } = pivotData;

    if (!data || !rowKeys.length || !colKeys.length) {
        return (
            <div className="text-center py-4 text-gray-500">
                <p>Configure rows, columns, and values to see preview</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                    <tr>
                        <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium">
                            {config.rows.length > 0 ? 'Rows' : ''}
                        </th>
                        {colKeys.map(colKey => (
                            <th key={colKey} className="border border-gray-300 bg-gray-50 px-3 py-2 text-center font-medium">
                                {colKey}
                            </th>
                        ))}
                        {config.showTotals && (
                            <th className="border border-gray-300 bg-blue-50 px-3 py-2 text-center font-medium">
                                Total
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {rowKeys.map(rowKey => (
                        <tr key={rowKey}>
                            <td className="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">
                                {rowKey}
                            </td>
                            {colKeys.map(colKey => (
                                <td key={colKey} className="border border-gray-300 px-3 py-2 text-right">
                                    {data[rowKey] && data[rowKey][colKey] !== undefined
                                        ? typeof data[rowKey][colKey] === 'number'
                                            ? data[rowKey][colKey].toFixed(2)
                                            : data[rowKey][colKey]
                                        : '—'
                                    }
                                </td>
                            ))}
                            {config.showTotals && (
                                <td className="border border-gray-300 bg-blue-50 px-3 py-2 text-right font-medium">
                                    {Object.values(data[rowKey] || {})
                                        .reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0)
                                        .toFixed(2)
                                    }
                                </td>
                            )}
                        </tr>
                    ))}
                    {config.showGrandTotal && (
                        <tr className="bg-blue-50 font-bold">
                            <td className="border border-gray-300 px-3 py-2">Grand Total</td>
                            {colKeys.map(colKey => (
                                <td key={colKey} className="border border-gray-300 px-3 py-2 text-right">
                                    {rowKeys.reduce((sum, rowKey) => {
                                        const value = data[rowKey] && data[rowKey][colKey];
                                        return sum + (typeof value === 'number' ? value : 0);
                                    }, 0).toFixed(2)}
                                </td>
                            ))}
                            {config.showTotals && (
                                <td className="border border-gray-300 px-3 py-2 text-right">
                                    {Object.values(data).reduce((grandTotal, row) =>
                                        grandTotal + Object.values(row).reduce((rowTotal, val) =>
                                            rowTotal + (typeof val === 'number' ? val : 0), 0
                                        ), 0
                                    ).toFixed(2)}
                                </td>
                            )}
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default PivotTableBuilder;