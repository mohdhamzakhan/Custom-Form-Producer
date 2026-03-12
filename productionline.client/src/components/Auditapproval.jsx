import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Shield, Check, X, ChevronLeft, ChevronRight,
    RefreshCw, AlertCircle, Calendar, Users, Settings,
    Package, ClipboardList, BookOpen, ArrowLeft,
    CheckCircle2, XCircle, Clock, Search, Filter,
    ChevronDown, ChevronUp, Info, Bell, Layers,
    ArrowRight, FileText, Lock
} from "lucide-react";
import { toast } from "react-toastify";
import { APP_CONSTANTS } from "./store";
import Layout from "./Layout";

// ─────────────────────────────────────────────────────────────────
// Constants  (shared with AuditPlanner — keep in sync)
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

const FREQUENCY_OPTS = {
    Once: "One-Time", Monthly: "Monthly", Quarterly: "Quarterly",
    HalfYearly: "Half-Yearly", Yearly: "Annually",
};

const PLAN_DURATION_LABELS = {
    Monthly: "Monthly", Quarterly: "Quarterly", HalfYearly: "Half-Yearly",
    Yearly: "Annual", TwoYear: "2-Year", ThreeYear: "3-Year", Custom: "Custom",
};

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
// Helpers
// ─────────────────────────────────────────────────────────────────
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const isoDate = d => d ? new Date(d).toISOString().slice(0, 10) : "";
const getType = v => AUDIT_TYPES.find(a => a.value === v) || AUDIT_TYPES[0];

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
    return <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${cfg.cls}`}>{cfg.label}</span>;
};

// ─────────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────────
const Stat = ({ label, value, sub, color = "text-slate-800", bg = "bg-slate-50", icon: Icon }) => (
    <div className={`rounded-xl border border-slate-100 px-4 py-3 flex items-center gap-3 shadow-sm ${bg}`}>
        {Icon && (
            <div className="w-9 h-9 rounded-lg bg-white/70 border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
                <Icon size={16} className={color} />
            </div>
        )}
        <div>
            <p className={`text-2xl font-bold leading-none ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────
