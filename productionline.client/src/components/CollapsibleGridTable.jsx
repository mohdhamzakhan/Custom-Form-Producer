import React, { useState } from "react";

function CollapsibleGridTable({ label, columns, rows, maxPreviewRows = 3 }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="mb-4">
            <button
                className="flex items-center font-semibold mb-1 text-blue-600"
                onClick={() => setOpen(v => !v)}
            >
                {open ? "▼" : "▶"}&nbsp;{label}
                <span className="ml-2 bg-gray-200 text-gray-700 px-2 rounded text-xs">{rows.length} rows</span>
            </button>
            {open && (
                <div className="overflow-x-auto max-h-48 overflow-y-auto border rounded">
                    <table className="min-w-max table-auto bg-white">
                        <thead>
                            <tr>
                                {columns.map(col => (
                                    <th key={col.colId} className="border px-2 py-1 bg-gray-50">
                                        {col.label.split("→").pop().trim()}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.slice(0, maxPreviewRows).map((row, i) => (
                                <tr key={i}>
                                    {columns.map(col => (
                                        <td key={col.colId} className="border px-2 py-1">
                                            {row[col.label.split("→").pop().trim()] ?? ""}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {rows.length > maxPreviewRows && (
                        <div className="p-2 text-xs text-gray-500">
                            +{rows.length - maxPreviewRows} more rows not shown...
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default CollapsibleGridTable;