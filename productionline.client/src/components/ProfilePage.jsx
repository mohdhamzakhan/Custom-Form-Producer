import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "./Layout";
import LoadingDots from "./LoadingDots";
import { APP_CONSTANTS } from "./store";
import {
    ShieldCheck, LogOut, Clock, CheckCircle2, XCircle, Send,
    ClipboardList, ArrowRight, KeyRound, Wrench, PenSquare, UserRound
} from "lucide-react";

const STATUS_STYLES = {
    Approved: { icon: CheckCircle2, className: "text-emerald-600 bg-emerald-50" },
    Rejected: { icon: XCircle, className: "text-rose-600 bg-rose-50" },
    Pending: { icon: Clock, className: "text-amber-600 bg-amber-50" },
    NotSent: { icon: Send, className: "text-gray-500 bg-gray-100" },
};

// A friendly, human role label instead of exposing raw AD group/security
// group names (e.g. "SANAND-IT") — same precedence Layout.jsx uses for nav.
function getRoleInfo(groups = []) {
    if (groups.includes("SANAND-IT")) {
        return { label: "IT Administrator", icon: Wrench };
    }
    if (groups.includes("Custom-Form_Creators")) {
        return { label: "Form Creator", icon: PenSquare };
    }
    return { label: "Team Member", icon: UserRound };
}



