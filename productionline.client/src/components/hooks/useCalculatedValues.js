// Add this to your ReportViewer.jsx to enhance calculated fields display

const useCalculatedValues = (reportData, calculatedFields) => {
    // Function to format values based on calculation settings
    const formatValue = (value, format, precision = 2) => {
        if (value === null || value === undefined || isNaN(value)) {
            return "-";
        }

        switch (format) {
            case "integer":
                return Math.round(value).toLocaleString();
            case "percent":
                return (value * 100).toFixed(precision) + "%";
            case "currency":
                return "$" + value.toFixed(precision).replace(/\d(?=(\d{3})+\.)/g, '$&,');
            case "decimal":
            default:
                return value.toFixed(precision);
        }
    };

    // Safe formula evaluation
    const evaluateFormula = (formula, rowData) => {
        if (!formula || !rowData) return "-";

        try {
            // Replace field placeholders with their values
            let evaluated = formula;

            // Find all field placeholders in the formula
            const fieldPlaceholders = formula.match(/\{[^}]+\}/g) || [];

            // Replace each placeholder with its value
            fieldPlaceholders.forEach(placeholder => {
                const fieldId = placeholder.substring(1, placeholder.length - 1);
                const field = rowData.find(f => f.fieldId === fieldId || f.fieldLabel === fieldId);

                if (field) {
                    const value = isNaN(Number(field.value)) ? 0 : Number(field.value);
                    evaluated = evaluated.replaceAll(placeholder, value);
                } else {
                    // Field not found, replace with 0
                    evaluated = evaluated.replaceAll(placeholder, 0);
                }
            });

            // Safely evaluate the formula (in production, use a safer formula parser)
            const result = eval(evaluated);
            return isNaN(result) ? "-" : result;
        } catch (error) {
            console.error("Error evaluating formula:", error);
            return "-";
        }
    };

    // Process all calculations for all rows
    const calculatedValues = reportData.map(row => {
        const rowCalculations = {};

        calculatedFields.forEach(calc => {
            const rawValue = evaluateFormula(calc.formula, row.data);
            rowCalculations[calc.label] = {
                raw: rawValue,
                formatted: formatValue(rawValue, calc.format || "decimal", calc.precision || 2)
            };
        });

        return {
            submissionId: row.submissionId,
            calculatedValues: rowCalculations
        };
    });

    return {
        calculatedValues,
        evaluateFormula,
        formatValue
    };
};

export default useCalculatedValues;