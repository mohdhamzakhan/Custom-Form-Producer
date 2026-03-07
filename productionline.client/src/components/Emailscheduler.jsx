import React, { useState, useEffect, useCallback } from "react";
import {
    Plus, Edit2, Trash2, Play, Pause, Send, Clock, Users,
    Paperclip, ChevronDown, ChevronUp, X, Check, AlertCircle,
    Calendar, RefreshCw, Eye, Mail, Bell
} from "lucide-react";
import { toast } from "react-toastify";
import { APP_CONSTANTS } from "./store";
import useAdSearch from "./hooks/useAdSearch";
import Layout from "./Layout";

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────
const OCCURRENCE_TYPES = [
    { value: "Once", label: "Once (single send)" },
    { value: "Daily", label: "Daily" },
    { value: "Weekly", label: "Weekly" },
    { value: "Monthly", label: "Monthly" },
    { value: "Custom", label: "Custom (cron)" },
];

const WEEKDAYS = [
    { value: 0, label: "Sun" }, { value: 1, label: "Mon" },
    { value: 2, label: "Tue" }, { value: 3, label: "Wed" },
    { value: 4, label: "Thu" }, { value: 5, label: "Fri" },
    { value: 6, label: "Sat" },
];

const STATUS_COLORS = {
    Active: "bg-green-100 text-green-800",
    Paused: "bg-yellow-100 text-yellow-800",
    Completed: "bg-gray-100 text-gray-700",
    Failed: "bg-red-100 text-red-800",
};

const API = `${APP_CONSTANTS.API_BASE_URL}/api/email-schedules`;

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
const formatDate = (d) =>
    d ? new Date(d).toLocaleString() : "—";

