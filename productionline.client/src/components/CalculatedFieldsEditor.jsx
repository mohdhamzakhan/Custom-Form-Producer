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
            description: "Calculate across multiple rows (SUM, AVG, MIN, MAX, COUNT) - Results show in each row",
            icon: <Database className="w-4 h-4" />,
            functions: ["SUM", "AVG", "MIN", "MAX", "COUNT", "COUNT_DISTINCT"],
            hint: "💡 Use for totals, averages, and counting across all data rows"
        },
        rowwise: {
            label: "➡️ Row-wise Calculations",
            description: "Calculate across columns in the same row - Results show for each individual row",
            icon: <Rows className="w-4 h-4" />,
            functions: ["ADD", "SUBTRACT", "MULTIPLY", "DIVIDE", "PERCENTAGE", "CONCATENATE"],
            hint: "💡 Use for calculations like Total = Quantity × Price for each row"
        },
        columnwise: {
            label: "⬇️ Column-wise Calculations",
            description: "Calculate down a column with conditions - Results appear in SUMMARY ROW at bottom",
            icon: <Columns className="w-4 h-4" />,
            functions: ["RUNNING_TOTAL", "RANK", "PERCENT_OF_TOTAL", "CUMULATIVE_AVG", "MOVING_AVG", "DIFFERENCE"],
            hint: "💡 Use for running totals, rankings, and trends - Shows final result in summary row"
        },
        grouping: {
            label: "🏷️ Grouping & Efficiency",
            description: "Group data and calculate efficiency metrics - Results show one row per group",
            icon: <BarChart3 className="w-4 h-4" />,
            functions: ["GROUP_SUM", "GROUP_AVG", "GROUP_COUNT", "EFFICIENCY", "RATIO", "GROUP_MIN", "GROUP_MAX"],
            hint: "💡 Use for department totals, team efficiency, and grouped analytics"
        }
    };


    const ENHANCED_FORMULA_EXAMPLES = {
        // Aggregate examples
        "SUM": {
            formula: "SUM(\"Production Details → Quantity\")",
            description: "Sum all values in the specified column across all rows",
            example: "SUM(Order Amount) → Shows 15000 in each row",
            resultLocation: "Each row shows the total sum",
            useCase: "Great for showing grand totals alongside individual records"
        },
        "AVG": {
            formula: "AVG(\"Quality Score\")",
            description: "Calculate average of all values in the column",
            example: "AVG(Performance Score) → Shows 85.5 in each row",
            resultLocation: "Each row shows the overall average",
            useCase: "Perfect for showing benchmark comparisons"
        },
        "EFFICIENCY": {
            formula: "EFFICIENCY(\"Production Details → Output\", \"Production Details → Input\", 8)",
            description: "Calculate efficiency as (Output/Input)/Target × 100%",
            example: "EFFICIENCY(\"Working Hours\", \"Man Power\", 8) → Shows 95.5% efficiency",
            resultLocation: "Each row shows individual efficiency percentage",
            useCase: "Ideal for measuring productivity and performance metrics"
        },

        // Row-wise examples  
        "ADD": {
            formula: "ADD(\"Basic Salary\", \"Allowances\", \"Bonus\")",
            description: "Add values across columns in the same row",
            example: "Row 1: 50000 + 5000 + 2000 = 57000",
            resultLocation: "Each row shows its own calculated total",
            useCase: "Perfect for calculating totals like Grand Total = Base + Tax + Fee"
        },
        "MULTIPLY": {
            formula: "MULTIPLY(\"Quantity\", \"Unit Price\")",
            description: "Multiply values across columns in the same row",
            example: "Row 1: 10 × 25.50 = 255.00",
            resultLocation: "Each row shows its individual calculation",
            useCase: "Great for Line Total = Quantity × Price calculations"
        },
        "PERCENTAGE": {
            formula: "PERCENTAGE(\"Individual Sales\", \"Team Total\")",
            description: "Calculate percentage contribution for each row",
            example: "Row 1: 15000/100000 = 15%",
            resultLocation: "Each row shows its percentage contribution",
            useCase: "Excellent for showing individual contribution percentages"
        },

        // Column-wise examples
        "RUNNING_TOTAL": {
            formula: "RUNNING_TOTAL(\"Daily Sales\")",
            description: "Calculate cumulative sum down the column",
            example: "Row 1: 100, Row 2: 350, Row 3: 770...",
            resultLocation: "Summary row shows final cumulative total",
            useCase: "Track accumulating values like monthly cumulative sales"
        },
        "RANK": {
            formula: "RANK(\"Performance Score\", \"DESC\")",
            description: "Rank values in descending or ascending order",
            example: "Best performer gets rank 1, next gets 2...",
            resultLocation: "Summary row shows ranking methodology",
            useCase: "Rank employees, products, or regions by performance"
        },
        "PERCENT_OF_TOTAL": {
            formula: "PERCENT_OF_TOTAL(\"Department Sales\")",
            description: "Each value as percentage of column total",
            example: "Dept A: 12.5%, Dept B: 8.3%...",
            resultLocation: "Summary row shows 100% (total verification)",
            useCase: "Show relative contribution of each item to the whole"
        },

        // Grouping examples
        "GROUP_SUM": {
            formula: "GROUP_SUM(\"Sales Amount\", \"Department\")",
            description: "Sum amounts grouped by department, one row per group",
            example: "Engineering: 45000, Sales: 38000, HR: 22000",
            resultLocation: "Shows only group summary rows",
            useCase: "Get departmental totals, regional sums, category totals"
        },
        "GROUP_AVG": {
            formula: "GROUP_AVG(\"Salary\", \"Department\")",
            description: "Average salary grouped by department",
            example: "Engineering: 75000, Sales: 62000, HR: 55000",
            resultLocation: "Shows only group average rows",
            useCase: "Compare average performance across teams/categories"
        }
    };

    const CalculationHintPanel = ({ calculationType }) => {
        const typeConfig = CALCULATION_TYPES[calculationType];
        if (!typeConfig) return null;

        return (
            <div className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                <div className="flex items-start">
                    {typeConfig.icon}
                    <div className="ml-3">
                        <h6 className="font-semibold text-blue-800 mb-2">{typeConfig.label}</h6>
                        <p className="text-blue-700 text-sm mb-2">{typeConfig.description}</p>
                        <div className="bg-blue-100 px-3 py-2 rounded-md">
                            <p className="text-blue-800 text-sm font-medium">{typeConfig.hint}</p>
                        </div>

                        {calculationType === "columnwise" && (
                            <div className="mt-3 bg-yellow-100 px-3 py-2 rounded-md border border-yellow-300">
                                <p className="text-yellow-800 text-sm">
                                    <strong>📋 Result Display:</strong> Column-wise calculations will show their final result in a summary row at the bottom of your report table.
                                </p>
                            </div>
                        )}

                        {calculationType === "grouping" && (
                            <div className="mt-3 bg-green-100 px-3 py-2 rounded-md border border-green-300">
                                <p className="text-green-800 text-sm">
                                    <strong>📊 Result Display:</strong> Grouping calculations will replace individual rows with summary rows (one per group).
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
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

    const insertFieldIntoFormula = (fieldId, fieldLabel) => {
        const fieldReference = `"${fieldLabel}"`;
        const textareaElement = document.querySelector(`textarea[data-field-id="${fieldId}"]`);

        if (textareaElement) {
            const start = textareaElement.selectionStart;
            const end = textareaElement.selectionEnd;
            const currentFormula = textareaElement.value;

            const newFormula =
                currentFormula.substring(0, start) +
                fieldReference +
                currentFormula.substring(end);

            updateCalculatedField(fieldId, "formula", newFormula);

            // Set cursor position after inserted text
            setTimeout(() => {
                textareaElement.focus();
                textareaElement.selectionStart = textareaElement.selectionEnd = start + fieldReference.length;
            }, 0);
        } else {
            // Fallback to simple append
            const currentFormula = calculatedFields.find(f => f.id === fieldId)?.formula || "";
            const separator = currentFormula.trim() ? ', ' : '';
            updateCalculatedField(fieldId, "formula", currentFormula + separator + fieldReference);
        }
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
                        {/* Add the calculation hint panel */}
                        <CalculationHintPanel calculationType={field.calculationType || "aggregate"} />
                    </div>
                </div>
                {/* Function Type Selection with Enhanced Examples */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Function</label>
                        <select
                            value={field.functionType || ""}
                            onChange={(e) => {
                                const selectedFunction = e.target.value;
                                updateCalculatedField(field.id, "functionType", selectedFunction);
                                // Auto-populate formula example
                                if (ENHANCED_FORMULA_EXAMPLES[selectedFunction]) {
                                    updateCalculatedField(field.id, "formula", ENHANCED_FORMULA_EXAMPLES[selectedFunction].formula);
                                }
                            }}
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select Function</option>
                            {currentFunctions.map(func => (
                                <option key={func} value={func}>{func}</option>
                            ))}
                        </select>
                        {/* Show enhanced example when function is selected */}
                        {field.functionType && ENHANCED_FORMULA_EXAMPLES[field.functionType] && (
                            <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg">
                                <div className="text-sm">
                                    <div className="font-semibold text-gray-800 mb-1">
                                        {field.functionType} Example:
                                    </div>
                                    <div className="text-gray-600 mb-2">
                                        {ENHANCED_FORMULA_EXAMPLES[field.functionType].description}
                                    </div>
                                    <div className="bg-gray-100 p-2 rounded font-mono text-xs mb-2">
                                        {ENHANCED_FORMULA_EXAMPLES[field.functionType].example}
                                    </div>
                                    <div className="text-blue-600 text-xs bg-blue-50 p-2 rounded">
                                        <strong>Where results appear:</strong> {ENHANCED_FORMULA_EXAMPLES[field.functionType].resultLocation}
                                    </div>
                                    <div className="text-green-600 text-xs bg-green-50 p-2 rounded mt-2">
                                        <strong>Use case:</strong> {ENHANCED_FORMULA_EXAMPLES[field.functionType].useCase}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Source Fields</label>
                        <div className="w-full border border-gray-300 rounded-lg h-24 text-sm focus-within:ring-2 focus-within:ring-blue-500 overflow-y-auto bg-white">
                            {availableFields.length === 0 ? (
                                <div className="p-3 text-gray-500 text-center">
                                    No fields available
                                </div>
                            ) : (
                                <div className="p-2">
                                    {availableFields.map(f => (
                                        <div
                                            key={f.id}
                                            onDoubleClick={() => insertFieldIntoFormula(field.id, f.label)}
                                            className="cursor-pointer hover:bg-blue-50 p-2 rounded text-sm border-b border-gray-100 last:border-b-0 transition-colors"
                                            title={`Double-click to add "${f.label}" to formula`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-700">{f.label}</span>
                                                <span className="text-xs text-gray-400 uppercase">{f.type}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            💡 <strong>Double-click</strong> any field to add it to your formula
                        </p>
                    </div>

                </div>

                {/* FORMULA INPUT FIELD - This was missing! */}
                <div className="grid grid-cols-1 gap-4 mb-4">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium">Formula *</label>
                            <button
                                type="button"
                                onClick={() => toggleFormulaHelper(field.id)}
                                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                            >
                                <HelpCircle className="w-4 h-4 mr-1" />
                                {showFormulaHelper[field.id] ? "Hide Examples" : "Show Examples"}
                            </button>
                        </div>
                        <textarea
                            placeholder="Enter your formula here..."
                            value={field.formula || ""}
                            onChange={(e) => updateCalculatedField(field.id, "formula", e.target.value)}
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            rows={3}
                            data-field-id={field.id}  // Add this line for enhanced cursor positioning
                        />

                        <p className="text-xs text-gray-500 mt-1">
                            Use quotes around field names: "Field Name" and separate parameters with commas
                        </p>
                    </div>
                </div>

                {/* Formula Helper Panel */}
                {showFormulaHelper[field.id] && (
                    <div className="mb-4 p-4 border rounded bg-yellow-50">
                        <h6 className="font-medium mb-3">Quick Formula Examples:</h6>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {currentFunctions.map(func => {
                                const example = ENHANCED_FORMULA_EXAMPLES[func];
                                if (!example) return null;
                                return (
                                    <button
                                        key={func}
                                        onClick={() => insertFormula(field.id, example.formula)}
                                        className="text-left p-3 border border-gray-200 rounded hover:bg-white hover:border-blue-300 transition-colors"
                                    >
                                        <div className="font-medium text-sm text-gray-800">{func}</div>
                                        <div className="text-xs text-gray-600 mt-1 font-mono bg-gray-100 p-1 rounded">
                                            {example.formula}
                                        </div>
                                        <div className="text-xs text-blue-600 mt-1">{example.description}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Additional Options for Grouping Calculations */}
                {(field.calculationType === "grouping") && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Group By Field</label>
                            <select
                                value={field.groupByField || ""}
                                onChange={(e) => updateCalculatedField(field.id, "groupByField", e.target.value)}
                                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select field to group by</option>
                                {availableFields.map(f => (
                                    <option key={f.id} value={f.id}>{f.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center">
                            <label className="flex items-center text-sm font-medium">
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
                )}

                {/* Additional Options for Column-wise Calculations */}
                {(field.calculationType === "columnwise") && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Sort Order</label>
                            <select
                                value={field.sortOrder || "ASC"}
                                onChange={(e) => updateCalculatedField(field.id, "sortOrder", e.target.value)}
                                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="ASC">Ascending</option>
                                <option value="DESC">Descending</option>
                            </select>
                        </div>
                        {field.functionType === "MOVING_AVG" && (
                            <div>
                                <label className="block text-sm font-medium mb-2">Window Size</label>
                                <input
                                    type="number"
                                    min="2"
                                    max="10"
                                    value={field.windowSize || 3}
                                    onChange={(e) => updateCalculatedField(field.id, "windowSize", parseInt(e.target.value))}
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">Number of rows to include in moving average</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const CalculationTypeGuide = ({ isVisible, onClose }) => {
        if (!isVisible) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-4xl max-h-96 overflow-y-auto m-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-800">📊 Calculation Types Guide</h3>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Row-wise Example */}
                        <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                            <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                                <Rows className="w-5 h-5 mr-2" />
                                Row-wise Calculations
                            </h4>
                            <div className="text-sm text-green-700 space-y-2">
                                <p><strong>What:</strong> Calculate across columns in each individual row</p>
                                <p><strong>Example:</strong> Total = Quantity × Unit Price</p>
                                <div className="bg-white p-3 rounded border">
                                    <table className="text-xs w-full">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left">Qty</th>
                                                <th className="text-left">Price</th>
                                                <th className="text-left text-green-600">Total (Calc)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr><td>10</td><td>25.50</td><td className="text-green-600 font-bold">255.00</td></tr>
                                            <tr><td>5</td><td>40.00</td><td className="text-green-600 font-bold">200.00</td></tr>
                                            <tr><td>8</td><td>15.75</td><td className="text-green-600 font-bold">126.00</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Column-wise Example */}
                        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                            <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                                <Columns className="w-5 h-5 mr-2" />
                                Column-wise Calculations
                            </h4>
                            <div className="text-sm text-blue-700 space-y-2">
                                <p><strong>What:</strong> Calculate down a column, final result in summary row</p>
                                <p><strong>Example:</strong> Running Total of Daily Sales</p>
                                <div className="bg-white p-3 rounded border">
                                    <table className="text-xs w-full">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left">Day</th>
                                                <th className="text-left">Sales</th>
                                                <th className="text-left text-blue-600">Running Total (Calc)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr><td>Mon</td><td>1000</td><td className="text-blue-600">1000</td></tr>
                                            <tr><td>Tue</td><td>1200</td><td className="text-blue-600">2200</td></tr>
                                            <tr><td>Wed</td><td>900</td><td className="text-blue-600">3100</td></tr>
                                            <tr className="bg-blue-100 border-t-2 border-blue-300">
                                                <td className="font-bold">📊 Summary</td>
                                                <td>—</td>
                                                <td className="text-blue-600 font-bold">3100 (Final Total)</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Aggregate Example */}
                        <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                            <h4 className="font-semibold text-purple-800 mb-3 flex items-center">
                                <Database className="w-5 h-5 mr-2" />
                                Aggregate Calculations
                            </h4>
                            <div className="text-sm text-purple-700 space-y-2">
                                <p><strong>What:</strong> Same total/average shown in every row</p>
                                <p><strong>Example:</strong> SUM of all sales (grand total)</p>
                                <div className="bg-white p-3 rounded border">
                                    <table className="text-xs w-full">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left">Product</th>
                                                <th className="text-left">Sales</th>
                                                <th className="text-left text-purple-600">Grand Total (Calc)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr><td>Product A</td><td>1000</td><td className="text-purple-600 font-bold">3100</td></tr>
                                            <tr><td>Product B</td><td>1200</td><td className="text-purple-600 font-bold">3100</td></tr>
                                            <tr><td>Product C</td><td>900</td><td className="text-purple-600 font-bold">3100</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-xs text-purple-600">Same value (3100) appears in every row</p>
                            </div>
                        </div>

                        {/* Efficiency Example */}
                        <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                            <h4 className="font-semibold text-orange-800 mb-3 flex items-center">
                                <BarChart3 className="w-5 h-5 mr-2" />
                                Efficiency Calculations
                            </h4>
                            <div className="text-sm text-orange-700 space-y-2">
                                <p><strong>What:</strong> (Output ÷ Input) ÷ Target × 100%</p>
                                <p><strong>Example:</strong> Production Efficiency</p>
                                <div className="bg-white p-3 rounded border">
                                    <table className="text-xs w-full">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left">Output</th>
                                                <th className="text-left">Input</th>
                                                <th className="text-left">Target</th>
                                                <th className="text-left text-orange-600">Efficiency (Calc)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr><td>80</td><td>10</td><td>8</td><td className="text-orange-600 font-bold">100.0%</td></tr>
                                            <tr><td>72</td><td>12</td><td>8</td><td className="text-orange-600 font-bold">75.0%</td></tr>
                                            <tr><td>96</td><td>8</td><td>8</td><td className="text-orange-600 font-bold">150.0%</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-xs text-orange-600">Perfect for measuring productivity and performance</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                        <h5 className="font-medium text-gray-800 mb-2">🎯 Chart Integration</h5>
                        <p className="text-sm text-gray-700">
                            All calculated fields can be used in charts! They'll appear in the metrics dropdown
                            with a "(Calculated)" label so you can easily identify and use them for visualizations.
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    const renderCalculationGuideButton = () => {
        const [showGuide, setShowGuide] = useState(false);

        return (
            <>
                <button
                    onClick={() => setShowGuide(true)}
                    className="mb-4 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg flex items-center text-sm font-medium transition-all"
                >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    📖 Calculation Types Guide & Examples
                </button>

                <CalculationTypeGuide
                    isVisible={showGuide}
                    onClose={() => setShowGuide(false)}
                />
            </>
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