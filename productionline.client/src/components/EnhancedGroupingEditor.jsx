import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Layers, Plus, X, GripVertical } from 'lucide-react';

const EnhancedGroupingEditor = ({
    groupingConfig = [],
    setGroupingConfig,
    selectedFields = [],
    fields = [],
    calculatedFields = []
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const availableFields = useMemo(() => {
        return selectedFields.map(fieldId => {
            const field = fields.find(f => f.id === fieldId);
            return {
                id: fieldId,
                label: field?.label || fieldId,
                type: field?.type || 'text'
            };
        });
    }, [selectedFields, fields]);

    const AGGREGATE_FUNCTIONS = [
        { value: 'SUM', label: 'Sum' },
        { value: 'AVG', label: 'Average' },
        { value: 'COUNT', label: 'Count' },
        { value: 'MIN', label: 'Minimum' },
        { value: 'MAX', label: 'Maximum' },
        { value: 'FIRST', label: 'First Value' },
        { value: 'LAST', label: 'Last Value' },
        { value: 'CONCAT', label: 'Concatenate' }
    ];

    const addGroupingLevel = () => {
        setGroupingConfig([...groupingConfig, {
            id: Date.now(),
            fieldId: '',
            order: groupingConfig.length,
            sortDirection: 'ASC',
            showSubtotals: true,
            aggregations: []
        }]);
    };

    const removeGroupingLevel = (id) => {
        setGroupingConfig(groupingConfig.filter(g => g.id !== id));
    };

    const updateGroupingLevel = (id, updates) => {
        setGroupingConfig(groupingConfig.map(g =>
            g.id === id ? { ...g, ...updates } : g
        ));
    };

    const addAggregation = (groupId) => {
        const group = groupingConfig.find(g => g.id === groupId);
        if (!group) return;

        const newAggregations = [...(group.aggregations || []), {
            id: Date.now(),
            fieldId: '',
            function: 'SUM',
            label: ''
        }];

        updateGroupingLevel(groupId, { aggregations: newAggregations });
    };

    const updateAggregation = (groupId, aggId, updates) => {
        const group = groupingConfig.find(g => g.id === groupId);
        if (!group) return;

        const newAggregations = group.aggregations.map(agg =>
            agg.id === aggId ? { ...agg, ...updates } : agg
        );

        updateGroupingLevel(groupId, { aggregations: newAggregations });
    };

    const removeAggregation = (groupId, aggId) => {
        const group = groupingConfig.find(g => g.id === groupId);
        if (!group) return;

        const newAggregations = group.aggregations.filter(agg => agg.id !== aggId);
        updateGroupingLevel(groupId, { aggregations: newAggregations });
    };

    const moveGroupLevel = (index, direction) => {
        const newConfig = [...groupingConfig];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newConfig.length) return;

        [newConfig[index], newConfig[targetIndex]] = [newConfig[targetIndex], newConfig[index]];

        // Update order
        newConfig.forEach((group, idx) => {
            group.order = idx;
        });

        setGroupingConfig(newConfig);
    };

    return (
        <div className="mb-6 bg-white border rounded-lg shadow-sm">
            <div
                className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50 border-b"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h3 className="font-semibold flex items-center">
                    <Layers className="w-5 h-5 mr-2 text-purple-500" />
                    Grouping Configuration ({groupingConfig.length} levels)
                </h3>
                <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-3">
                        Configure multi-level grouping with aggregations
                    </span>
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </div>
            </div>

            {isExpanded && (
                <div className="p-6">
                    {/* Info Panel */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-400 rounded-r-lg">
                        <h4 className="font-semibold text-purple-800 mb-2">📊 How Grouping Works</h4>
                        <ul className="text-sm text-purple-700 space-y-1">
                            <li>• <strong>Multiple Levels:</strong> Create hierarchical grouping (e.g., Department → Team → Employee)</li>
                            <li>• <strong>Row-Level Calculations:</strong> Regular calculated fields work on individual rows within groups</li>
                            <li>• <strong>Group-Level Aggregations:</strong> Add subtotals, averages, etc. for each group</li>
                            <li>• <strong>Drag to Reorder:</strong> Change grouping hierarchy by dragging levels up/down</li>
                        </ul>
                    </div>

                    {/* Grouping Levels */}
                    {groupingConfig.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                            <Layers className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500 italic mb-4">No grouping configured</p>
                            <p className="text-sm text-gray-600 mb-6">
                                Add grouping levels to organize your data hierarchically
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4 mb-6">
                            {groupingConfig.map((group, index) => (
                                <div
                                    key={group.id}
                                    className="border-2 border-purple-200 rounded-lg p-5 bg-purple-50"
                                >
                                    {/* Group Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col gap-1">
                                                <button
                                                    onClick={() => moveGroupLevel(index, 'up')}
                                                    disabled={index === 0}
                                                    className={`p-1 rounded ${index === 0
                                                            ? 'text-gray-300 cursor-not-allowed'
                                                            : 'text-purple-600 hover:bg-purple-200'
                                                        }`}
                                                >
                                                    <ChevronRight className="w-4 h-4 transform -rotate-90" />
                                                </button>
                                                <button
                                                    onClick={() => moveGroupLevel(index, 'down')}
                                                    disabled={index === groupingConfig.length - 1}
                                                    className={`p-1 rounded ${index === groupingConfig.length - 1
                                                            ? 'text-gray-300 cursor-not-allowed'
                                                            : 'text-purple-600 hover:bg-purple-200'
                                                        }`}
                                                >
                                                    <ChevronRight className="w-4 h-4 transform rotate-90" />
                                                </button>
                                            </div>
                                            <div className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                                                {index + 1}
                                            </div>
                                            <h4 className="font-semibold text-purple-900">
                                                Level {index + 1}: {group.fieldId ? fields.find(f => f.id === group.fieldId)?.label : 'Not configured'}
                                            </h4>
                                        </div>
                                        <button
                                            onClick={() => removeGroupingLevel(group.id)}
                                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded flex items-center"
                                        >
                                            <X className="w-4 h-4 mr-1" />
                                            Remove
                                        </button>
                                    </div>

                                    {/* Group Configuration */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 bg-white p-4 rounded-lg">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Group By Field *</label>
                                            <select
                                                value={group.fieldId || ''}
                                                onChange={(e) => updateGroupingLevel(group.id, { fieldId: e.target.value })}
                                                className="w-full border p-2 rounded focus:ring-2 focus:ring-purple-500"
                                            >
                                                <option value="">Select Field</option>
                                                {availableFields.map(field => (
                                                    <option key={field.id} value={field.id}>
                                                        {field.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-2">Sort Direction</label>
                                            <select
                                                value={group.sortDirection || 'ASC'}
                                                onChange={(e) => updateGroupingLevel(group.id, { sortDirection: e.target.value })}
                                                className="w-full border p-2 rounded focus:ring-2 focus:ring-purple-500"
                                            >
                                                <option value="ASC">Ascending (A-Z, 0-9)</option>
                                                <option value="DESC">Descending (Z-A, 9-0)</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center">
                                            <label className="flex items-center text-sm font-medium">
                                                <input
                                                    type="checkbox"
                                                    checked={group.showSubtotals ?? true}
                                                    onChange={(e) => updateGroupingLevel(group.id, { showSubtotals: e.target.checked })}
                                                    className="mr-2"
                                                />
                                                Show Group Subtotals
                                            </label>
                                        </div>
                                    </div>

                                    {/* Aggregations */}
                                    {group.showSubtotals && (
                                        <div className="bg-white p-4 rounded-lg border-2 border-dashed border-purple-300">
                                            <div className="flex items-center justify-between mb-3">
                                                <h5 className="font-medium text-purple-800">Group Aggregations</h5>
                                                <button
                                                    onClick={() => addAggregation(group.id)}
                                                    className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm flex items-center"
                                                >
                                                    <Plus className="w-4 h-4 mr-1" />
                                                    Add Aggregation
                                                </button>
                                            </div>

                                            {(!group.aggregations || group.aggregations.length === 0) ? (
                                                <p className="text-gray-500 italic text-sm">
                                                    No aggregations added. Click "Add Aggregation" to create group subtotals.
                                                </p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {group.aggregations.map(agg => (
                                                        <div key={agg.id} className="flex gap-3 items-center p-3 bg-purple-50 rounded border border-purple-200">
                                                            <select
                                                                value={agg.fieldId || ''}
                                                                onChange={(e) => updateAggregation(group.id, agg.id, { fieldId: e.target.value })}
                                                                className="flex-1 border p-2 rounded text-sm"
                                                            >
                                                                <option value="">Select Field</option>
                                                                {availableFields.map(field => (
                                                                    <option key={field.id} value={field.id}>
                                                                        {field.label}
                                                                    </option>
                                                                ))}
                                                                <optgroup label="Calculated Fields">
                                                                    {calculatedFields.map(cf => (
                                                                        <option key={`calc_${cf.id}`} value={`calc_${cf.id}`}>
                                                                            {cf.label} (Calculated)
                                                                        </option>
                                                                    ))}
                                                                </optgroup>
                                                            </select>

                                                            <select
                                                                value={agg.function || 'SUM'}
                                                                onChange={(e) => updateAggregation(group.id, agg.id, { function: e.target.value })}
                                                                className="border p-2 rounded text-sm"
                                                            >
                                                                {AGGREGATE_FUNCTIONS.map(func => (
                                                                    <option key={func.value} value={func.value}>
                                                                        {func.label}
                                                                    </option>
                                                                ))}
                                                            </select>

                                                            <input
                                                                type="text"
                                                                placeholder="Label (optional)"
                                                                value={agg.label || ''}
                                                                onChange={(e) => updateAggregation(group.id, agg.id, { label: e.target.value })}
                                                                className="flex-1 border p-2 rounded text-sm"
                                                            />

                                                            <button
                                                                onClick={() => removeAggregation(group.id, agg.id)}
                                                                className="bg-red-500 hover:bg-red-600 text-white px-2 py-2 rounded"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add Grouping Level Button */}
                    <button
                        onClick={addGroupingLevel}
                        className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-6 py-4 rounded-lg flex items-center justify-center font-medium transition-all transform hover:scale-105"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add Grouping Level
                    </button>

                    {/* Example Preview */}
                    {groupingConfig.length > 0 && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                            <h5 className="font-medium mb-3">📋 Grouping Hierarchy Preview</h5>
                            <div className="space-y-2">
                                {groupingConfig.map((group, index) => {
                                    const field = fields.find(f => f.id === group.fieldId);
                                    return (
                                        <div key={group.id} className="flex items-center" style={{ marginLeft: `${index * 20}px` }}>
                                            <ChevronRight className="w-4 h-4 text-purple-500 mr-2" />
                                            <span className="font-medium">Level {index + 1}:</span>
                                            <span className="ml-2 text-purple-600">
                                                {field?.label || 'Not configured'}
                                            </span>
                                            {group.aggregations?.length > 0 && (
                                                <span className="ml-2 text-sm text-gray-500">
                                                    ({group.aggregations.length} aggregation{group.aggregations.length !== 1 ? 's' : ''})
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Preview Component showing how grouped data would look
const GroupedDataPreview = ({ data, groupingConfig, fields, calculatedFields }) => {
    const groupedData = useMemo(() => {
        if (!groupingConfig || groupingConfig.length === 0) return data;

        // Implementation of grouping logic would go here
        // This is a simplified version
        return data;
    }, [data, groupingConfig]);

    return (
        <div className="border rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-3">
                <h4 className="font-semibold">Grouped Data Preview</h4>
            </div>
            <div className="p-4">
                {/* Preview implementation */}
                <p className="text-gray-500 italic">
                    Preview will show hierarchical grouped data with subtotals
                </p>
            </div>
        </div>
    );
};

export { EnhancedGroupingEditor, GroupedDataPreview };