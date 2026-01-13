// groupingDataProcessor.js - Complete data grouping and calculation processor

/**
 * Process grouped data with hierarchical grouping and calculations
 */
export const processGroupedData = (reportData, groupingConfig, fields, calculatedFields) => {
    if (!groupingConfig || groupingConfig.length === 0) {
        return { flattenedData: reportData, summaryRows: [] };
    }

    console.log('=== GROUPING PROCESSOR DEBUG ===');
    console.log('Input data:', reportData.length, 'rows');
    console.log('Grouping config:', groupingConfig);
    console.log('Calculated fields:', calculatedFields);

    // Separate group-aware and normal calculated fields
    const groupCalculatedFields = calculatedFields.filter(cf => cf.scope === 'group');
    const normalCalculatedFields = calculatedFields.filter(cf => cf.scope !== 'group');

    console.log('Group calculated fields:', groupCalculatedFields);
    console.log('Normal calculated fields:', normalCalculatedFields);

    // Build hierarchical groups
    const groupedData = buildHierarchicalGroups(reportData, groupingConfig, fields);

    // Flatten with group headers, data rows, and footers
    const flattenedData = [];

    const processGroup = (group, level = 0) => {
        // Add group header
        flattenedData.push({
            type: 'group-header',
            level: level,
            groupField: group.fieldLabel,
            groupValue: group.value,
            rowCount: group.rows.length
        });

        // If there are sub-groups, process them recursively
        if (group.subGroups && group.subGroups.length > 0) {
            group.subGroups.forEach(subGroup => processGroup(subGroup, level + 1));
        } else {
            // Add data rows with group-aware calculations
            group.rows.forEach(row => {
                flattenedData.push({
                    type: 'data-row',
                    level: level + 1,
                    submissionId: row.submissionId,
                    submittedAt: row.submittedAt,
                    data: row.data,
                    groupContext: {
                        groupValue: group.value,
                        groupField: group.fieldLabel,
                        allGroupRows: group.rows
                    }
                });
            });
        }

        // Calculate group aggregations
        const aggregations = {};
        groupingConfig[level]?.aggregations?.forEach(agg => {
            const field = fields.find(f => f.id === agg.fieldId || f.label === agg.fieldId);
            if (!field) return;

            const values = [];
            group.rows.forEach(row => {
                const fieldData = row.data.find(d => d.fieldLabel === field.label);
                if (fieldData) {
                    try {
                        const parsed = JSON.parse(fieldData.value || "0");
                        const numValue = parseFloat(parsed) || 0;
                        if (numValue !== 0) values.push(numValue);
                    } catch {
                        const numValue = parseFloat(fieldData.value || "0") || 0;
                        if (numValue !== 0) values.push(numValue);
                    }
                }
            });

            let result = 0;
            switch (agg.function) {
                case 'SUM':
                    result = values.reduce((sum, val) => sum + val, 0);
                    break;
                case 'AVG':
                    result = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
                    break;
                case 'COUNT':
                    result = values.length;
                    break;
                case 'MIN':
                    result = values.length > 0 ? Math.min(...values) : 0;
                    break;
                case 'MAX':
                    result = values.length > 0 ? Math.max(...values) : 0;
                    break;
                case 'FIRST':
                    result = values.length > 0 ? values[0] : 0;
                    break;
                case 'LAST':
                    result = values.length > 0 ? values[values.length - 1] : 0;
                    break;
                case 'CONCAT':
                    aggregations[agg.fieldId] = {
                        label: agg.label || `${agg.function}(${field.label})`,
                        value: values.join(', ')
                    };
                    return;
            }

            aggregations[agg.fieldId] = {
                label: agg.label || `${agg.function}(${field.label})`,
                value: result
            };
        });

        // Add group footer with aggregations
        if (Object.keys(aggregations).length > 0) {
            flattenedData.push({
                type: 'group-footer',
                level: level,
                groupField: group.fieldLabel,
                groupValue: group.value,
                aggregations: aggregations
            });
        }
    };

    // Process all top-level groups
    groupedData.forEach(group => processGroup(group, 0));

    console.log('Flattened data:', flattenedData.length, 'rows');

    return { flattenedData, summaryRows: [] };
};

