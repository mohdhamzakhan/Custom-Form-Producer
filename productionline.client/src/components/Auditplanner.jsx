import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Plus, Edit2, Trash2, Send, X, Check,
    Calendar, RefreshCw, Eye, Shield, ClipboardList,
    Package, Settings, BookOpen, Users, ChevronDown,
    ChevronLeft, ChevronRight, CheckCircle2, Clock,
    AlertCircle, FileText, Bell, Search, Filter,
    MoreHorizontal, Layers, ArrowRight, Inbox, XCircle
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { APP_CONSTANTS } from "./store";
import useAdSearch from "./hooks/useAdSearch";
import Layout from "./Layout";

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────
const API = `${APP_CONSTANTS.API_BASE_URL}/api/audit-plans`;

const AUDIT_TYPES = [
    { value: "Process", label: "Process Audit", icon: Settings, dot: "#8b5cf6" },
    { value: "Product", label: "Product Audit", icon: Package, dot: "#f59e0b" },
    { value: "System", label: "System Audit", icon: Shield, dot: "#3b82f6" },
    { value: "Compliance", label: "Compliance Audit", icon: ClipboardList, dot: "#ef4444" },
    { value: "Internal", label: "Internal Audit", icon: BookOpen, dot: "#10b981" },
    { value: "Supplier", label: "Supplier Audit", icon: Users, dot: "#f97316" },
];

const PLAN_DURATIONS = [
    { value: "Monthly", label: "Monthly", months: 1 },
    { value: "Quarterly", label: "Quarterly", months: 3 },
    { value: "HalfYearly", label: "Half-Yearly", months: 6 },
    { value: "Yearly", label: "Annual", months: 12 },
    { value: "TwoYear", label: "2-Year", months: 24 },
    { value: "ThreeYear", label: "3-Year", months: 36 },
    { value: "Custom", label: "Custom Range", months: null },
];

const FREQUENCY_OPTS = [
    { value: "Once", label: "One-Time" },
    { value: "Monthly", label: "Monthly" },
    { value: "Quarterly", label: "Quarterly" },
    { value: "HalfYearly", label: "Half-Yearly" },
    { value: "Yearly", label: "Annually" },
];

const STATUS_CFG = {
    Draft: { label: "Draft", cls: "bg-slate-100 text-slate-600", dot: "#94a3b8" },
    Pending: { label: "Pending", cls: "bg-amber-100 text-amber-700", dot: "#f59e0b" },
    Approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700", dot: "#10b981" },
    Active: { label: "Active", cls: "bg-blue-100 text-blue-700", dot: "#3b82f6" },
    Completed: { label: "Completed", cls: "bg-indigo-100 text-indigo-700", dot: "#6366f1" },
    Rejected: { label: "Rejected", cls: "bg-red-100 text-red-700", dot: "#ef4444" },
};

const AUDIT_STATUS_CFG = {
    Scheduled: { label: "Scheduled", cls: "bg-blue-50 text-blue-600 border border-blue-200" },
    InProgress: { label: "In Progress", cls: "bg-amber-50 text-amber-700 border border-amber-200" },
    Completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
    Skipped: { label: "Skipped", cls: "bg-slate-50 text-slate-500 border border-slate-200" },
    Overdue: { label: "Overdue", cls: "bg-red-50 text-red-600 border border-red-200" },
};

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];


// ─────────────────────────────────────────────────────────────────
// Tiny helpers
// ─────────────────────────────────────────────────────────────────
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtMonth = d => d ? new Date(d).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—";
const isoDate = d => d ? new Date(d).toISOString().slice(0, 10) : "";
const addMonths = (dateStr, n) => { const d = new Date(dateStr); d.setMonth(d.getMonth() + n); return isoDate(d); };
const getTypeInfo = v => AUDIT_TYPES.find(a => a.value === v) || AUDIT_TYPES[0];

function calcEndDate(start, duration) {
    const cfg = PLAN_DURATIONS.find(d => d.value === duration);
    if (!cfg || !cfg.months || !start) return "";
    return addMonths(start, cfg.months);
}