export default function ProfilePage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, recent: [], loading: true });
    const navigate = useNavigate();

    useEffect(() => {
        const storedUserData = localStorage.getItem("user");
        const token = localStorage.getItem("meaiFormToken");

        if (!token) {
            navigate("/login");
            return;
        }

        if (storedUserData && storedUserData !== "undefined") {
            try {
                setUser(JSON.parse(storedUserData));
            } catch (error) {
                console.error("Error parsing stored user data:", error);
            }
        }
        setLoading(false);
    }, [navigate]);

    useEffect(() => {
        if (!user?.username) return;

        const fetchStats = async () => {
            try {
                const base = `${APP_CONSTANTS.API_BASE_URL}/api/forms/${encodeURIComponent(user.username)}/my-submissions`;
                const [allRes, pendingRes, approvedRes, rejectedRes] = await Promise.all([
                    fetch(`${base}?page=1&pageSize=10`),
                    fetch(`${base}?status=Pending&page=1&pageSize=1`),
                    fetch(`${base}?status=Approved&page=1&pageSize=1`),
                    fetch(`${base}?status=Rejected&page=1&pageSize=1`),
                ]);
                const allData = allRes.ok ? await allRes.json() : { items: [], totalCount: 0 };
                const pendingData = pendingRes.ok ? await pendingRes.json() : { totalCount: 0 };
                const approvedData = approvedRes.ok ? await approvedRes.json() : { totalCount: 0 };
                const rejectedData = rejectedRes.ok ? await rejectedRes.json() : { totalCount: 0 };

                setStats({
                    total: allData.totalCount || 0,
                    pending: pendingData.totalCount || 0,
                    approved: approvedData.totalCount || 0,
                    rejected: rejectedData.totalCount || 0,
                    recent: allData.items || [],
                    loading: false,
                });
            } catch (error) {
                console.error("Error fetching profile stats:", error);
                setStats(prev => ({ ...prev, loading: false }));
            }
        };

        fetchStats();
    }, [user]);

    const memberSince = useMemo(() => {
        if (!user?.expiry) return null;
        // We don't have an actual account-creation date on hand — expiry is a
        // session expiry, not useful here, so this is intentionally left null
        // unless a real "created" field becomes available from the backend.
        return null;
    }, [user]);

    const handleLogout = () => {
        localStorage.removeItem("meaiFormToken");
        localStorage.removeItem("user");
        navigate("/login");
    };

    if (loading) return <LoadingDots />;
    if (!user) return null;

    const displayName = user.name || user.username;
    const initial = displayName?.[0]?.toUpperCase() || "?";
    const roleInfo = getRoleInfo(user.groups);
    const RoleIcon = roleInfo.icon;

    return (
        <Layout>
            {/* ── Header ───────────────────────────────────────────────────── */}
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

                <div className="relative px-6 py-8 sm:px-10 sm:py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/15 backdrop-blur border border-white/20 text-white rounded-2xl w-20 h-20 flex items-center justify-center text-3xl font-bold shadow-inner shrink-0">
                            {initial}
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{
                                displayName
                                    ?.replace(/\./g, ' ')
                                    .replace(/\b\w/g, char => char.toUpperCase())
                            }</h1>
                            {user.name && user.username && user.name !== user.username && (
                                <p className="text-indigo-200/80 text-sm mt-0.5">@{user.username}</p>
                            )}
                            <div className="flex items-center gap-1.5 mt-3 bg-white/10 border border-white/15 rounded-full pl-1.5 pr-3 py-1 w-fit">
                                <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center">
                                    <RoleIcon size={11} className="text-white" />
                                </span>
                                <span className="text-xs font-medium text-indigo-100">{roleInfo.label}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="self-start sm:self-auto flex items-center gap-2 bg-white/10 hover:bg-white/15 backdrop-blur border border-white/15 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                    >
                        <LogOut size={15} />
                        Sign out
                    </button>
                </div>
            </motion.div>

            {/* ── Stats ────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard label="Total Submissions" value={stats.total} loading={stats.loading} icon={ClipboardList} accent="indigo" />
                <StatCard label="Pending" value={stats.pending} loading={stats.loading} icon={Clock} accent="amber" />
                <StatCard label="Approved" value={stats.approved} loading={stats.loading} icon={CheckCircle2} accent="teal" />
                <StatCard label="Rejected" value={stats.rejected} loading={stats.loading} icon={XCircle} accent="rose" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent submissions */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800">Recent Submissions</h2>
                        <button
                            onClick={() => navigate("/reports")}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                        >
                            View all <ArrowRight size={14} />
                        </button>
                    </div>

                    {stats.loading ? (
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />
                            ))}
                        </div>
                    ) : stats.recent.length > 0 ? (
                        <div className="space-y-1">
                            {stats.recent.map(item => {
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
                                                {new Date(item.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </span>
                                        <span className="text-xs font-medium text-gray-400">{item.derivedStatus}</span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 py-6 text-center">No submissions yet.</p>
                    )}
                </div>

                {/* Account info */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 h-fit">
                    <div className="flex items-center gap-2 mb-4">
                        <ShieldCheck size={17} className="text-indigo-500" />
                        <h2 className="font-semibold text-gray-800">Account</h2>
                    </div>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between gap-3">
                            <dt className="text-gray-400">Login ID</dt>
                            <dd className="font-medium text-gray-800 text-right">{user.username}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-gray-400">Display Name</dt>
                            <dd className="font-medium text-gray-800 text-right">{displayName}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-gray-400">Role</dt>
                            <dd className="font-medium text-gray-800 text-right">{roleInfo.label}</dd>
                        </div>
                    </dl>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-start gap-2 text-xs text-gray-400">
                        <KeyRound size={13} className="mt-0.5 shrink-0" />
                        <span>Account details come from Active Directory. To update your name or roles, contact IT.</span>
                    </div>
                    {(user.groups || []).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1.5">AD Groups</div>
                            <p className="text-xs text-gray-400 break-words">{user.groups.join(", ")}</p>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}

const ACCENTS = {
    indigo: { bg: "bg-indigo-50", ring: "ring-indigo-100", icon: "text-indigo-600" },
    teal: { bg: "bg-teal-50", ring: "ring-teal-100", icon: "text-teal-600" },
    amber: { bg: "bg-amber-50", ring: "ring-amber-100", icon: "text-amber-600" },
    rose: { bg: "bg-rose-50", ring: "ring-rose-100", icon: "text-rose-600" },
};

function StatCard({ label, value, loading, icon: Icon, accent }) {
    const a = ACCENTS[accent] || ACCENTS.indigo;
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${a.bg} ring-1 ${a.ring} flex items-center justify-center shrink-0`}>
                <Icon className={a.icon} size={18} />
            </div>
            <div>
                <div className="text-xl font-bold text-gray-800">{loading ? "–" : value}</div>
                <div className="text-xs text-gray-400">{label}</div>
            </div>
        </div>
    );
}