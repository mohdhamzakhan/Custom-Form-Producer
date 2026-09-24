import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "./Layout";
import LoadingDots from './LoadingDots';
import { APP_CONSTANTS } from "./store";
import {
    FileText, ArrowRight, ClipboardList, BarChart3, Activity, Mail,
    ClipboardCheck, ShieldCheck, Radio, PlusCircle, Sparkles,
    CheckCircle2, XCircle, Clock, Send, Sun, Moon, CloudSun
} from "lucide-react";

// Only these forms get a card on the dashboard, even if the user has entry
// access to others too. Matches case-insensitively against a form's name
// containing any of these (e.g. "Competency" matches "Competency Mapping Test").
// Edit this list to add/remove which forms show up here.
const DASHBOARD_FORM_NAMES = ["Competency", "Gap Analysis"];

// Cycled accent themes for the form cards — deterministic per form so the
// same form always gets the same colour, but the grid still reads as varied.
const CARD_THEMES = [
    { bg: "bg-indigo-50", ring: "ring-indigo-100", icon: "text-indigo-600", bar: "bg-indigo-500" },
    { bg: "bg-teal-50", ring: "ring-teal-100", icon: "text-teal-600", bar: "bg-teal-500" },
    { bg: "bg-amber-50", ring: "ring-amber-100", icon: "text-amber-600", bar: "bg-amber-500" },
    { bg: "bg-rose-50", ring: "ring-rose-100", icon: "text-rose-600", bar: "bg-rose-500" },
    { bg: "bg-sky-50", ring: "ring-sky-100", icon: "text-sky-600", bar: "bg-sky-500" },
    { bg: "bg-violet-50", ring: "ring-violet-100", icon: "text-violet-600", bar: "bg-violet-500" },
];

function themeFor(key) {
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    return CARD_THEMES[hash % CARD_THEMES.length];
}

const STATUS_STYLES = {
    Approved: { icon: CheckCircle2, className: "text-emerald-600 bg-emerald-50" },
    Rejected: { icon: XCircle, className: "text-rose-600 bg-rose-50" },
    Pending: { icon: Clock, className: "text-amber-600 bg-amber-50" },
    NotSent: { icon: Send, className: "text-gray-500 bg-gray-100" },
};

function parseJwt(token) {
    try {
        const base64Payload = token.split('.')[1];
        const payload = atob(base64Payload);
        return JSON.parse(payload);
    } catch (error) {
        console.error("Invalid token format:", error);
        return null;
    }
}

function useGreeting() {
    return useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return { text: "Good morning", Icon: Sun };
        if (hour < 17) return { text: "Good afternoon", Icon: CloudSun };
        return { text: "Good evening", Icon: Moon };
    }, []);
}

// Same permission checks Layout.jsx uses for its nav links, so these tiles
// only ever point at pages the user can actually reach.
function getQuickActions(user, navigate) {
    const groups = user.groups || [];
    const isIT = groups.includes("SANAND-IT");
    const isCreator = groups.includes("Custom-Form_Creators") || isIT;

    const actions = [
        {
            key: "my-submissions",
            icon: ClipboardList,
            accent: "indigo",
            title: "My Submissions",
            description: "Track the forms you've submitted and their approval status",
            cta: "Open",
            onClick: () => navigate("/reports"),
        },
    ];

    if (isCreator) {
        actions.push(
            {
                key: "create-form",
                icon: PlusCircle,
                accent: "teal",
                title: "Create Form",
                description: "Build a new form from scratch or edit an existing one",
                cta: "Open Builder",
                onClick: () => navigate("/MyForm"),
            },
            {
                key: "report-builder",
                icon: BarChart3,
                accent: "amber",
                title: "Report Builder",
                description: "Build or view custom reports across your forms",
                cta: "Open Reports",
                onClick: () => navigate("/report"),
            },
            {
                key: "live-monitor",
                icon: Radio,
                accent: "sky",
                title: "Live Monitor",
                description: "Watch production submissions come in in real time",
                cta: "Open Monitor",
                onClick: () => navigate("/production-monitor"),
            },
            {
                key: "email-scheduler",
                icon: Mail,
                accent: "violet",
                title: "Email Scheduler",
                description: "Manage scheduled email reports and notifications",
                cta: "Manage",
                onClick: () => navigate("/EmailSchedular"),
            },
            {
                key: "audit",
                icon: ClipboardCheck,
                accent: "rose",
                title: "Audit Planner",
                description: "Plan and track audits across your forms",
                cta: "Open Audit",
                onClick: () => navigate("/Audit"),
            },
            {
                key: "audit-approval",
                icon: ShieldCheck,
                accent: "indigo",
                title: "Audit Approval",
                description: "Review and approve pending audit entries",
                cta: "Review",
                onClick: () => navigate("/AuditApproval"),
            },
        );
    }

    return actions;
}

