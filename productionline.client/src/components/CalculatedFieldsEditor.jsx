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
    const [showExpressionHelper, setShowExpressionHelper] = useState({});


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
            functions: ["ADD", "SUBTRACT", "MULTIPLY", "DIVIDE", "PERCENTAGE", "CONCATENATE", "EXPRESSION"],
            hint: "💡 Use for calculations like Total = Quantity × Price for each row or complex expressions"
        },
        columnwise: {
            label: "⬇️ Column-wise Calculations",
            description: "Calculate down a column with conditions - Results appear in SUMMARY ROW at bottom",
            icon: <Columns className="w-4 h-4" />,
            functions: ["RUNNING_TOTAL", "RANK", "PERCENT_OF_TOTAL", "CUMULATIVE_AVG", "MOVING_AVG", "DIFFERENCE", "EXPRESSION"],
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
        "EXPRESSION": {
            formula: 'EXPRESSION("("Quantity" * "Price") + ("Tax" * 0.1)")',
            description: "Complex mathematical expression with operators (+, -, *, /, ^, %, sqrt, abs, round, floor, ceil)",
            example: 'EXPRESSION("sqrt(\"Area\") + (\"Length\" * \"Width\")")  → Complex calculation result',
            resultLocation: "Each row shows calculated expression result",
            useCase: "Perfect for complex formulas like compound interest, geometric calculations, conditional logic"
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

    const validateExpression = (expression, calculationType, availableFields) => {
        const errors = [];
        const warnings = [];

        if (!expression.trim()) {
            errors.push("Expression cannot be empty");
            return { isValid: false, errors, warnings };
        }

        // Check balanced parentheses
        let parenCount = 0;
        for (let char of expression) {
            if (char === '(') parenCount++;
            if (char === ')') parenCount--;
            if (parenCount < 0) {
                errors.push("Unmatched closing parenthesis");
                break;
            }
        }
        if (parenCount > 0) {
            errors.push("Unmatched opening parenthesis");
        }

        // Check for field references
        const fieldMatches = expression.match(/"([^"]+)"/g);
        if (fieldMatches) {
            fieldMatches.forEach(match => {
                const fieldName = match.replace(/"/g, '');
                const fieldExists = availableFields.some(f => f.label === fieldName);
                if (!fieldExists) {
                    warnings.push(`Field "${fieldName}" not found in selected fields`);
                }
            });
        }

        // Check for invalid operators
        const invalidPatterns = [
            { pattern: /\+\+|\-\-/, message: "Invalid operator usage (++ or --)" },
            { pattern: /\*\*/, message: "Use ^ for exponentiation instead of **" },
            { pattern: /===/g, message: "Use == for equality comparison" },
        ];

        invalidPatterns.forEach(({ pattern, message }) => {
            if (pattern.test(expression)) {
                errors.push(message);
            }
        });

        // Column-wise specific validation
        if (calculationType === 'columnwise') {
            const columnFunctions = ['PREV', 'NEXT', 'INDEX', 'AVG_RANGE', 'SUM_RANGE'];
            columnFunctions.forEach(func => {
                if (expression.includes(func) && !expression.includes(`${func}(`)) {
                    errors.push(`${func} must be used as a function with parentheses: ${func}()`);
                }
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            fieldReferences: fieldMatches ? fieldMatches.length : 0
        };
    };

    const toggleExpressionHelper = (fieldId) => {
        setShowExpressionHelper(prev => ({
            ...prev,
            [fieldId]: !prev[fieldId]
        }));
    };

    const insertExpressionElement = (fieldId, element) => {
        const textareaElement = document.querySelector(`textarea[data-field-id="${fieldId}"]`);
        if (textareaElement) {
            const start = textareaElement.selectionStart;
            const end = textareaElement.selectionEnd;
            const currentFormula = textareaElement.value;

            const newFormula =
                currentFormula.substring(0, start) +
                element +
                currentFormula.substring(end);

            updateCalculatedField(fieldId, "formula", newFormula);

            setTimeout(() => {
                textareaElement.focus();
                textareaElement.selectionStart = textareaElement.selectionEnd = start + element.length;
            }, 0);
        }
    };

    const ExpressionHelperPanel = ({ fieldId, isVisible, onClose, calculationType }) => {
        if (!isVisible) return null;

        const OPERATORS = [
            { symbol: ' + ', desc: 'Addition', example: '"Field1" + "Field2"' },
            { symbol: ' - ', desc: 'Subtraction', example: '"Revenue" - "Costs"' },
            { symbol: ' * ', desc: 'Multiplication', example: '"Qty" * "Price"' },
            { symbol: ' / ', desc: 'Division', example: '"Total" / "Count"' },
            { symbol: ' ^ ', desc: 'Power/Exponent', example: '"Base" ^ 2' },
            { symbol: ' % ', desc: 'Modulo', example: '"Number" % 10' },
            { symbol: '()', desc: 'Grouping', example: '("A" + "B") * "C"' }
        ];

        const MATH_FUNCTIONS = [
            { func: 'sqrt(', desc: 'Square root', example: 'sqrt("Area")' },
            { func: 'abs(', desc: 'Absolute value', example: 'abs("Difference")' },
            { func: 'round(', desc: 'Round to nearest', example: 'round("Value", 2)' },
            { func: 'floor(', desc: 'Round down', example: 'floor("Price")' },
            { func: 'ceil(', desc: 'Round up', example: 'ceil("Estimate")' },
            { func: 'max(', desc: 'Maximum value', example: 'max("A", "B", "C")' },
            { func: 'min(', desc: 'Minimum value', example: 'min("X", "Y")' },
            { func: 'pow(', desc: 'Power function', example: 'pow("Base", "Exponent")' }
        ];

        const LOGICAL_OPERATORS = [
            { symbol: ' > ', desc: 'Greater than', example: '"Score" > 80' },
            { symbol: ' < ', desc: 'Less than', example: '"Age" < 65' },
            { symbol: ' >= ', desc: 'Greater or equal', example: '"Grade" >= 90' },
            { symbol: ' <= ', desc: 'Less or equal', example: '"Hours" <= 40' },
            { symbol: ' == ', desc: 'Equal to', example: '"Status" == "Active"' },
            { symbol: ' != ', desc: 'Not equal to', example: '"Type" != "Cancelled"' },
            { symbol: ' && ', desc: 'AND condition', example: '"A" > 0 && "B" < 100' },
            { symbol: ' || ', desc: 'OR condition', example: '"Type" == "A" || "Type" == "B"' }
        ];

        const CONDITIONAL_FUNCTIONS = [
            { func: 'IF(', desc: 'If-then-else', example: 'IF("Score" > 80, "Pass", "Fail")' },
        ];

        const COLUMN_FUNCTIONS = calculationType === 'columnwise' ? [
            { func: 'PREV(', desc: 'Previous row value', example: 'PREV("Sales")' },
            { func: 'NEXT(', desc: 'Next row value', example: 'NEXT("Forecast")' },
            { func: 'INDEX()', desc: 'Current row index', example: 'INDEX() + 1' },
            { func: 'AVG_RANGE(', desc: 'Average of range', example: 'AVG_RANGE("Sales", 3)' },
            { func: 'SUM_RANGE(', desc: 'Sum of range', example: 'SUM_RANGE("Values", 5)' },
        ] : [];

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-5xl max-h-[90vh] overflow-y-auto m-4">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-800">Expression Builder Helper</h3>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {/* Basic Operators */}
                        <div className="border rounded-lg p-4 bg-blue-50">
                            <h4 className="font-semibold text-blue-800 mb-3">Basic Operators</h4>
                            <div className="space-y-2">
                                {OPERATORS.map((op, i) => (
                                    <div key={i} className="bg-white p-3 rounded border hover:border-blue-300 cursor-pointer transition-colors"
                                        onClick={() => insertExpressionElement(fieldId, op.symbol)}>
                                        <div className="font-mono font-bold text-blue-600">{op.symbol.trim()}</div>
                                        <div className="text-sm text-gray-600">{op.desc}</div>
                                        <div className="text-xs text-gray-500 font-mono bg-gray-50 p-1 rounded mt-1">
                                            {op.example}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Math Functions */}
                        <div className="border rounded-lg p-4 bg-green-50">
                            <h4 className="font-semibold text-green-800 mb-3">Math Functions</h4>
                            <div className="space-y-2">
                                {MATH_FUNCTIONS.map((func, i) => (
                                    <div key={i} className="bg-white p-3 rounded border hover:border-green-300 cursor-pointer transition-colors"
                                        onClick={() => insertExpressionElement(fieldId, func.func)}>
                                        <div className="font-mono font-bold text-green-600">{func.func}</div>
                                        <div className="text-sm text-gray-600">{func.desc}</div>
                                        <div className="text-xs text-gray-500 font-mono bg-gray-50 p-1 rounded mt-1">
                                            {func.example}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Logical Operators */}
                        <div className="border rounded-lg p-4 bg-purple-50">
                            <h4 className="font-semibold text-purple-800 mb-3">Logical Operators</h4>
                            <div className="space-y-2">
                                {LOGICAL_OPERATORS.map((op, i) => (
                                    <div key={i} className="bg-white p-3 rounded border hover:border-purple-300 cursor-pointer transition-colors"
                                        onClick={() => insertExpressionElement(fieldId, op.symbol)}>
                                        <div className="font-mono font-bold text-purple-600">{op.symbol.trim()}</div>
                                        <div className="text-sm text-gray-600">{op.desc}</div>
                                        <div className="text-xs text-gray-500 font-mono bg-gray-50 p-1 rounded mt-1">
                                            {op.example}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Conditional Functions */}
                        <div className="border rounded-lg p-4 bg-orange-50">
                            <h4 className="font-semibold text-orange-800 mb-3">Conditional Functions</h4>
                            <div className="space-y-2">
                                {CONDITIONAL_FUNCTIONS.map((func, i) => (
                                    <div key={i} className="bg-white p-3 rounded border hover:border-orange-300 cursor-pointer transition-colors"
                                        onClick={() => insertExpressionElement(fieldId, func.func)}>
                                        <div className="font-mono font-bold text-orange-600">{func.func}</div>
                                        <div className="text-sm text-gray-600">{func.desc}</div>
                                        <div className="text-xs text-gray-500 font-mono bg-gray-50 p-1 rounded mt-1">
                                            {func.example}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Column Functions (for columnwise only) */}
                        {COLUMN_FUNCTIONS.length > 0 && (
                            <div className="border rounded-lg p-4 bg-indigo-50">
                                <h4 className="font-semibold text-indigo-800 mb-3">Column Functions</h4>
                                <div className="space-y-2">
                                    {COLUMN_FUNCTIONS.map((func, i) => (
                                        <div key={i} className="bg-white p-3 rounded border hover:border-indigo-300 cursor-pointer transition-colors"
                                            onClick={() => insertExpressionElement(fieldId, func.func)}>
                                            <div className="font-mono font-bold text-indigo-600">{func.func}</div>
                                            <div className="text-sm text-gray-600">{func.desc}</div>
                                            <div className="text-xs text-gray-500 font-mono bg-gray-50 p-1 rounded mt-1">
                                                {func.example}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Common Examples */}
                        <div className="border rounded-lg p-4 bg-yellow-50">
                            <h4 className="font-semibold text-yellow-800 mb-3">Common Examples</h4>
                            <div className="space-y-3">
                                <div className="bg-white p-3 rounded border cursor-pointer hover:border-yellow-300"
                                    onClick={() => insertExpressionElement(fieldId, '"Principal" * pow((1 + "Rate"/100), "Years")')}>
                                    <div className="font-medium text-yellow-700">Compound Interest</div>
                                    <div className="text-xs font-mono text-gray-600 bg-gray-50 p-2 rounded mt-1">
                                        "Principal" * pow((1 + "Rate"/100), "Years")
                                    </div>
                                </div>
                                <div className="bg-white p-3 rounded border cursor-pointer hover:border-yellow-300"
                                    onClick={() => insertExpressionElement(fieldId, 'IF("Quantity" > 100, "Price" * 0.9, "Price")')}>
                                    <div className="font-medium text-yellow-700">Conditional Pricing</div>
                                    <div className="text-xs font-mono text-gray-600 bg-gray-50 p-2 rounded mt-1">
                                    IF("Quantity" &gt; 100, "Price" * 0.9, "Price")
                                    </div>
                                </div>
                                {calculationType === 'columnwise' && (
                                    <div className="bg-white p-3 rounded border cursor-pointer hover:border-yellow-300"
                                        onClick={() => insertExpressionElement(fieldId, '("Sales" - PREV("Sales")) / PREV("Sales") * 100')}>
                                        <div className="font-medium text-yellow-700">Growth Rate</div>
                                        <div className="text-xs font-mono text-gray-600 bg-gray-50 p-2 rounded mt-1">
                                            ("Sales" - PREV("Sales")) / PREV("Sales") * 100
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                        <h5 className="font-medium text-gray-800 mb-2">Expression Syntax Rules</h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                            <li>• Always wrap field names in double quotes: "Field Name"</li>
                            <li>• Use parentheses for grouping: ("A" + "B") * "C"</li>
                            <li>• String literals use single quotes: 'Active'</li>
                            <li>• Numbers don't need quotes: 100, 3.14, 0.5</li>
                            <li>• Functions are case-sensitive: sqrt() not SQRT()</li>
                            {calculationType === 'columnwise' && (
                                <li>• Column functions reference other rows: PREV("Field") gets previous row's value</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        );
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

    //const updateCalculatedField = (id, key, value) => {
    //    if (!setCalculatedFields || !calculatedFields) return;

    //    setCalculatedFields(prev => (prev || []).map(field =>
    //        field.id === id ? { ...field, [key]: value } : field
    //    ));
    //};

    const updateCalculatedField = (fieldId, key, value) => {
        setCalculatedFields(prev =>
            prev.map(field => {
                if (field.id === fieldId) {
                    const updatedField = { ...field, [key]: value };

                    // If updating formula, also update sourceFields
                    if (key === 'formula') {
                        const extractedSourceFields = extractSourceFields(value, fields);
                        updatedField.sourceFields = extractedSourceFields;
                    }

                    return updatedField;
                }
                return field;
            })
        );
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

    const validateFormula = (formula, functionType, availableFields) => {
        const errors = [];
        const warnings = [];

        if (!formula.trim()) {
            errors.push("Formula cannot be empty");
            return { isValid: false, errors, warnings };
        }

        // Check if field references exist
        const fieldMatches = formula.match(/"([^"]+)"/g);
        if (fieldMatches) {
            fieldMatches.forEach(match => {
                const fieldName = match.replace(/"/g, '');
                const fieldExists = availableFields.some(f => f.label === fieldName);
                if (!fieldExists) {
                    warnings.push(`Field "${fieldName}" not found in selected fields`);
                }
            });
        }

        // Function-specific validation
        if (functionType) {
            const requiredParams = {
                'SUM': 1, 'AVG': 1, 'MIN': 1, 'MAX': 1, 'COUNT': 1,
                'ADD': 2, 'SUBTRACT': 2, 'MULTIPLY': 2, 'DIVIDE': 2,
                'EFFICIENCY': 3, 'PERCENTAGE': 2
            };

            const expectedParams = requiredParams[functionType];
            if (expectedParams) {
                const paramCount = (fieldMatches || []).length;
                if (paramCount < expectedParams) {
                    errors.push(`${functionType} requires at least ${expectedParams} parameters, found ${paramCount}`);
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    };

    const FORMULA_TEMPLATES = {
        // Aggregate Functions
        "SUM": {
            template: 'SUM("{field}")',
            description: "Sum all values in a column",
            example: 'SUM("Sales Amount") → Total: $15,000',
            category: "aggregate"
        },
        "AVG": {
            template: 'AVG("{field}")',
            description: "Average of all values",
            example: 'AVG("Performance Score") → 85.5',
            category: "aggregate"
        },
        "MIN": {
            template: 'MIN("{field}")',
            description: "Minimum value in column",
            example: 'MIN("Price") → $12.50',
            category: "aggregate"
        },
        "MAX": {
            template: 'MAX("{field}")',
            description: "Maximum value in column",
            example: 'MAX("Score") → 98.5',
            category: "aggregate"
        },
        "COUNT": {
            template: 'COUNT("{field}")',
            description: "Count non-empty values",
            example: 'COUNT("Orders") → 150',
            category: "aggregate"
        },
        "COUNT_DISTINCT": {
            template: 'COUNT_DISTINCT("{field}")',
            description: "Count unique values",
            example: 'COUNT_DISTINCT("Customer") → 45',
            category: "aggregate"
        },

        // Row-wise Calculations
        "ADD": {
            template: 'ADD("{field1}", "{field2}")',
            description: "Add two or more fields together",
            example: 'ADD("Base Salary", "Bonus") → $75,000',
            category: "rowwise"
        },
        "SUBTRACT": {
            template: 'SUBTRACT("{field1}", "{field2}")',
            description: "Subtract second field from first",
            example: 'SUBTRACT("Revenue", "Costs") → $25,000',
            category: "rowwise"
        },
        "MULTIPLY": {
            template: 'MULTIPLY("{field1}", "{field2}")',
            description: "Multiply fields together",
            example: 'MULTIPLY("Quantity", "Price") → $1,250',
            category: "rowwise"
        },
        "DIVIDE": {
            template: 'DIVIDE("{field1}", "{field2}")',
            description: "Divide first field by second",
            example: 'DIVIDE("Total Sales", "Units") → $25.50',
            category: "rowwise"
        },
        "PERCENTAGE": {
            template: 'PERCENTAGE("{field1}", "{field2}")',
            description: "Calculate percentage contribution",
            example: 'PERCENTAGE("Individual", "Total") → 15%',
            category: "rowwise"
        },
        "CONCATENATE": {
            template: 'CONCATENATE("{field1}", "{field2}")',
            description: "Join text fields together",
            example: 'CONCATENATE("First Name", "Last Name") → John Doe',
            category: "rowwise"
        },

        // Column-wise Calculations
        "RUNNING_TOTAL": {
            template: 'RUNNING_TOTAL("{field}")',
            description: "Calculate cumulative sum",
            example: 'RUNNING_TOTAL("Daily Sales") → 100, 350, 770...',
            category: "columnwise"
        },
        "RANK": {
            template: 'RANK("{field}", "DESC")',
            description: "Rank values in order",
            example: 'RANK("Performance", "DESC") → 1, 2, 3...',
            category: "columnwise"
        },
        "PERCENT_OF_TOTAL": {
            template: 'PERCENT_OF_TOTAL("{field}")',
            description: "Each value as % of total",
            example: 'PERCENT_OF_TOTAL("Sales") → 12.5%, 8.3%...',
            category: "columnwise"
        },
        "CUMULATIVE_AVG": {
            template: 'CUMULATIVE_AVG("{field}")',
            description: "Running average down column",
            example: 'CUMULATIVE_AVG("Scores") → 85, 87, 86...',
            category: "columnwise"
        },
        "MOVING_AVG": {
            template: 'MOVING_AVG("{field}", 3)',
            description: "Moving average with window",
            example: 'MOVING_AVG("Sales", 3) → avg of last 3',
            category: "columnwise"
        },
        "DIFFERENCE": {
            template: 'DIFFERENCE("{field}")',
            description: "Difference from previous row",
            example: 'DIFFERENCE("Monthly Sales") → +150, -50...',
            category: "columnwise"
        },

        // Grouping & Efficiency
        "GROUP_SUM": {
            template: 'GROUP_SUM("{field}", "{groupBy}")',
            description: "Sum by groups",
            example: 'GROUP_SUM("Sales", "Department") → Eng: $45k',
            category: "grouping"
        },
        "GROUP_AVG": {
            template: 'GROUP_AVG("{field}", "{groupBy}")',
            description: "Average by groups",
            example: 'GROUP_AVG("Salary", "Dept") → Sales: $62k',
            category: "grouping"
        },
        "GROUP_COUNT": {
            template: 'GROUP_COUNT("{field}", "{groupBy}")',
            description: "Count by groups",
            example: 'GROUP_COUNT("Orders", "Region") → West: 45',
            category: "grouping"
        },
        "EFFICIENCY": {
            template: 'EFFICIENCY("{output}", "{input}", {target})',
            description: "Calculate efficiency percentage",
            example: 'EFFICIENCY("Units", "Hours", 8) → 95.5%',
            category: "grouping"
        },
        "RATIO": {
            template: 'RATIO("{field1}", "{field2}")',
            description: "Calculate ratio between fields",
            example: 'RATIO("Actual", "Target") → 1.25',
            category: "grouping"
        },
        "GROUP_MIN": {
            template: 'GROUP_MIN("{field}", "{groupBy}")',
            description: "Minimum value by groups",
            example: 'GROUP_MIN("Score", "Team") → TeamA: 78',
            category: "grouping"
        },
        "GROUP_MAX": {
            template: 'GROUP_MAX("{field}", "{groupBy}")',
            description: "Maximum value by groups",
            example: 'GROUP_MAX("Score", "Team") → TeamA: 95',
            category: "grouping"
        }
    };


    const renderFormulaBuilder = (field) => {
        const availableFields = getAvailableFields();
        const currentFunctions = CALCULATION_TYPES[field.calculationType || "aggregate"]?.functions || [];
        const validation = field.functionType === 'EXPRESSION'
            ? validateExpression(field.formula || "", field.calculationType || "rowwise", availableFields)
            : validateFormula(field.formula || "", field.functionType, availableFields);


        const insertSmartTemplate = (template, fieldId) => {
            // Auto-populate with first available fields
            let smartFormula = template;
            const fieldPlaceholders = template.match(/{[^}]+}/g) || [];

            fieldPlaceholders.forEach((placeholder, index) => {
                if (placeholder === '{target}') {
                    smartFormula = smartFormula.replace(placeholder, '8');
                } else if (availableFields[index]) {
                    smartFormula = smartFormula.replace(placeholder, `"${availableFields[index].label}"`);
                } else {
                    smartFormula = smartFormula.replace(placeholder, '""');
                }
            });

            updateCalculatedField(fieldId, "formula", smartFormula);
            // Also set the function type
            const templateFunction = Object.keys(FORMULA_TEMPLATES).find(key =>
                FORMULA_TEMPLATES[key].template === template
            );
            if (templateFunction) {
                updateCalculatedField(fieldId, "functionType", templateFunction);
            }
        };
        return (
            <div className="mt-3 p-4 border rounded bg-gradient-to-r from-blue-50 to-indigo-50">
                <h5 className="font-medium mb-3 flex items-center">
                    <Calculator className="w-4 h-4 mr-2" />
                    Smart Formula Builder
                </h5>

                {/* Quick Templates */}
                <div className="mb-4 p-3 bg-white rounded border">
                    <h6 className="text-sm font-medium mb-2">🚀 Quick Start Templates</h6>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        {Object.entries(FORMULA_TEMPLATES)
                            .filter(([_, template]) => template.category === (field.calculationType || "aggregate"))
                            .map(([key, template]) => (
                                <button
                                    key={key}
                                    onClick={() => insertSmartTemplate(template.template, field.id)}
                                    className="p-2 text-xs bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded transition-colors"
                                    title={template.description}
                                >
                                    <div className="font-medium">{key}</div>
                                    <div className="text-gray-600 truncate">{template.example.split(' →')[0]}</div>
                                </button>
                            ))}
                    </div>
                </div>
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
                    </div>
                </div>

                <CalculationHintPanel calculationType={field.calculationType || "aggregate"} />


                {/* Function Selection with Preview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Function</label>
                        <select
                            value={field.functionType || ""}
                            onChange={(e) => {
                                const selectedFunction = e.target.value;
                                updateCalculatedField(field.id, "functionType", selectedFunction);
                                // Auto-insert template
                                if (FORMULA_TEMPLATES[selectedFunction]) {
                                    insertSmartTemplate(FORMULA_TEMPLATES[selectedFunction].template, field.id);
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

                    {/* Field Selector with Search */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Available Fields</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search fields..."
                                className="w-full border border-gray-300 p-2 rounded-t-lg text-sm"
                            />
                            <div className="border border-t-0 border-gray-300 rounded-b-lg max-h-32 overflow-y-auto">
                                {availableFields.map(f => (
                                    <div
                                        key={f.id}
                                        onClick={() => insertFieldIntoFormula(field.id, f.label)}
                                        className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 text-sm"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span>{f.label}</span>
                                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                                {f.type}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                {/* Enhanced Formula Input with Validation */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Formula</label>
                    <div className="relative">
                        <textarea
                            placeholder="Enter your formula or use templates above..."
                            value={field.formula || ""}
                            onChange={(e) => updateCalculatedField(field.id, "formula", e.target.value)}
                            className={`w-full border p-3 rounded-lg font-mono text-sm ${validation.isValid
                                    ? 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                                    : 'border-red-300 focus:ring-2 focus:ring-red-500'
                                }`}
                            rows={3}
                            data-field-id={field.id}
                        />

                        {/* Real-time validation feedback */}
                        {field.formula && (
                            <div className="mt-2">
                                {validation.errors.length > 0 && (
                                    <div className="text-red-600 text-sm">
                                        <strong>❌ Errors:</strong>
                                        <ul className="list-disc list-inside ml-4">
                                            {validation.errors.map((error, i) => (
                                                <li key={i}>{error}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {validation.warnings.length > 0 && (
                                    <div className="text-yellow-600 text-sm mt-1">
                                        <strong>⚠️ Warnings:</strong>
                                        <ul className="list-disc list-inside ml-4">
                                            {validation.warnings.map((warning, i) => (
                                                <li key={i}>{warning}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {validation.isValid && field.formula.trim() && (
                                    <div className="text-green-600 text-sm">
                                        Formula looks good!
                                        {field.functionType === 'EXPRESSION' && validation.fieldReferences && (
                                            <span className="ml-2 text-xs">
                                                ({validation.fieldReferences} field references found)
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                {/* Formula Preview */}
                {field.formula && validation.isValid && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                        <h6 className="text-sm font-medium text-green-800 mb-1">📋 Formula Preview</h6>
                        <div className="text-sm text-green-700">
                            <strong>What it does:</strong> {FORMULA_TEMPLATES[field.functionType]?.description || "Custom calculation"}
                        </div>
                        <div className="text-xs text-green-600 mt-1 font-mono bg-green-100 p-2 rounded">
                            {field.formula}
                        </div>
                    </div>
                )}

                {/* Additional Options for Grouping Calculations - RESTORED */}
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

                {/* Additional Options for Column-wise Calculations - RESTORED */}
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
                <div className="grid grid-cols-1 gap-4 mb-4">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium">Formula</label>
                            {field.functionType === 'EXPRESSION' && (
                                <button
                                    type="button"
                                    onClick={() => toggleExpressionHelper(field.id)}
                                    className="text-purple-600 hover:text-purple-800 text-sm flex items-center bg-purple-100 px-3 py-1 rounded-lg hover:bg-purple-200 transition-colors"
                                >
                                    Expression Helper
                                </button>
                            )}
                        </div>
                        <textarea
                            placeholder="Enter your formula here..."
                            value={field.formula || ""}
                            onChange={(e) => updateCalculatedField(field.id, "formula", e.target.value)}
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            rows={3}
                            data-field-id={field.id}  // Add this line for enhanced cursor positioning
                        />
                        <ExpressionHelperPanel
                            fieldId={field.id}
                            isVisible={showExpressionHelper[field.id]}
                            onClose={() => toggleExpressionHelper(field.id)}
                            calculationType={field.calculationType || "rowwise"}
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

    const getFieldReference = (fieldLabel, availableFields) => {
        const field = availableFields.find(f => f.label === fieldLabel);
        if (!field) return fieldLabel;

        // Check if it's a grid field (contains colon in ID)
        if (field.id.includes(':')) {
            return field.id; // Already in gridId:fieldId format
        }

        return field.id; // Regular field
    };

    const extractSourceFields = (formula, availableFields) => {
        if (!formula) return [];

        // Extract field names from formula (text between quotes)
        const fieldMatches = formula.match(/"([^"]+)"/g) || [];

        return fieldMatches.map(match => {
            const fieldName = match.replace(/"/g, '');
            return getFieldReference(fieldName, availableFields);
        }).filter(Boolean); // Remove any null/undefined values
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