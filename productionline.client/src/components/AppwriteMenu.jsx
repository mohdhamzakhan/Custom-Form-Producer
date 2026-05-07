import React, { useEffect, useMemo, useState } from 'react';
import { Client, Account, Databases, Query } from 'appwrite';
import {
    ResponsiveContainer, AreaChart, Area, CartesianGrid,
    Tooltip, XAxis, YAxis, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

// ─────────────────────────────────────────────
// APPWRITE CONFIG
// ─────────────────────────────────────────────
const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('69fad71700047614a4fe');

const account = new Account(client);
const databases = new Databases(client);
const DATABASE_ID = '69fad726001482a22c65';
const COLLECTIONS = { LOGS: 'notification_logs', MENUS: 'app_menus' };

// ─────────────────────────────────────────────
// FONTS
// ─────────────────────────────────────────────
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700;800&display=swap';
document.head.appendChild(fontLink);

// ─────────────────────────────────────────────
// DESIGN TOKENS (CSS Variables mapped to JS)
// ─────────────────────────────────────────────
const C = {
    bg: 'var(--bg)',
    surface: 'var(--surface)',
    card: 'var(--card)',
    border: 'var(--border)',
    accent: 'var(--accent)',
    accentDim: 'var(--accentDim)',
    blue: 'var(--blue)',
    red: 'var(--red)',
    amber: 'var(--amber)',
    text: 'var(--text)',
    muted: 'var(--muted)',
    dim: 'var(--dim)',
    surfaceAlpha: 'var(--surfaceAlpha)',
    borderDim: 'var(--borderDim)'
};

const injectStyles = () => {
    if (document.getElementById('dash-styles')) return;
    const s = document.createElement('style');
    s.id = 'dash-styles';
    s.textContent = `
    :root, [data-theme="dark"] {
        --bg: #060b14;          /* Blueish dark background */
        --surface: #0b121f;     /* Slightly lighter blueish surface */
        --card: #111a2b;        /* Card background */
        --border: #1e2b42;
        --borderDim: #1e2b4280;
        --accent: #00d4aa;
        --accentDim: #00d4aa22;
        --accentBorder: #00d4aa40;
        --blue: #3b82f6;
        --red: #f43f5e;
        --amber: #f59e0b;
        --text: #e8edf5;
        --muted: #64748b;
        --dim: #1e293b;
        --surfaceAlpha: rgba(11, 18, 31, 0.8);

        --status-sent-bg: #052e1a;
        --status-sent-color: #00d4aa;
        --status-sent-border: #00d4aa33;
        --status-failed-bg: #2e0512;
        --status-failed-color: #f43f5e;
        --status-failed-border: #f43f5e33;
        --status-pending-bg: #2e1a05;
        --status-pending-color: #f59e0b;
        --status-pending-border: #f59e0b33;
    }

    [data-theme="light"] {
        --bg: #f3f4f6;          /* Grayish light background */
        --surface: #e5e7eb;     /* Grayish surface */
        --card: #ffffff;        /* Pure white cards */
        --border: #d1d5db;
        --borderDim: #d1d5db60;
        --accent: #0f766e;
        --accentDim: #ccfbf1;
        --accentBorder: #0f766e40;
        --blue: #2563eb;
        --red: #e11d48;
        --amber: #d97706;
        --text: #111827;
        --muted: #6b7280;
        --dim: #e5e7eb;
        --surfaceAlpha: rgba(229, 231, 235, 0.8);

        --status-sent-bg: #d1fae5;
        --status-sent-color: #047857;
        --status-sent-border: #34d39980;
        --status-failed-bg: #ffe4e6;
        --status-failed-color: #be123c;
        --status-failed-border: #fb718580;
        --status-pending-bg: #fef3c7;
        --status-pending-color: #b45309;
        --status-pending-border: #fbbf2480;
    }

    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
    @keyframes slideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }
    @keyframes spin { to{transform:rotate(360deg)} }
    
    .dash-root * { box-sizing: border-box; }
    .dash-root { font-family: 'JetBrains Mono', monospace; transition: background-color 0.3s ease, color 0.3s ease; }
    .card-hover:hover { border-color: var(--blue) !important; background: var(--surface) !important; transition: all .15s ease; }
    
    .btn-primary { background: var(--accent); color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600; letter-spacing: .05em; display:flex;align-items:center;justify-content:center;gap:6px; transition: opacity .15s; }
    .btn-primary:hover:not(:disabled) { opacity: .85; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    [data-theme="dark"] .btn-primary { color: #000; }
    
    .btn-ghost { background: transparent; color: var(--muted); border: 1px solid var(--border); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-family: 'JetBrains Mono', monospace; font-size: 11px; transition: all .15s; }
    .btn-ghost:hover { border-color: var(--blue); color: var(--text); }
    .btn-ghost.active { border-color: var(--accent); color: var(--accent); }
    
    .table-row:hover { background: var(--surface) !important; }
    .sidebar-item { padding: 8px 12px; border-radius: 6px; cursor: pointer; display:flex;align-items:center;gap:8px; font-size:12px; color:var(--muted); transition:all .15s; }
    .sidebar-item:hover { background:var(--surface); color:var(--text); }
    .sidebar-item.active { background:var(--accentDim); color:var(--accent); border:1px solid var(--accentBorder); }
    
    ::-webkit-scrollbar { width:4px; height:4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--dim); border-radius:4px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--muted); }
    
    input[type=text], input[type=search], input[type=email], input[type=password] { background:var(--surface); border:1px solid var(--border); color:var(--text); padding:10px 14px; border-radius:6px; font-family:'JetBrains Mono',monospace; font-size:12px; outline:none; transition: border-color 0.2s; }
    input:focus { border-color:var(--accent) !important; }
    select { background:var(--surface); border:1px solid var(--border); color:var(--text); padding:6px 10px; border-radius:6px; font-family:'JetBrains Mono',monospace; font-size:11px; outline:none; cursor:pointer; }
  `;
    document.head.appendChild(s);
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const timeAgo = (date) => {
    const d = new Date(date);
    const s = Math.floor((Date.now() - d) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return d.toLocaleDateString();
};

const fmt = (v) => v?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') ?? '—';

const recentCount = (docs, minutes) => {
    const cutoff = Date.now() - minutes * 60000;
    return docs.filter(d => new Date(d.$createdAt).getTime() > cutoff).length;
};

// ─────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────
const PulseDot = ({ color = C.accent, size = 8 }) => (
    <span style={{ position: 'relative', display: 'inline-block', width: size, height: size }}>
        <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: color, animation: 'pulse 2s ease infinite'
        }} />
        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color }} />
    </span>
);

