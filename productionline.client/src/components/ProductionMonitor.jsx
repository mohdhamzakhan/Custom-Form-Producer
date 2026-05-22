import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { APP_CONSTANTS } from "./store";

// ─────────────────────────────────────────────────────────────────────────────
// ProductionMonitor.jsx
// ─────────────────────────────────────────────────────────────────────────────

// ── helpers ──────────────────────────────────────────────────────────────────

const getAuthHeaders = () => {
    try {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        return u.username ? { "X-Username": u.username } : {};
    } catch {
        return {};
    }
};

const formatAgo = (ms) => {
    if (ms === null || ms === undefined) return "—";
    const totalSec = Math.floor(ms / 1000);
    if (totalSec < 60) return `${totalSec}s ago`;
    const m = Math.floor(totalSec / 60);
    if (m < 60) return `${m}m ${totalSec % 60}s ago`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m ago`;
};

const formatTs = (ts) => {
    if (!ts) return "—";
    try {
        return new Date(ts).toLocaleTimeString([], {
            hour: "2-digit", minute: "2-digit", second: "2-digit",
        });
    } catch { return String(ts); }
};

const uid = () => Math.random().toString(36).slice(2, 9);

const DEFAULT_THRESHOLD_MINUTES = 5;
const AUTO_REFRESH_MS = 60_000;
const AGE_TICK_MS = 5_000;

// ── styles (using CSS Variables for Theme Support) ───────────────────────────

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

.pm-root * { box-sizing: border-box; transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease; }

/* ── Theme Variables ── */
.pm-root {
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  min-height: 100vh;
  padding: 32px 24px 64px;
}

/* Soft Dark Mode */
.pm-root.dark {
  --bg-main: #111827; 
  --bg-card: #1f2937; 
  --bg-cfg: #1f2937;
  --bg-input: #111827;
  --border-subtle: #374151; 
  --border-input: #4b5563; 
  --border-focus: #60a5fa;
  --text-primary: #f9fafb; 
  --text-secondary: #d1d5db; 
  --text-muted: #9ca3af; 
  --text-eyebrow: #9ca3af;
  --hover-bg: #374151;
  --shadow-card: 0 4px 20px rgba(0,0,0,0.25);
}

/* Soft Light Mode */
.pm-root.light {
  --bg-main: #f3f4f6; 
  --bg-card: #fafafa; 
  --bg-cfg: #fafafa;
  --bg-input: #ffffff;
  --border-subtle: #d1d5db; 
  --border-input: #d1d5db;
  --border-focus: #9ca3af;
  --text-primary: #374151; 
  --text-secondary: #4b5563; 
  --text-muted: #6b7280; 
  --text-eyebrow: #6b7280;
  --hover-bg: #e5e7eb; 
  --shadow-card: 0 4px 15px rgba(0,0,0,0.03);
}

.pm-root { background: var(--bg-main); color: var(--text-secondary); }

/* ── header ── */
.pm-header {
  display: flex; align-items: flex-end; justify-content: space-between;
  flex-wrap: wrap; gap: 16px;
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: 24px; margin-bottom: 32px;
}
.pm-header-left { display: flex; flex-direction: column; gap: 4px; }
.pm-eyebrow {
  font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--text-eyebrow); font-family: 'IBM Plex Mono', monospace; font-weight: 600;
}
.pm-title {
  font-size: 28px; font-weight: 400; color: var(--text-primary); letter-spacing: -0.02em;
}

.pm-header-right {
  display: flex; align-items: center; gap: 20px;
}

/* theme toggle */
.pm-theme-btn {
  background: none; border: 1px solid var(--border-subtle); border-radius: 50%;
  width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--text-muted); transition: all 0.2s;
}
.pm-theme-btn:hover { background: var(--hover-bg); color: var(--text-primary); transform: scale(1.05); }

.pm-live-badge {
  display: flex; align-items: center; gap: 8px;
  font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--text-eyebrow); font-family: 'IBM Plex Mono', monospace; font-weight: 500;
  padding: 6px 12px; border: 1px solid var(--border-subtle); border-radius: 100px;
  background: var(--bg-card);
}
.pm-live-dot {
  width: 8px; height: 8px; border-radius: 50%; background: #22c55e;
  animation: pmLive 2.4s ease-in-out infinite;
}
@keyframes pmLive {
  0%,100%{ opacity:1; box-shadow:0 0 0 0 rgba(34,197,94,.6); }
  50%    { opacity:.5; box-shadow:0 0 0 5px rgba(34,197,94,0); }
}

/* ── summary strip ── */
.pm-strip {
  display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 28px;
}
.pm-chip {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 16px; border-radius: 100px; font-size: 13px; font-weight: 500;
}
.pm-chip-n { font-family:'IBM Plex Mono',monospace; font-size:16px; font-weight:600; }
.pm-chip--total { background: var(--hover-bg); border: 1px solid var(--border-subtle); color: var(--text-secondary); }
.pm-chip--up    { background: rgba(34,197,94,.1); border: 1px solid rgba(34,197,94,.3); color: #22c55e; }
.pm-chip--down  { background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3); color: #ef4444; }

/* ── grid ── */
.pm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 36px;
}

/* ── card ── */
.pm-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  transition: all .3s ease;
  box-shadow: var(--shadow-card);
  cursor: default;
}
.pm-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }

.pm-card--up   { border-color: rgba(34,197,94,.4); }
.pm-card--down { border-color: rgba(239,68,68,.4); }
.pm-card--err  { border-color: rgba(251,191,36,.4); }

.pm-bar { position: absolute; top: 0; left: 0; right: 0; height: 3px; }
.pm-card--up   .pm-bar { background: #22c55e; animation: pmBarGreen 2s ease-in-out infinite; }
.pm-card--down .pm-bar { background: #ef4444; animation: pmBarRed   1s ease-in-out infinite; }
.pm-card--err  .pm-bar { background: #fbbf24; }
.pm-card--loading .pm-bar { background: var(--text-muted); opacity: 0.5; }

@keyframes pmBarGreen { 0%,100%{ opacity:1; box-shadow:0 0 12px 2px rgba(34,197,94,.6); } 50%{ opacity:.4; box-shadow:none; } }
@keyframes pmBarRed   { 0%,100%{ opacity:1; box-shadow:0 0 14px 3px rgba(239,68,68,.8); } 50%{ opacity:.3; box-shadow:none; } }

.pm-card-inner { padding: 20px 18px 18px; }

/* badge */
.pm-badge {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; letter-spacing: .16em; text-transform: uppercase;
  font-family: 'IBM Plex Mono', monospace; font-weight: 600;
  padding: 4px 10px; border-radius: 100px; margin-bottom: 16px;
}
.pm-bdot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

.pm-badge--up   { background: rgba(34,197,94,.15); border: 1px solid rgba(34,197,94,.3); color: #22c55e; }
.pm-badge--up   .pm-bdot { background: #22c55e; animation: pmBlink 1.4s ease-in-out infinite; }
.pm-badge--down { background: rgba(239,68,68,.15); border: 1px solid rgba(239,68,68,.3); color: #ef4444; }
.pm-badge--down .pm-bdot { background: #ef4444; animation: pmBlink .72s ease-in-out infinite; }
.pm-badge--loading { background: var(--hover-bg); border: 1px solid var(--border-subtle); color: var(--text-muted); }
.pm-badge--err  { background: rgba(251,191,36,.15); border: 1px solid rgba(251,191,36,.3); color: #f59e0b; }

@keyframes pmBlink { 0%,100%{opacity:1} 50%{opacity:.15} }

/* card text */
.pm-plant {
  font-size: 16px; font-weight: 500; color: var(--text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px;
}
.pm-fid {
  font-size: 11px; color: var(--text-muted); font-family: 'IBM Plex Mono', monospace;
  margin-bottom: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.pm-sep { height: 1px; background: var(--border-subtle); margin-bottom: 16px; }

.pm-lbl {
  font-size: 10px; letter-spacing: .16em; text-transform: uppercase;
  font-family: 'IBM Plex Mono', monospace; color: var(--text-eyebrow); margin-bottom: 4px;
}
.pm-ts {
  font-size: 20px; font-weight: 400; font-family: 'IBM Plex Mono', monospace;
  color: var(--text-secondary); letter-spacing: .02em; margin-bottom: 6px;
}
.pm-ago { font-size: 13px; font-family: 'IBM Plex Mono', monospace; font-weight: 500; }
.pm-ago--up      { color: #22c55e; }
.pm-ago--down    { color: #ef4444; }
.pm-ago--loading { color: var(--text-muted); }
.pm-ago--err     { color: #f59e0b; font-size: 12px; }
.pm-hint { font-size: 11px; color: var(--text-eyebrow); font-family: 'IBM Plex Mono', monospace; margin-top: 4px; }
.pm-count { font-size: 11px; color: var(--text-eyebrow); font-family: 'IBM Plex Mono', monospace; margin-top: 8px; }

/* ── spinner ── */
.pm-spin {
  display: inline-block; width: 10px; height: 10px;
  border: 2px solid var(--border-subtle); border-top-color: var(--text-muted);
  border-radius: 50%; animation: pmSpin .6s linear infinite; vertical-align: middle;
}
@keyframes pmSpin{ to{transform:rotate(360deg)} }

/* ── config panel ── */
.pm-cfg {
  background: var(--bg-cfg); border: 1px solid var(--border-subtle);
  border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-card);
}
.pm-cfg-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; cursor: pointer; user-select: none;
}
.pm-cfg-head:hover { background: var(--hover-bg); }
.pm-cfg-head.open  { border-bottom: 1px solid var(--border-subtle); }
.pm-cfg-lbl {
  font-size: 11px; letter-spacing: .18em; text-transform: uppercase;
  font-family: 'IBM Plex Mono', monospace; color: var(--text-primary); font-weight: 600;
}
.pm-cfg-arrow { font-size: 10px; color: var(--text-muted); transition: transform .2s; }
.pm-cfg-arrow.open { transform: rotate(180deg); }

.pm-cfg-body { padding: 20px; }

/* table inside config */
.pm-tbl { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
.pm-tbl th {
  font-size: 10px; letter-spacing: .16em; text-transform: uppercase;
  font-family: 'IBM Plex Mono', monospace; color: var(--text-muted); font-weight: 600;
  text-align: left; padding: 0 10px 10px; border-bottom: 1px solid var(--border-subtle);
}
.pm-tbl td { padding: 6px 4px; vertical-align: middle; }

.pm-inp {
  width: 100%; background: var(--bg-input); border: 1px solid var(--border-input);
  color: var(--text-primary); border-radius: 8px; padding: 8px 12px; font-size: 13px;
  outline: none; font-family: 'IBM Plex Sans', sans-serif;
}
.pm-inp.mono { font-family: 'IBM Plex Mono', monospace; }
.pm-inp:focus { border-color: var(--border-focus); box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.2); }
.pm-inp::placeholder { color: var(--text-muted); opacity: 0.6; }

.pm-thresh-row {
  display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
  font-size: 12px; color: var(--text-secondary); font-family: 'IBM Plex Mono', monospace; flex-wrap: wrap;
  background: var(--hover-bg); padding: 12px 16px; border-radius: 8px;
}
.pm-thresh-inp {
  width: 60px; background: var(--bg-input); border: 1px solid var(--border-input); color: var(--text-primary);
  border-radius: 6px; padding: 6px 8px; font-size: 13px; text-align: center;
  outline: none; font-family: 'IBM Plex Mono', monospace; font-weight: 600;
}
.pm-thresh-inp:focus { border-color: var(--border-focus); }

.pm-btn-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.pm-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 600;
  cursor: pointer; border: 1px solid transparent;
  font-family: 'IBM Plex Mono', monospace; letter-spacing: .05em;
  transition: all 0.15s ease;
}
.pm-btn:disabled { opacity: .5; cursor: not-allowed; }

.pm-btn--add     { background: rgba(34,197,94,.1); border-color: rgba(34,197,94,.3); color: #22c55e; }
.pm-btn--add:hover:not(:disabled) { background: rgba(34,197,94,.2); }

.pm-btn--db      { background: rgba(14,165,233,.1); border-color: rgba(14,165,233,.3); color: #0ea5e9; }
.pm-btn--db:hover:not(:disabled) { background: rgba(14,165,233,.2); }

.pm-btn--refresh { background: rgba(99,102,241,.1); border-color: rgba(99,102,241,.3); color: #6366f1; }
.pm-btn--refresh:hover:not(:disabled) { background: rgba(99,102,241,.2); }

.pm-btn--remove  { background: rgba(239,68,68,.1); border-color: rgba(239,68,68,.3); color: #ef4444; padding: 6px 10px; }
.pm-btn--remove:hover { background: rgba(239,68,68,.2); }

.pm-since { margin-left: auto; font-size: 11px; color: var(--text-muted); font-family: 'IBM Plex Mono', monospace; }

.pm-empty {
  text-align: center; padding: 64px 20px; font-size: 14px;
  color: var(--text-muted); font-family: 'IBM Plex Mono', monospace; letter-spacing: .05em;
  background: var(--bg-card); border: 1px dashed var(--border-subtle); border-radius: 16px; margin-bottom: 36px;
}
`;

// ── Sun / Moon / DB Icons ────────────────────────────────────────────────────
const SunIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
);
const MoonIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
);
const DbIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
    </svg>
);

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ state }) {
    const MAP = {
        up: ["pm-badge--up", "Running"],
        down: ["pm-badge--down", "Down"],
        loading: ["pm-badge--loading", "Checking"],
        error: ["pm-badge--err", "Error"],
    };
    const [cls, label] = MAP[state] || MAP.loading;
    return (
        <span className={`pm-badge ${cls}`}>
            {state === "loading"
                ? <span className="pm-spin" />
                : <span className="pm-bdot" />}
            {label}
        </span>
    );
}

