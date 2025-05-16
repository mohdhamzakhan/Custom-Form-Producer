// Add this component to handle different views in ReportViewer.jsx

import { useState } from 'react';

function ReportDisplayOptions({
    reportData,
    headers,
    calculatedFields,
    displayMode,
    setDisplayMode
}) {
    const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);

    // Display options
    const displayOptions = [
        { id: 'table', label: 'Table View' },
        { id: 'detail', label: 'Detail View' },
        { id: 'summary', label: 'Summary View' }
    ];

    // Format the date strings
    const formatDate = (dateStr) => {
        try {
            return new Date(dateStr).toLocaleString();
        } catch (e) {
            return dateStr;
        }
    };

    // Evaluate formula safely
    const evaluateFormula = (formula, rowData) => {
        let evaluated = formula;
        rowData.forEach(field => {
            const value = isNaN(Number(field.value)) ? 0 : Number(field.value);
            evaluated = evaluated.replaceAll(`{${field.fieldLabel}}`, value);
        });
        try {
            return eval(evaluated);
        } catch {
            return "-";
        }
    };

    // Get summary statistics
    const getSummaryStats = () => {
        if (!reportData.length) return [];

        // Get all numeric fields
        const numericFields = headers.filter(header => {
            // Check if the field has numeric values
            const fieldValues = reportData.map(row => {
                const field = row.data.find(f => f.fieldLabel === header);
                return field ? field.value : null;
            });

            // Consider field numeric if at least 50% of values are numbers
            const numericCount = fieldValues.filter(val =>
                val !== null && !isNaN(Number(val))
            ).length;

            return numericCount > fieldValues.length * 0.5;
        });

        // Calculate stats for numeric fields
        return numericFields.map(field => {
            const values = reportData.map(row => {
                const fieldData = row.data.find(f => f.fieldLabel === field);
                return fieldData ? Number(fieldData.value) : null;
            }).filter(val => val !== null && !isNaN(val));

            // Skip if no valid values
            if (!values.length) return null;

            // Calculate statistics
            const sum = values.reduce((acc, val) => acc + val, 0);
            const avg = sum / values.length;
            const min = Math.min(...values);
            const max = Math.max(...values);

            return {
                field,
                min,
                max,
                avg,
                sum,
                count: values.length
            };
        }).filter(Boolean);
    };

    // Get a single row by submission ID
    const getRowById = (id) => {
        return reportData.find(row => row.submissionId === id) || null;
    };

    // Render the right display based on mode
    const renderDisplay = () => {
        switch (displayMode) {
            case 'detail':
                return renderDetailView();
            case 'summary':
                return renderSummaryView();
            case 'table':
            default:
                return renderTableView();
        }
    };

    // Table view (default)
    const renderTableView = () => {
        return (
            <>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select a row to view details:
                    </label>
                    <select
                        className="border p-2 rounded w-full"
                        value={selectedSubmissionId || ''}
                        onChange={(e) => {
                            setSelectedSubmissionId(e.target.value);
                            if (e.target.value) {
                                setDisplayMode('detail');
                            }
                        }}
                    >
                        <option value="">-- Select a submission --</option>
                        {reportData.map(row => (
                            <option key={row.submissionId} value={row.submissionId}>
                                ID: {row.submissionId} - {formatDate(row.submittedAt)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="overflow-auto border rounded">
                    <table className="min-w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-2 border-b text-left">Submission ID</th>
                                <th className="px-4 py-2 border-b text-left">Submitted At</th>
                                {headers.map((header, idx) => (
                                    <th key={idx} className="px-4 py-2 border-b text-left">{header}</th>
                                ))}
                                {calculatedFields.map((calc, idx) => (
                                    <th key={idx} className="px-4 py-2 border-b text-right">
                                        {calc.label}
                                        {calc.description && (
                                            <span className="block text-xs text-gray-500">{calc.description}</span>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map((row, index) => (
                                <tr
                                    key={index}
                                    className={`border-b hover:bg-blue-50 cursor-pointer ${selectedSubmissionId === row.submissionId ? 'bg-blue-100' : ''
                                        }`}
                                    onClick={() => {
                                        setSelectedSubmissionId(row.submissionId);
                                        setDisplayMode('detail');
                                    }}
                                >
                                    <td className="px-4 py-2">{row.submissionId}</td>
                                    <td className="px-4 py-2">{formatDate(row.submittedAt)}</td>
                                    {row.data.map((field, idx) => (
                                        <td key={idx} className="px-4 py-2">
                                            {field.value}
                                        </td>
                                    ))}
                                    {calculatedFields.map((calc, idx) => (
                                        <td key={idx} className="px-4 py-2 font-semibold text-right">
                                            {evaluateFormula(calc.formula, row.data)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </>
        );
    };

    // Detail view (single row)
    const renderDetailView = () => {
        const row = getRowById(selectedSubmissionId);

        if (!row) {
            return (
                <div className="p-6 text-center">
                    <p>No submission selected</p>
                    <button
                        className="bg-blue-600 text-white px-4 py-2 rounded mt-4"
                        onClick={() => setDisplayMode('table')}
                    >
                        Back to Table View
                    </button>
                </div>
            );
        }

        return (
            <div className="border rounded p-6 bg-white">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">
                        Submission Details #{row.submissionId}
                    </h3>
                    <button
                        className="bg-blue-600 text-white px-4 py-2 rounded"
                        onClick={() => setDisplayMode('table')}
                    >
                        Back to Table View
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <div className="mb-4">
                            <span className="block text-gray-500 text-sm">Submitted At</span>
                            <span className="text-lg">{formatDate(row.submittedAt)}</span>
                        </div>

                        <div className="border-t pt-4">
                            <h4 className="font-bold mb-2">Form Fields</h4>
                            <div className="space-y-3">
                                {row.data.map((field, idx) => (
                                    <div key={idx} className="grid grid-cols-2">
                                        <span className="text-gray-600">{field.fieldLabel}</span>
                                        <span className="font-medium">{field.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        {calculatedFields.length > 0 && (
                            <div className="mb-6">
                                <h4 className="font-bold mb-3">Calculated Fields</h4>
                                {calculatedFields.map((calc, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-gray-50 p-4 rounded mb-2 border-l-4 border-blue-500"
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold">{calc.label}</span>
                                            <span className="text-xl font-mono">
                                                {evaluateFormula(calc.formula, row.data)}
                                            </span>
                                        </div>
                                        {calc.description && (
                                            <p className="text-sm text-gray-600 mt-1">{calc.description}</p>
                                        )}
                                        <div className="text-xs text-gray-500 mt-2">
                                            Formula: {calc.formula}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Summary view (aggregated stats)
    const renderSummaryView = () => {
        const stats = getSummaryStats();

        return (
            <div className="border rounded p-6 bg-white">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">
                        Summary Statistics
                    </h3>
                    <button
                        className="bg-blue-600 text-white px-4 py-2 rounded"
                        onClick={() => setDisplayMode('table')}
                    >
                        Back to Table View
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2">
                        <div className="mb-4">
                            <span className="block text-gray-500 text-sm">Total Records</span>
                            <span className="text-2xl font-bold">{reportData.length}</span>
                        </div>

                        <div className="overflow-auto">
                            <table className="min-w-full border border-gray-300">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-2 border">Field</th>
                                        <th className="px-4 py-2 border">Min</th>
                                        <th className="px-4 py-2 border">Max</th>
                                        <th className="px-4 py-2 border">Average</th>
                                        <th className="px-4 py-2 border">Sum</th>
                                        <th className="px-4 py-2 border">Count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.map((stat, idx) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-2 border font-medium">{stat.field}</td>
                                            <td className="px-4 py-2 border text-right">{stat.min.toFixed(2)}</td>
                                            <td className="px-4 py-2 border text-right">{stat.max.toFixed(2)}</td>
                                            <td className="px-4 py-2 border text-right">{stat.avg.toFixed(2)}</td>
                                            <td className="px-4 py-2 border text-right">{stat.sum.toFixed(2)}</td>
                                            <td className="px-4 py-2 border text-right">{stat.count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {calculatedFields.length > 0 && (
                        <div className="col-span-2 mt-6">
                            <h4 className="font-bold mb-3">Calculated Fields Summary</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {calculatedFields.map((calc, idx) => {
                                    // Calculate average, min, max for this formula
                                    const values = reportData.map(row => {
                                        return evaluateFormula(calc.formula, row.data);
                                    }).filter(val => val !== "-" && !isNaN(val));

                                    if (!values.length) return null;

                                    const sum = values.reduce((acc, val) => acc + val, 0);
                                    const avg = sum / values.length;
                                    const min = Math.min(...values);
                                    const max = Math.max(...values);

                                    return (
                                        <div
                                            key={idx}
                                            className="bg-gray-50 p-4 rounded border-l-4 border-green-500"
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold">{calc.label}</span>
                                            </div>

                                            {calc.description && (
                                                <p className="text-sm text-gray-600 mt-1">{calc.description}</p>
                                            )}

                                            <div className="grid grid-cols-2 gap-2 mt-3">
                                                <div>
                                                    <span className="text-gray-500 text-sm">Average</span>
                                                    <span className="block text-lg font-mono">{avg.toFixed(2)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 text-sm">Min / Max</span>
                                                    <span className="block text-lg font-mono">
                                                        {min.toFixed(2)} / {max.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }).filter(Boolean)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Report Results</h3>
                <div className="flex space-x-2">
                    {displayOptions.map(option => (
                        <button
                            key={option.id}
                            className={`px-3 py-1 rounded ${displayMode === option.id
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 hover:bg-gray-300'
                                }`}
                            onClick={() => setDisplayMode(option.id)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {renderDisplay()}
        </div>
    );
}

export default ReportDisplayOptions;