export default function MainPage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [entryForms, setEntryForms] = useState([]);
    const [entryFormsLoading, setEntryFormsLoading] = useState(true);
    const [activity, setActivity] = useState({ total: 0, pending: 0, recent: [], loading: true });
    const [now, setNow] = useState(new Date());
    const navigate = useNavigate();
    const greeting = useGreeting();

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60_000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const storedUserData = localStorage.getItem("user");
        const token = localStorage.getItem("meaiFormToken");

        if (!token) {
            navigate("/login");
            return;
        }

        if (storedUserData && storedUserData !== "undefined") {
            try {
                const storedUser = JSON.parse(storedUserData);
                setUser(storedUser);
                setLoading(false);
            } catch (error) {
                console.error("Error parsing stored user data:", error);
                decodeTokenAndSetUser(token);
            }
        } else {
            decodeTokenAndSetUser(token);
        }
    }, [navigate]);

    const decodeTokenAndSetUser = (token) => {
        const decodedUser = parseJwt(token);
        if (decodedUser) {
            const userData = {
                username: decodedUser.name || decodedUser.sub,
                groups: decodedUser.role ?
                    (Array.isArray(decodedUser.role) ? decodedUser.role : [decodedUser.role]) :
                    [],
                name: decodedUser.displayName || decodedUser.name || decodedUser.sub
            };

            setUser(userData);
            localStorage.setItem("user", JSON.stringify(userData));
        } else {
            localStorage.removeItem("meaiFormToken");
            localStorage.removeItem("user");
            navigate("/login");
        }
        setLoading(false);
    };

    useEffect(() => {
        if (!user) return;

        const fetchEntryForms = async () => {
            try {
                setEntryFormsLoading(true);
                const groupsParam = encodeURIComponent((user.groups || []).join(','));
                const res = await fetch(
                    `${APP_CONSTANTS.API_BASE_URL}/api/forms/entry-access?username=${encodeURIComponent(user.username || '')}&groups=${groupsParam}`
                );
                if (res.ok) {
                    const data = await res.json();
                    setEntryForms(data || []);
                } else {
                    console.error("Failed to fetch entry-access forms");
                }
            } catch (error) {
                console.error("Error fetching entry-access forms:", error);
            } finally {
                setEntryFormsLoading(false);
            }
        };

        fetchEntryForms();
    }, [user]);

    // Real "Your Activity" numbers, pulled from the same my-submissions API
    // the Submission Report page uses — no invented stats.
    useEffect(() => {
        if (!user?.username) return;

        const fetchActivity = async () => {
            try {
                const base = `${APP_CONSTANTS.API_BASE_URL}/api/forms/${encodeURIComponent(user.username)}/my-submissions`;
                const [recentRes, pendingRes] = await Promise.all([
                    fetch(`${base}?page=1&pageSize=5`),
                    fetch(`${base}?status=Pending&page=1&pageSize=1`),
                ]);
                const recentData = recentRes.ok ? await recentRes.json() : { items: [], totalCount: 0 };
                const pendingData = pendingRes.ok ? await pendingRes.json() : { totalCount: 0 };

                setActivity({
                    total: recentData.totalCount || 0,
                    pending: pendingData.totalCount || 0,
                    recent: recentData.items || [],
                    loading: false,
                });
            } catch (error) {
                console.error("Error fetching submission activity:", error);
                setActivity(prev => ({ ...prev, loading: false }));
            }
        };

        fetchActivity();
    }, [user]);

    if (loading) return <LoadingDots />;
    if (!user) return null;

    // Filter entry forms against DASHBOARD_FORM_NAMES (case-insensitive substring match)
    const filteredForms = entryForms.filter(form =>
        DASHBOARD_FORM_NAMES.some(allowedName =>
            (form.name || "").toLowerCase().includes(allowedName.toLowerCase())
        )
    );

    const quickActions = getQuickActions(user, navigate);
    const dateLabel = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    const timeLabel = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

    return (
        <Layout>
            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="relative overflow-hidden rounded-2xl mb-8 shadow-lg"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-900 to-indigo-700" />
                <div
                    className="absolute inset-0 opacity-[0.15]"
                    style={{
                        backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
                        backgroundSize: "22px 22px"
                    }}
                />
                <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-indigo-400/20 blur-3xl" />
                <div className="absolute -left-10 -bottom-16 w-56 h-56 rounded-full bg-sky-400/10 blur-3xl" />

                <div className="relative px-6 py-8 sm:px-10 sm:py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                            <div className="bg-white/15 backdrop-blur border border-white/20 text-white rounded-2xl w-16 h-16 flex items-center justify-center text-2xl font-bold shadow-inner">
                                {user.name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <span className="absolute -bottom-1 -right-1 bg-emerald-400 w-4 h-4 rounded-full ring-2 ring-indigo-900" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 text-indigo-200 text-sm font-medium">
                                <greeting.Icon size={15} />
                                {greeting.text}
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                {user.username
                                    ?.replace(/\./g, ' ')
                                    .replace(/\b\w/g, char => char.toUpperCase())}
                            </h1>
                            <p className="text-indigo-200/80 text-sm mt-0.5">{dateLabel} · {timeLabel}</p>
                        </div>
                    </div>

                    <div className="flex gap-3 sm:gap-4">
                        <button
                            onClick={() => navigate("/reports")}
                            className="bg-white/10 backdrop-blur border border-white/10 hover:bg-white/15 transition rounded-xl px-4 py-3 text-center min-w-[92px]"
                        >
                            <div className="text-2xl font-bold text-white">{activity.loading ? "–" : activity.total}</div>
                            <div className="text-[11px] uppercase tracking-wide text-indigo-200/80">Submissions</div>
                        </button>
                        <button
                            onClick={() => navigate("/reports")}
                            className="bg-white/10 backdrop-blur border border-white/10 hover:bg-white/15 transition rounded-xl px-4 py-3 text-center min-w-[92px]"
                        >
                            <div className="text-2xl font-bold text-white">{activity.loading ? "–" : activity.pending}</div>
                            <div className="text-[11px] uppercase tracking-wide text-indigo-200/80">Pending</div>
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* ── Forms you can fill ──────────────────────────────────────── */}
            <div className="mb-9">
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={18} className="text-indigo-500" />
                    <h2 className="text-lg font-semibold text-gray-800">Forms you can fill</h2>
                </div>

                {entryFormsLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-[104px] rounded-xl bg-gray-100 animate-pulse" />
                        ))}
                    </div>
                ) : filteredForms.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredForms.map((form, i) => {
                            const theme = themeFor(String(form.id ?? form.name ?? i));
                            return (
                                <motion.button
                                    key={form.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.35, delay: 0.05 * i }}
                                    whileHover={{ y: -3 }}
                                    onClick={() => navigate(`/form/${form.formLink}`)}
                                    className="group relative text-left bg-white p-5 pl-6 rounded-xl shadow-sm hover:shadow-lg border border-gray-100 transition-shadow overflow-hidden"
                                >
                                    <span className={`absolute left-0 top-0 h-full w-1 ${theme.bar}`} />
                                    <div className="flex items-center justify-between mb-3">
                                        <div className={`w-10 h-10 rounded-lg ${theme.bg} ring-1 ${theme.ring} flex items-center justify-center`}>
                                            <FileText className={theme.icon} size={19} />
                                        </div>
                                        <ArrowRight
                                            className="text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all"
                                            size={17}
                                        />
                                    </div>
                                    <div className="font-semibold text-gray-800 leading-snug">{form.name}</div>
                                    <div className="text-xs text-gray-400 mt-1">Click to fill this form</div>
                                </motion.button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center">
                        <ClipboardList className="mx-auto text-gray-300 mb-2" size={28} />
                        <p className="text-gray-500 text-sm">No forms are currently assigned to you for entry.</p>
                    </div>
                )}
            </div>

            {/* ── Your activity + Quick actions ───────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent activity — real data from My Submissions */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity size={17} className="text-indigo-500" />
                        <h2 className="font-semibold text-gray-800">Recent Activity</h2>
                    </div>

                    {activity.loading ? (
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />
                            ))}
                        </div>
                    ) : activity.recent.length > 0 ? (
                        <div className="space-y-1">
                            {activity.recent.map((item) => {
                                const status = STATUS_STYLES[item.derivedStatus] || STATUS_STYLES.NotSent;
                                const StatusIcon = status.icon;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => navigate(`/submissions/${item.id}`)}
                                        className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition text-left"
                                    >
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${status.className}`}>
                                            <StatusIcon size={15} />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-medium text-gray-800 truncate">{item.formName}</span>
                                            <span className="block text-xs text-gray-400">
                                                {new Date(item.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {item.derivedStatus}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => navigate("/reports")}
                                className="w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-800 pt-2"
                            >
                                View all submissions →
                            </button>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 py-4 text-center">No submissions yet.</p>
                    )}
                </div>

                {/* Quick actions — real routes, gated by the same groups Layout.jsx uses */}
                <div className="lg:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <h2 className="font-semibold text-gray-800">Quick Actions</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {quickActions.map((action, i) => (
                            <QuickActionCard key={action.key} {...action} delay={i * 0.04} />
                        ))}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

const ACCENTS = {
    indigo: { bg: "bg-indigo-50", ring: "ring-indigo-100", icon: "text-indigo-600", text: "text-indigo-700", link: "text-indigo-600 hover:text-indigo-800" },
    teal: { bg: "bg-teal-50", ring: "ring-teal-100", icon: "text-teal-600", text: "text-teal-700", link: "text-teal-600 hover:text-teal-800" },
    amber: { bg: "bg-amber-50", ring: "ring-amber-100", icon: "text-amber-600", text: "text-amber-700", link: "text-amber-600 hover:text-amber-800" },
    rose: { bg: "bg-rose-50", ring: "ring-rose-100", icon: "text-rose-600", text: "text-rose-700", link: "text-rose-600 hover:text-rose-800" },
    sky: { bg: "bg-sky-50", ring: "ring-sky-100", icon: "text-sky-600", text: "text-sky-700", link: "text-sky-600 hover:text-sky-800" },
    violet: { bg: "bg-violet-50", ring: "ring-violet-100", icon: "text-violet-600", text: "text-violet-700", link: "text-violet-600 hover:text-violet-800" },
};

function QuickActionCard({ icon: Icon, accent = "indigo", title, description, cta, onClick, delay = 0 }) {
    const a = ACCENTS[accent] || ACCENTS.indigo;
    return (
        <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay }}
            whileHover={{ y: -3 }}
            onClick={onClick}
            className="text-left bg-white p-5 rounded-xl shadow-sm hover:shadow-lg border border-gray-100 transition-shadow"
        >
            <div className={`w-10 h-10 rounded-lg ${a.bg} ring-1 ${a.ring} flex items-center justify-center mb-3`}>
                <Icon className={a.icon} size={19} />
            </div>
            <h3 className={`text-sm font-semibold mb-1 ${a.text}`}>{title}</h3>
            <p className="text-gray-500 text-xs mb-3 leading-relaxed">{description}</p>
            <span className={`text-xs font-semibold inline-flex items-center gap-1 ${a.link}`}>
                {cta} <ArrowRight size={12} />
            </span>
        </motion.button>
    );
}