const formatBytes = (b) => {
    if (!b) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

// ─────────────────────────────────────────────────────────────────
// Sub-component: Recipient Picker
// ─────────────────────────────────────────────────────────────────
// Dedup helper — unique by adObjectId OR email (case-insensitive), per recipientType
const deduplicateRecipients = (list) => {
    const seen = new Set();
    return list.filter((r) => {
        // Build a unique key: prefer adObjectId, fall back to lowercase email
        const key = `${r.recipientType}::${(r.adObjectId || r.email || r.name || "").toLowerCase()
            }`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const RecipientPicker = ({ recipients, onChange }) => {
    const [search, setSearch] = useState("");
    const [recipientType, setRecipientType] = useState("to");
    const { searchResults, isSearching, searchAdDirectory } = useAdSearch();

    // Dedup on mount in case saved data already has duplicates
    useEffect(() => {
        const deduped = deduplicateRecipients(recipients);
        if (deduped.length !== recipients.length) {
            onChange(deduped);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (search.length >= 3) searchAdDirectory(search);
    }, [search, searchAdDirectory]);

    const add = (item) => {
        // Check duplicate: same adObjectId OR same email, regardless of recipientType
        const isDuplicate = recipients.some((r) => {
            const sameId = r.adObjectId && item.id && r.adObjectId.toLowerCase() === item.id.toLowerCase();
            const sameEmail = r.email && item.email && r.email.toLowerCase() === item.email.toLowerCase();
            return sameId || sameEmail;
        });

        if (isDuplicate) {
            toast.warning(`"${item.name}" is already added.`);
            return;
        }

        const newRecipient = {
            type: item.type,
            name: item.name,
            email: item.email || null,
            adObjectId: item.id,
            recipientType,
        };

        onChange(deduplicateRecipients([...recipients, newRecipient]));
        setSearch("");
    };

    const remove = (idx) => onChange(recipients.filter((_, i) => i !== idx));

    return (
        <div>
            <div className="flex gap-2 mb-2">
                <input
                    className="flex-1 border rounded px-3 py-2 text-sm"
                    placeholder="Search AD users or groups (min 3 chars)…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select
                    value={recipientType}
                    onChange={(e) => setRecipientType(e.target.value)}
                    className="border rounded px-2 py-2 text-sm"
                >
                    <option value="to">To</option>
                    <option value="cc">CC</option>
                    <option value="bcc">BCC</option>
                </select>
            </div>

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
                <div className="border rounded bg-white shadow max-h-48 overflow-y-auto mb-3">
                    {searchResults.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => add(item)}
                            className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2 text-sm"
                        >
                            <Users size={14} className="text-gray-500 shrink-0" />
                            <div>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-xs text-gray-500">
                                    {item.type === "user" ? item.email : "Group"}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Chips */}
            <div className="flex flex-wrap gap-2">
                {recipients.map((r, idx) => (
                    <span
                        key={idx}
                        className={`flex items-center gap-1 text-xs rounded-full px-3 py-1 ${r.recipientType === "cc"
                                ? "bg-blue-100 text-blue-800"
                                : r.recipientType === "bcc"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-green-100 text-green-800"
                            }`}
                    >
                        {r.recipientType.toUpperCase()} · {r.name}
                        <button onClick={() => remove(idx)}>
                            <X size={12} />
                        </button>
                    </span>
                ))}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────
// Sub-component: Recurrence Picker
// ─────────────────────────────────────────────────────────────────
const RecurrencePicker = ({ form, onChange }) => {
    const toggleDay = (day) => {
        const current = form.recurrenceDays
            ? form.recurrenceDays.split(",").map(Number)
            : [];
        const next = current.includes(day)
            ? current.filter((d) => d !== day)
            : [...current, day].sort((a, b) => a - b);
        onChange({ recurrenceDays: next.join(",") });
    };

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium mb-1">Occurrence</label>
                    <select
                        className="w-full border rounded px-3 py-2 text-sm"
                        value={form.occurrenceType}
                        onChange={(e) => onChange({ occurrenceType: e.target.value })}
                    >
                        {OCCURRENCE_TYPES.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Send Time (UTC)</label>
                    <input
                        type="time"
                        className="w-full border rounded px-3 py-2 text-sm"
                        value={form.sendTime || "08:00"}
                        onChange={(e) => onChange({ sendTime: e.target.value })}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium mb-1">Start Date/Time (UTC)</label>
                    <input
                        type="datetime-local"
                        className="w-full border rounded px-3 py-2 text-sm"
                        value={form.startDateTime || ""}
                        onChange={(e) => onChange({ startDateTime: e.target.value })}
                    />
                </div>
                {form.occurrenceType !== "Once" && (
                    <div>
                        <label className="block text-sm font-medium mb-1">End Date (optional)</label>
                        <input
                            type="datetime-local"
                            className="w-full border rounded px-3 py-2 text-sm"
                            value={form.endDateTime || ""}
                            onChange={(e) => onChange({ endDateTime: e.target.value || null })}
                        />
                    </div>
                )}
            </div>

            {/* Weekly day picker */}
            {form.occurrenceType === "Weekly" && (
                <div>
                    <label className="block text-sm font-medium mb-2">Days of Week</label>
                    <div className="flex gap-2 flex-wrap">
                        {WEEKDAYS.map((d) => {
                            const active = (form.recurrenceDays || "")
                                .split(",")
                                .map(Number)
                                .includes(d.value);
                            return (
                                <button
                                    key={d.value}
                                    type="button"
                                    onClick={() => toggleDay(d.value)}
                                    className={`w-10 h-10 rounded-full text-xs font-medium border transition-colors ${active
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                                        }`}
                                >
                                    {d.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Monthly day */}
            {form.occurrenceType === "Monthly" && (
                <div>
                    <label className="block text-sm font-medium mb-1">Day of Month</label>
                    <input
                        type="number"
                        min="1"
                        max="28"
                        className="w-24 border rounded px-3 py-2 text-sm"
                        value={form.recurrenceDays || "1"}
                        onChange={(e) => onChange({ recurrenceDays: e.target.value })}
                    />
                    <span className="text-xs text-gray-500 ml-2">
                        (use 1–28 to avoid month-end issues)
                    </span>
                </div>
            )}

            {/* Custom cron */}
            {form.occurrenceType === "Custom" && (
                <div>
                    <label className="block text-sm font-medium mb-1">Cron Expression</label>
                    <input
                        type="text"
                        placeholder="e.g. 0 9 * * 1-5"
                        className="w-full border rounded px-3 py-2 text-sm font-mono"
                        value={form.cronExpression || ""}
                        onChange={(e) => onChange({ cronExpression: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Format: minute hour day-of-month month day-of-week
                    </p>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────
// Sub-component: Schedule Form Modal
// ─────────────────────────────────────────────────────────────────
const ScheduleModal = ({ schedule, onClose, onSaved }) => {
    const isEdit = !!schedule?.id;

    const blankForm = {
        title: "",
        subject: "",
        body: "",
        occurrenceType: "Once",
        startDateTime: "",
        endDateTime: "",
        cronExpression: "",
        recurrenceDays: "",
        sendTime: "08:00",
        recipients: [],
    };

    const [form, setForm] = useState(() => {
        if (!isEdit) return blankForm;
        return {
            ...schedule,
            // Dedup immediately on load — fixes duplicates already saved in DB
            recipients: deduplicateRecipients(schedule.recipients || []),
        };
    });
    const [attachments, setAttachments] = useState([]);
    const [existingAttachments, setExistingAttachments] = useState(
        schedule?.attachments || []
    );
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("general");

    const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

    const handleFileAdd = (e) => {
        const files = Array.from(e.target.files);
        setAttachments((prev) => [...prev, ...files]);
        e.target.value = "";
    };

    const removeNewAttachment = (idx) =>
        setAttachments((prev) => prev.filter((_, i) => i !== idx));

    const removeExistingAttachment = async (attId) => {
        try {
            await fetch(`${API}/attachments/${attId}`, { method: "DELETE" });
            setExistingAttachments((prev) => prev.filter((a) => a.id !== attId));
            toast.success("Attachment removed.");
        } catch {
            toast.error("Failed to remove attachment.");
        }
    };

    const handleSave = async () => {
        if (!form.title.trim() || !form.subject.trim() || !form.body.trim()) {
            toast.error("Title, subject, and body are required.");
            return;
        }
        if (!form.startDateTime) {
            toast.error("Start date/time is required.");
            return;
        }
        if (form.recipients.length === 0) {
            toast.error("Please add at least one recipient.");
            return;
        }

        setSaving(true);
        try {
            // Always dedup before saving — catches any duplicates that slipped through
            const cleanRecipients = deduplicateRecipients(form.recipients);

            const payload = {
                title: form.title,
                subject: form.subject,
                body: form.body,
                occurrenceType: form.occurrenceType,
                startDateTime: new Date(form.startDateTime).toISOString(),
                endDateTime: form.endDateTime
                    ? new Date(form.endDateTime).toISOString()
                    : null,
                cronExpression: form.cronExpression || null,
                recurrenceDays: form.recurrenceDays || null,
                sendTime: form.sendTime || null,
                recipients: cleanRecipients,
            };

            let savedId;
            if (isEdit) {
                await fetch(`${API}/${schedule.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                savedId = schedule.id;
                toast.success("Schedule updated!");
            } else {
                const res = await fetch(API, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                savedId = data.id;
                toast.success("Schedule created!");
            }

            // Upload new attachments
            for (const file of attachments) {
                const fd = new FormData();
                fd.append("file", file);
                await fetch(`${API}/${savedId}/attachments`, {
                    method: "POST",
                    body: fd,
                });
            }

            onSaved();
            onClose();
        } catch (err) {
            toast.error("Save failed: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const tabs = ["general", "recipients", "schedule", "attachments"];

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold">
                        {isEdit ? "Edit Schedule" : "New Email Schedule"}
                    </h2>
                    <button onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b px-6">
                    {tabs.map((t) => (
                        <button
                            key={t}
                            onClick={() => setActiveTab(t)}
                            className={`py-3 px-4 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === t
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {/* ── GENERAL ─────────────────────────────────── */}
                    {activeTab === "general" && (
                        <>
                            <div>
                                <label className="block text-sm font-medium mb-1">Title</label>
                                <input
                                    className="w-full border rounded px-3 py-2 text-sm"
                                    placeholder="e.g. Weekly Sales Report Reminder"
                                    value={form.title}
                                    onChange={(e) => update({ title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Subject</label>
                                <input
                                    className="w-full border rounded px-3 py-2 text-sm"
                                    placeholder="Email subject line"
                                    value={form.subject}
                                    onChange={(e) => update({ subject: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Body (HTML supported)
                                </label>
                                <textarea
                                    className="w-full border rounded px-3 py-2 text-sm h-48 font-mono"
                                    placeholder="<p>Hello,</p><p>Please remember to submit your report.</p>"
                                    value={form.body}
                                    onChange={(e) => update({ body: e.target.value })}
                                />
                            </div>
                            {/* Live preview */}
                            {form.body && (
                                <div className="border rounded p-3 bg-gray-50">
                                    <p className="text-xs text-gray-500 mb-2 font-medium">
                                        Preview:
                                    </p>
                                    <div
                                        className="text-sm"
                                        dangerouslySetInnerHTML={{ __html: form.body }}
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* ── RECIPIENTS ────────────────────────────────── */}
                    {activeTab === "recipients" && (
                        <RecipientPicker
                            recipients={form.recipients}
                            onChange={(r) => update({ recipients: r })}
                        />
                    )}

                    {/* ── SCHEDULE ─────────────────────────────────── */}
                    {activeTab === "schedule" && (
                        <RecurrencePicker form={form} onChange={update} />
                    )}

                    {/* ── ATTACHMENTS ─────────────────────────────── */}
                    {activeTab === "attachments" && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Add Attachments
                                </label>
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileAdd}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>

                            {/* New files to upload */}
                            {attachments.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-gray-700">
                                        Pending uploads:
                                    </p>
                                    {attachments.map((f, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between bg-blue-50 rounded px-3 py-2 text-sm"
                                        >
                                            <span className="flex items-center gap-2">
                                                <Paperclip size={14} />
                                                {f.name}{" "}
                                                <span className="text-gray-500">
                                                    ({formatBytes(f.size)})
                                                </span>
                                            </span>
                                            <button
                                                onClick={() => removeNewAttachment(idx)}
                                                className="text-red-500"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Existing attachments */}
                            {existingAttachments.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-gray-700">
                                        Current attachments:
                                    </p>
                                    {existingAttachments.map((a) => (
                                        <div
                                            key={a.id}
                                            className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-sm"
                                        >
                                            <span className="flex items-center gap-2">
                                                <Paperclip size={14} />
                                                {a.fileName}{" "}
                                                <span className="text-gray-500">
                                                    ({formatBytes(a.fileSizeBytes)})
                                                </span>
                                            </span>
                                            <button
                                                onClick={() => removeExistingAttachment(a.id)}
                                                className="text-red-500"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {attachments.length === 0 && existingAttachments.length === 0 && (
                                <p className="text-sm text-gray-500 text-center py-8">
                                    No attachments yet.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded border text-sm hover:bg-gray-100"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
                    >
                        {saving ? (
                            <RefreshCw size={14} className="animate-spin" />
                        ) : (
                            <Check size={14} />
                        )}
                        {saving ? "Saving…" : isEdit ? "Update" : "Create"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────
// Sub-component: Log Modal
// ─────────────────────────────────────────────────────────────────
const LogModal = ({ scheduleId, onClose }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API}/${scheduleId}/logs`)
            .then((r) => r.json())
            .then((data) => {
                setLogs(data);
                setLoading(false);
            });
    }, [scheduleId]);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold">Send History</h2>
                    <button onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {loading ? (
                        <p className="text-center text-gray-500 py-8">Loading…</p>
                    ) : logs.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No logs yet.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-gray-500 border-b">
                                    <th className="pb-2">Sent At</th>
                                    <th className="pb-2">Status</th>
                                    <th className="pb-2">Recipients</th>
                                    <th className="pb-2">Error</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((l) => (
                                    <tr key={l.id} className="border-b last:border-0">
                                        <td className="py-2">{formatDate(l.sentAt)}</td>
                                        <td className="py-2">
                                            <span
                                                className={`px-2 py-0.5 rounded text-xs font-medium ${l.status === "Success"
                                                        ? "bg-green-100 text-green-800"
                                                        : "bg-red-100 text-red-800"
                                                    }`}
                                            >
                                                {l.status}
                                            </span>
                                        </td>
                                        <td className="py-2">
                                            {l.recipientsSucceeded}/{l.recipientsTotal}
                                        </td>
                                        <td className="py-2 text-red-600 text-xs max-w-xs truncate">
                                            {l.errorMessage || "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
const EmailScheduler = () => {
    const [schedules, setSchedules] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [logScheduleId, setLogScheduleId] = useState(null);

    const pageSize = 15;

    // ── Fetch list ──────────────────────────────────────────────────
    const fetchSchedules = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page,
                pageSize,
                ...(statusFilter && { status: statusFilter }),
                ...(search && { search }),
            });
            const res = await fetch(`${API}?${params}`);
            const data = await res.json();
            setSchedules(data.items || []);
            setTotal(data.total || 0);
        } catch {
            toast.error("Failed to load schedules.");
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, search]);

    useEffect(() => {
        fetchSchedules();
    }, [fetchSchedules]);

    // ── Actions ─────────────────────────────────────────────────────
    const handleDelete = async (id) => {
        if (!window.confirm("Delete this schedule?")) return;
        await fetch(`${API}/${id}`, { method: "DELETE" });
        toast.success("Deleted.");
        fetchSchedules();
    };

    const handleToggleStatus = async (s) => {
        const newStatus = s.status === "Active" ? "Paused" : "Active";
        await fetch(`${API}/${s.id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
        });
        toast.success(`${newStatus === "Active" ? "Resumed" : "Paused"}.`);
        fetchSchedules();
    };

    const handleSendNow = async (id) => {
        await fetch(`${API}/${id}/send-now`, { method: "POST" });
        toast.success("Send job queued!");
    };

    const handleEdit = async (id) => {
        const res = await fetch(`${API}/${id}`);
        const data = await res.json();
        // convert ISO dates to local datetime-local format
        data.startDateTime = data.startDateTime
            ? new Date(data.startDateTime).toISOString().slice(0, 16)
            : "";
        data.endDateTime = data.endDateTime
            ? new Date(data.endDateTime).toISOString().slice(0, 16)
            : "";
        setEditingSchedule(data);
        setModalOpen(true);
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <Layout>
            <div className="max-w-7xl mx-auto p-4">
                {/* ── Header ─────────────────────────────────────────── */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Bell size={24} className="text-blue-600" />
                            Email Scheduler
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {total} schedule{total !== 1 ? "s" : ""} configured
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingSchedule(null);
                            setModalOpen(true);
                        }}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                        <Plus size={16} />
                        New Schedule
                    </button>
                </div>

                {/* ── Filters ────────────────────────────────────────── */}
                <div className="flex gap-3 mb-4 flex-wrap">
                    <input
                        type="text"
                        placeholder="Search title or subject…"
                        className="border rounded px-3 py-2 text-sm flex-1 min-w-48"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                    <select
                        className="border rounded px-3 py-2 text-sm"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Paused">Paused</option>
                        <option value="Completed">Completed</option>
                        <option value="Failed">Failed</option>
                    </select>
                    <button
                        onClick={fetchSchedules}
                        className="border rounded px-3 py-2 hover:bg-gray-50"
                        title="Refresh"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>

                {/* ── Table ──────────────────────────────────────────── */}
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="text-center py-16 text-gray-500">Loading…</div>
                    ) : schedules.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <Mail size={40} className="mx-auto mb-3 opacity-30" />
                            <p>No schedules found.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="text-left px-4 py-3">Title / Subject</th>
                                    <th className="text-left px-4 py-3">Occurrence</th>
                                    <th className="text-left px-4 py-3">Next Send</th>
                                    <th className="text-left px-4 py-3">Recipients</th>
                                    <th className="text-left px-4 py-3">Sent</th>
                                    <th className="text-left px-4 py-3">Status</th>
                                    <th className="text-right px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {schedules.map((s) => (
                                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{s.title}</div>
                                            <div className="text-gray-500 text-xs">{s.subject}</div>
                                        </td>
                                        <td className="px-4 py-3 capitalize">{s.occurrenceType}</td>
                                        <td className="px-4 py-3 text-xs text-gray-600">
                                            {s.nextSendAt ? formatDate(s.nextSendAt) : "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="flex items-center gap-1 text-gray-600">
                                                <Users size={13} />
                                                {s.recipientCount}
                                                {s.attachmentCount > 0 && (
                                                    <span className="ml-2 flex items-center gap-0.5 text-gray-400">
                                                        <Paperclip size={12} />
                                                        {s.attachmentCount}
                                                    </span>
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {s.totalSentCount}×
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[s.status] || "bg-gray-100 text-gray-600"
                                                    }`}
                                            >
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                {/* Pause / Resume */}
                                                {(s.status === "Active" || s.status === "Paused") && (
                                                    <button
                                                        onClick={() => handleToggleStatus(s)}
                                                        title={s.status === "Active" ? "Pause" : "Resume"}
                                                        className="p-1.5 rounded hover:bg-yellow-50 text-yellow-600"
                                                    >
                                                        {s.status === "Active" ? (
                                                            <Pause size={15} />
                                                        ) : (
                                                            <Play size={15} />
                                                        )}
                                                    </button>
                                                )}

                                                {/* Send Now */}
                                                <button
                                                    onClick={() => handleSendNow(s.id)}
                                                    title="Send now"
                                                    className="p-1.5 rounded hover:bg-green-50 text-green-600"
                                                >
                                                    <Send size={15} />
                                                </button>

                                                {/* Logs */}
                                                <button
                                                    onClick={() => setLogScheduleId(s.id)}
                                                    title="View logs"
                                                    className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                                                >
                                                    <Eye size={15} />
                                                </button>

                                                {/* Edit */}
                                                <button
                                                    onClick={() => handleEdit(s.id)}
                                                    title="Edit"
                                                    className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                                                >
                                                    <Edit2 size={15} />
                                                </button>

                                                {/* Delete */}
                                                <button
                                                    onClick={() => handleDelete(s.id)}
                                                    title="Delete"
                                                    className="p-1.5 rounded hover:bg-red-50 text-red-500"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ── Pagination ─────────────────────────────────────── */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 text-sm">
                        <span className="text-gray-500">
                            Showing {(page - 1) * pageSize + 1}–
                            {Math.min(page * pageSize, total)} of {total}
                        </span>
                        <div className="flex gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage((p) => p - 1)}
                                className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
                            >
                                ‹ Prev
                            </button>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage((p) => p + 1)}
                                className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
                            >
                                Next ›
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Modals ─────────────────────────────────────────── */}
                {modalOpen && (
                    <ScheduleModal
                        schedule={editingSchedule}
                        onClose={() => {
                            setModalOpen(false);
                            setEditingSchedule(null);
                        }}
                        onSaved={fetchSchedules}
                    />
                )}

                {logScheduleId && (
                    <LogModal
                        scheduleId={logScheduleId}
                        onClose={() => setLogScheduleId(null)}
                    />
                )}
            </div>
        </Layout>
    );
};

export default EmailScheduler;