// Add this component to your ReportDesigner.jsx

function CalculatedFieldsEditor({
    calculatedFields,
    setCalculatedFields,
    selectedFields,
    fields
}) {
    const addCalculation = () => {
        setCalculatedFields([...calculatedFields, {
            label: "",
            formula: "",
            description: "",
            format: "decimal",
            precision: 2
        }]);
    };

    const updateCalculation = (index, key, value) => {
        const updated = [...calculatedFields];
        updated[index][key] = value;
        setCalculatedFields(updated);
    };

    const removeCalculation = (index) => {
        setCalculatedFields(calculatedFields.filter((_, i) => i !== index));
    };

    // Get available numeric fields for formulas
    const numericFields = selectedFields
        .map(id => {
            const field = fields.find(f => f.id === id);
            return field && ["number", "decimal", "numeric"].includes(field.type)
                ? { id, label: field.label }
                : null;
        })
        .filter(Boolean);

    const validateFormula = (formula) => {
        // Basic formula validation
        try {
            // Replace field placeholders with 1 to test evaluation
            let testFormula = formula;
            numericFields.forEach(field => {
                testFormula = testFormula.replaceAll(`{${field.id}}`, "1");
            });

            // Try to evaluate (unsafe but only for validation)
            // In production, use a proper formula parser library
            eval(testFormula);
            return true;
        } catch (error) {
            return false;
        }
    };

    return (
        <div className="mb-6">
            <h3 className="font-semibold mb-2">Add Calculated Fields</h3>
            {calculatedFields.map((calc, index) => (
                <div key={index} className="border rounded p-4 mb-4 bg-gray-50">
                    <div className="grid grid-cols-2 gap-3 mb-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Field Label</label>
                            <input
                                type="text"
                                placeholder="Label (e.g. MTBF)"
                                value={calc.label}
                                onChange={(e) => updateCalculation(index, "label", e.target.value)}
                                className="border p-2 rounded w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Display Format</label>
                            <div className="flex gap-2">
                                <select
                                    value={calc.format}
                                    onChange={(e) => updateCalculation(index, "format", e.target.value)}
                                    className="border p-2 rounded flex-grow"
                                >
                                    <option value="decimal">Decimal</option>
                                    <option value="integer">Integer</option>
                                    <option value="percent">Percentage</option>
                                    <option value="currency">Currency</option>
                                </select>

                                {calc.format === "decimal" && (
                                    <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        placeholder="Decimals"
                                        value={calc.precision}
                                        onChange={(e) => updateCalculation(
                                            index,
                                            "precision",
                                            Math.min(10, Math.max(0, parseInt(e.target.value) || 0))
                                        )}
                                        className="border p-2 rounded w-20"
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <input
                            type="text"
                            placeholder="Description of what this calculation represents"
                            value={calc.description || ""}
                            onChange={(e) => updateCalculation(index, "description", e.target.value)}
                            className="border p-2 rounded w-full"
                        />
                    </div>

                    <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Formula
                            <span className={`ml-2 text-xs ${validateFormula(calc.formula) ? "text-green-600" : "text-red-600"
                                }`}>
                                {calc.formula && (validateFormula(calc.formula) ? "✓ Valid" : "✗ Invalid formula")}
                            </span>
                        </label>
                        <textarea
                            placeholder="Formula using field IDs like {field1} + {field2}"
                            value={calc.formula}
                            onChange={(e) => updateCalculation(index, "formula", e.target.value)}
                            className={`border p-2 rounded w-full ${calc.formula && !validateFormula(calc.formula) ? "border-red-500" : ""
                                }`}
                            rows={2}
                        />
                    </div>

                    <div className="bg-white p-3 rounded border mb-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Available Fields</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {numericFields.map(field => (
                                <button
                                    key={field.id}
                                    onClick={() => updateCalculation(
                                        index,
                                        "formula",
                                        calc.formula + `{${field.id}}`
                                    )}
                                    className="text-left text-sm bg-blue-50 hover:bg-blue-100 p-1 rounded"
                                >
                                    <span className="font-mono">{`{${field.id}}`}</span>: {field.label}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-4 gap-1 mt-2">
                            {['+', '-', '*', '/', '(', ')', 'Math.sqrt(', 'Math.pow('].map(op => (
                                <button
                                    key={op}
                                    onClick={() => updateCalculation(index, "formula", calc.formula + op)}
                                    className="bg-gray-100 hover:bg-gray-200 p-1 rounded text-center"
                                >
                                    {op}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => removeCalculation(index)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                        Remove Calculation
                    </button>
                </div>
            ))}
            <button
                onClick={addCalculation}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
                + Add Calculation
            </button>
        </div>
    );
}

export default CalculatedFieldsEditor;