const KpiCard = ({ label, value, sub, color = C.accent, icon, trend }) => (
    <div className="card-hover" style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: '18px 20px', position: 'relative',
        overflow: 'hidden', animation: 'slideIn .3s ease'
    }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${color},transparent)` }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: C.muted, letterSpacing: '.1em', textTransform: 'uppercase' }}>{label}</span>
            {icon && <span style={{ fontSize: 16, opacity: .5 }}>{icon}</span>}
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: C.text, fontFamily: 'Syne, sans-serif', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: trend === 'up' ? C.accent : trend === 'down' ? C.red : C.muted, marginTop: 8 }}>{sub}</div>}
    </div>
);

const StatusBadge = ({ status }) => {
    const cfg = {
        'Sent': { bg: 'var(--status-sent-bg)', color: 'var(--status-sent-color)', border: 'var(--status-sent-border)' },
        'Failed': { bg: 'var(--status-failed-bg)', color: 'var(--status-failed-color)', border: 'var(--status-failed-border)' },
        'Pending': { bg: 'var(--status-pending-bg)', color: 'var(--status-pending-color)', border: 'var(--status-pending-border)' },
    }[status] || { bg: C.dim, color: C.muted, border: 'transparent' };
    return (
        <span style={{
            background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
            padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 600,
            letterSpacing: '.08em', textTransform: 'uppercase'
        }}>{status}</span>
    );
};

const RowModal = ({ doc, onClose }) => {
    if (!doc) return null;
    const entries = Object.entries(doc).filter(([k]) => !k.startsWith('$') || ['$id', '$createdAt', '$updatedAt'].includes(k));
    const meta = Object.entries(doc).filter(([k]) => k.startsWith('$') && !['$id', '$createdAt', '$updatedAt'].includes(k));

    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, animation: 'fadeIn .15s ease', backdropFilter: 'blur(4px)'
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 12, width: 'min(680px,90vw)', maxHeight: '80vh',
                overflow: 'hidden', display: 'flex', flexDirection: 'column',
                animation: 'slideIn .2s ease'
            }}>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, color: C.text }}>Document Details</div>
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{doc.$id}</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>✕</button>
                </div>
                <div style={{ overflowY: 'auto', padding: '16px 20px', flex: 1 }}>
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 10, color: C.muted, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>Fields</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                            {entries.map(([k, v]) => (
                                <div key={k} style={{ display: 'flex', background: C.surface }}>
                                    <div style={{ width: 160, padding: '10px 14px', fontSize: 11, color: C.muted, borderRight: `1px solid ${C.border}`, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</div>
                                    <div style={{ padding: '10px 14px', fontSize: 11, color: C.text, wordBreak: 'break-all', flex: 1 }}>
                                        {typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {meta.length > 0 && (
                        <div>
                            <div style={{ fontSize: 10, color: C.muted, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>Metadata</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {meta.map(([k, v]) => (
                                    <div key={k} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 10px' }}>
                                        <div style={{ fontSize: 9, color: C.muted }}>{k}</div>
                                        <div style={{ fontSize: 10, color: C.text, marginTop: 2 }}>{String(v)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const DataTable = ({ docs, columns, onRowClick }) => {
    const [sort, setSort] = useState({ key: '$createdAt', dir: -1 });
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const sorted = useMemo(() => {
        return [...docs].sort((a, b) => {
            const va = a[sort.key] ?? '';
            const vb = b[sort.key] ?? '';
            return sort.dir * (va < vb ? -1 : va > vb ? 1 : 0);
        });
    }, [docs, sort]);

    const total = Math.max(1, Math.ceil(sorted.length / pageSize));
    const rows = sorted.slice((page - 1) * pageSize, page * pageSize);

    const toggleSort = (key) => {
        setSort(s => s.key === key ? { key, dir: s.dir * -1 } : { key, dir: 1 });
        setPage(1);
    };

    return (
        <div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                        <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                            {columns.map(col => (
                                <th key={col.key} onClick={() => toggleSort(col.key)}
                                    style={{
                                        padding: '10px 14px', textAlign: 'left', color: C.muted, cursor: 'pointer',
                                        fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase',
                                        fontSize: 10, whiteSpace: 'nowrap', userSelect: 'none'
                                    }}>
                                    {col.label}
                                    {sort.key === col.key && <span style={{ marginLeft: 4, color: C.accent }}>{sort.dir > 0 ? '↑' : '↓'}</span>}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={row.$id || i} className="table-row"
                                onClick={() => onRowClick(row)}
                                style={{ borderBottom: `1px solid ${C.borderDim}`, cursor: 'pointer', transition: 'background .1s' }}>
                                {columns.map(col => (
                                    <td key={col.key} style={{ padding: '10px 14px', color: C.text, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 11, color: C.muted }}>{sorted.length} records · page {page}/{total}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-ghost" disabled={page === 1} onClick={() => setPage(1)}>«</button>
                    <button className="btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                    <button className="btn-ghost" disabled={page === total} onClick={() => setPage(p => p + 1)}>›</button>
                    <button className="btn-ghost" disabled={page === total} onClick={() => setPage(total)}>»</button>
                </div>
            </div>
        </div>
    );
};

const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 11 }}>
            <div style={{ color: C.muted, marginBottom: 4 }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></div>
            ))}
        </div>
    );
};

// ─────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────
export default function MonitoringDashboard() {
    injectStyles();

    // App State
    // Read from localStorage to persist theme across reloads
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('dash-theme') || 'dark';
        }
        return 'dark';
    });

    const [loading, setLoading] = useState(true);

    // Auth State
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Data State
    const [logs, setLogs] = useState([]);
    const [menus, setMenus] = useState([]);
    const [connected, setConnected] = useState(true);
    const [lastSync, setLastSync] = useState(null);
    const [view, setView] = useState('overview'); // overview | logs | menus
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [realtimeEvents, setRealtimeEvents] = useState(0);

    // Initial check for session
    useEffect(() => { checkSession(); }, []);

    // Save theme to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('dash-theme', theme);
    }, [theme]);

    const checkSession = async () => {
        try {
            const userData = await account.get();
            setUser(userData);
            await loadData();
            setupRealtime();
        } catch (err) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoggingIn(true);
        setAuthError('');

        try {
            await account.createEmailPasswordSession(email, password);
            const userData = await account.get();
            setUser(userData);
            await loadData();
            setupRealtime();
        } catch (err) {
            setAuthError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleLogout = async () => {
        try {
            await account.deleteSession('current');
            setUser(null);
            setLogs([]);
            setMenus([]);
        } catch (err) {
            console.error('Logout failed', err);
        }
    };

    const loadData = async () => {
        await Promise.all([loadLogs(), loadMenus()]);
    };

    const setupRealtime = () => {
        try {
            client.subscribe([
                `databases.${DATABASE_ID}.collections.${COLLECTIONS.LOGS}.documents`,
                `databases.${DATABASE_ID}.collections.${COLLECTIONS.MENUS}.documents`,
            ], () => {
                setConnected(true);
                setRealtimeEvents(n => n + 1);
                loadLogs();
                setLastSync(new Date());
            });
        } catch (err) {
            console.error(err);
            setConnected(false);
        }
    };

    const loadLogs = async () => {
        try {
            const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.LOGS, [
                Query.limit(500), Query.orderDesc('$createdAt')
            ]);
            setLogs(res.documents);
            setLastSync(new Date());
        } catch (err) {
            console.error(err);
            setConnected(false);
        }
    };

    const loadMenus = async () => {
        try {
            const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.MENUS, [Query.limit(100)]);
            setMenus(res.documents);
        } catch (err) { console.error(err); }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    // ── Derived stats ──
    const sentCount = logs.filter(x => x.status === 'Sent').length;
    const failedCount = logs.filter(x => x.status === 'Failed').length;
    const successRate = logs.length ? ((sentCount / logs.length) * 100).toFixed(1) : 0;

    const last5m = recentCount(logs, 5);
    const last15m = recentCount(logs, 15);
    const last1h = recentCount(logs, 60);
    const last24h = recentCount(logs, 1440);

    // ── Chart data ──
    const hourlyStats = Array.from({ length: 24 }, (_, hour) => {
        const sent = logs.filter(l => new Date(l.$createdAt).getHours() === hour && l.status === 'Sent').length;
        const failed = logs.filter(l => new Date(l.$createdAt).getHours() === hour && l.status === 'Failed').length;
        return { hour: `${hour}h`, sent, failed };
    });

    const pieData = [
        { name: 'Sent', value: sentCount },
        { name: 'Failed', value: failedCount },
    ];

    const weeklyData = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        const label = d.toLocaleDateString('en', { weekday: 'short' });
        const dayStr = d.toDateString();
        const count = logs.filter(l => new Date(l.$createdAt).toDateString() === dayStr).length;
        return { label, count };
    });

    // ── Filtered logs ──
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchSearch = search === '' || JSON.stringify(log).toLowerCase().includes(search.toLowerCase());
            const matchStatus = statusFilter === 'all' || log.status === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [logs, search, statusFilter]);

    // ── Table columns ──
    const logColumns = [
        {
            key: '$createdAt', label: 'Time',
            render: v => <span style={{ color: C.muted }}>{timeAgo(v)}</span>
        },
        { key: 'linePlant', label: 'Plant' },
        { key: 'recipientName', label: 'Recipient' },
        {
            key: 'status', label: 'Status',
            render: v => <StatusBadge status={v} />
        },
        {
            key: 'message', label: 'Message',
            render: v => <span style={{ color: C.muted, maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v || '—'}</span>
        },
    ];

    const menuColumns = [
        { key: '$id', label: 'ID', render: v => <span style={{ color: C.muted, fontSize: 10 }}>{v.slice(0, 12)}…</span> },
        { key: '$createdAt', label: 'Created', render: v => timeAgo(v) },
        { key: '$updatedAt', label: 'Updated', render: v => timeAgo(v) },
    ];

    // ─────────────────────────────────────────────
    // RENDER: LOADING
    // ─────────────────────────────────────────────
    if (loading) return (
        <div data-theme={theme} style={{ height: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.text, fontFamily: 'JetBrains Mono,monospace', gap: 16 }}>
            <div style={{ width: 32, height: 32, border: `2px solid ${C.border}`, borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: 12, color: C.muted }}>Initializing monitoring system…</div>
        </div>
    );

    // ─────────────────────────────────────────────
    // RENDER: LOGIN
    // ─────────────────────────────────────────────
    if (!user) return (
        <div className="dash-root" data-theme={theme} style={{ height: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text, position: 'relative' }}>

            {/* Theme Toggle for Login Screen */}
            <button className="btn-ghost" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} style={{ position: 'absolute', top: 24, right: 24, display: 'flex', alignItems: 'center', gap: 6 }}>
                {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>

            <div style={{ width: '100%', maxWidth: 400, padding: 32, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, animation: 'slideIn 0.4s ease', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 28, fontWeight: 800, color: C.accent, letterSpacing: '-.02em' }}>MEAI</div>
                    <div style={{ fontSize: 11, color: C.muted, letterSpacing: '.15em', textTransform: 'uppercase', marginTop: 4 }}>System Authentication</div>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Email</label>
                        <input
                            type="email"
                            required
                            placeholder="admin@meai.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Password</label>
                        <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ width: '100%' }}
                        />
                    </div>

                    {authError && (
                        <div style={{ padding: '10px 12px', background: 'var(--status-failed-bg)', border: `1px solid var(--status-failed-border)`, color: 'var(--status-failed-color)', fontSize: 11, borderRadius: 6 }}>
                            {authError}
                        </div>
                    )}

                    <button type="submit" className="btn-primary" disabled={isLoggingIn} style={{ marginTop: 8, padding: '12px 16px', width: '100%' }}>
                        {isLoggingIn ? (
                            <><span style={{ animation: 'spin 1s linear infinite' }}>↻</span> Authenticating...</>
                        ) : 'Secure Login'}
                    </button>
                </form>
            </div>
        </div>
    );


    // ─────────────────────────────────────────────
    // RENDER: DASHBOARD
    // ─────────────────────────────────────────────
    return (
        <div className="dash-root" data-theme={theme} style={{ display: 'flex', height: '100vh', background: C.bg, color: C.text, overflow: 'hidden' }}>

            {selectedDoc && <RowModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />}

            {/* ──────────── SIDEBAR ──────────── */}
            <aside style={{
                width: 220, background: C.surface, borderRight: `1px solid ${C.border}`,
                display: 'flex', flexDirection: 'column', flexShrink: 0, padding: '20px 12px', gap: 4
            }}>
                {/* Logo */}
                <div style={{ padding: '0 8px 20px', borderBottom: `1px solid ${C.border}`, marginBottom: 8 }}>
                    <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 16, fontWeight: 800, color: C.accent, letterSpacing: '-.02em' }}>MEAI</div>
                    <div style={{ fontSize: 9, color: C.muted, letterSpacing: '.15em', textTransform: 'uppercase', marginTop: 2 }}>Database Monitor</div>
                </div>

                {/* Nav */}
                {[
                    { id: 'overview', label: 'Overview', icon: '◈' },
                    { id: 'logs', label: 'Notification Logs', icon: '▦' },
                    { id: 'menus', label: 'App Menus', icon: '☰' },
                ].map(item => (
                    <div key={item.id} className={`sidebar-item ${view === item.id ? 'active' : ''}`}
                        onClick={() => setView(item.id)}>
                        <span style={{ fontSize: 12 }}>{item.icon}</span>
                        {item.label}
                    </div>
                ))}

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Connection status */}
                <div style={{ padding: '14px 12px', background: C.card, borderRadius: 8, border: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <PulseDot color={connected ? C.accent : C.red} />
                        <span style={{ fontSize: 10, color: connected ? C.accent : C.red, letterSpacing: '.06em' }}>
                            {connected ? 'LIVE' : 'OFFLINE'}
                        </span>
                    </div>
                    <div style={{ fontSize: 9, color: C.muted, marginBottom: 4 }}>Last sync</div>
                    <div style={{ fontSize: 10, color: C.text }}>{lastSync ? lastSync.toLocaleTimeString() : '—'}</div>
                    {realtimeEvents > 0 && (
                        <div style={{ fontSize: 9, color: C.accent, marginTop: 6 }}>↑ {realtimeEvents} realtime events</div>
                    )}
                </div>

                {/* Collections */}
                <div style={{ padding: '12px', background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, marginTop: 6 }}>
                    <div style={{ fontSize: 9, color: C.muted, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>Collections</div>
                    {[
                        { name: 'notification_logs', count: logs.length },
                        { name: 'app_menus', count: menus.length },
                    ].map(col => (
                        <div key={col.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 6 }}>
                            <span style={{ color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{col.name}</span>
                            <span style={{ color: C.accent, fontWeight: 600 }}>{fmt(col.count)}</span>
                        </div>
                    ))}
                </div>

                {/* User & Logout */}
                <div style={{ padding: '10px 8px', borderTop: `1px solid ${C.border}`, marginTop: 6 }}>
                    <div style={{ color: C.text, fontSize: 10, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || 'Admin User'}</div>
                    <div style={{ fontSize: 9, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 10 }}>{user.email}</div>
                    <button className="btn-ghost" onClick={handleLogout} style={{ width: '100%', fontSize: 10, padding: '4px 8px' }}>Logout</button>
                </div>
            </aside>

            {/* ──────────── MAIN ──────────── */}
            <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

                {/* Topbar */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 24px', borderBottom: `1px solid ${C.border}`,
                    background: C.surfaceAlpha, position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(8px)'
                }}>
                    <div>
                        <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 20, fontWeight: 800, letterSpacing: '-.02em' }}>
                            {view === 'overview' ? 'System Overview' : view === 'logs' ? 'Notification Logs' : 'App Menus'}
                        </div>
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                            {view === 'overview' ? 'Realtime production visibility' :
                                view === 'logs' ? `${filteredLogs.length} of ${logs.length} records` :
                                    `${menus.length} menu records`}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        {/* Theme Toggle Button */}
                        <button className="btn-ghost" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
                        </button>
                        <button className="btn-primary" onClick={handleRefresh} disabled={refreshing}>
                            <span style={{ display: 'inline-block', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>↺</span>
                            {refreshing ? 'Syncing…' : 'Refresh'}
                        </button>
                    </div>
                </div>

                <div style={{ padding: 24, flex: 1 }}>

                    {/* ══════════ OVERVIEW ══════════ */}
                    {view === 'overview' && (
                        <div style={{ animation: 'slideIn .3s ease' }}>

                            {/* KPI grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 24 }}>
                                <KpiCard label="Total Logs" value={fmt(logs.length)} sub={`${fmt(last24h)} in last 24h`} icon="▦" />
                                <KpiCard label="Sent" value={fmt(sentCount)} sub={`${successRate}% success rate`} color={C.accent} icon="✓" trend="up" />
                                <KpiCard label="Failed" value={fmt(failedCount)} sub={failedCount > 0 ? 'requires attention' : 'all clear'} color={C.red} icon="✕" trend={failedCount > 0 ? 'down' : 'up'} />
                                <KpiCard label="App Menus" value={fmt(menus.length)} sub="total menu entries" color={C.blue} icon="☰" />
                            </div>

                            {/* Activity velocity */}
                            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px', marginBottom: 24 }}>
                                <div style={{ fontSize: 11, color: C.muted, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 16 }}>Activity Velocity</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: C.border, borderRadius: 8, overflow: 'hidden' }}>
                                    {[
                                        { label: 'Last 5 min', value: last5m },
                                        { label: 'Last 15 min', value: last15m },
                                        { label: 'Last 1 hr', value: last1h },
                                        { label: 'Last 24 hr', value: last24h },
                                    ].map(({ label, value }) => (
                                        <div key={label} style={{ background: C.surface, padding: '14px 18px' }}>
                                            <div style={{ fontSize: 9, color: C.muted, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
                                            <div style={{ fontSize: 26, fontWeight: 700, color: value > 0 ? C.accent : C.muted, fontFamily: 'Syne,sans-serif' }}>{value}</div>
                                            <div style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>new rows</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Charts row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 24 }}>

                                {/* Hourly chart */}
                                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <div style={{ fontSize: 11, color: C.muted, letterSpacing: '.08em', textTransform: 'uppercase' }}>Hourly Traffic</div>
                                        <div style={{ display: 'flex', gap: 12, fontSize: 9, color: C.muted }}>
                                            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: C.accent, borderRadius: 2, marginRight: 4 }} />Sent</span>
                                            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: C.red, borderRadius: 2, marginRight: 4 }} />Failed</span>
                                        </div>
                                    </div>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <AreaChart data={hourlyStats} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                                            <defs>
                                                <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={C.accent} stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="gFail" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={C.red} stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor={C.red} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
                                            <XAxis dataKey="hour" tick={{ fill: C.muted, fontSize: 9 }} tickLine={false} axisLine={false} />
                                            <YAxis tick={{ fill: C.muted, fontSize: 9 }} tickLine={false} axisLine={false} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Area type="monotone" dataKey="sent" name="Sent" stroke={C.accent} fill="url(#gSent)" strokeWidth={1.5} />
                                            <Area type="monotone" dataKey="failed" name="Failed" stroke={C.red} fill="url(#gFail)" strokeWidth={1.5} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Pie + weekly */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px', flex: 1 }}>
                                        <div style={{ fontSize: 11, color: C.muted, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>Delivery Status</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                            <ResponsiveContainer width={100} height={100}>
                                                <PieChart>
                                                    <Pie data={pieData} dataKey="value" innerRadius={28} outerRadius={44} paddingAngle={3}>
                                                        <Cell fill={C.accent} />
                                                        <Cell fill={C.red} />
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div>
                                                <div style={{ fontSize: 9, color: C.muted }}>SUCCESS</div>
                                                <div style={{ fontSize: 22, fontWeight: 700, color: C.accent, fontFamily: 'Syne,sans-serif' }}>{successRate}%</div>
                                                <div style={{ fontSize: 9, color: C.muted, marginTop: 6 }}>{sentCount} sent · {failedCount} failed</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px', flex: 1 }}>
                                        <div style={{ fontSize: 11, color: C.muted, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>7-Day Activity</div>
                                        <ResponsiveContainer width="100%" height={80}>
                                            <BarChart data={weeklyData} margin={{ top: 0, right: 0, bottom: 0, left: -28 }}>
                                                <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 9 }} tickLine={false} axisLine={false} />
                                                <YAxis tick={{ fill: C.muted, fontSize: 9 }} tickLine={false} axisLine={false} />
                                                <Tooltip content={<ChartTooltip />} />
                                                <Bar dataKey="count" name="Logs" fill={C.blue} radius={[3, 3, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Live feed */}
                            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                    <PulseDot />
                                    <span style={{ fontSize: 11, color: C.muted, letterSpacing: '.08em', textTransform: 'uppercase' }}>Live Activity Feed</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {logs.slice(0, 8).map(log => (
                                        <div key={log.$id}
                                            onClick={() => setSelectedDoc(log)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                                                borderRadius: 6, cursor: 'pointer', transition: 'background .1s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = C.surface}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: log.status === 'Sent' ? C.accent : C.red, flexShrink: 0 }} />
                                            <StatusBadge status={log.status} />
                                            <span style={{ fontSize: 11, color: C.text, flex: 1 }}>{log.recipientName || 'Unknown'}</span>
                                            <span style={{ fontSize: 10, color: C.muted }}>{log.linePlant || '—'}</span>
                                            <span style={{ fontSize: 10, color: C.muted, minWidth: 70, textAlign: 'right' }}>{timeAgo(log.$createdAt)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══════════ LOGS TABLE ══════════ */}
                    {view === 'logs' && (
                        <div style={{ animation: 'slideIn .3s ease' }}>
                            {/* Filters */}
                            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                                <input
                                    type="search" placeholder="Search logs…" value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    style={{ flex: 1, minWidth: 200 }}
                                />
                                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                    <option value="all">All statuses</option>
                                    <option value="Sent">Sent</option>
                                    <option value="Failed">Failed</option>
                                    <option value="Pending">Pending</option>
                                </select>
                                <div style={{ fontSize: 10, color: C.muted }}>{filteredLogs.length} results</div>
                            </div>

                            {/* Quick stats */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
                                {[
                                    { label: '5 min', value: last5m, color: last5m > 0 ? C.accent : C.muted },
                                    { label: '15 min', value: last15m, color: C.text },
                                    { label: '1 hour', value: last1h, color: C.text },
                                    { label: '24 hours', value: last24h, color: C.text },
                                ].map(s => (
                                    <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>Last {s.label}</span>
                                        <span style={{ fontSize: 16, fontWeight: 700, color: s.color, fontFamily: 'Syne,sans-serif' }}>{s.value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Table */}
                            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                                <DataTable docs={filteredLogs} columns={logColumns} onRowClick={setSelectedDoc} />
                            </div>
                            <div style={{ fontSize: 10, color: C.muted, marginTop: 10, textAlign: 'center' }}>
                                Click any row to inspect the full document
                            </div>
                        </div>
                    )}

                    {/* ══════════ MENUS TABLE ══════════ */}
                    {view === 'menus' && (
                        <div style={{ animation: 'slideIn .3s ease' }}>
                            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                                <input type="search" placeholder="Search menus…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
                            </div>
                            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                                <DataTable
                                    docs={menus.filter(m => search === '' || JSON.stringify(m).toLowerCase().includes(search.toLowerCase()))}
                                    columns={[
                                        ...menuColumns,
                                        ...Object.keys(menus[0] || {}).filter(k => !k.startsWith('$')).map(k => ({
                                            key: k, label: k,
                                            render: v => <span style={{ color: C.muted }}>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}</span>
                                        }))
                                    ]}
                                    onRowClick={setSelectedDoc}
                                />
                            </div>
                            <div style={{ fontSize: 10, color: C.muted, marginTop: 10, textAlign: 'center' }}>
                                Click any row to inspect the full document · Read-only view
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}