// Confirm modal — approve or reject with optional comments
// ─────────────────────────────────────────────────────────────────
const ConfirmModal = ({ action, planName, onConfirm, onClose }) => {
    const [comments, setComments] = useState("");
    const [busy, setBusy] = useState(false);
    const isApprove = action === "approve";

    const submit = async () => {
        setBusy(true);
        await onConfirm(isApprove, comments);
        setBusy(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className={`px-6 pt-6 pb-4 rounded-t-2xl ${isApprove ? "bg-emerald-50" : "bg-red-50"}`}>
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${isApprove ? "bg-emerald-100" : "bg-red-100"}`}>
                        {isApprove ? <Check size={22} className="text-emerald-600" /> : <X size={22} className="text-red-600" />}
                    </div>
                    <h3 className="text-base font-bold text-slate-800">
                        {isApprove ? "Approve Audit Plan" : "Reject Audit Plan"}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                        <span className="font-semibold">"{planName}"</span>
                        {isApprove
                            ? " — Hangfire email jobs will be scheduled for all audits."
                            : " — The submitter will be notified of the rejection."}
                    </p>
                </div>
                <div className="px-6 py-4 space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                            Comments {!isApprove && <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                            rows={3}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                            placeholder={isApprove ? "Optional notes…" : "Reason for rejection (required)…"}
                            value={comments}
                            onChange={e => setComments(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        disabled={busy || (!isApprove && !comments.trim())}
                        className={`px-5 py-2 rounded-lg text-white text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50
                            ${isApprove ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>
                        {busy ? <RefreshCw size={14} className="animate-spin" /> : isApprove ? <Check size={14} /> : <X size={14} />}
                        {isApprove ? "Approve & Schedule" : "Reject Plan"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────
// Plan List — pending plans waiting for THIS user's approval
// ─────────────────────────────────────────────────────────────────
const ApprovalList = ({ currentUser, onSelect }) => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}?status=Pending&pageSize=100`);
            const data = await res.json();
            // Filter to only plans where this user is the designated approver
            // Normalize both sides: strip domain so "hamza.khan" matches "hamza.khan@company.com"
            const normalize = v => (v || "").toLowerCase().split("@")[0].trim();
            const userKey = normalize(currentUser?.email);
            console.log("[AuditApproval] currentUser:", currentUser, "| userKey:", userKey);
            const mine = (data.items || []).filter(p => {
                const planKey = normalize(p.approverEmail);
                console.log("[AuditApproval] plan:", p.planName, "| approverEmail:", p.approverEmail, "| planKey:", planKey, "| match:", planKey === userKey);
                return (
                    p.approverAdObjectId === currentUser?.adObjectId ||
                    planKey === userKey
                );
            });
            setPlans(mine);
        } catch {
            toast.error("Failed to load pending plans.");
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    useEffect(() => { load(); }, [load]);

    const filtered = plans.filter(p =>
        !search || p.planName.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return (
        <div className="space-y-3 p-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Search */}
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                    placeholder="Search pending plans…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <CheckCircle2 size={40} className="mx-auto mb-3 opacity-20" />
                    <p className="font-medium text-slate-500">No plans awaiting your approval</p>
                    <p className="text-sm mt-1">You're all caught up!</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(p => (
                        <button key={p.id} onClick={() => onSelect(p.id)}
                            className="w-full text-left border border-slate-200 rounded-xl px-4 py-3.5 hover:border-blue-300 hover:bg-blue-50/30 transition-all group shadow-sm bg-white">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                                            {p.planName}
                                        </span>
                                        <StatusBadge status={p.status} small />
                                    </div>
                                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={11} />
                                            {fmtDate(p.startDate)} – {fmtDate(p.endDate)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <ClipboardList size={11} />
                                            {p.totalAudits} audit{p.totalAudits !== 1 ? "s" : ""}
                                        </span>
                                        <span className="bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                                            {PLAN_DURATION_LABELS[p.durationType] || p.durationType}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Submitted by {p.createdBy}</p>
                                </div>
                                <ArrowRight size={15} className="text-slate-300 group-hover:text-blue-400 shrink-0 mt-1 transition-colors" />
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────
// Plan Detail — full audit table + approve/reject actions
// ─────────────────────────────────────────────────────────────────
const PlanDetail = ({ planId, currentUser, onBack, onActioned }) => {
    const [plan, setPlan] = useState(null);
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmAction, setConfirmAction] = useState(null); // "approve" | "reject"
    const [typeFilter, setTypeFilter] = useState("");
    const [sortCol, setSortCol] = useState("scheduledDate");
    const [sortAsc, setSortAsc] = useState(true);
    const [expandedRow, setExpandedRow] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [pRes, eRes] = await Promise.all([
                fetch(`${API}/${planId}`),
                fetch(`${API}/${planId}/entries`),
            ]);
            const [p, e] = await Promise.all([pRes.json(), eRes.json()]);
            setPlan(p);
            setEntries(e);
        } catch {
            toast.error("Failed to load plan.");
        } finally {
            setLoading(false);
        }
    }, [planId]);

    useEffect(() => { load(); }, [load]);

    // ── Auth check — only designated approver can act ─────────────
    const normalize = v => (v || "").toLowerCase().split("@")[0].trim();
    const canApprove = plan && (
        plan.approverAdObjectId === currentUser?.adObjectId ||
        normalize(plan.approverEmail) === normalize(currentUser?.email)
    );

    const handleApprovalConfirm = async (approved, comments) => {
        try {
            const res = await fetch(`${API}/${planId}/approval`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ approved, comments }),
            });
            if (!res.ok) {
                const err = await res.json();
                toast.error(err.error || "Action failed.");
                return;
            }
            toast.success(approved
                ? "Plan approved! Hangfire email jobs scheduled for all audits."
                : "Plan rejected. Submitter will be notified.");
            setConfirmAction(null);
            onActioned();
        } catch (err) {
            toast.error("Request failed: " + err.message);
        }
    };

    // ── Sort & filter entries ─────────────────────────────────────
    const sortedEntries = [...entries]
        .filter(e => !typeFilter || e.auditType === typeFilter)
        .sort((a, b) => {
            let av = a[sortCol] ?? "", bv = b[sortCol] ?? "";
            if (sortCol === "scheduledDate") { av = new Date(av); bv = new Date(bv); }
            if (av < bv) return sortAsc ? -1 : 1;
            if (av > bv) return sortAsc ? 1 : -1;
            return 0;
        });

    const toggleSort = col => {
        if (sortCol === col) setSortAsc(p => !p);
        else { setSortCol(col); setSortAsc(true); }
    };

    const SortTh = ({ col, children, cls = "" }) => (
        <th
            onClick={() => toggleSort(col)}
            className={`text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 cursor-pointer select-none hover:text-slate-700 transition-colors ${cls}`}>
            <span className="flex items-center gap-1">
                {children}
                {sortCol === col
                    ? sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    : <span className="w-3" />}
            </span>
        </th>
    );

    // ── Stats ─────────────────────────────────────────────────────
    const typeCounts = entries.reduce((acc, e) => {
        acc[e.auditType] = (acc[e.auditType] || 0) + 1;
        return acc;
    }, {});

    if (loading) return (
        <div className="space-y-4 p-4">
            <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
            <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
            <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
        </div>
    );

    if (!plan) return <div className="p-8 text-center text-slate-400">Plan not found.</div>;

    return (
        <>
            <div className="space-y-5">
                {/* Back + title */}
                <div className="flex items-center gap-3">
                    <button onClick={onBack}
                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
                        <ArrowLeft size={15} /> Back
                    </button>
                    <div className="h-4 w-px bg-slate-200" />
                    <h2 className="text-base font-bold text-slate-800 truncate">{plan.planName}</h2>
                    <StatusBadge status={plan.status} />
                </div>

                {/* ── Not the approver warning ───────────────────── */}
                {!canApprove && plan.status === "Pending" && (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <Lock size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-amber-800">You are not the designated approver</p>
                            <p className="text-xs text-amber-700 mt-0.5">
                                Only <span className="font-semibold">{plan.approverName}</span> ({plan.approverEmail}) can approve or reject this plan.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Plan summary card ─────────────────────────── */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
                        <h3 className="text-white font-bold text-base">{plan.planName}</h3>
                        {plan.description && <p className="text-slate-300 text-xs mt-0.5">{plan.description}</p>}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-y divide-slate-100">
                        {[
                            { label: "Duration Type", value: PLAN_DURATION_LABELS[plan.durationType] || plan.durationType },
                            { label: "Start Date", value: fmtDate(plan.startDate) },
                            { label: "End Date", value: fmtDate(plan.endDate) },
                            { label: "Submitted By", value: plan.createdBy },
                            { label: "Approver", value: plan.approverName || "—" },
                            { label: "Approver Email", value: plan.approverEmail || "—" },
                            { label: "Total Audits", value: entries.length },
                            { label: "Audit Types", value: Object.keys(typeCounts).length + " type" + (Object.keys(typeCounts).length !== 1 ? "s" : "") },
                        ].map(({ label, value }) => (
                            <div key={label} className="px-4 py-3">
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
                                <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate" title={String(value)}>{value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Type breakdown mini-stat row ──────────────── */}
                <div className="flex flex-wrap gap-2">
                    {AUDIT_TYPES.filter(t => typeCounts[t.value]).map(t => {
                        const Icon = t.icon;
                        return (
                            <button key={t.value}
                                onClick={() => setTypeFilter(f => f === t.value ? "" : t.value)}
                                className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 border transition-all
                                    ${typeFilter === t.value ? "shadow-sm scale-105" : "bg-white hover:scale-105"}`}
                                style={{
                                    borderColor: typeFilter === t.value ? t.dot : "#e2e8f0",
                                    background: typeFilter === t.value ? t.dot + "18" : "",
                                    color: typeFilter === t.value ? t.dot : "#64748b",
                                }}>
                                <Icon size={11} />
                                {t.label}
                                <span className="font-bold">{typeCounts[t.value]}</span>
                            </button>
                        );
                    })}
                    {typeFilter && (
                        <button onClick={() => setTypeFilter("")}
                            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 px-2 py-1.5 transition-colors">
                            <X size={11} /> Clear filter
                        </button>
                    )}
                </div>

                {/* ── Full audit table ──────────────────────────── */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-700">
                            Audit Details
                            <span className="ml-2 text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                {sortedEntries.length} of {entries.length}
                            </span>
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[820px]">
                            <thead className="bg-slate-50/80 border-b border-slate-100">
                                <tr>
                                    <SortTh col="title">Audit Title</SortTh>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Type</th>
                                    <SortTh col="department">Department</SortTh>
                                    <SortTh col="auditorName">Auditor</SortTh>
                                    <SortTh col="auditeeName">Auditee</SortTh>
                                    <SortTh col="scheduledDate">Scheduled Date</SortTh>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Frequency</th>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Reminder</th>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Status</th>
                                    <th className="px-4 py-3 w-8" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {sortedEntries.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-12 text-slate-400">
                                            No audits match the current filter.
                                        </td>
                                    </tr>
                                ) : sortedEntries.map((e, idx) => {
                                    const ti = getType(e.auditType);
                                    const Icon = ti.icon;
                                    const isExp = expandedRow === e.id;

                                    return (
                                        <React.Fragment key={e.id}>
                                            <tr className={`hover:bg-slate-50/60 transition-colors ${isExp ? "bg-slate-50" : ""}`}>
                                                {/* Title */}
                                                <td className="px-4 py-3">
                                                    <span className="font-semibold text-slate-800 text-sm">{e.title}</span>
                                                </td>
                                                {/* Type chip */}
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 border whitespace-nowrap"
                                                        style={{ borderColor: ti.dot + "40", background: ti.dot + "18", color: ti.dot }}>
                                                        <Icon size={11} />{ti.label}
                                                    </span>
                                                </td>
                                                {/* Department */}
                                                <td className="px-4 py-3 text-sm text-slate-600">{e.department || "—"}</td>
                                                {/* Auditor */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
                                                            {e.auditorName?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="text-sm text-slate-700 whitespace-nowrap">{e.auditorName}</span>
                                                    </div>
                                                </td>
                                                {/* Auditee */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">
                                                            {e.auditeeName?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="text-sm text-slate-700 whitespace-nowrap">{e.auditeeName}</span>
                                                    </div>
                                                </td>
                                                {/* Date */}
                                                <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap font-medium">
                                                    {fmtDate(e.scheduledDate)}
                                                </td>
                                                {/* Frequency */}
                                                <td className="px-4 py-3">
                                                    <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2.5 py-0.5 font-medium whitespace-nowrap">
                                                        {FREQUENCY_OPTS[e.frequency] || e.frequency}
                                                    </span>
                                                </td>
                                                {/* Reminder */}
                                                <td className="px-4 py-3">
                                                    <span className="flex items-center gap-1 text-xs text-slate-500">
                                                        <Bell size={11} />
                                                        {e.reminderDaysBefore}d before
                                                    </span>
                                                </td>
                                                {/* Status */}
                                                <td className="px-4 py-3"><AuditStatusBadge status={e.status} /></td>
                                                {/* Expand toggle */}
                                                <td className="px-4 py-3">
                                                    {e.scope && (
                                                        <button onClick={() => setExpandedRow(isExp ? null : e.id)}
                                                            className="p-1 rounded hover:bg-slate-200 text-slate-400 transition-colors">
                                                            {isExp ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                            {/* Expanded scope row */}
                                            {isExp && (
                                                <tr className="bg-slate-50">
                                                    <td colSpan={10} className="px-6 py-3 border-b border-slate-100">
                                                        <div className="flex items-start gap-2">
                                                            <Info size={13} className="text-slate-400 shrink-0 mt-0.5" />
                                                            <div>
                                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Scope / Notes</p>
                                                                <p className="text-sm text-slate-700">{e.scope}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Approve / Reject action bar ───────────────── */}
                {plan.status === "Pending" && canApprove && (
                    <div className="sticky bottom-4 flex items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-lg">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                                <AlertCircle size={16} className="text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-800">Action Required</p>
                                <p className="text-xs text-slate-500">Review the {entries.length} audit(s) above, then approve or reject.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <button onClick={() => setConfirmAction("reject")}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold transition-colors">
                                <XCircle size={15} /> Reject
                            </button>
                            <button onClick={() => setConfirmAction("approve")}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors shadow-sm shadow-emerald-200">
                                <Check size={15} /> Approve Plan
                            </button>
                        </div>
                    </div>
                )}

                {/* Already actioned */}
                {(plan.status === "Active" || plan.status === "Rejected" || plan.status === "Completed") && (
                    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${plan.status === "Rejected"
                            ? "bg-red-50 border-red-200"
                            : "bg-emerald-50 border-emerald-200"
                        }`}>
                        {plan.status === "Rejected"
                            ? <XCircle size={16} className="text-red-500 shrink-0" />
                            : <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
                        <p className="text-sm font-medium text-slate-700">
                            This plan was <span className="font-bold">{plan.status === "Active" ? "Approved" : plan.status}</span>
                            {plan.approvedBy ? ` by ${plan.approvedBy}` : ""}
                            {plan.approvedAt ? ` on ${fmtDate(plan.approvedAt)}` : ""}.
                        </p>
                    </div>
                )}
            </div>

            {/* Confirm modal */}
            {confirmAction && (
                <ConfirmModal
                    action={confirmAction}
                    planName={plan.planName}
                    onConfirm={handleApprovalConfirm}
                    onClose={() => setConfirmAction(null)}
                />
            )}
        </>
    );
};

// ─────────────────────────────────────────────────────────────────
// MAIN — AuditApproval page
// ─────────────────────────────────────────────────────────────────
const AuditApproval = () => {
    // Stable currentUser read once from localStorage — avoids new object ref every render
    const [currentUser] = useState(() => {
        try {
            const stored = localStorage.getItem("user");
            if (!stored || stored === "undefined") return null;
            const u = JSON.parse(stored);
            // u.username is the AD username e.g. "hamza.khan" or "hamza.khan@company.com"
            return { email: u.username, name: u.username };
        } catch { return null; }
    });

    const [selectedPlanId, setSelectedPlanId] = useState(null);
    const [listKey, setListKey] = useState(0); // bump to re-fetch list

    const handleActioned = () => {
        setSelectedPlanId(null);
        setListKey(k => k + 1);
    };

    return (
        <Layout>
            <div className="min-h-screen bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 py-6">

                    {/* ── Page header ───────────────────────────── */}
                    <div className="flex items-start justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center shadow-md shadow-amber-200">
                                    <Check size={18} className="text-white" />
                                </div>
                                Audit Plan Approval
                            </h1>
                            <p className="text-sm text-slate-500 mt-1 ml-11">
                                Review and approve audit plans submitted for your sign-off
                            </p>
                        </div>
                        {currentUser && (
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm shrink-0">
                                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                    {currentUser.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-xs">
                                    <p className="font-semibold text-slate-700">{currentUser.name}</p>
                                    <p className="text-slate-400">{currentUser.email}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {selectedPlanId ? (
                        // ── Detail view ──────────────────────────
                        <PlanDetail
                            planId={selectedPlanId}
                            currentUser={currentUser}
                            onBack={() => setSelectedPlanId(null)}
                            onActioned={handleActioned}
                        />
                    ) : (
                        // ── Pending list ──────────────────────────
                        <div className="max-w-2xl">
                            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                                    <Clock size={15} className="text-amber-500" />
                                    <h2 className="text-sm font-bold text-slate-700">Plans Pending Your Approval</h2>
                                </div>
                                <div className="p-4">
                                    <ApprovalList
                                        key={listKey}
                                        currentUser={currentUser}
                                        onSelect={setSelectedPlanId}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default AuditApproval;