import React, { useState } from "react";
import { ChevronRight, ChevronDown, BarChart3, Plus, X, Info, Calculator, HelpCircle, Database, Rows, Columns } from "lucide-react";

// Enhanced Calculated Fields Editor with comprehensive formula support

const EnhancedCalculatedFieldsEditor = ({
    calculatedFields = [],
    setCalculatedFields,
    selectedFields = [],
    fields = []
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showFormulaHelper, setShowFormulaHelper] = useState({});

    const CALCULATION_TYPES = {
        aggregate: {
            label: "📊 Aggregate Functions",
            description: "Calculate across multiple rows (SUM, AVG, MIN, MAX, COUNT)",
            icon: <Database className="w-4 h-4" />,
            functions: ["SUM", "AVG", "MIN", "MAX", "COUNT", "COUNT_DISTINCT"]
        },
        rowwise: {
            label: "➡️ Row-wise Calculations",
            description: "Calculate across columns in the same row",
            icon: <Rows className="w-4 h-4" />,
            functions: ["ADD", "SUBTRACT", "MULTIPLY", "DIVIDE", "PERCENTAGE", "CONCATENATE"]
        },
        columnwise: {
            label: "⬇️ Column-wise Calculations",
            description: "Calculate down a column with conditions",
            icon: <Columns className="w-4 h-4" />,
            functions: ["RUNNING_TOTAL", "RANK", "PERCENT_OF_TOTAL", "CUMULATIVE_AVG", "MOVING_AVG", "DIFFERENCE"]
        },
        grouping: {
            label: "🏷️ Grouping & Efficiency",
            description: "Group data and calculate efficiency metrics",
            icon: <BarChart3 className="w-4 h-4" />,
            functions: ["GROUP_SUM", "GROUP_AVG", "GROUP_COUNT", "EFFICIENCY", "RATIO", "GROUP_MIN", "GROUP_MAX"]
        }
    };

    const FORMULA_EXAMPLES = {
        // Aggregate examples
        "SUM": {
            formula: "SUM(Quantity)",
            description: "Sum all values in the Quantity column",
            example: "SUM(Order Amount) → 15000"
        },
        "AVG": {
            formula: "AVG(Price)",
            description: "Average of all values in the Price column",
            example: "AVG(Score) → 85.5"
        },
        "MIN": {
            formula: "MIN(Date)",
            description: "Find the minimum value in the Date column",
            example: "MIN(Start Date) → 2024-01-01"
        },
        "MAX": {
            formula: "MAX(Amount)",
            description: "Find the maximum value in the Amount column",
            example: "MAX(Sales) → 25000"
        },
        "COUNT": {
            formula: "COUNT(Items)",
            description: "Count non-empty values in the Items column",
            example: "COUNT(Product ID) → 150"
        },
        "COUNT_DISTINCT": {
            formula: "COUNT_DISTINCT(Category)",
            description: "Count unique values in the Category column",
            example: "COUNT_DISTINCT(Customer) → 45"
        },

        // Row-wise examples
        "ADD": {
            formula: "ADD(Column1, Column2, Column3)",
            description: "Add values across columns in the same row",
            example: "ADD(Basic Salary, Allowances, Bonus) → 75000"
        },
        "SUBTRACT": {
            formula: "SUBTRACT(Revenue, Cost)",
            description: "Subtract second column from first column",
            example: "SUBTRACT(Sales, Returns) → 18500"
        },
        "MULTIPLY": {
            formula: "MULTIPLY(Quantity, Price)",
            description: "Multiply values across columns",
            example: "MULTIPLY(Hours, Rate) → 2400"
        },
        "DIVIDE": {
            formula: "DIVIDE(Total, Count)",
            description: "Divide first column by second column",
            example: "DIVIDE(Total Revenue, Total Orders) → 125.50"
        },
        "PERCENTAGE": {
            formula: "PERCENTAGE(Value, Total)",
            description: "Calculate percentage of Value from Total",
            example: "PERCENTAGE(Individual Sales, Team Sales) → 15.5%"
        },
        "CONCATENATE": {
            formula: "CONCATENATE(First Name, \" \", Last Name)",
            description: "Join text values with optional separator",
            example: "CONCATENATE(First Name, Last Name) → 'John Doe'"
        },

        // Column-wise examples
        "RUNNING_TOTAL": {
            formula: "RUNNING_TOTAL(Amount)",
            description: "Calculate cumulative sum down the column",
            example: "RUNNING_TOTAL(Daily Sales) → 100, 250, 420, 680..."
        },
        "RANK": {
            formula: "RANK(Score, DESC)",
            description: "Rank values in descending or ascending order",
            example: "RANK(Performance Score, DESC) → 1, 2, 3..."
        },
        "PERCENT_OF_TOTAL": {
            formula: "PERCENT_OF_TOTAL(Value)",
            description: "Calculate each value as percentage of column total",
            example: "PERCENT_OF_TOTAL(Sales) → 12.5%, 8.3%, 15.2%..."
        },
        "CUMULATIVE_AVG": {
            formula: "CUMULATIVE_AVG(Sales)",
            description: "Calculate running average down the column",
            example: "CUMULATIVE_AVG(Monthly Revenue) → 100, 150, 133, 175..."
        },
        "MOVING_AVG": {
            formula: "MOVING_AVG(Value, 3)",
            description: "Calculate moving average with specified window",
            example: "MOVING_AVG(Stock Price, 5) → 3-period moving average"
        },
        "DIFFERENCE": {
            formula: "DIFFERENCE(Current Value)",
            description: "Calculate difference from previous row",
            example: "DIFFERENCE(Monthly Sales) → 0, 500, -200, 800..."
        },

        // Grouping examples
        "GROUP_SUM": {
            formula: "GROUP_SUM(Amount, Department)",
            description: "Sum Amount grouped by Department, show one row per group",
            example: "GROUP_SUM(Sales, Region) → North: 45000, South: 38000"
        },
        "GROUP_AVG": {
            formula: "GROUP_AVG(Score, Team)",
            description: "Average Score grouped by Team, show one row per group",
            example: "GROUP_AVG(Performance, Department) → HR: 85, IT: 92"
        },
        "GROUP_COUNT": {
            formula: "GROUP_COUNT(Employee ID, Department)",
            description: "Count employees grouped by Department",
            example: "GROUP_COUNT(ID, Location) → Mumbai: 25, Delhi: 18"
        },
        "EFFICIENCY": {
            formula: "EFFICIENCY(\"Output Field\", \"Input Field\", Target)",
            description: "Calculate efficiency as (Output/Input)/Target * 100",
            example: "EFFICIENCY(\"Production Details → Working Hour\", \"Production Details → Man Power\", 8) → 95.5%"
        },
        "RATIO": {
            formula: "RATIO(Numerator, Denominator)",
            description: "Calculate ratio between two grouped values",
            example: "RATIO(Profit, Revenue) → 0.15 (15% profit margin)"
        },
        "GROUP_MIN": {
            formula: "GROUP_MIN(Value, Category)",
            description: "Find minimum value within each group",
            example: "GROUP_MIN(Price, Product Type) → Electronics: 500"
        },
        "GROUP_MAX": {
            formula: "GROUP_MAX(Value, Category)",
            description: "Find maximum value within each group",
            example: "GROUP_MAX(Salary, Department) → Engineering: 95000"
        }
    };

    const addCalculatedField = () => {
        if (!setCalculatedFields) return;

        setCalculatedFields([...(calculatedFields || []), {
            id: Date.now(),
            label: "",
            calculationType: "aggregate",
            formula: "",
            description: "",
            format: "decimal",
            precision: 2,
            functionType: "",
            sourceFields: [],
            groupByField: "",
            sortOrder: "ASC",
            windowSize: 3,
            showOneRowPerGroup: false
        }]);
    };

    const updateCalculatedField = (id, key, value) => {
        if (!setCalculatedFields || !calculatedFields) return;

        setCalculatedFields(prev => (prev || []).map(field =>
            field.id === id ? { ...field, [key]: value } : field
        ));
    };

    const removeCalculatedField = (id) => {
        if (!setCalculatedFields || !calculatedFields) return;

        setCalculatedFields(prev => (prev || []).filter(field => field.id !== id));
    };

    const getAvailableFields = () => {
        if (!selectedFields || !fields) return [];

        return selectedFields.map(fieldId => {
            const field = fields.find(f => f.id === fieldId);
            return {
                id: fieldId,
                label: field?.label || fieldId,
                type: field?.type || 'text'
            };
        });
    };

    const toggleFormulaHelper = (fieldId) => {
        setShowFormulaHelper(prev => ({
            ...prev,
            [fieldId]: !prev[fieldId]
        }));
    };

    const insertFormula = (fieldId, formula) => {
        // Replace placeholder field names with quotes for easier editing
        const formulaWithQuotes = formula
            .replace(/\(([^,)]+)/g, '("$1"')  // First parameter
            .replace(/, ([^,)]+)/g, ', "$1"') // Subsequent parameters
            .replace(/, (\d+)\"/g, ', $1');   // Keep numbers without quotes

        updateCalculatedField(fieldId, "formula", formulaWithQuotes);
        setShowFormulaHelper(prev => ({
            ...prev,
            [fieldId]: false
        }));
    };

    const renderFormulaBuilder = (field) => {
        const availableFields = getAvailableFields();
        const currentFunctions = CALCULATION_TYPES[field.calculationType || "aggregate"]?.functions || [];

        return (
            <div className="mt-3 p-4 border rounded bg-gradient-to-r from-blue-50 to-indigo-50">
                <h5 className="font-medium mb-3 flex items-center">
                    <Calculator className="w-4 h-4 mr-2" />
                    Formula Builder
                </h5>

                {/* Calculation Type Selection */}
                <div className="grid grid-cols-1 gap-3 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Calculation Type</label>
                        <select
                            value={field.calculationType || "aggregate"}
                            onChange={(e) => {
                                updateCalculatedField(field.id, "calculationType", e.target.value);
                                updateCalculatedField(field.id, "functionType", "");
                                updateCalculatedField(field.id, "formula", "");
                            }}
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            {Object.entries(CALCULATION_TYPES).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                            ))}
                        </select>
                        <div className="mt-2 p-3 bg-blue-100 border border-blue-200 rounded flex items-start">
                            {CALCULATION_TYPES[field.calculationType || "aggregate"]?.icon}
                            <p className="text-sm text-blue-800 ml-2">
                                {CALCULATION_TYPES[field.calculationType || "aggregate"]?.description}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Function Type Selection with Examples */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Function</label>
                        <select
                            value={field.functionType || ""}
                            onChange={(e) => {
                                const selectedFunction = e.target.value;
                                updateCalculatedField(field.id, "functionType", selectedFunction);

                                // Auto-populate formula example
                                if (FORMULA_EXAMPLES[selectedFunction]) {
                                    updateCalculatedField(field.id, "formula", FORMULA_EXAMPLES[selectedFunction].formula);
                                }
                            }}
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select Function</option>
                            {currentFunctions.map(func => (
                                <option key={func} value={func}>{func}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Source Fields</label>
                        <select
                            multiple
                            value={field.sourceFields || []}
                            onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                                updateCalculatedField(field.id, "sourceFields", selected);
                            }}
                            className="w-full border border-gray-300 p-3 rounded-lg h-24 text-sm focus:ring-2 focus:ring-blue-500"
                        >
                            {availableFields.map(f => (
                                <option key={f.id} value={f.id}>{f.label}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Hold Ctrl to select multiple</p>
                    </div>
                </div>

                {/* Grouping Options - Show for grouping calculations */}
                {field.calculationType === "grouping" && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <h6 className="font-medium text-yellow-800 mb-2 flex items-center">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Grouping Options
                        </h6>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Group By Field</label>
                                <select
                                    value={field.groupByField || ""}
                                    onChange={(e) => updateCalculatedField(field.id, "groupByField", e.target.value)}
                                    className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select Field</option>
                                    {availableFields.map(f => (
                                        <option key={f.id} value={f.id}>{f.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Sort Groups By</label>
                                <select
                                    value={field.sortOrder || "ASC"}
                                    onChange={(e) => updateCalculatedField(field.id, "sortOrder", e.target.value)}
                                    className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="ASC">Ascending</option>
                                    <option value="DESC">Descending</option>
                                </select>
                            </div>
                            <div className="flex items-center">
                                <label className="flex items-center text-sm">
                                    <input
                                        type="checkbox"
                                        checked={field.showOneRowPerGroup || false}
                                        onChange={(e) => updateCalculatedField(field.id, "showOneRowPerGroup", e.target.checked)}
                                        className="mr-2"
                                    />
                                    Show one row per group
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Column-wise specific options */}
                {field.calculationType === "columnwise" && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                        <h6 className="font-medium text-green-800 mb-2 flex items-center">
                            <Columns className="w-4 h-4 mr-2" />
                            Column-wise Options
                        </h6>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Sort Order</label>
                                <select
                                    value={field.sortOrder || "ASC"}
                                    onChange={(e) => updateCalculatedField(field.id, "sortOrder", e.target.value)}
                                    className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="ASC">Ascending</option>
                                    <option value="DESC">Descending</option>
                                </select>
                            </div>
                            {(field.functionType === "MOVING_AVG") && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Window Size</label>
                                    <input
                                        type="number"
                                        min="2"
                                        max="20"
                                        value={field.windowSize || 3}
                                        onChange={(e) => updateCalculatedField(field.id, "windowSize", parseInt(e.target.value))}
                                        className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Formula Input with Helper */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium">Formula</label>
                        <button
                            type="button"
                            onClick={() => toggleFormulaHelper(field.id)}
                            className="text-blue-500 hover:text-blue-700 flex items-center text-sm"
                        >
                            <HelpCircle className="w-4 h-4 mr-1" />
                            Formula Helper
                        </button>
                    </div>

                    {/* Field Token Buttons - Make it easy to insert field names */}
                    <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-600 mb-2">Available Fields (Click to Insert):</label>
                        <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-gray-50 border rounded">
                            {availableFields.map(f => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => {
                                        const currentFormula = field.formula || "";
                                        const newFormula = currentFormula + (currentFormula ? ", " : "") + `"${f.label}"`;
                                        updateCalculatedField(field.id, "formula", newFormula);
                                    }}
                                    className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs rounded border border-blue-300 transition-colors"
                                    title={`Click to insert: ${f.label}`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Click any field name to automatically insert it into your formula</p>
                    </div>

                    <textarea
                        placeholder="Enter your formula or select a function above..."
                        value={field.formula || ""}
                        onChange={(e) => updateCalculatedField(field.id, "formula", e.target.value)}
                        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows="3"
                    />

                    {/* Formula Helper Panel */}
                    {showFormulaHelper[field.id] && (
                        <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <h6 className="font-medium mb-3">Available Functions</h6>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                                {currentFunctions.map(func => (
                                    <div key={func} className="p-2 bg-white border border-gray-200 rounded hover:bg-blue-50 cursor-pointer"
                                        onClick={() => insertFormula(field.id, FORMULA_EXAMPLES[func]?.formula || func + "()")}>
                                        <div className="font-medium text-sm text-blue-800">{func}</div>
                                        <div className="text-xs text-gray-600 mb-1">
                                            {FORMULA_EXAMPLES[func]?.description}
                                        </div>
                                        <div className="text-xs font-mono bg-gray-100 p-1 rounded">
                                            {FORMULA_EXAMPLES[func]?.example}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Current Function Example */}
                    {field.functionType && FORMULA_EXAMPLES[field.functionType] && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                            <div className="flex items-start text-sm text-blue-800">
                                <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                <div>
                                    <div className="font-medium mb-1">
                                        {field.functionType}: {FORMULA_EXAMPLES[field.functionType].description}
                                    </div>
                                    <div className="font-mono bg-blue-100 px-2 py-1 rounded text-xs">
                                        Example: {FORMULA_EXAMPLES[field.functionType].example}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="mb-6 bg-white border rounded-lg shadow-sm">
            <div
                className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50 border-b"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h3 className="font-semibold flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                    Calculated Fields ({(calculatedFields || []).length})
                </h3>
                <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-3">
                        Configure custom calculations
                    </span>
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </div>
            </div>

            {isExpanded && (
                <div className="p-6">
                    {(!calculatedFields || calculatedFields.length === 0) && (
                        <div className="text-center py-12">
                            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500 italic mb-6">No calculated fields added yet</p>

                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-lg mb-6">
                                <h4 className="font-medium text-blue-800 mb-4">Available Calculation Types:</h4>
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
                                    {Object.entries(CALCULATION_TYPES).map(([key, config]) => (
                                        <div key={key} className="text-center p-4 bg-white border border-blue-100 rounded-lg">
                                            <div className="flex justify-center mb-2">{config.icon}</div>
                                            <div className="font-medium text-blue-700 mb-2">{config.label}</div>
                                            <div className="text-blue-600 text-xs">{config.description}</div>
                                            <div className="text-xs text-gray-500 mt-2">
                                                {config.functions.slice(0, 3).join(", ")}
                                                {config.functions.length > 3 && "..."}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {(calculatedFields || []).map((field, index) => (
                        <div key={field.id || index} className="mb-6 p-5 border border-gray-200 rounded-lg bg-gray-50">
                            {/* Field Header */}
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-medium text-lg">
                                    Calculated Field #{index + 1}
                                    {field.label && ` - ${field.label}`}
                                </h4>
                                <button
                                    onClick={() => removeCalculatedField(field.id)}
                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg flex items-center transition-colors"
                                    title="Remove calculated field"
                                >
                                    <X className="w-4 h-4 mr-1" />
                                    Remove
                                </button>
                            </div>

                            {/* Basic Settings */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Field Label *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Total Efficiency"
                                        value={field.label || ""}
                                        onChange={(e) => updateCalculatedField(field.id, "label", e.target.value)}
                                        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Display Format</label>
                                    <select
                                        value={field.format || "decimal"}
                                        onChange={(e) => updateCalculatedField(field.id, "format", e.target.value)}
                                        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="decimal">Decimal (123.45)</option>
                                        <option value="currency">Currency ($123.45)</option>
                                        <option value="percentage">Percentage (12.34%)</option>
                                        <option value="integer">Integer (123)</option>
                                        <option value="text">Text</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Decimal Places</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        value={field.precision || 2}
                                        onChange={(e) => updateCalculatedField(field.id, "precision", parseInt(e.target.value))}
                                        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Formula Builder */}
                            {renderFormulaBuilder(field)}

                            {/* Description */}
                            <div className="mt-4">
                                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="Describe what this calculated field represents..."
                                    value={field.description || ""}
                                    onChange={(e) => updateCalculatedField(field.id, "description", e.target.value)}
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    ))}

                    {/* Add Button */}
                    <button
                        onClick={addCalculatedField}
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-4 rounded-lg flex items-center justify-center font-medium transition-all transform hover:scale-105"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add New Calculated Field
                    </button>
                </div>
            )}
        </div>
    );
};

export default EnhancedCalculatedFieldsEditor;