/**
 * Build hierarchical groups from flat data
 */
const buildHierarchicalGroups = (reportData, groupingConfig, fields) => {
    if (groupingConfig.length === 0) return reportData;

    const buildGroupLevel = (rows, configIndex) => {
        if (configIndex >= groupingConfig.length) {
            return rows;
        }

        const config = groupingConfig[configIndex];
        const field = fields.find(f => f.id === config.fieldId);

        if (!field) {
            console.warn('Field not found for grouping:', config.fieldId);
            return rows;
        }

        // Group rows by field value
        const groups = {};
        rows.forEach(row => {
            const fieldData = row.data?.find(d => d.fieldLabel === field.label);
            const value = fieldData?.value || '(Empty)';

            if (!groups[value]) {
                groups[value] = [];
            }
            groups[value].push(row);
        });

        // Sort groups
        const sortedKeys = Object.keys(groups).sort((a, b) => {
            if (config.sortDirection === 'DESC') {
                return b.localeCompare(a);
            }
            return a.localeCompare(b);
        });

        // Create group objects
        return sortedKeys.map(key => {
            const groupRows = groups[key];
            const subGroups = buildGroupLevel(groupRows, configIndex + 1);

            return {
                fieldLabel: field.label,
                value: key,
                rows: groupRows,
                subGroups: Array.isArray(subGroups) && subGroups.length > 0 && typeof subGroups[0] === 'object' && subGroups[0].fieldLabel
                    ? subGroups
                    : null
            };
        });
    };

    return buildGroupLevel(reportData, 0);
};

/**
 * Apply row-level calculations with group context awareness
 */
export const applyRowLevelCalculations = (flattenedData, calculatedFields, fields) => {
    if (!calculatedFields || calculatedFields.length === 0) {
        return flattenedData;
    }

    console.log('=== APPLYING ROW-LEVEL CALCULATIONS ===');
    console.log('Calculated fields:', calculatedFields);

    return flattenedData.map(row => {
        // Skip non-data rows
        if (row.type !== 'data-row') {
            return row;
        }

        const newRow = { ...row };
        const calculatedData = [];

        calculatedFields.forEach(calcField => {
            let calculatedValue;

            // Handle group-aware calculations
            if (calcField.scope === 'group' && row.groupContext) {
                calculatedValue = evaluateGroupCalculation(
                    calcField,
                    row,
                    row.groupContext.allGroupRows,
                    fields
                );
            } else if (calcField.scope !== 'group') {
                // Handle normal row-wise calculations
                calculatedValue = evaluateRowCalculation(calcField, row.data, fields);
            } else {
                // Group field without group context - skip
                return;
            }

            calculatedData.push({
                fieldLabel: calcField.label,
                value: formatCalculatedValue(calculatedValue, calcField),
                fieldType: 'calculated',
                visible: true
            });
        });

        newRow.data = [...(newRow.data || []), ...calculatedData];
        return newRow;
    });
};

/**
 * Evaluate group-aware calculation (IF statements with GROUP_SUM, etc.)
 */
