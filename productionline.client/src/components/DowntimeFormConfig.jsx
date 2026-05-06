// DowntimeFormConfig.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { APP_CONSTANTS } from "./store";

const SLOTS = [
    { key: "timeFrom", label: "Time From", required: true },
    { key: "timeTo", label: "Time To", required: true },
    { key: "date", label: "Date", required: false },
    { key: "cause", label: "Cause / Reason", required: false },
];

export default function DowntimeFormConfig({ forms, value, onChange }) {
    const [dtFields, setDtFields] = useState([]);
    const cfg = value || {};

    useEffect(() => {
        if (!cfg.downtimeFormId) { setDtFields([]); return; }
        axios
            .get(`${APP_CONSTANTS.API_BASE_URL}/api/forms/${cfg.downtimeFormId}/fields`)
            .then(res => {
                const list = Array.isArray(res.data)
                    ? res.data
                    : Array.isArray(res.data.fields) ? res.data.fields : [];
                // Expand grid columns the same way your other components do
                const expanded = [];
                list.forEach(f => {
                    if (f.columnJson) {
                        try {
                            JSON.parse(f.columnJson).forEach(col =>
                                expanded.push({ id: `${f.id}:${col.id}`, label: `${f.label} → ${col.name}` })
                            );
                        } catch { }
                    } else {
                        expanded.push({ id: f.id, label: f.label });
                    }
                });
                setDtFields(expanded);
            })
            .catch(() => setDtFields([]));
    }, [cfg.downtimeFormId]);

    const set = (key, val) => onChange({ ...cfg, [key]: val });
    const setMap = (slot, fieldId) =>
        onChange({ ...cfg, fieldMap: { ...cfg.fieldMap, [slot]: fieldId } });

    const isMapped = slot => !!cfg.fieldMap?.[slot];
    const requiredMet = isMapped("timeFrom") && isMapped("timeTo");

    return (
        <div className="mt-4 border border-red-200 rounded-lg bg-red-50 p-4">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-red-800">Downtime overlay</span>
                <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                    linked by shift time
                </span>
            </div>

            {/* Form selector */}
            <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                    Downtime form <span className="text-red-500">*</span>
                </label>
                <select
                    value={cfg.downtimeFormId || ""}
                    onChange={e => onChange({ downtimeFormId: parseInt(e.target.value), fieldMap: {} })}
                    className="w-full border p-2 rounded text-sm bg-white"
                >
                    <option value="">— select form —</option>
                    {forms.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                    Records are matched by shift time window automatically
                </p>
            </div>

            {/* Field mapping — only shown once a form is picked */}
            {cfg.downtimeFormId > 0 && (
                <>
                    <div className="mb-3">
                        <p className="text-xs font-medium text-gray-600 mb-2">Map fields</p>
                        <div className="space-y-2">
                            {SLOTS.map(slot => (
                                <div key={slot.key} className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 w-28 flex-shrink-0">
                                        {slot.label}
                                        {slot.required && <span className="text-red-500 ml-0.5">*</span>}
                                    </span>
                                    <span className="text-gray-300 text-xs">→</span>
                                    <select
                                        value={cfg.fieldMap?.[slot.key] || ""}
                                        onChange={e => setMap(slot.key, e.target.value)}
                                        className={`flex-1 border p-1.5 rounded text-xs bg-white ${slot.required && !isMapped(slot.key)
                                                ? "border-red-300"
                                                : "border-gray-200"
                                            }`}
                                    >
                                        <option value="">— not mapped —</option>
                                        {dtFields.map(f => (
                                            <option key={f.id} value={f.id}>{f.label}</option>
                                        ))}
                                    </select>
                                    {isMapped(slot.key) && (
                                        <span className="text-green-500 text-xs">✓</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Duration is always auto-calculated */}
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                            <span className="text-green-400">✓</span>
                            Duration auto-calculated from Time From / Time To
                        </div>
                    </div>

                    {!requiredMet && (
                        <p className="text-xs text-red-500 mt-1">
                            Map Time From and Time To to enable the downtime overlay
                        </p>
                    )}
                </>
            )}
        </div>
    );
}