// ── LineCard ──────────────────────────────────────────────────────────────────

function LineCard({ line, status }) {
    const s = status || { state: "loading" };
    const state = s.state;

    const cardCls = `pm-card pm-card--${state === "error" ? "err" : state}`;
    const agoCls = `pm-ago pm-ago--${state}`;

    const agoText =
        s.ageMs !== null && s.ageMs !== undefined
            ? formatAgo(s.ageMs)
            : state === "error"
                ? (s.error || "request failed")
                : "—";

    return (
        <div className={cardCls}>
            <div className="pm-bar" />
            <div className="pm-card-inner">
                <StatusBadge state={state} />

                <div className="pm-plant">{line.plant || "(Unnamed)"}</div>
                <div className="pm-fid">{line.formId || "no form id set"}</div>

                <div className="pm-sep" />

                <div className="pm-lbl">Last Submission</div>
                <div className="pm-ts">{formatTs(s.lastTimestamp)}</div>
                <div className={agoCls}>{agoText}</div>

                {/*{s.totalSubmissions !== undefined && (*/}
                {/*    <div className="pm-count">{s.totalSubmissions.toLocaleString()} total</div>*/}
                {/*)}*/}
                {state === "error" && (
                    <div className="pm-hint">check form id or api</div>
                )}
            </div>
        </div>
    );
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function ProductionMonitor() {
    const [theme, setTheme] = useState(() => localStorage.getItem("pm_theme") || "dark");

    // Lines default to local storage. It will NO LONGER be overwritten on page load.
    const [lines, setLines] = useState(() => {
        const saved = localStorage.getItem("pm_lines_config");
        try { return saved ? JSON.parse(saved) : []; } catch { return []; }
    });

    const [statuses, setStatuses] = useState({});
    const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD_MINUTES);
    const [cfgOpen, setCfgOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [syncingDb, setSyncingDb] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(null);

    const intervalsRef = useRef({ fetch: null, tick: null });
    const linesRef = useRef(lines);
    const threshRef = useRef(threshold);

    // Every time 'lines' changes (e.g. you hit 'X' to hide one), save to localStorage
    useEffect(() => {
        linesRef.current = lines;
        localStorage.setItem("pm_lines_config", JSON.stringify(lines));
    }, [lines]);

    useEffect(() => { threshRef.current = threshold; }, [threshold]);
    useEffect(() => { localStorage.setItem("pm_theme", theme); }, [theme]);

    useEffect(() => {
        const id = "pm-global-styles";
        if (document.getElementById(id)) return;
        const tag = document.createElement("style");
        tag.id = id;
        tag.textContent = STYLES;
        document.head.appendChild(tag);
        return () => tag.remove();
    }, []);

    // ── fetch config from DB ───────────────────────────────────────────────────
    const fetchDbConfig = useCallback(async () => {
        setSyncingDb(true);
        try {
            const { data } = await axios.get(
                `${APP_CONSTANTS.API_BASE_URL}/api/forms/config`,
                { headers: getAuthHeaders() }
            );

            if (Array.isArray(data) && data.length > 0) {
                // NORMALIZER: This handles differences in JSON serialization casing 
                // (e.g. FormId vs formId vs FORMID) ensuring inputs fill out perfectly.
                const normalizedLines = data.map(item => ({
                    id: (item.id || item.Id || item.ID || uid()).toString(),
                    plant: item.plant || item.Plant || item.PLANT || "Unnamed Line",
                    formId: (item.formId || item.FormId || item.FORMID || "").toString()
                }));

                setLines(normalizedLines);
                fetchAll(normalizedLines, threshRef.current);
            }
        } catch (err) {
            console.error("Failed to fetch DB config for lines:", err);
        } finally {
            setSyncingDb(false);
        }
    }, []);

    // NOTE: I removed the useEffect that auto-called fetchDbConfig on mount.
    // The app will now trust your localStorage entirely.


    // ── fetch one line's status ────────────────────────────────────────────────
    const fetchLine = useCallback(async (line, thresh) => {
        if (!line.formId.trim()) {
            setStatuses(p => ({
                ...p,
                [line.id]: { state: "error", error: "No form ID set", lastTimestamp: null, ageMs: null },
            }));
            return;
        }

        setStatuses(p => ({
            ...p,
            [line.id]: { ...(p[line.id] || {}), state: "loading" },
        }));

        try {
            const { data } = await axios.get(
                `${APP_CONSTANTS.API_BASE_URL}/api/forms/${encodeURIComponent(line.formId)}/last-submission`,
                { headers: getAuthHeaders(), timeout: 15_000 }
            );

            const ts =
                data?.lastSubmittedAt ||
                data?.submittedAt ||
                data?.createdAt ||
                data?.timestamp ||
                null;

            if (!ts) {
                setStatuses(p => ({
                    ...p,
                    [line.id]: { state: "down", error: "No submissions found", lastTimestamp: null, ageMs: null, totalSubmissions: 0 },
                }));
                return;
            }

            const ageMs = Date.now() - new Date(ts).getTime();
            setStatuses(p => ({
                ...p,
                [line.id]: {
                    state: ageMs <= thresh * 60_000 ? "up" : "down",
                    lastTimestamp: ts,
                    ageMs,
                    totalSubmissions: data?.totalSubmissions ?? undefined,
                    error: null,
                },
            }));
        } catch (err) {
            const status = err?.response?.status;
            const msg =
                status === 404 ? "Form not found" :
                    status === 401 ? "Unauthorized" :
                        err?.code === "ECONNABORTED" ? "Timeout" :
                            "Request failed";

            setStatuses(p => ({
                ...p,
                [line.id]: { state: "error", error: msg, lastTimestamp: null, ageMs: null },
            }));
        }
    }, []);

    // ── fetch all lines ────────────────────────────────────────────────────────
    const fetchAll = useCallback(async (currentLines, thresh) => {
        if (!currentLines || currentLines.length === 0) return;
        setRefreshing(true);
        await Promise.all(currentLines.map(l => fetchLine(l, thresh)));
        setRefreshing(false);
        setLastRefresh(new Date());
    }, [fetchLine]);

    // ── age tick: recalculate ageMs + state every 5 s without network call ────
    useEffect(() => {
        intervalsRef.current.tick = setInterval(() => {
            const thresh = threshRef.current;
            setStatuses(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(id => {
                    const s = next[id];
                    if (!s?.lastTimestamp) return;
                    const ageMs = Date.now() - new Date(s.lastTimestamp).getTime();
                    next[id] = {
                        ...s,
                        ageMs,
                        state: ageMs <= thresh * 60_000 ? "up" : "down",
                    };
                });
                return next;
            });
        }, AGE_TICK_MS);

        return () => clearInterval(intervalsRef.current.tick);
    }, []);

    // ── auto-refresh status every 60 s ─────────────────────────────────────────
    // Note: This updates the timestamps of your CURRENT lines. It does not hit the master DB config.
    useEffect(() => {
        // Run an initial status fetch on load
        fetchAll(linesRef.current, threshRef.current);

        intervalsRef.current.fetch = setInterval(
            () => fetchAll(linesRef.current, threshRef.current),
            AUTO_REFRESH_MS
        );
        return () => clearInterval(intervalsRef.current.fetch);
    }, [fetchAll]);

    // ── line CRUD ──────────────────────────────────────────────────────────────
    const addLine = () =>
        setLines(p => [...p, { id: uid(), plant: "", formId: "" }]);

    const removeLine = (id) => {
        setLines(p => p.filter(l => l.id !== id));
        setStatuses(p => { const n = { ...p }; delete n[id]; return n; });
    };

    const updateLine = (id, field, value) =>
        setLines(p => p.map(l => l.id === id ? { ...l, [field]: value } : l));

    const handleFormIdBlur = (line) => fetchLine(line, threshold);

    const handleRefreshNow = () => {
        if (!refreshing) fetchAll(lines, threshold);
    };

    const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");

    // ── derived counts ─────────────────────────────────────────────────────────
    const upCount = lines.filter(l => statuses[l.id]?.state === "up").length;
    const downCount = lines.filter(l => ["down", "error"].includes(statuses[l.id]?.state)).length;

    // ── render ─────────────────────────────────────────────────────────────────
    return (
        <div className={`pm-root ${theme}`}>
            {/* header */}
            <div className="pm-header">
                <div className="pm-header-left">
                    <div className="pm-eyebrow">Factory Intelligence</div>
                    <div className="pm-title">Production Monitor</div>
                </div>
                <div className="pm-header-right">
                    <button
                        className="pm-theme-btn"
                        onClick={toggleTheme}
                        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                    >
                        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
                    </button>
                    <div className="pm-live-badge">
                        <span className="pm-live-dot" /> Live
                    </div>
                </div>
            </div>

            {/* summary strip */}
            <div className="pm-strip">
                <div className="pm-chip pm-chip--total">
                    <span className="pm-chip-n">{lines.length}</span> Lines
                </div>
                <div className="pm-chip pm-chip--up">
                    <span className="pm-chip-n">{upCount}</span> Running
                </div>
                <div className="pm-chip pm-chip--down">
                    <span className="pm-chip-n">{downCount}</span> Down
                </div>
            </div>

            {/* cards */}
            {lines.length === 0 ? (
                <div className="pm-empty">
                    No lines configured. Add one below, or Sync from the Database.
                </div>
            ) : (
                <div className="pm-grid">
                    {lines.map(line => (
                        <LineCard key={line.id} line={line} status={statuses[line.id]} />
                    ))}
                </div>
            )}

            {/* config panel */}
            <div className="pm-cfg">
                <div
                    className={`pm-cfg-head ${cfgOpen ? "open" : ""}`}
                    onClick={() => setCfgOpen(v => !v)}
                >
                    <span className="pm-cfg-lbl">Line Configuration</span>
                    <span className={`pm-cfg-arrow ${cfgOpen ? "open" : ""}`}>▼</span>
                </div>

                {cfgOpen && (
                    <div className="pm-cfg-body">
                        <table className="pm-tbl">
                            <thead>
                                <tr>
                                    <th style={{ width: "42%" }}>Plant / Line Name</th>
                                    <th style={{ width: "42%" }}>Form ID</th>
                                    <th style={{ width: "16%" }} />
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map(line => (
                                    <tr key={line.id}>
                                        <td>
                                            <input
                                                className="pm-inp"
                                                value={line.plant}
                                                placeholder="e.g. Line A – Plant 1"
                                                onChange={e => updateLine(line.id, "plant", e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                className="pm-inp mono"
                                                value={line.formId}
                                                placeholder="form_001"
                                                onChange={e => updateLine(line.id, "formId", e.target.value)}
                                                onBlur={() => handleFormIdBlur(line)}
                                            />
                                        </td>
                                        <td style={{ textAlign: "right" }}>
                                            <button
                                                className="pm-btn pm-btn--remove"
                                                onClick={() => removeLine(line.id)}
                                                title="Remove Line"
                                            >✕</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="pm-thresh-row">
                            <span>Alert threshold:</span>
                            <input
                                type="number"
                                className="pm-thresh-inp"
                                value={threshold}
                                min={1}
                                max={120}
                                onChange={e =>
                                    setThreshold(Math.max(1, parseInt(e.target.value) || DEFAULT_THRESHOLD_MINUTES))
                                }
                            />
                            <span>minutes without a submission triggers a DOWN alert</span>
                        </div>

                        <div className="pm-btn-row">
                            <button className="pm-btn pm-btn--add" onClick={addLine}>
                                + Add Line
                            </button>

                            <button
                                className="pm-btn pm-btn--db"
                                onClick={fetchDbConfig}
                                disabled={syncingDb}
                                title="Pull active lines from the database"
                            >
                                <DbIcon />
                                {syncingDb ? "Syncing..." : "Sync from DB"}
                            </button>

                            <button
                                className="pm-btn pm-btn--refresh"
                                onClick={handleRefreshNow}
                                disabled={refreshing}
                                title="Refresh statuses of configured lines"
                            >
                                {refreshing
                                    ? <><span className="pm-spin" /> Refreshing…</>
                                    : "↻ Refresh Status"}
                            </button>

                            {lastRefresh && (
                                <span className="pm-since">
                                    Updated {lastRefresh.toLocaleTimeString([], {
                                        hour: "2-digit", minute: "2-digit", second: "2-digit",
                                    })}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}