// ─────────────────────────────────────────────────────────────────
// PersonPicker — AD search, single person
// ─────────────────────────────────────────────────────────────────
const PersonPicker = ({ label, value, onChange, required }) => {
    const [q, setQ] = useState("");
    const [open, setOpen] = useState(false);
    const ref = useRef();
    const { searchResults, searchAdDirectory } = useAdSearch();

    useEffect(() => { if (q.length >= 3) searchAdDirectory(q); }, [q]);
    useEffect(() => {
        const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {value ? (
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {value.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{value.name}</p>
                        <p className="text-xs text-slate-500 truncate">{value.email || "—"}</p>
                    </div>
                    <button onClick={() => onChange(null)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <X size={13} />
                    </button>
                </div>
            ) : (
                <>
                    <input
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
                        placeholder={`Search ${label} (min 3 chars)…`}
                        value={q}
                        onChange={e => { setQ(e.target.value); setOpen(true); }}
                        onFocus={() => setOpen(true)}
                    />
                    {open && searchResults.length > 0 && (
                        <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                            {searchResults.map(item => (
                                <div key={item.id} onClick={() => { onChange({ id: item.id, name: item.name, email: item.email || null }); setQ(""); setOpen(false); }}
                                    className="flex items-center gap-2 px-3 py-2.5 hover:bg-blue-50 cursor-pointer transition-colors">
                                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                                        {item.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">{item.name}</p>
                                        <p className="text-xs text-slate-500">{item.email || item.type}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};



// ─────────────────────────────────────────────────────────────────
// StatusBadge
// ─────────────────────────────────────────────────────────────────
const StatusBadge = ({ status, small }) => {
    const cfg = STATUS_CFG[status] || STATUS_CFG.Draft;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${small ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1"} ${cfg.cls}`}>
            <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ background: cfg.dot }} />
            {cfg.label}
        </span>
    );
};

const AuditStatusBadge = ({ status }) => {
    const cfg = AUDIT_STATUS_CFG[status] || AUDIT_STATUS_CFG.Scheduled;
    return <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${cfg.cls}`}>{cfg.label}</span>;
};

// ─────────────────────────────────────────────────────────────────
// AuditEntryRow — one audit within the plan form
// ─────────────────────────────────────────────────────────────────
const AuditEntryRow = ({ entry, idx, onChange, onRemove, planStart, planEnd }) => {
    const [exp, setExp] = useState(false);
    const typeInfo = getTypeInfo(entry.auditType);
    const Icon = typeInfo.icon;

    const upd = patch => onChange(idx, { ...entry, ...patch });

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
            {/* Row header */}
            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-slate-50 transition-colors"
                onClick={() => setExp(p => !p)}>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 border"
                    style={{ background: typeInfo.dot + "18", color: typeInfo.dot, borderColor: typeInfo.dot + "40" }}>
                    <Icon size={11} />{typeInfo.label}
                </span>
                <span className="flex-1 text-sm font-medium text-slate-700 truncate">{entry.title || <span className="text-slate-400 italic">Untitled audit</span>}</span>
                <div className="flex items-center gap-3 shrink-0">
                    {entry.scheduledDate && <span className="text-xs text-slate-400 hidden md:block">{fmtDate(entry.scheduledDate)}</span>}
                    {entry.auditor && <span className="text-xs text-slate-500 hidden md:block">👤 {entry.auditor.name}</span>}
                    <button onClick={e => { e.stopPropagation(); onRemove(idx); }} className="p-1 text-slate-300 hover:text-red-500 transition-colors rounded">
                        <Trash2 size={13} />
                    </button>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${exp ? "rotate-180" : ""}`} />
                </div>
            </div>

            {/* Expanded body */}
            {exp && (
                <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Title */}
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Audit Title <span className="text-red-500">*</span></label>
                        <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                            placeholder="e.g. Q1 Assembly Line Process Audit"
                            value={entry.title}
                            onChange={e => upd({ title: e.target.value })} />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Audit Type</label>
                        <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                            value={entry.auditType} onChange={e => upd({ auditType: e.target.value })}>
                            {AUDIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>

                    {/* Department */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Department / Area</label>
                        <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                            placeholder="e.g. Manufacturing, QA, HR"
                            value={entry.department}
                            onChange={e => upd({ department: e.target.value })} />
                    </div>

                    {/* Auditor */}
                    <PersonPicker label="Auditor" value={entry.auditor} onChange={v => upd({ auditor: v })} required />

                    {/* Auditee */}
                    <PersonPicker label="Auditee" value={entry.auditee} onChange={v => upd({ auditee: v })} required />

                    {/* Scheduled Date */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Scheduled Date <span className="text-red-500">*</span></label>
                        <input type="date"
                            min={planStart || undefined}
                            max={planEnd || undefined}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                            value={entry.scheduledDate}
                            onChange={e => upd({ scheduledDate: e.target.value })} />
                    </div>

                    {/* Frequency */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Repeat Frequency</label>
                        <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                            value={entry.frequency} onChange={e => upd({ frequency: e.target.value })}>
                            {FREQUENCY_OPTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                    </div>

                    {/* Reminder days before */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Reminder (days before)</label>
                        <input type="number" min={0} max={30}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                            value={entry.reminderDaysBefore}
                            onChange={e => upd({ reminderDaysBefore: parseInt(e.target.value) || 0 })} />
                    </div>

                    {/* Scope */}
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Scope / Notes</label>
                        <textarea rows={2}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition resize-none"
                            placeholder="Describe what this audit covers…"
                            value={entry.scope}
                            onChange={e => upd({ scope: e.target.value })} />
                    </div>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────
// Create / Edit Plan Modal
// ─────────────────────────────────────────────────────────────────
const blankEntry = () => ({
    title: "", auditType: "Process", department: "",
    auditor: null, auditee: null, scheduledDate: "",
    frequency: "Once", reminderDaysBefore: 3, scope: "",
});

const blankPlan = {
    planName: "", description: "",
    durationType: "Yearly", startDate: "", endDate: "",
    approver: null,
    entries: [blankEntry()],
};

const PlanModal = ({ plan, onClose, onSaved, currentUser }) => {
    const isEdit = !!plan?.id;
    const [form, setForm] = useState(() => {
        if (!isEdit) return { ...blankPlan };
        return {
            ...plan,
            startDate: isoDate(plan.startDate),
            endDate: isoDate(plan.endDate),
            entries: (plan.entries || []).map(e => ({
                ...e, scheduledDate: isoDate(e.scheduledDate),
            })),
        };
    });
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState("details");

    const upd = patch => setForm(p => ({ ...p, ...patch }));

    // Auto-fill end date when durationType or startDate changes
    useEffect(() => {
        if (form.durationType !== "Custom" && form.startDate) {
            const end = calcEndDate(form.startDate, form.durationType);
            if (end) upd({ endDate: end });
        }
    }, [form.durationType, form.startDate]);

    const addEntry = () => upd({ entries: [...form.entries, blankEntry()] });
    const removeEntry = idx => upd({ entries: form.entries.filter((_, i) => i !== idx) });
    const changeEntry = (idx, updated) => upd({ entries: form.entries.map((e, i) => i === idx ? updated : e) });

    const validate = () => {
        if (!form.planName.trim()) { toast.error("Plan name is required."); return false; }
        if (!form.startDate) { toast.error("Start date is required."); return false; }
        if (!form.endDate) { toast.error("End date is required."); return false; }
        if (!form.approver) { toast.error("Approver is required."); return false; }
        if (form.entries.length === 0) { toast.error("Add at least one audit entry."); return false; }
        for (const [i, e] of form.entries.entries()) {
            if (!e.title.trim()) { toast.error(`Audit #${i + 1}: Title is required.`); return false; }
            if (!e.auditor) { toast.error(`Audit #${i + 1}: Auditor is required.`); return false; }
            if (!e.auditee) { toast.error(`Audit #${i + 1}: Auditee is required.`); return false; }
            if (!e.scheduledDate) { toast.error(`Audit #${i + 1}: Scheduled date is required.`); return false; }
        }
        return true;
    };

    const handleSave = async (submitForApproval = false) => {
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = {
                planName: form.planName,
                description: form.description,
                durationType: form.durationType,
                startDate: new Date(form.startDate).toISOString(),
                endDate: new Date(form.endDate).toISOString(),
                approver: form.approver,
                submitForApproval,
                entries: form.entries.map(e => ({
                    ...e,
                    scheduledDate: new Date(e.scheduledDate).toISOString(),
                    auditorId: e.auditor?.id,
                    auditorName: e.auditor?.name,
                    auditorEmail: e.auditor?.email,
                    auditeeId: e.auditee?.id,
                    auditeeName: e.auditee?.name,
                    auditeeEmail: e.auditee?.email,
                })),
                userName: currentUser
            };
            if (isEdit) {
                await fetch(`${API}/${plan.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                toast.success("Plan updated!");
            } else {
                await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                toast.success(submitForApproval ? "Plan submitted for approval!" : "Plan saved as draft!");
            }
            onSaved();
            onClose();
        } catch (err) {
            toast.error("Save failed: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const TABS = [
        { key: "details", label: "Plan Details" },
        { key: "audits", label: `Audits (${form.entries.length})` },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">{isEdit ? "Edit Audit Plan" : "New Audit Plan"}</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Fill in plan details and add individual audit entries</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-6 pt-3 border-b border-slate-100">
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${tab === t.key ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    {/* ─── DETAILS TAB ─────────────────────────────── */}
                    {tab === "details" && (
                        <div className="space-y-4">
                            {/* Plan name */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Plan Name <span className="text-red-500">*</span></label>
                                <input className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                                    placeholder="e.g. Annual Quality Audit Plan 2025"
                                    value={form.planName}
                                    onChange={e => upd({ planName: e.target.value })} />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Description</label>
                                <textarea rows={2}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition resize-none"
                                    placeholder="Brief overview of this audit plan…"
                                    value={form.description}
                                    onChange={e => upd({ description: e.target.value })} />
                            </div>

                            {/* Duration type + date range */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Plan Duration <span className="text-red-500">*</span></label>
                                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                                        value={form.durationType} onChange={e => upd({ durationType: e.target.value })}>
                                        {PLAN_DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Start Date <span className="text-red-500">*</span></label>
                                    <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                                        value={form.startDate} onChange={e => upd({ startDate: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">End Date <span className="text-red-500">*</span></label>
                                    <input type="date"
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                                        value={form.endDate}
                                        disabled={form.durationType !== "Custom"}
                                        onChange={e => upd({ endDate: e.target.value })} />
                                </div>
                            </div>

                            {/* Approver */}
                            <PersonPicker label="Approver" value={form.approver} onChange={v => upd({ approver: v })} required />

                            {/* Summary */}
                            {form.startDate && form.endDate && (
                                <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                                    <Calendar size={16} className="text-blue-500 shrink-0" />
                                    <p className="text-sm text-blue-700">
                                        Plan spans <span className="font-semibold">{fmtDate(form.startDate)}</span> to <span className="font-semibold">{fmtDate(form.endDate)}</span>
                                        {" "}· <span className="font-semibold">{form.entries.length}</span> audit{form.entries.length !== 1 ? "s" : ""} scheduled
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── AUDITS TAB ───────────────────────────────── */}
                    {tab === "audits" && (
                        <div className="space-y-3">
                            {form.entries.map((entry, idx) => (
                                <AuditEntryRow key={idx} entry={entry} idx={idx}
                                    onChange={changeEntry} onRemove={removeEntry}
                                    planStart={form.startDate} planEnd={form.endDate} />
                            ))}
                            <button onClick={addEntry}
                                className="w-full border-2 border-dashed border-slate-200 rounded-xl py-3 text-sm text-slate-500 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-2 font-medium">
                                <Plus size={15} /> Add Audit Entry
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/80">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-100 transition-colors">
                        Cancel
                    </button>
                    <div className="flex gap-2">
                        <button onClick={() => handleSave(false)} disabled={saving}
                            className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                            <FileText size={14} /> Save Draft
                        </button>
                        <button onClick={() => handleSave(true)} disabled={saving}
                            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                            Submit for Approval
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────
// Calendar Month View — shows audits as dots/chips on dates
// ─────────────────────────────────────────────────────────────────
const CalendarView = ({ planId }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth());
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null); // date string

    const fetchAudits = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/${planId}/entries`);
            const data = await res.json();
            setAudits(data);
        } finally {
            setLoading(false);
        }
    }, [planId]);

    useEffect(() => { fetchAudits(); }, [fetchAudits]);

    const markComplete = async (entryId) => {
        await fetch(`${API}/entries/${entryId}/complete`, { method: "PATCH" });
        toast.success("Audit marked as completed. Email notifications cancelled.");
        fetchAudits();
    };

    // Build calendar grid
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const auditsByDate = {};
    audits.forEach(a => {
        const d = isoDate(a.scheduledDate);
        if (!auditsByDate[d]) auditsByDate[d] = [];
        auditsByDate[d].push(a);
    });

    const todayStr = isoDate(new Date());
    const selStr = selected ? `${year}-${String(month + 1).padStart(2, "0")}-${String(selected).padStart(2, "0")}` : null;
    const selAudits = selStr ? (auditsByDate[selStr] || []) : [];

    const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); setSelected(null); };
    const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); setSelected(null); };

    return (
        <div className="space-y-4">
            {/* Nav */}
            <div className="flex items-center justify-between">
                <button onClick={prev} className="p-2 rounded-lg hover:bg-slate-100 transition-colors"><ChevronLeft size={16} /></button>
                <h3 className="text-base font-bold text-slate-800">{MONTHS_SHORT[month]} {year}</h3>
                <button onClick={next} className="p-2 rounded-lg hover:bg-slate-100 transition-colors"><ChevronRight size={16} /></button>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Loading calendar…</div>
            ) : (
                <>
                    {/* Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                            <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
                        ))}
                        {cells.map((day, i) => {
                            if (!day) return <div key={i} />;
                            const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                            const dayAudits = auditsByDate[dStr] || [];
                            const isToday = dStr === todayStr;
                            const isSel = day === selected;
                            const hasAudits = dayAudits.length > 0;

                            return (
                                <div key={i} onClick={() => setSelected(day)}
                                    className={`min-h-[56px] rounded-xl p-1.5 cursor-pointer border transition-all
                                        ${isSel ? "border-blue-400 bg-blue-50 shadow-sm" : "border-transparent hover:border-slate-200 hover:bg-slate-50"}
                                        ${isToday ? "ring-2 ring-blue-300 ring-offset-1" : ""}
                                    `}>
                                    <div className={`text-xs font-semibold mb-1 w-5 h-5 flex items-center justify-center rounded-full
                                        ${isToday ? "bg-blue-600 text-white" : "text-slate-600"}`}>
                                        {day}
                                    </div>
                                    <div className="flex flex-wrap gap-0.5">
                                        {dayAudits.slice(0, 3).map((a, ai) => {
                                            const ti = getTypeInfo(a.auditType);
                                            return (
                                                <span key={ai} title={a.title}
                                                    className={`w-2 h-2 rounded-full shrink-0 ${a.status === "Completed" ? "opacity-40" : ""}`}
                                                    style={{ background: ti.dot }} />
                                            );
                                        })}
                                        {dayAudits.length > 3 && <span className="text-[9px] text-slate-400 leading-3">+{dayAudits.length - 3}</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Selected day panel */}
                    {selected && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100">
                                <h4 className="text-sm font-semibold text-slate-700">
                                    {selected} {MONTHS_SHORT[month]} {year}
                                    {selAudits.length === 0 && <span className="ml-2 text-slate-400 font-normal">— No audits</span>}
                                </h4>
                            </div>
                            {selAudits.map(a => {
                                const ti = getTypeInfo(a.auditType);
                                const Icon = ti.icon;
                                return (
                                    <div key={a.id} className="flex items-start gap-3 px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                                            style={{ background: ti.dot + "20", color: ti.dot }}>
                                            <Icon size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-semibold text-slate-800">{a.title}</span>
                                                <AuditStatusBadge status={a.status} />
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                                Auditor: <span className="font-medium">{a.auditorName}</span>
                                                &nbsp;·&nbsp; Auditee: <span className="font-medium">{a.auditeeName}</span>
                                            </div>
                                            {a.department && <div className="text-xs text-slate-400 mt-0.5">{a.department}</div>}
                                        </div>
                                        {a.status !== "Completed" && a.status !== "Skipped" && (
                                            <button onClick={() => markComplete(a.id)}
                                                className="shrink-0 flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg transition-colors">
                                                <CheckCircle2 size={12} /> Mark Done
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-3 pt-1">
                {AUDIT_TYPES.map(t => (
                    <span key={t.value} className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.dot }} />{t.label}
                    </span>
                ))}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────
// Plan Detail Drawer (right-side panel)
// ─────────────────────────────────────────────────────────────────
const PlanDrawer = ({ planId, onClose, onRefresh, currentUser }) => {
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("calendar");
    const [entries, setEntries] = useState([]);
    const load = useCallback(async () => {
        setLoading(true);
        const [pRes, eRes] = await Promise.all([
            fetch(`${API}/${planId}`),
            fetch(`${API}/${planId}/entries`),
        ]);
        const [p, e] = await Promise.all([pRes.json(), eRes.json()]);
        setPlan(p);
        setEntries(e);
        setLoading(false);
    }, [planId]);

    useEffect(() => { load(); }, [load]);

    const handleApprove = async (approved) => {
        await fetch(`${API}/${planId}/approval`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ approved }),
        });
        toast.success(approved ? "Plan approved! Emails scheduled in Hangfire." : "Plan rejected.");
        onRefresh();
        load();
    };

    const markComplete = async (entryId) => {
        await fetch(`${API}/entries/${entryId}/complete`, { method: "PATCH" });
        toast.success("Marked complete. Email cancelled.");
        load();
    };

    const DTABS = [
        { key: "calendar", label: "Calendar" },
        { key: "list", label: `All Audits (${entries.length})` },
    ];

    return (
        <div className="fixed inset-0 z-40 flex justify-end">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        {loading ? <div className="h-5 w-48 bg-slate-100 rounded animate-pulse" /> : (
                            <>
                                <h2 className="text-base font-bold text-slate-800 truncate">{plan?.planName}</h2>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <StatusBadge status={plan?.status} />
                                    <span className="text-xs text-slate-400">{fmtDate(plan?.startDate)} — {fmtDate(plan?.endDate)}</span>
                                </div>
                            </>
                        )}
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors shrink-0">
                        <X size={18} />
                    </button>
                </div>

                {/* Approval actions — only shown to the designated approver */}
                {plan?.status === "Pending" && (() => {
                    // Normalise the current user's email — handle different AD/OIDC property names
                    const userName =
                        currentUser?.email ||
                        currentUser?.mail ||
                        currentUser?.userPrincipalName ||
                        currentUser ||
                        "";

                    const normalizedUser = userName.toLowerCase().split("@")[0];
                    const approver = (plan.approverName || "").toLowerCase();

                    // Only show action buttons when we can positively confirm this IS the approver.
                    // If currentUser is null/undefined we cannot confirm — hide buttons to be safe.
                    const isApprover = normalizedUser === approver;
                    console.log(isApprover)
                    return isApprover ? (
                        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
                            <AlertCircle size={15} className="text-amber-600 shrink-0" />
                            <p className="text-sm text-amber-700 flex-1">This plan is awaiting <strong>your</strong> approval.</p>
                            <button onClick={() => handleApprove(false)}
                                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                                <XCircle size={13} /> Reject
                            </button>
                            <button onClick={() => handleApprove(true)}
                                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                                <Check size={13} /> Approve
                            </button>
                        </div>
                    ) : (
                        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                            <AlertCircle size={15} className="text-amber-500 shrink-0" />
                            <p className="text-sm text-amber-700">
                                Awaiting approval from <span className="font-semibold">{plan.approverName}</span>
                            </p>
                        </div>
                    );
                })()}

                {/* Tabs */}
                <div className="flex gap-1 px-6 pt-3 border-b border-slate-100">
                    {DTABS.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${tab === t.key ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {loading ? (
                        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}</div>
                    ) : tab === "calendar" ? (
                        <CalendarView planId={planId} />
                    ) : (
                        <div className="space-y-2">
                            {entries.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <Inbox size={32} className="mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">No audits in this plan.</p>
                                </div>
                            ) : entries.map(a => {
                                const ti = getTypeInfo(a.auditType);
                                const Icon = ti.icon;
                                return (
                                    <div key={a.id} className="border border-slate-100 rounded-xl px-4 py-3 hover:border-slate-200 hover:bg-slate-50/50 transition-all">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                                                style={{ background: ti.dot + "20", color: ti.dot }}>
                                                <Icon size={15} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <span className="text-sm font-semibold text-slate-800">{a.title}</span>
                                                    <AuditStatusBadge status={a.status} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-x-4 text-xs text-slate-500">
                                                    <span>📅 {fmtDate(a.scheduledDate)}</span>
                                                    <span>🏢 {a.department || "—"}</span>
                                                    <span>👤 Auditor: {a.auditorName}</span>
                                                    <span>👥 Auditee: {a.auditeeName}</span>
                                                    <span>🔁 {FREQUENCY_OPTS.find(f => f.value === a.frequency)?.label || a.frequency}</span>
                                                    <span>🔔 {a.reminderDaysBefore}d before</span>
                                                </div>
                                            </div>
                                            {a.status !== "Completed" && a.status !== "Skipped" && (
                                                <button onClick={() => markComplete(a.id)}
                                                    className="shrink-0 flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg transition-colors">
                                                    <CheckCircle2 size={12} /> Done
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────
// MAIN — AuditPlanner
// ─────────────────────────────────────────────────────────────────
const AuditPlanner = () => {
    // Current logged-in user — tries common property names across different auth setups
    const [user, setUser] = useState(null);
    const navigate = useNavigate();
   

    const [plans, setPlans] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [editPlan, setEditPlan] = useState(null);
    const [drawerPlanId, setDrawerPlanId] = useState(null);

    const PAGE_SIZE = 15;

    const fetchPlans = useCallback(async () => {
        setLoading(true);
        try {
            const p = new URLSearchParams({ page, pageSize: PAGE_SIZE, ...(search && { search }), ...(statusFilter && { status: statusFilter }) });
            const res = await fetch(`${API}?${p}`);
            const data = await res.json();
            setPlans(data.items || []);
            setTotal(data.total || 0);
        } catch { toast.error("Failed to load plans."); }
        finally { setLoading(false); }
    }, [page, search, statusFilter]);

    useEffect(() => { fetchPlans(); }, [fetchPlans]);


    // ─────────────────────────────────────────────────────────────────
    // Get the login person name
    // ─────────────────────────────────────────────────────────────────

    useEffect(() => {
        const storedUserData = localStorage.getItem("user");

        if (storedUserData && storedUserData !== "undefined") {
            const storedUser = JSON.parse(storedUserData);

            // ⏳ Check if session has expired
            if (storedUser.expiry && Date.now() > storedUser.expiry) {
                // Session expired
                localStorage.removeItem("user");
                localStorage.removeItem("meaiFormToken");
                navigate(`/login?expired=true`);
            } else {
                const names = [storedUser.username, ...storedUser.groups];
                APP_CONSTANTS.CURRENT_USER = storedUser.username
                setUser(storedUser.username);
            }
        } else {
            navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
        }
    }, [navigate, location]);

    const currentUser = APP_CONSTANTS.CURRENT_USER || APP_CONSTANTS.USER || user || null;

    const handleDelete = async id => {
        if (!window.confirm("Delete this audit plan?")) return;
        await fetch(`${API}/${id}`, { method: "DELETE" });
        toast.success("Deleted.");
        fetchPlans();
    };

    const handleEdit = async id => {
        const res = await fetch(`${API}/${id}`);
        const data = await res.json();
        setEditPlan(data);
        setModalOpen(true);
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    // Stats
    const stats = [
        { label: "Total Plans", value: total, icon: Layers, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Active", value: plans.filter(p => p.status === "Active").length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "Pending Approval", value: plans.filter(p => p.status === "Pending").length, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
        { label: "Completed", value: plans.filter(p => p.status === "Completed").length, icon: Check, color: "text-indigo-600", bg: "bg-indigo-50" },
    ];

    return (
        <Layout>
            <div className="min-h-screen bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

                    {/* ── Page header ─────────────────────────────── */}
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-200">
                                    <Shield size={18} className="text-white" />
                                </div>
                                Audit Planner
                            </h1>
                            <p className="text-sm text-slate-500 mt-1 ml-11">
                                Create and manage audit plans with automated email scheduling
                            </p>
                        </div>
                        <button onClick={() => { setEditPlan(null); setModalOpen(true); }}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-blue-200 transition-colors shrink-0">
                            <Plus size={16} /> New Plan
                        </button>
                    </div>

                    {/* ── Stats ───────────────────────────────────── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {stats.map(s => {
                            const Icon = s.icon;
                            return (
                                <div key={s.label} className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center gap-3 shadow-sm">
                                    <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                                        <Icon size={16} className={s.color} />
                                    </div>
                                    <div>
                                        <p className="text-xl font-bold text-slate-800 leading-none">{s.value}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Filters ─────────────────────────────────── */}
                    <div className="flex gap-3 flex-wrap">
                        <div className="flex-1 min-w-48 relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                                placeholder="Search plans…"
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }} />
                        </div>
                        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                            value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                            <option value="">All Statuses</option>
                            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <button onClick={fetchPlans} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors" title="Refresh">
                            <RefreshCw size={15} className="text-slate-500" />
                        </button>
                    </div>

                    {/* ── Table ───────────────────────────────────── */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="p-8 space-y-3">
                                {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
                            </div>
                        ) : plans.length === 0 ? (
                            <div className="text-center py-20 text-slate-400">
                                <Shield size={44} className="mx-auto mb-3 opacity-20" />
                                <p className="font-medium">No audit plans found</p>
                                <p className="text-sm mt-1">Click "New Plan" to create your first audit plan</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/60">
                                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Plan</th>
                                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Duration</th>
                                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Period</th>
                                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Approver</th>
                                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Audits</th>
                                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Status</th>
                                        <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {plans.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="font-semibold text-slate-800">{p.planName}</div>
                                                {p.description && <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{p.description}</div>}
                                            </td>
                                            <td className="px-4 py-3.5 hidden md:table-cell">
                                                <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                                                    {PLAN_DURATIONS.find(d => d.value === p.durationType)?.label || p.durationType}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 hidden lg:table-cell text-xs text-slate-500">
                                                {fmtDate(p.startDate)} <ArrowRight size={10} className="inline mx-1" /> {fmtDate(p.endDate)}
                                            </td>
                                            <td className="px-4 py-3.5 hidden md:table-cell text-xs text-slate-600">
                                                {p.approverName || "—"}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
                                                    <ClipboardList size={12} className="text-slate-400" />
                                                    {p.totalAudits}
                                                    {p.completedAudits > 0 && (
                                                        <span className="text-emerald-600">({p.completedAudits} done)</span>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <StatusBadge status={p.status} small />
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center justify-end gap-0.5">
                                                    <button onClick={() => setDrawerPlanId(p.id)} title="View"
                                                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors">
                                                        <Eye size={14} />
                                                    </button>
                                                    {(p.status === "Draft" || p.status === "Rejected") && (
                                                        <button onClick={() => handleEdit(p.id)} title="Edit"
                                                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                                                            <Edit2 size={14} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDelete(p.id)} title="Delete"
                                                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* ── Pagination ──────────────────────────────── */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between text-sm text-slate-500">
                            <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
                            <div className="flex gap-2">
                                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                                    className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors flex items-center gap-1">
                                    <ChevronLeft size={14} /> Prev
                                </button>
                                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                                    className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors flex items-center gap-1">
                                    Next <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {modalOpen && (
                <PlanModal
                    plan={editPlan}
                    onClose={() => { setModalOpen(false); setEditPlan(null); }}
                    onSaved={fetchPlans}
                    currentUser={currentUser}
                />
            )}
            {drawerPlanId && (
                <PlanDrawer
                    planId={drawerPlanId}
                    onClose={() => setDrawerPlanId(null)}
                    onRefresh={fetchPlans}
                    currentUser={currentUser}
                />
            )}
        </Layout>
    );
};

export default AuditPlanner;