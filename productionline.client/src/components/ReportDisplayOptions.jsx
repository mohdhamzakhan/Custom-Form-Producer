// Updated ReportDisplayOptions.jsx
import { useState } from 'react';

function ReportDisplayOptions({ reportData, headers, calculatedFields, displayMode, setDisplayMode, summaryRows }) {
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

    // Get calculated field value from row data
    const getCalculatedFieldValue = (calcField, rowData) => {
        const fieldData = rowData.find(d => d.fieldLabel === calcField.label);
        return fieldData ? fieldData.value : '—';
    };

    // Get summary statistics
    const getSummaryStats = () => {
        if (!reportData.length) return [];

        // Get all numeric fields (including calculated ones)
        const allFields = [...headers, ...calculatedFields.map(cf => cf.label)];

        const numericFields = allFields.filter(fieldName => {
            // Check if the field has numeric values
            const fieldValues = reportData.map(row => {
                const field = row.data.find(f => f.fieldLabel === fieldName);
                return field ? field.value : null;
            });

            // Consider field numeric if at least 50% of values are numbers
            const numericCount = fieldValues.filter(val => {
                if (val === null || val === undefined || val === '') return false;
                const numVal = parseFloat(val.toString().replace(/[$,%]/g, ''));
                return !isNaN(numVal);
            }).length;

            return numericCount > fieldValues.length * 0.5;
        });

        // Calculate stats for numeric fields
        return numericFields.map(fieldName => {
            const values = reportData.map(row => {
                const fieldData = row.data.find(f => f.fieldLabel === fieldName);
                if (!fieldData) return null;

                // Clean the value (remove currency symbols, etc.)
                const cleanValue = fieldData.value.toString().replace(/[$,%]/g, '');
                const numValue = parseFloat(cleanValue);
                return isNaN(numValue) ? null : numValue;
            }).filter(val => val !== null);

            // Skip if no valid values
            if (!values.length) return null;

            // Calculate statistics
            const sum = values.reduce((acc, val) => acc + val, 0);
            const avg = sum / values.length;
            const min = Math.min(...values);
            const max = Math.max(...values);

            return {
                field: fieldName,
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
    // In ReportDisplayOptions.jsx, update this section:
    const renderTableView = () => {
        return (
            <>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 border-b text-left text-sm font-semibold text-gray-900">
                                    Submission ID
                                </th>
                                <th className="px-4 py-2 border-b text-left text-sm font-semibold text-gray-900">
                                    Submitted At
                                </th>
                                {headers.map((header, idx) => (
                                    <th key={idx} className="px-4 py-2 border-b text-left text-sm font-semibold text-gray-900">
                                        {/* Fix: Make sure header is a string, not object */}
                                        {typeof header === 'object' ? header.label : header}
                                    </th>
                                ))}
                                {calculatedFields.map((calc, idx) => (
                                    <th key={idx} className="px-4 py-2 border-b text-left text-sm font-semibold text-blue-700">
                                        {calc.label} <span className="text-xs">(Calculated)</span>
                                        {calc.description && (
                                            <div className="text-xs text-gray-500 mt-1 font-normal">
                                                {calc.description}
                                            </div>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 border-b text-sm">{row.submissionId}</td>
                                    <td className="px-4 py-2 border-b text-sm">{formatDate(row.submittedAt)}</td>
                                    {headers.map((header, fieldIdx) => {
                                        // Fix: Extract header name properly
                                        const headerName = typeof header === 'object' ? header.label : header;
                                        const field = row.data.find(f => f.fieldLabel === headerName);
                                        return (
                                            <td key={fieldIdx} className="px-4 py-2 border-b text-sm">
                                                {field ? field.value : '—'}
                                            </td>
                                        );
                                    })}
                                    {calculatedFields.map((calc, calcIdx) => (
                                        <td key={calcIdx} className="px-4 py-2 border-b text-sm text-blue-700 font-medium">
                                            {getCalculatedFieldValue(calc, row.data)}
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


    // Detail view implementation (similar updates)
    const renderDetailView = () => {
        return (
            <div className="space-y-4">
                <select
                    value={selectedSubmissionId || ''}
                    onChange={(e) => setSelectedSubmissionId(e.target.value)}
                    className="mb-4 p-2 border border-gray-300 rounded"
                >
                    <option value="">Select a submission</option>
                    {reportData.map(row => (
                        <option key={row.submissionId} value={row.submissionId}>
                            {row.submissionId} - {formatDate(row.submittedAt)}
                        </option>
                    ))}
                </select>

                {selectedSubmissionId ? (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        {(() => {
                            const selectedRow = getRowById(selectedSubmissionId);
                            if (!selectedRow) return <p>No submission selected</p>;

                            return (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Submission Details</h3>
                                    <p><strong>ID:</strong> {selectedRow.submissionId}</p>
                                    <p><strong>Submitted:</strong> {formatDate(selectedRow.submittedAt)}</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedRow.data.map((field, idx) => (
                                            <div key={idx} className="border border-gray-200 rounded p-3">
                                                <label className="font-medium text-gray-700">
                                                    {field.fieldLabel}
                                                    {field.fieldType === 'calculated' && (
                                                        <span className="text-blue-600 text-xs ml-2">(Calculated)</span>
                                                    )}
                                                </label>
                                                <p className="mt-1 text-gray-900">{field.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                ) : (
                    <p className="text-gray-500">No submission selected</p>
                )}
            </div>
        );
    };

    // Summary view implementation
    const renderSummaryView = () => {
        const stats = getSummaryStats();

        return (
            <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Summary Statistics</h3>

                    {stats.length > 0 ? (
                        <table className="min-w-full bg-white border border-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 border-b text-left text-sm font-semibold text-gray-900">Field</th>
                                    <th className="px-4 py-2 border-b text-left text-sm font-semibold text-gray-900">Min</th>
                                    <th className="px-4 py-2 border-b text-left text-sm font-semibold text-gray-900">Max</th>
                                    <th className="px-4 py-2 border-b text-left text-sm font-semibold text-gray-900">Average</th>
                                    <th className="px-4 py-2 border-b text-left text-sm font-semibold text-gray-900">Sum</th>
                                    <th className="px-4 py-2 border-b text-left text-sm font-semibold text-gray-900">Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.map((stat, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 border-b text-sm font-medium">{stat.field}</td>
                                        <td className="px-4 py-2 border-b text-sm">{stat.min.toFixed(2)}</td>
                                        <td className="px-4 py-2 border-b text-sm">{stat.max.toFixed(2)}</td>
                                        <td className="px-4 py-2 border-b text-sm">{stat.avg.toFixed(2)}</td>
                                        <td className="px-4 py-2 border-b text-sm">{stat.sum.toFixed(2)}</td>
                                        <td className="px-4 py-2 border-b text-sm">{stat.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-gray-500">No numeric fields available for statistics</p>
                    )}
                </div>

                {/* Calculated Fields Summary */}
                {calculatedFields.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-blue-800 mb-4">Calculated Fields</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {calculatedFields.map((calc, idx) => (
                                <div key={idx} className="bg-white border border-blue-200 rounded p-4">
                                    <h4 className="font-medium text-blue-700">{calc.label}</h4>
                                    {calc.description && (
                                        <p className="text-sm text-gray-600 mt-1">{calc.description}</p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-2 font-mono">{calc.formula}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Display Mode Toggle */}
            <div className="flex space-x-2 mb-4">
                {displayOptions.map(option => (
                    <button
                        key={option.id}
                        onClick={() => setDisplayMode(option.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${displayMode === option.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {/* Render the selected display */}
            {renderDisplay()}
        </div>
    );
}

export default ReportDisplayOptions;
