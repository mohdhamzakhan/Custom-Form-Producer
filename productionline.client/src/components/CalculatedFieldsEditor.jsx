import React, { useState } from "react";
import { ChevronRight, ChevronDown, BarChart3, Plus, X, Info } from "lucide-react";

// Enhanced Calculated Fields Editor with row/column support
const CalculatedFieldsEditor = ({ calculatedFields, setCalculatedFields, selectedFields, fields }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const CALCULATION_TYPES = {
        aggregate: {
            label: "📊 Aggregate Functions",
            description: "Calculate across multiple rows (SUM, AVG, MIN, MAX, COUNT)",
            functions: ["SUM", "AVG", "MIN", "MAX", "COUNT"]
        },
        rowwise: {
            label: "➡️ Row-wise Calculations",
            description: "Calculate across columns in the same row",
            functions: ["ADD", "SUBTRACT", "MULTIPLY", "DIVIDE", "PERCENTAGE"]
        },
        columnwise: {
            label: "⬇️ Column-wise Calculations",
            description: "Calculate down a column with conditions",
            functions: ["RUNNING_TOTAL", "RANK", "PERCENT_OF_TOTAL", "CUMULATIVE_AVG"]
        }
    };

    const FORMULA_EXAMPLES = {
        // Aggregate examples
        "SUM": "SUM(Quantity)",
        "AVG": "AVG(Price)",
        "MIN": "MIN(Date)",
        "MAX": "MAX(Amount)",
        "COUNT": "COUNT(Items)",

        // Row-wise examples
        "ADD": "ADD(Column1, Column2, Column3)",
        "SUBTRACT": "SUBTRACT(Revenue, Cost)",
        "MULTIPLY": "MULTIPLY(Quantity, Price)",
        "DIVIDE": "DIVIDE(Total, Count)",
        "PERCENTAGE": "PERCENTAGE(Value, Total)",

        // Column-wise examples
        "RUNNING_TOTAL": "RUNNING_TOTAL(Amount)",
        "RANK": "RANK(Score, DESC)",
        "PERCENT_OF_TOTAL": "PERCENT_OF_TOTAL(Value)",
        "CUMULATIVE_AVG": "CUMULATIVE_AVG(Sales)"
    };

    const addCalculatedField = () => {
        setCalculatedFields([...calculatedFields, {
            id: Date.now(),
            label: "",
            calculationType: "aggregate",
            formula: "",
            description: "",
            format: "decimal",
            precision: 2,
            functionType: "",
            sourceFields: []
        }]);
    };

    const updateCalculatedField = (id, key, value) => {
        setCalculatedFields(prev => prev.map(field =>
            field.id === id ? { ...field, [key]: value } : field
        ));
    };

    const removeCalculatedField = (id) => {
        setCalculatedFields(prev => prev.filter(field => field.id !== id));
    };

    const getAvailableFields = () => {
        return selectedFields.map(fieldId => {
            const field = fields.find(f => f.id === fieldId);
            return {
                id: fieldId,
                label: field?.label || fieldId,
                type: field?.type || 'text'
            };
        });
    };

    const renderFormulaBuilder = (field) => {
        const availableFields = getAvailableFields();

        return (
            <div className="mt-3 p-3 border rounded bg-gray-50">
                <h5 className="font-medium mb-2">Formula Builder</h5>

                {/* Calculation Type Selection */}
                <div className="grid grid-cols-1 gap-3 mb-3">
                    <div>
                        <label className="block text-sm font-medium mb-1">Calculation Type</label>
                        <select
                            value={field.calculationType || "aggregate"}
                            onChange={(e) => {
                                updateCalculatedField(field.id, "calculationType", e.target.value);
                                updateCalculatedField(field.id, "functionType", "");
                                updateCalculatedField(field.id, "formula", "");
                            }}
                            className="w-full border p-2 rounded"
                        >
                            {Object.entries(CALCULATION_TYPES).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            {CALCULATION_TYPES[field.calculationType || "aggregate"]?.description}
                        </p>
                    </div>
                </div>

                {/* Function Type Selection */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                        <label className="block text-sm font-medium mb-1">Function</label>
                        <select
                            value={field.functionType || ""}
                            onChange={(e) => {
                                const selectedFunction = e.target.value;
                                updateCalculatedField(field.id, "functionType", selectedFunction);

                                // Auto-populate formula example
                                if (FORMULA_EXAMPLES[selectedFunction]) {
                                    updateCalculatedField(field.id, "formula", FORMULA_EXAMPLES[selectedFunction]);
                                }
                            }}
                            className="w-full border p-2 rounded"
                        >
                            <option value="">Select Function</option>
                            {CALCULATION_TYPES[field.calculationType || "aggregate"]?.functions.map(func => (
                                <option key={func} value={func}>{func}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Source Fields</label>
                        <select
                            multiple
                            value={field.sourceFields || []}
                            onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                                updateCalculatedField(field.id, "sourceFields", selected);
                            }}
                            className="w-full border p-2 rounded h-20 text-sm"
                        >
                            {availableFields.map(f => (
                                <option key={f.id} value={f.id}>{f.label}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Hold Ctrl to select multiple</p>
                    </div>
                </div>

                {/* Formula Input with Examples */}
                <div className="mb-3">
                    <label className="block text-sm font-medium mb-1">Formula</label>
                    <textarea
                        placeholder="Enter your formula..."
                        value={field.formula}
                        onChange={(e) => updateCalculatedField(field.id, "formula", e.target.value)}
                        className="w-full border p-2 rounded"
                        rows="3"
                    />

                    {field.functionType && FORMULA_EXAMPLES[field.functionType] && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                            <div className="flex items-center text-sm text-blue-800">
                                <Info className="w-4 h-4 mr-1" />
                                <span className="font-medium">Example: </span>
                                <code className="ml-2 bg-blue-100 px-2 py-1 rounded">
                                    {FORMULA_EXAMPLES[field.functionType]}
                                </code>
                            </div>
                        </div>
                    )}
                </div>

                {/* Additional Options for specific calculation types */}
                {field.calculationType === "columnwise" && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">Sort Order</label>
                            <select
                                value={field.sortOrder || "ASC"}
                                onChange={(e) => updateCalculatedField(field.id, "sortOrder", e.target.value)}
                                className="w-full border p-2 rounded"
                            >
                                <option value="ASC">Ascending</option>
                                <option value="DESC">Descending</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Group By Field</label>
                            <select
                                value={field.groupByField || ""}
                                onChange={(e) => updateCalculatedField(field.id, "groupByField", e.target.value)}
                                className="w-full border p-2 rounded"
                            >
                                <option value="">No Grouping</option>
                                {availableFields.map(f => (
                                    <option key={f.id} value={f.id}>{f.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="mb-6 bg-white border rounded">
            <div
                className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h3 className="font-semibold flex items-center">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Calculated Fields ({calculatedFields.length})
                </h3>
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>

            {isExpanded && (
                <div className="p-4 border-t">
                    {calculatedFields.length === 0 && (
                        <div className="text-center py-8">
                            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                            <p className="text-gray-500 italic mb-4">No calculated fields added yet</p>
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                                <h4 className="font-medium text-blue-800 mb-2">Calculation Types Available:</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    {Object.entries(CALCULATION_TYPES).map(([key, config]) => (
                                        <div key={key} className="text-center">
                                            <div className="font-medium text-blue-700">{config.label}</div>
                                            <div className="text-blue-600 text-xs mt-1">{config.description}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {calculatedFields.map(field => (
                        <div key={field.id} className="mb-6 p-4 border rounded bg-gray-50">
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <input
                                    type="text"
                                    placeholder="Field Label"
                                    value={field.label}
                                    onChange={(e) => updateCalculatedField(field.id, "label", e.target.value)}
                                    className="border p-2 rounded"
                                />
                                <select
                                    value={field.format}
                                    onChange={(e) => updateCalculatedField(field.id, "format", e.target.value)}
                                    className="border p-2 rounded"
                                >
                                    <option value="decimal">Decimal</option>
                                    <option value="currency">Currency</option>
                                    <option value="percentage">Percentage</option>
                                    <option value="integer">Integer</option>
                                    <option value="text">Text</option>
                                </select>
                            </div>

                            {renderFormulaBuilder(field)}

                            <div className="flex justify-between items-center mt-3">
                                <input
                                    type="text"
                                    placeholder="Description (optional)"
                                    value={field.description}
                                    onChange={(e) => updateCalculatedField(field.id, "description", e.target.value)}
                                    className="border p-2 rounded flex-1 mr-2"
                                />
                                <button
                                    onClick={() => removeCalculatedField(field.id)}
                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded"
                                    title="Remove calculated field"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={addCalculatedField}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded flex items-center justify-center"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Calculated Field
                    </button>
                </div>
            )}
        </div>
    );
};

export default CalculatedFieldsEditor;