const evaluateGroupCalculation = (calcField, currentRow, allGroupRows, fields) => {
    const formula = calcField.formula;
    let expression = formula;

    console.log('Evaluating group calculation:', calcField.label);
    console.log('Formula:', formula);

    // Handle IF conditions with GROUP functions
    const ifMatches = formula.match(/IF\(([^)]+(?:\([^)]*\))?[^)]*)\)/g);
    const ifReplacements = {};

    if (ifMatches) {
        ifMatches.forEach((ifMatch, idx) => {
            const placeholder = `__IF_PLACEHOLDER_${idx}__`;
            ifReplacements[placeholder] = ifMatch;
            expression = expression.replace(ifMatch, placeholder);
        });
    }

    // Extract field values for current row
    const fieldMatches = formula.match(/"([^"]+)"/g) || [];
    const fieldValues = {};

    fieldMatches.forEach(match => {
        const fieldLabel = match.replace(/"/g, '');
        const field = fields.find(f => f.label === fieldLabel);

        if (field) {
            const fieldData = currentRow.data?.find(d => d.fieldLabel === field.label);
            if (fieldData) {
                try {
                    const parsed = JSON.parse(fieldData.value || "null");
                    fieldValues[match] = parsed;
                    fieldValues[fieldLabel] = parsed;
                } catch {
                    fieldValues[match] = fieldData.value;
                    fieldValues[fieldLabel] = fieldData.value;
                }
            }
        }
    });

    // Process GROUP functions
    expression = expression.replace(/GROUP_SUM\("([^"]+)"\)/g, (match, fieldLabel) => {
        const field = fields.find(f => f.label === fieldLabel);
        if (!field) return '0';

        let sum = 0;
        allGroupRows.forEach(row => {
            const fieldData = row.data?.find(d => d.fieldLabel === field.label);
            if (fieldData) {
                try {
                    const parsed = JSON.parse(fieldData.value || "0");
                    sum += parseFloat(parsed) || 0;
                } catch {
                    sum += parseFloat(fieldData.value || "0") || 0;
                }
            }
        });

        console.log('GROUP_SUM result:', sum);
        return sum.toString();
    });

    expression = expression.replace(/GROUP_AVG\("([^"]+)"\)/g, (match, fieldLabel) => {
        const field = fields.find(f => f.label === fieldLabel);
        if (!field) return '0';

        const values = [];
        allGroupRows.forEach(row => {
            const fieldData = row.data?.find(d => d.fieldLabel === field.label);
            if (fieldData) {
                try {
                    const parsed = JSON.parse(fieldData.value || "0");
                    const num = parseFloat(parsed) || 0;
                    if (num !== 0) values.push(num);
                } catch {
                    const num = parseFloat(fieldData.value || "0") || 0;
                    if (num !== 0) values.push(num);
                }
            }
        });

        const avg = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
        console.log('GROUP_AVG result:', avg);
        return avg.toString();
    });

    expression = expression.replace(/GROUP_COUNT\("([^"]+)"\)/g, (match, fieldLabel) => {
        console.log('GROUP_COUNT result:', allGroupRows.length);
        return allGroupRows.length.toString();
    });

    // Restore and evaluate IF conditions
    Object.entries(ifReplacements).forEach(([placeholder, ifStatement]) => {
        const ifContent = ifStatement.match(/IF\((.*)\)/)[1];
        const parts = splitIfParts(ifContent);

        if (parts.length === 3) {
            let [condition, trueVal, falseVal] = parts;

            // Replace field references in condition
            Object.entries(fieldValues).forEach(([fieldRef, value]) => {
                if (condition.includes(fieldRef)) {
                    if (typeof value === 'string') {
                        condition = condition.replace(new RegExp(fieldRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `'${value}'`);
                    } else if (value === null) {
                        condition = condition.replace(new RegExp(fieldRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'null');
                    } else {
                        condition = condition.replace(new RegExp(fieldRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
                    }
                }
            });

            condition = condition.replace(/\s*==\s*/g, ' === ').replace(/\s*=\s*(?!=)/g, ' === ');

            try {
                const conditionResult = eval(condition.trim());
                const result = conditionResult ? evaluateValue(trueVal, fieldValues) : evaluateValue(falseVal, fieldValues);

                console.log('IF condition result:', result);

                if (typeof result === 'string') {
                    expression = expression.replace(placeholder, `'${result}'`);
                } else {
                    expression = expression.replace(placeholder, result);
                }
            } catch (error) {
                console.error('IF evaluation error:', error);
                expression = expression.replace(placeholder, evaluateValue(falseVal, fieldValues));
            }
        }
    });

    // If final expression is a string literal, return it
    const stringMatch = expression.match(/^['"](.*)['"]$/);
    if (stringMatch) {
        return stringMatch[1];
    }

    // Replace remaining field references with numeric values
    Object.entries(fieldValues).forEach(([fieldRef, value]) => {
        if (expression.includes(fieldRef)) {
            const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
            expression = expression.replace(new RegExp(fieldRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), numValue);
        }
    });

    // Handle math functions
    expression = expression
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/abs\(/g, 'Math.abs(')
        .replace(/round\(/g, 'Math.round(')
        .replace(/\^/g, '**');

    try {
        const result = eval(expression);
        console.log('Final calculation result:', result);
        return typeof result === 'string' ? result : result;
    } catch (error) {
        console.error('Expression evaluation error:', error);
        return 0;
    }
};

/**
 * Evaluate normal row-wise calculation
 */
const evaluateRowCalculation = (calcField, rowData, fields) => {
    // Same logic as before for normal calculations
    const formula = calcField.formula;

    // Extract field references
    const fieldMatches = formula.match(/"([^"]+)"/g) || [];

    let result = 0;
    const values = [];

    fieldMatches.forEach(match => {
        const fieldLabel = match.replace(/"/g, '');
        const field = fields.find(f => f.label === fieldLabel);

        if (field) {
            const baseFieldId = field.id.split(':')[0];
            // ✅ FIXED: Handle submission.submissionData structure
            const fieldData = submission.submissionData?.find(d => d.fieldLabel === baseFieldId);

            let value = null;

            if (fieldData) {
                try {
                    const parsed = JSON.parse(fieldData.fieldValue || "null");
                    if (Array.isArray(parsed)) {
                        const columnName = field.label.split('→').pop().trim();
                        // ✅ FIX: Sum ALL rows, not just first
                        value = parsed.reduce((sum, row) => {
                            const cellValue = parseFloat(row[columnName]) || 0;
                            return sum + cellValue;
                        }, 0);
                    } else {
                        value = parsed;
                    }
                } catch {
                    value = fieldData.fieldValue;
                }
            }
            fieldValues[match] = value;
            fieldValues[fieldLabel] = value;
        }
    });

    // Apply function
    switch (calcField.functionType) {
        case 'ADD':
            result = values.reduce((sum, val) => sum + val, 0);
            break;
        case 'SUBTRACT':
            result = values.length >= 2 ? values[0] - values[1] : 0;
            break;
        case 'MULTIPLY':
            result = values.reduce((product, val) => product * val, 1);
            break;
        case 'DIVIDE':
            result = values.length >= 2 && values[1] !== 0 ? values[0] / values[1] : 0;
            break;
        default:
            result = values[0] || 0;
    }

    return result;
};

/**
 * Helper function to evaluate a value
 */
const evaluateValue = (val, fieldValues) => {
    val = val.trim();

    if (val.startsWith("'") && val.endsWith("'")) {
        return val.slice(1, -1);
    }

    if (val.startsWith('"') && val.endsWith('"')) {
        const fieldName = val.slice(1, -1);
        return fieldValues[fieldName] || fieldName;
    }

    const numValue = parseFloat(val);
    if (!isNaN(numValue)) {
        return numValue;
    }

    return val;
};

/**
 * Helper to split IF statement parts properly
 */
const splitIfParts = (content) => {
    const parts = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = null;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];

        if ((char === '"' || char === "'") && content[i - 1] !== '\\') {
            if (!inString) {
                inString = true;
                stringChar = char;
            } else if (char === stringChar) {
                inString = false;
                stringChar = null;
            }
        }

        if (!inString) {
            if (char === '(') depth++;
            if (char === ')') depth--;

            if (char === ',' && depth === 0) {
                parts.push(current.trim());
                current = '';
                continue;
            }
        }

        current += char;
    }

    if (current) {
        parts.push(current.trim());
    }

    return parts;
};

/**
 * Format calculated value
 */
const formatCalculatedValue = (value, calcField) => {
    if (typeof value === 'string' && isNaN(parseFloat(value))) {
        return value;
    }

    if (value === null || value === undefined || isNaN(value)) {
        return "0";
    }

    const precision = calcField.precision || 2;

    switch (calcField.format) {
        case 'currency':
            return value.toFixed(precision);
        case 'percentage':
            return value.toFixed(precision);
        case 'integer':
            return Math.round(value).toString();
        case 'decimal':
        default:
            return value.toFixed(precision);
    }
};