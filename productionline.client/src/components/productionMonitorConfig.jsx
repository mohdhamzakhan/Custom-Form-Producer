import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { APP_CONSTANTS } from "./store";
import { v4 as uuidv4 } from 'uuid';

// ─────────────────────────────────────────────────────────────────────────────
// ProductionMonitorConfig.jsx
// Standalone configuration page for Production Monitor.
// Drop this file next to ProductionMonitor.jsx — it shares the same store
// but touches NONE of the original file's code.
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


const uid = () => uuidv4();

const initials = (name = "") =>
    name.split(" ").filter(Boolean).map((w) => w[0].toUpperCase()).slice(0, 2).join("");

const timeToMinutes = (t = "00:00") => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
};

const minutesToTime = (m) => {
    const hh = String(Math.floor(m / 60) % 24).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    return `${hh}:${mm}`;
};

const nowMinutes = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
};

// Is the current time inside any break of the given shiftConfig array?
const isInBreak = (shiftConfigs = []) => {
    const now = nowMinutes();
    for (const sh of shiftConfigs) {
        for (const br of sh.breaks || []) {
            const s = timeToMinutes(br.startTime);
            const e = timeToMinutes(br.endTime);
            // handle midnight crossover
            if (s <= e ? now >= s && now < e : now >= s || now < e) return { inBreak: true, name: br.name };
        }
    }
    return { inBreak: false };
};

// Which shift is currently active?
const currentShift = (shiftConfigs = []) => {
    const now = nowMinutes();
    for (const sh of shiftConfigs) {
        const s = timeToMinutes(sh.startTime);
        const e = timeToMinutes(sh.endTime);
        if (s <= e ? now >= s && now < e : now >= s || now < e) return sh;
    }
    return null;
};

// ── default data shapes ───────────────────────────────────────────────────────

const defaultLine = () => ({
    "id": 0,
    plant: "",
    formId: "",
    shiftTemplateId: "",
    engineers: [],
    supervisors: [],
});

const defaultPerson = () => ({
    id: uid(),
    name: "",
    phone: "",
    email: "",
    shift: "A",
});

const defaultRecipient = () => ({
    id: uid(),
    name: "",
    email: "",
    phone: "",
    enabled: true,
    delayMin: 5,
    android: true,
    ios: false,
    lineIds: [], // empty = all lines
});

const defaultQuietHours = () => ({
    enabled: false,
    start: "12:00",
    end: "12:30",
    skipBreaks: true,
});

const SHIFTS_DEFAULT = [
    {
        key: "A", name: "Shift A", start: "06:15", end: "14:30",
        breaks: [
            { id: 1, name: "Morning Break", start: "07:30", end: "07:40" },
            { id: 2, name: "Tea Break", start: "10:00", end: "10:10" },
            { id: 3, name: "Lunch Break", start: "11:45", end: "12:15" },
        ],
    },
    {
        key: "B", name: "Shift B", start: "14:45", end: "23:00",
        breaks: [
            { id: 4, name: "Tea Break", start: "17:00", end: "17:10" },
            { id: 5, name: "Dinner Break", start: "19:30", end: "20:00" },
            { id: 6, name: "Night Break", start: "22:00", end: "22:10" },
        ],
    },
    {
        key: "C", name: "Shift C", start: "23:15", end: "06:00",
        breaks: [
            { id: 7, name: "Mid-Night Break", start: "01:00", end: "01:10" },
            { id: 8, name: "Early Morning Break", start: "03:00", end: "03:10" },
        ],
    },
];

// ── Storage keys ──────────────────────────────────────────────────────────────

const STORAGE = {
    lines: "pmcfg_lines",
    recipients: "pmcfg_recipients",
    quietHours: "pmcfg_quiet",
    shifts: "pmcfg_shifts",
    theme: "pm_theme",           // share theme with ProductionMonitor
};

const load = (key, fallback) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
};

const save = (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { }
};

// ── CSS ───────────────────────────────────────────────────────────────────────


const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

.cfg-root *, .cfg-root *::before, .cfg-root *::after { box-sizing: border-box; }
.cfg-root {
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  min-height: 100vh;
  transition: background 0.3s, color 0.3s;
}

/* ── Themes ── */
.cfg-root.dark {
  --bg:          #0d1117;
  --bg-card:     #161b22;
  --bg-raised:   #21262d;
  --bg-input:    #0d1117;
  --border:      #30363d;
  --border-mid:  #484f58;
  --focus:       #58a6ff;
  --text-1:      #e6edf3;
  --text-2:      #8b949e;
  --text-3:      #6e7681;
  --accent:      #58a6ff;
  --accent-bg:   rgba(88,166,255,.12);
  --green:       #3fb950;
  --green-bg:    rgba(63,185,80,.12);
  --red:         #f85149;
  --red-bg:      rgba(248,81,73,.12);
  --amber:       #e3b341;
  --amber-bg:    rgba(227,179,65,.12);
  --shadow:      0 4px 24px rgba(0,0,0,.4);
  --shadow-sm:   0 2px 8px rgba(0,0,0,.3);
}
.cfg-root.light {
  --bg:          #f6f8fa;
  --bg-card:     #ffffff;
  --bg-raised:   #f0f2f4;
  --bg-input:    #ffffff;
  --border:      #d0d7de;
  --border-mid:  #b1bac4;
  --focus:       #0969da;
  --text-1:      #1f2328;
  --text-2:      #59636e;
  --text-3:      #848d97;
  --accent:      #0969da;
  --accent-bg:   rgba(9,105,218,.08);
  --green:       #1a7f37;
  --green-bg:    rgba(26,127,55,.08);
  --red:         #d1242f;
  --red-bg:      rgba(209,36,47,.08);
  --amber:       #9a6700;
  --amber-bg:    rgba(154,103,0,.08);
  --shadow:      0 4px 16px rgba(0,0,0,.07);
  --shadow-sm:   0 2px 6px rgba(0,0,0,.05);
}

.cfg-root { background: var(--bg); color: var(--text-2); }

/* ── Layout ── */
.cfg-layout { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }

/* ── Sidebar ── */
.cfg-sidebar {
  background: var(--bg-card);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  position: sticky; top: 0; height: 100vh; overflow-y: auto;
}
.cfg-sidebar-head {
  padding: 24px 20px 20px;
  border-bottom: 1px solid var(--border);
}
.cfg-logo {
  display: flex; align-items: center; gap: 10px; margin-bottom: 6px;
}
.cfg-logo-mark {
  width: 32px; height: 32px;
  background: var(--accent-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px; font-weight: 600;
  color: var(--accent);
}
.cfg-logo-text { font-size: 13px; font-weight: 600; color: var(--text-1); letter-spacing: -.01em; }
.cfg-logo-sub  { font-size: 11px; color: var(--text-3); font-family: 'IBM Plex Mono', monospace; letter-spacing: .06em; text-transform: uppercase; }

.cfg-nav { padding: 12px 8px; flex: 1; }
.cfg-nav-section { font-size: 10px; letter-spacing: .14em; text-transform: uppercase; font-family: 'IBM Plex Mono', monospace; color: var(--text-3); font-weight: 600; padding: 4px 12px 8px; margin-top: 12px; }
.cfg-nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px; border-radius: 8px; cursor: pointer;
  font-size: 13px; color: var(--text-2);
  transition: all .15s; position: relative; margin-bottom: 2px;
}
.cfg-nav-item:hover { background: var(--bg-raised); color: var(--text-1); }
.cfg-nav-item.active { background: var(--accent-bg); color: var(--accent); font-weight: 500; }
.cfg-nav-item.active::before {
  content: ''; position: absolute; left: 0; top: 25%; bottom: 25%;
  width: 3px; background: var(--accent); border-radius: 0 2px 2px 0;
}
.cfg-nav-icon { width: 16px; height: 16px; opacity: .8; flex-shrink: 0; }
.cfg-nav-badge {
  margin-left: auto; font-size: 10px; font-family: 'IBM Plex Mono', monospace;
  background: var(--bg-raised); color: var(--text-3);
  padding: 1px 6px; border-radius: 100px; border: 1px solid var(--border);
}
.cfg-nav-item.active .cfg-nav-badge { background: var(--accent-bg); color: var(--accent); border-color: var(--accent); }

.cfg-sidebar-footer { padding: 16px; border-top: 1px solid var(--border); }

/* ── Main ── */
.cfg-main { padding: 32px 36px 64px; min-width: 0; }
.cfg-page-head { margin-bottom: 32px; }
.cfg-page-eyebrow {
  font-size: 10px; letter-spacing: .18em; text-transform: uppercase;
  font-family: 'IBM Plex Mono', monospace; color: var(--text-3); font-weight: 600;
  margin-bottom: 6px;
}
.cfg-page-title { font-size: 24px; font-weight: 300; color: var(--text-1); letter-spacing: -.02em; margin-bottom: 4px; }
.cfg-page-sub   { font-size: 13px; color: var(--text-3); }

/* ── Cards ── */
.cfg-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
}
.cfg-card-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}
.cfg-card-title { font-size: 13px; font-weight: 600; color: var(--text-1); }
.cfg-card-sub   { font-size: 11px; color: var(--text-3); margin-top: 2px; }
.cfg-card-body  { padding: 20px; }

/* ── Buttons ── */
.cfg-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 500;
  cursor: pointer; border: 1px solid var(--border); background: var(--bg-card);
  color: var(--text-1); font-family: 'IBM Plex Sans', sans-serif;
  transition: all .15s; white-space: nowrap;
}
.cfg-btn:hover { background: var(--bg-raised); border-color: var(--border-mid); }
.cfg-btn:active { transform: scale(.98); }
.cfg-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }

.cfg-btn-primary { background: var(--accent); color: #fff; border-color: var(--accent); }
.cfg-btn-primary:hover { opacity: .88; background: var(--accent); }

.cfg-btn-danger { background: var(--red-bg); color: var(--red); border-color: rgba(248,81,73,.3); }
.cfg-btn-danger:hover { background: rgba(248,81,73,.2); }

.cfg-btn-success { background: var(--green-bg); color: var(--green); border-color: rgba(63,185,80,.3); }
.cfg-btn-success:hover { background: rgba(63,185,80,.2); }

.cfg-btn-sm { padding: 4px 10px; font-size: 11px; border-radius: 6px; }
.cfg-btn-icon { padding: 5px; width: 28px; height: 28px; justify-content: center; border-radius: 6px; }

/* ── Inputs ── */
.cfg-inp {
  width: 100%; padding: 8px 12px; font-size: 13px;
  border: 1px solid var(--border); border-radius: 8px;
  background: var(--bg-input); color: var(--text-1);
  font-family: 'IBM Plex Sans', sans-serif;
  outline: none; transition: border .15s;
}
.cfg-inp:focus { border-color: var(--focus); box-shadow: 0 0 0 3px rgba(88,166,255,.12); }
.cfg-inp::placeholder { color: var(--text-3); }
.cfg-inp.mono { font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
.cfg-inp-sm { padding: 5px 8px; font-size: 12px; }

.cfg-label { display: block; font-size: 11px; font-weight: 500; color: var(--text-2); margin-bottom: 5px; }

.cfg-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
.cfg-form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 14px; }
.cfg-form-group { margin-bottom: 14px; }

/* ── Table ── */
.cfg-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.cfg-table th {
  text-align: left; padding: 8px 14px;
  font-size: 10px; letter-spacing: .12em; text-transform: uppercase;
  font-family: 'IBM Plex Mono', monospace; color: var(--text-3); font-weight: 600;
  border-bottom: 1px solid var(--border); background: var(--bg-raised);
}
.cfg-table td { padding: 11px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; color: var(--text-2); }
.cfg-table tr:last-child td { border-bottom: none; }
.cfg-table tr:hover td { background: var(--bg-raised); }

/* ── Badges ── */
.cfg-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 8px; border-radius: 100px; font-size: 10px; font-weight: 600;
  font-family: 'IBM Plex Mono', monospace; letter-spacing: .04em;
}
.cfg-badge-green  { background: var(--green-bg); color: var(--green); border: 1px solid rgba(63,185,80,.25); }
.cfg-badge-red    { background: var(--red-bg);   color: var(--red);   border: 1px solid rgba(248,81,73,.25); }
.cfg-badge-amber  { background: var(--amber-bg); color: var(--amber); border: 1px solid rgba(227,179,65,.25); }
.cfg-badge-blue   { background: var(--accent-bg);color: var(--accent);border: 1px solid rgba(88,166,255,.25); }
.cfg-badge-neutral{ background: var(--bg-raised);color: var(--text-2);border: 1px solid var(--border); }
.cfg-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.cfg-dot-blink { animation: cfgBlink .8s ease-in-out infinite; }
@keyframes cfgBlink { 0%,100%{opacity:1} 50%{opacity:.1} }

/* ── Avatar ── */
.cfg-avatar {
  width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 600;
  background: var(--accent-bg); color: var(--accent);
  border: 1px solid var(--border);
}
.cfg-avatar-amber { background: var(--amber-bg); color: var(--amber); }
.cfg-avatar-green { background: var(--green-bg); color: var(--green); }

/* ── Toggle ── */
.cfg-toggle { position: relative; width: 38px; height: 22px; flex-shrink: 0; }
.cfg-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
.cfg-toggle-slider {
  position: absolute; inset: 0; border-radius: 11px;
  background: var(--border-mid); cursor: pointer; transition: .2s;
  border: 1px solid var(--border);
}
.cfg-toggle-slider::before {
  content: ''; position: absolute; width: 16px; height: 16px;
  left: 2px; top: 2px; border-radius: 50%; background: #fff;
  transition: .2s; box-shadow: 0 1px 3px rgba(0,0,0,.3);
}
.cfg-toggle input:checked + .cfg-toggle-slider { background: var(--green); border-color: var(--green); }
.cfg-toggle input:checked + .cfg-toggle-slider::before { transform: translateX(16px); }

/* ── Shift pills ── */
.shift-pill {
  display: inline-flex; align-items: center;
  padding: 2px 8px; border-radius: 100px; font-size: 10px; font-weight: 600;
  font-family: 'IBM Plex Mono', monospace;
}
.shift-a { background: rgba(63,185,80,.12); color: var(--green); border: 1px solid rgba(63,185,80,.25); }
.shift-b { background: var(--accent-bg); color: var(--accent); border: 1px solid rgba(88,166,255,.25); }
.shift-c { background: var(--amber-bg); color: var(--amber); border: 1px solid rgba(227,179,65,.25); }

/* ── People row ── */
.cfg-person-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-raised); margin-bottom: 6px;
  transition: border .15s;
}
.cfg-person-row:hover { border-color: var(--border-mid); }
.cfg-person-info { flex: 1; min-width: 0; }
.cfg-person-name { font-size: 13px; font-weight: 500; color: var(--text-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cfg-person-detail { font-size: 11px; color: var(--text-3); font-family: 'IBM Plex Mono', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── Break rows ── */
.cfg-break-row {
  display: grid; grid-template-columns: 1fr 1fr 1fr auto;
  gap: 8px; align-items: center; margin-bottom: 8px;
}

/* ── Stats grid ── */
.cfg-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
.cfg-stat {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: 10px; padding: 16px 18px;
}
.cfg-stat-label { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; font-family: 'IBM Plex Mono', monospace; color: var(--text-3); font-weight: 600; margin-bottom: 6px; }
.cfg-stat-val { font-size: 26px; font-weight: 300; color: var(--text-1); letter-spacing: -.02em; }
.cfg-stat-sub { font-size: 11px; color: var(--text-3); margin-top: 2px; }

/* ── Timeline ── */
.cfg-timeline {
  height: 40px; background: var(--bg-raised); border-radius: 8px;
  position: relative; overflow: hidden; margin: 12px 0 6px;
  border: 1px solid var(--border);
}
.cfg-timeline-tick { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--border); }
.cfg-timeline-block { position: absolute; top: 4px; bottom: 4px; border-radius: 4px; }
.cfg-timeline-now  { position: absolute; top: 0; bottom: 0; width: 2px; background: var(--text-1); opacity: .6; z-index: 2; }
.cfg-timeline-label {
  display: flex; justify-content: space-between;
  font-size: 10px; font-family: 'IBM Plex Mono', monospace; color: var(--text-3);
  margin-top: 4px;
}

/* ── Delay input ── */
.cfg-delay-inp {
  width: 54px; padding: 5px 8px; font-size: 12px; text-align: center;
  border: 1px solid var(--border); border-radius: 6px;
  background: var(--bg-input); color: var(--text-1);
  font-family: 'IBM Plex Mono', monospace; outline: none;
}
.cfg-delay-inp:focus { border-color: var(--focus); }

/* ── Modal ── */
.cfg-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 300; padding: 20px;
  animation: cfgFadeIn .15s ease;
}
@keyframes cfgFadeIn { from{opacity:0} to{opacity:1} }
.cfg-modal {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: 14px; width: 100%; max-width: 500px;
  max-height: 85vh; overflow-y: auto;
  box-shadow: var(--shadow);
  animation: cfgSlideUp .18s ease;
}
@keyframes cfgSlideUp { from{transform:translateY(12px);opacity:0} to{transform:none;opacity:1} }
.cfg-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--border); position: sticky; top: 0;
  background: var(--bg-card); z-index: 1;
}
.cfg-modal-title { font-size: 14px; font-weight: 600; color: var(--text-1); }
.cfg-modal-body   { padding: 20px; }
.cfg-modal-footer {
  padding: 14px 20px; border-top: 1px solid var(--border);
  display: flex; justify-content: flex-end; gap: 10px;
  position: sticky; bottom: 0; background: var(--bg-card);
}

/* ── Theme toggle ── */
.cfg-theme-btn {
  background: none; border: 1px solid var(--border); border-radius: 50%;
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--text-2); transition: all .2s;
}
.cfg-theme-btn:hover { background: var(--bg-raised); color: var(--text-1); }

/* ── Info box ── */
.cfg-info-box {
  display: flex; gap: 10px; padding: 12px 14px;
  background: var(--accent-bg); border: 1px solid rgba(88,166,255,.2);
  border-radius: 8px; font-size: 12px; color: var(--text-2); line-height: 1.55;
  margin-bottom: 16px;
}
.cfg-info-icon { flex-shrink: 0; color: var(--accent); font-size: 13px; margin-top: 1px; }

.cfg-warn-box {
  display: flex; gap: 10px; padding: 12px 14px;
  background: var(--amber-bg); border: 1px solid rgba(227,179,65,.2);
  border-radius: 8px; font-size: 12px; color: var(--text-2); line-height: 1.55;
  margin-bottom: 16px;
}

/* ── Divider ── */
.cfg-divider { height: 1px; background: var(--border); margin: 18px 0; }

/* ── Section tabs (inner) ── */
.cfg-inner-tabs { display: flex; gap: 4px; margin-bottom: 16px; }
.cfg-inner-tab {
  padding: 6px 14px; font-size: 12px; border-radius: 6px; cursor: pointer;
  border: 1px solid transparent; color: var(--text-2); transition: all .12s;
}
.cfg-inner-tab.active { background: var(--bg-raised); border-color: var(--border); color: var(--text-1); font-weight: 500; }
.cfg-inner-tab:hover:not(.active) { color: var(--text-1); }

/* ── Spinner ── */
.cfg-spin {
  display: inline-block; width: 12px; height: 12px;
  border: 2px solid var(--border); border-top-color: var(--accent);
  border-radius: 50%; animation: cfgSpin .5s linear infinite;
}
@keyframes cfgSpin { to { transform: rotate(360deg); } }

/* ── Empty state ── */
.cfg-empty {
  text-align: center; padding: 36px 20px;
  font-size: 12px; color: var(--text-3);
  font-family: 'IBM Plex Mono', monospace; letter-spacing: .04em;
}

/* ── Notification alert box ── */
.cfg-alert-card {
  background: var(--red-bg); border: 1px solid rgba(248,81,73,.25);
  border-radius: 10px; padding: 14px 16px; margin-bottom: 10px;
}
.cfg-alert-title { font-size: 13px; font-weight: 600; color: var(--red); margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
.cfg-contact-mini { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.cfg-contact-mini-info { font-size: 12px; color: var(--text-2); }
.cfg-contact-mini-name { font-weight: 500; color: var(--text-1); }

/* ── Responsive ── */
@media (max-width: 860px) {
  .cfg-layout { grid-template-columns: 1fr; }
  .cfg-sidebar { position: static; height: auto; border-right: none; border-bottom: 1px solid var(--border); }
  .cfg-main { padding: 20px 16px 48px; }
  .cfg-stats { grid-template-columns: 1fr 1fr; }
  .cfg-form-row, .cfg-form-row-3 { grid-template-columns: 1fr; }
}
`;

// ── SVG Icons ─────────────────────────────────────────────────────────────────

const Icon = ({ d, size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
    </svg>
);

const Icons = {
    overview: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
    lines: "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18",
    personnel: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    shifts: "M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0 0V12l4-4",
    notif: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
    quiet: "M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2m0-8v4",
    save: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8",
    add: "M12 5v14M5 12h14",
    remove: "M18 6L6 18M6 6l12 12",
    edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 1 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
    sun: "M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z",
    moon: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
    db: "M12 2C6.477 2 2 4.477 2 7s4.477 5 10 5 10-2.477 10-5-4.477-5-10-5zM2 7v5c0 2.523 4.477 5 10 5s10-2.477 10-5V7M2 12v5c0 2.523 4.477 5 10 5s10-2.477 10-5v-5",
    link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
    phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.09 6.09l1.88-1.88a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
    mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
    android: "M17.523 15.341l1.446 2.502a.5.5 0 0 1-.866.5l-1.463-2.532A8.93 8.93 0 0 1 12 16.5c-1.292 0-2.518-.273-3.64-.771L6.897 18.26a.5.5 0 0 1-.866-.5l1.446-2.502A8.972 8.972 0 0 1 4 8h16a8.972 8.972 0 0 1-2.477 7.341zM8.5 11a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1zm7 0a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1zM9.5 4.5 8 2M14.5 4.5 16 2",
    apple: "M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z",
};

// ── Shift pill ────────────────────────────────────────────────────────────────
const ShiftPill = ({ shift }) => (
    <span className={`shift-pill shift-${shift?.toLowerCase?.() || "a"}`}>
        {shift}
    </span>
);

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, onSave, children, saveLabel = "Save" }) {
    return (
        <div className="cfg-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="cfg-modal">
                <div className="cfg-modal-header">
                    <span className="cfg-modal-title">{title}</span>
                    <button className="cfg-btn cfg-btn-icon" onClick={onClose}>
                        <Icon d={Icons.remove} size={14} />
                    </button>
                </div>
                <div className="cfg-modal-body">{children}</div>
                <div className="cfg-modal-footer">
                    <button className="cfg-btn" onClick={onClose}>Cancel</button>
                    <button className="cfg-btn cfg-btn-primary" onClick={onSave}>{saveLabel}</button>
                </div>
            </div>
        </div>
    );
}

// ── Person form ───────────────────────────────────────────────────────────────
function PersonForm({ value, onChange }) {
    const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
    return (
        <>
            <div className="cfg-form-group">
                <label className="cfg-label">Full Name *</label>
                <input className="cfg-inp" value={value.name} onChange={set("name")} placeholder="e.g. Rajesh Kumar" />
            </div>
            <div className="cfg-form-row">
                <div>
                    <label className="cfg-label">Phone *</label>
                    <input className="cfg-inp mono" value={value.phone} onChange={set("phone")} placeholder="+91 98765 43210" />
                </div>
                <div>
                    <label className="cfg-label">Email *</label>
                    <input className="cfg-inp" value={value.email} onChange={set("email")} placeholder="name@plant.com" />
                </div>
            </div>
            <div className="cfg-form-group">
                <label className="cfg-label">Shift Assignment</label>
                <select className="cfg-inp" value={value.shift} onChange={set("shift")}>
                    <option value="A">Shift A — 06:15 to 14:30</option>
                    <option value="B">Shift B — 14:45 to 23:00</option>
                    <option value="C">Shift C — 23:15 to 06:00</option>
                </select>
            </div>
        </>
    );
}

// ── Overview page ─────────────────────────────────────────────────────────────
function PageOverview({ lines, recipients, shifts, quietHours }) {
    const totalEngineers = lines.reduce((a, l) => a + l.engineers.length, 0);
    const totalSupervisors = lines.reduce((a, l) => a + l.supervisors.length, 0);
    const activeRecip = recipients.filter((r) => r.enabled).length;

    // Detect current shift
    const shiftConfigs = shifts.map((sh) => ({
        shift: sh.key,
        startTime: sh.start,
        endTime: sh.end,
        breaks: sh.breaks.map((b) => ({ startTime: b.start, endTime: b.end })),
    }));
    const cur = currentShift(shiftConfigs);
    const brk = isInBreak(shiftConfigs);

    return (
        <>
            <div className="cfg-stats">
                <div className="cfg-stat">
                    <div className="cfg-stat-label">Production Lines</div>
                    <div className="cfg-stat-val">{lines.length}</div>
                    <div className="cfg-stat-sub">configured</div>
                </div>
                <div className="cfg-stat">
                    <div className="cfg-stat-label">Engineers</div>
                    <div className="cfg-stat-val">{totalEngineers}</div>
                    <div className="cfg-stat-sub">across all lines</div>
                </div>
                <div className="cfg-stat">
                    <div className="cfg-stat-label">Supervisors</div>
                    <div className="cfg-stat-val">{totalSupervisors}</div>
                    <div className="cfg-stat-sub">across all lines</div>
                </div>
                <div className="cfg-stat">
                    <div className="cfg-stat-label">Notif. Recipients</div>
                    <div className="cfg-stat-val">{activeRecip}</div>
                    <div className="cfg-stat-sub">enabled</div>
                </div>
            </div>

            {/* Current shift status */}
            <div className="cfg-card" style={{ marginBottom: 16 }}>
                <div className="cfg-card-header">
                    <div><div className="cfg-card-title">Current Shift Status</div><div className="cfg-card-sub">Live — updates every minute</div></div>
                </div>
                <div className="cfg-card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div style={{ padding: "14px 16px", background: "var(--bg-raised)", borderRadius: 8, border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "'IBM Plex Mono',monospace", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>Active Shift</div>
                        {cur
                            ? <><ShiftPill shift={cur.shift} /><div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 8, fontFamily: "'IBM Plex Mono',monospace" }}>{cur.startTime} → {cur.endTime}</div></>
                            : <span style={{ fontSize: 12, color: "var(--text-3)" }}>No active shift</span>}
                    </div>
                    <div style={{ padding: "14px 16px", background: brk.inBreak ? "var(--amber-bg)" : "var(--bg-raised)", borderRadius: 8, border: `1px solid ${brk.inBreak ? "rgba(227,179,65,.3)" : "var(--border)"}` }}>
                        <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "'IBM Plex Mono',monospace", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>Break Status</div>
                        {brk.inBreak
                            ? <><span className="cfg-badge cfg-badge-amber"><span className="cfg-dot" />In Break</span><div style={{ fontSize: 12, color: "var(--amber)", marginTop: 8 }}>{brk.name} — notifications paused</div></>
                            : <><span className="cfg-badge cfg-badge-green"><span className="cfg-dot" />Active</span><div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 8 }}>Notifications are firing normally</div></>}
                    </div>
                </div>
            </div>

            {/* Lines summary */}
            <div className="cfg-card">
                <div className="cfg-card-header">
                    <div><div className="cfg-card-title">Configured Lines</div><div className="cfg-card-sub">Quick summary of all lines and their personnel</div></div>
                </div>
                <table className="cfg-table">
                    <thead>
                        <tr>
                            <th>Line / Plant</th>
                            <th>Form ID</th>
                            <th>Engineers</th>
                            <th>Supervisors</th>
                            <th>Shift Template</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.length === 0 && (
                            <tr><td colSpan={5} className="cfg-empty">No lines configured yet. Go to Lines & Personnel to add one.</td></tr>
                        )}
                        {lines.map((l) => (
                            <tr key={l.id}>
                                <td style={{ fontWeight: 500, color: "var(--text-1)" }}>{l.plant || <span style={{ color: "var(--text-3)" }}>Unnamed</span>}</td>
                                <td><code style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, background: "var(--bg-raised)", padding: "1px 6px", borderRadius: 4, border: "1px solid var(--border)" }}>{l.formId || "—"}</code></td>
                                <td>{l.engineers.length > 0 ? <span className="cfg-badge cfg-badge-blue">{l.engineers.length}</span> : <span style={{ color: "var(--text-3)", fontSize: 12 }}>none</span>}</td>
                                <td>{l.supervisors.length > 0 ? <span className="cfg-badge cfg-badge-neutral">{l.supervisors.length}</span> : <span style={{ color: "var(--text-3)", fontSize: 12 }}>none</span>}</td>
                                <td>{l.shiftTemplateId ? <span className="cfg-badge cfg-badge-green"><Icon d={Icons.link} size={10} />{l.shiftTemplateId.toString().slice(0, 12)}…</span> : <span style={{ color: "var(--text-3)", fontSize: 12 }}>not linked</span>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

// ── Lines & Personnel page ────────────────────────────────────────────────────
function PageLines({ lines, setLines, shiftTemplates }) {
    const [expanded, setExpanded] = useState(null);
    const [innerTab, setInnerTab] = useState({});
    const [modal, setModal] = useState(null); // { type, lineId, role, personIdx }
    const [lineModal, setLineModal] = useState(null); // null | 'add' | lineObj
    const [draft, setDraft] = useState(defaultPerson());
    const [lineDraft, setLineDraft] = useState(defaultLine());

    const getTab = (id) => innerTab[id] || "engineers";
    const setTab = (id, t) => setInnerTab((p) => ({ ...p, [id]: t }));

    const openAddLine = () => { setLineDraft(defaultLine()); setLineModal("add"); };
    const openEditLine = (l) => { setLineDraft({ ...l }); setLineModal("edit"); };

    const saveLine = () => {
        if (!lineDraft.plant.trim() || !lineDraft.formId.trim()) return;
        if (lineModal === "add") {
            setLines((p) => [
                ...p,
                {
                    ...lineDraft,
                    id: 0, // ✅ always number
                    engineers: [],
                    supervisors: []
                }
            ]);
        } else {
            setLines((p) => p.map((l) => l.id === lineDraft.id ? lineDraft : l));
        }
        setLineModal(null);
    };

    const removeLine = (id) => setLines((p) => p.filter((l) => l.id !== id));

    const openAddPerson = (lineId, role) => {
        setDraft(defaultPerson());
        setModal({ type: "add", lineId, role });
    };
    const openEditPerson = (lineId, role, idx, person) => {
        setDraft({ ...person });
        setModal({ type: "edit", lineId, role, idx });
    };

    const savePerson = () => {
        if (!draft.name.trim()) return;
        setLines((p) => p.map((l) => {
            if (l.id !== modal.lineId) return l;
            const key = modal.role === "engineer" ? "engineers" : "supervisors";
            const arr = [...l[key]];
            if (modal.type === "add") arr.push({ ...draft, id: uid() });
            else arr[modal.idx] = { ...draft };
            return { ...l, [key]: arr };
        }));
        setModal(null);
    };

    const removePerson = (lineId, role, idx) => {
        setLines((p) => p.map((l) => {
            if (l.id !== lineId) return l;
            const key = role === "engineer" ? "engineers" : "supervisors";
            return { ...l, [key]: l[key].filter((_, i) => i !== idx) };
        }));
    };

    return (
        <>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                <button className="cfg-btn cfg-btn-primary" onClick={openAddLine}>
                    <Icon d={Icons.add} size={14} /> Add Line
                </button>
            </div>

            {lines.length === 0 && (
                <div className="cfg-card"><div className="cfg-empty">No lines configured. Click "Add Line" to get started.</div></div>
            )}

            {lines.map((line) => (
                <div key={line.id} className="cfg-card">
                    {/* Line header */}
                    <div
                        className="cfg-card-header"
                        style={{ cursor: "pointer" }}
                        onClick={() => setExpanded((p) => p === line.id ? null : line.id)}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--text-3)", flexShrink: 0 }} />
                            <div>
                                <div className="cfg-card-title">{line.plant || <span style={{ color: "var(--text-3)" }}>Unnamed Line</span>}</div>
                                <div className="cfg-card-sub">
                                    Form ID: <code style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10 }}>{line.formId || "—"}</code>
                                    {" · "}{line.engineers.length} engineers · {line.supervisors.length} supervisors
                                    {line.shiftTemplateId && <> · <span style={{ color: "var(--accent)" }}>template linked</span></>}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <button className="cfg-btn cfg-btn-sm" onClick={(e) => { e.stopPropagation(); openEditLine(line); }}>
                                <Icon d={Icons.edit} size={12} /> Edit
                            </button>
                            <button className="cfg-btn cfg-btn-sm cfg-btn-danger" onClick={(e) => { e.stopPropagation(); removeLine(line.id); }}>
                                <Icon d={Icons.remove} size={12} />
                            </button>
                            <span style={{ fontSize: 11, color: "var(--text-3)" }}>{expanded === line.id ? "▲" : "▼"}</span>
                        </div>
                    </div>

                    {/* Expanded body */}
                    {expanded === line.id && (
                        <div className="cfg-card-body">
                            {/* Inner tabs */}
                            <div className="cfg-inner-tabs">
                                {["engineers", "supervisors", "template"].map((t) => (
                                    <div
                                        key={t}
                                        className={`cfg-inner-tab ${getTab(line.id) === t ? "active" : ""}`}
                                        onClick={() => setTab(line.id, t)}
                                    >
                                        {t === "engineers" && `Engineers (${line.engineers.length})`}
                                        {t === "supervisors" && `Supervisors (${line.supervisors.length})`}
                                        {t === "template" && "Shift Template"}
                                    </div>
                                ))}
                            </div>

                            {/* Engineers */}
                            {getTab(line.id) === "engineers" && (
                                <>
                                    {line.engineers.length === 0 && <div className="cfg-empty" style={{ paddingTop: 16 }}>No engineers assigned.</div>}
                                    {line.engineers.map((e, i) => (
                                        <div key={e.id} className="cfg-person-row">
                                            <div className="cfg-avatar">{initials(e.name)}</div>
                                            <div className="cfg-person-info">
                                                <div className="cfg-person-name">{e.name}</div>
                                                <div className="cfg-person-detail">{e.phone} · {e.email}</div>
                                            </div>
                                            <ShiftPill shift={e.shift} />
                                            <button className="cfg-btn cfg-btn-sm" onClick={() => openEditPerson(line.id, "engineer", i, e)}><Icon d={Icons.edit} size={12} /></button>
                                            <button className="cfg-btn cfg-btn-sm cfg-btn-danger" onClick={() => removePerson(line.id, "engineer", i)}><Icon d={Icons.remove} size={12} /></button>
                                        </div>
                                    ))}
                                    <button className="cfg-btn cfg-btn-sm cfg-btn-success" style={{ marginTop: 10 }} onClick={() => openAddPerson(line.id, "engineer")}>
                                        <Icon d={Icons.add} size={12} /> Add Engineer
                                    </button>
                                </>
                            )}

                            {/* Supervisors */}
                            {getTab(line.id) === "supervisors" && (
                                <>
                                    {line.supervisors.length === 0 && <div className="cfg-empty" style={{ paddingTop: 16 }}>No supervisors assigned.</div>}
                                    {line.supervisors.map((s, i) => (
                                        <div key={s.id} className="cfg-person-row">
                                            <div className="cfg-avatar cfg-avatar-amber">{initials(s.name)}</div>
                                            <div className="cfg-person-info">
                                                <div className="cfg-person-name">{s.name}</div>
                                                <div className="cfg-person-detail">{s.phone} · {s.email}</div>
                                            </div>
                                            <ShiftPill shift={s.shift} />
                                            <button className="cfg-btn cfg-btn-sm" onClick={() => openEditPerson(line.id, "supervisor", i, s)}><Icon d={Icons.edit} size={12} /></button>
                                            <button className="cfg-btn cfg-btn-sm cfg-btn-danger" onClick={() => removePerson(line.id, "supervisor", i)}><Icon d={Icons.remove} size={12} /></button>
                                        </div>
                                    ))}
                                    <button className="cfg-btn cfg-btn-sm cfg-btn-success" style={{ marginTop: 10 }} onClick={() => openAddPerson(line.id, "supervisor")}>
                                        <Icon d={Icons.add} size={12} /> Add Supervisor
                                    </button>
                                </>
                            )}

                            {/* Shift Template */}
                            {/* Shift Template */}
                            {getTab(line.id) === "template" && (
                                <div style={{ padding: "12px 16px", background: "var(--bg-raised)", borderRadius: 8, border: "1px solid var(--border)" }}>
                                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-1)", marginBottom: 4 }}>Shift Template Assignment</div>
                                    <div className="cfg-info-box" style={{ marginTop: 10 }}>
                                        <span className="cfg-info-icon"><Icon d={Icons.db} size={13} /></span>
                                        <span>Select a Shift Template to link to this line. The system will automatically read the break windows to suppress false-positive down alerts.</span>
                                    </div>

                                    <label className="cfg-label">Select Template</label>

                                    {/* Swapped input for a select dropdown */}
                                    <select
                                        className="cfg-inp"
                                        value={line.shiftTemplateId || ""}
                                        onChange={(e) => setLines((p) => p.map((l) => l.id === line.id ? { ...l, shiftTemplateId: e.target.value } : l))}
                                    >
                                        <option value="">-- No template linked --</option>
                                        {shiftTemplates.map((template) => (
                                            <option key={template.id} value={template.id}>
                                                {template.name}
                                            </option>
                                        ))}
                                    </select>

                                    {line.shiftTemplateId && (
                                        <div style={{ marginTop: 10 }}>
                                            <span className="cfg-badge cfg-badge-green"><Icon d={Icons.link} size={10} /> Template linked</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {/* Add / Edit Line Modal */}
            {lineModal && (
                <Modal
                    title={lineModal === "add" ? "Add Production Line" : "Edit Line"}
                    onClose={() => setLineModal(null)}
                    onSave={saveLine}
                >
                    <div className="cfg-form-row">
                        <div>
                            <label className="cfg-label">Line / Plant Name *</label>
                            <input className="cfg-inp" value={lineDraft.plant} onChange={(e) => setLineDraft((p) => ({ ...p, plant: e.target.value }))} placeholder="e.g. PCSV Line" />
                        </div>
                        <div>
                            <label className="cfg-label">Form ID *</label>
                            <input className="cfg-inp mono" value={lineDraft.formId} onChange={(e) => setLineDraft((p) => ({ ...p, formId: e.target.value }))} placeholder="101" />
                        </div>
                    </div>
                    <div className="cfg-form-group">
                        <label className="cfg-label">Shift Template ID <span style={{ color: "var(--text-3)" }}>(optional)</span></label>
                        <input className="cfg-inp mono" value={lineDraft.shiftTemplateId || ""} onChange={(e) => setLineDraft((p) => ({ ...p, shiftTemplateId: e.target.value }))} placeholder="From FF_REPORTTEMPLATE — paste the ID" />
                    </div>
                </Modal>
            )}

            {/* Add / Edit Person Modal */}
            {modal && (
                <Modal
                    title={`${modal.type === "add" ? "Add" : "Edit"} ${modal.role === "engineer" ? "Engineer" : "Supervisor"}`}
                    onClose={() => setModal(null)}
                    onSave={savePerson}
                >
                    <PersonForm value={draft} onChange={setDraft} />
                </Modal>
            )}
        </>
    );
}

// ── Shifts page ───────────────────────────────────────────────────────────────
function PageShifts({ shifts, setShifts }) {
    const updateShift = (key, field, val) =>
        setShifts((p) => p.map((s) => s.key === key ? { ...s, [field]: val } : s));

    const updateBreak = (shiftKey, breakId, field, val) =>
        setShifts((p) => p.map((s) => s.key !== shiftKey ? s : {
            ...s,
            breaks: s.breaks.map((b) => b.id === breakId ? { ...b, [field]: val } : b),
        }));

    const addBreak = (shiftKey) =>
        setShifts((p) => p.map((s) => s.key !== shiftKey ? s : {
            ...s,
            breaks: [
                ...s.breaks,
                {
                    id: s.breaks.length + 1, // ✅ numeric ID
                    name: "New Break",
                    start: "08:00",
                    end: "08:10"
                }
            ]
        }));

    const removeBreak = (shiftKey, breakId) =>
        setShifts((p) => p.map((s) => s.key !== shiftKey ? s : {
            ...s,
            breaks: s.breaks.filter((b) => b.id !== breakId),
        }));

    const SHIFT_COLORS = { A: "shift-a", B: "shift-b", C: "shift-c" };

    return (
        <>
            <div className="cfg-warn-box">
                <span style={{ fontSize: 13 }}>⚠</span>
                <span>These shifts define when notifications are suppressed during breaks. If you link a line to an <code style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10 }}>FF_REPORTTEMPLATE</code> ID, the breaks are auto-populated from that record. Manual edits here serve as the fallback.</span>
            </div>

            {shifts.map((sh) => (
                <div key={sh.key} className="cfg-card">
                    <div className="cfg-card-header">
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <ShiftPill shift={sh.key} />
                            <div>
                                <div className="cfg-card-title">{sh.name}</div>
                                <div className="cfg-card-sub" style={{ fontFamily: "'IBM Plex Mono',monospace" }}>{sh.start} – {sh.end}</div>
                            </div>
                        </div>
                    </div>
                    <div className="cfg-card-body">
                        {/* Shift times */}
                        <div className="cfg-form-row" style={{ marginBottom: 18 }}>
                            <div>
                                <label className="cfg-label">Shift Start</label>
                                <input type="time" className="cfg-inp mono" value={sh.start} onChange={(e) => updateShift(sh.key, "start", e.target.value)} />
                            </div>
                            <div>
                                <label className="cfg-label">Shift End</label>
                                <input type="time" className="cfg-inp mono" value={sh.end} onChange={(e) => updateShift(sh.key, "end", e.target.value)} />
                            </div>
                        </div>

                        {/* Breaks */}
                        <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", fontFamily: "'IBM Plex Mono',monospace", color: "var(--text-3)", marginBottom: 10, fontWeight: 600 }}>
                            Break Windows
                        </div>

                        {/* Header row */}
                        <div className="cfg-break-row" style={{ marginBottom: 4 }}>
                            <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".1em", fontFamily: "'IBM Plex Mono',monospace" }}>Break Name</div>
                            <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".1em", fontFamily: "'IBM Plex Mono',monospace" }}>Start</div>
                            <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".1em", fontFamily: "'IBM Plex Mono',monospace" }}>End</div>
                            <div />
                        </div>

                        {sh.breaks.map((br) => (
                            <div key={br.id} className="cfg-break-row">
                                <input className="cfg-inp cfg-inp-sm" value={br.name} onChange={(e) => updateBreak(sh.key, br.id, "name", e.target.value)} placeholder="Break name" />
                                <input type="time" className="cfg-inp cfg-inp-sm mono" value={br.start} onChange={(e) => updateBreak(sh.key, br.id, "start", e.target.value)} />
                                <input type="time" className="cfg-inp cfg-inp-sm mono" value={br.end} onChange={(e) => updateBreak(sh.key, br.id, "end", e.target.value)} />
                                <button className="cfg-btn cfg-btn-icon cfg-btn-danger" onClick={() => removeBreak(sh.key, br.id)}><Icon d={Icons.remove} size={12} /></button>
                            </div>
                        ))}

                        <button className="cfg-btn cfg-btn-sm" style={{ marginTop: 8 }} onClick={() => addBreak(sh.key)}>
                            <Icon d={Icons.add} size={12} /> Add Break
                        </button>
                    </div>
                </div>
            ))}
        </>
    );
}

// ── Notifications page ────────────────────────────────────────────────────────
function PageNotifications({ recipients, setRecipients, lines }) {
    const [modal, setModal] = useState(null);  // null | 'add' | idx
    const [draft, setDraft] = useState(defaultRecipient());

    const openAdd = () => { setDraft(defaultRecipient()); setModal("add"); };
    const openEdit = (i) => { setDraft({ ...recipients[i] }); setModal(i); };
    const set = (k) => (e) => setDraft((p) => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

    const save = () => {
        if (!draft.name.trim()) return;
        if (modal === "add") setRecipients((p) => [...p, { ...draft, id: uid() }]);
        else setRecipients((p) => p.map((r, i) => i === modal ? { ...draft } : r));
        setModal(null);
    };

    const remove = (i) => setRecipients((p) => p.filter((_, idx) => idx !== i));
    const toggle = (i) => setRecipients((p) => p.map((r, idx) => idx === i ? { ...r, enabled: !r.enabled } : r));

    return (
        <>
            <div className="cfg-info-box">
                <span className="cfg-info-icon"><Icon d={Icons.notif} size={13} /></span>
                <span>Push notifications fire when a line has been down for longer than the recipient's defined delay. Notifications are automatically suppressed during break windows and quiet hours. Each recipient can be set up for Android (FCM), iOS (APNs), or both.</span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                <button className="cfg-btn cfg-btn-primary" onClick={openAdd}>
                    <Icon d={Icons.add} size={14} /> Add Recipient
                </button>
            </div>

            <div className="cfg-card">
                <table className="cfg-table">
                    <thead>
                        <tr>
                            <th>Recipient</th>
                            <th>Delay</th>
                            <th>Lines</th>
                            <th>Platform</th>
                            <th>Enabled</th>
                            <th style={{ width: 80 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {recipients.length === 0 && (
                            <tr><td colSpan={6} className="cfg-empty">No recipients yet. Add one to start receiving alerts.</td></tr>
                        )}
                        {recipients.map((r, i) => (
                            <tr key={r.id}>
                                <td>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <div className="cfg-avatar">{initials(r.name)}</div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-1)" }}>{r.name}</div>
                                            <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "'IBM Plex Mono',monospace" }}>{r.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                        <input
                                            type="number"
                                            className="cfg-delay-inp"
                                            value={r.delayMin}
                                            min={1} max={120}
                                            onChange={(e) => setRecipients((p) => p.map((rec, idx) => idx === i ? { ...rec, delayMin: parseInt(e.target.value) || 5 } : rec))}
                                        />
                                        <span style={{ fontSize: 11, color: "var(--text-3)" }}>min</span>
                                    </div>
                                </td>
                                <td>
                                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                                        {r.lineIds?.length > 0 ? `${r.lineIds.length} line(s)` : "All lines"}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                        {r.android && <span className="cfg-badge cfg-badge-blue"><Icon d={Icons.android} size={10} />Android</span>}
                                        {r.ios && <span className="cfg-badge cfg-badge-neutral"><Icon d={Icons.apple} size={10} />iOS</span>}
                                        {!r.android && !r.ios && <span style={{ fontSize: 11, color: "var(--text-3)" }}>none</span>}
                                    </div>
                                </td>
                                <td>
                                    <label className="cfg-toggle">
                                        <input type="checkbox" checked={r.enabled} onChange={() => toggle(i)} />
                                        <span className="cfg-toggle-slider" />
                                    </label>
                                </td>
                                <td>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <button className="cfg-btn cfg-btn-icon cfg-btn-sm" onClick={() => openEdit(i)}><Icon d={Icons.edit} size={12} /></button>
                                        <button className="cfg-btn cfg-btn-icon cfg-btn-sm cfg-btn-danger" onClick={() => remove(i)}><Icon d={Icons.remove} size={12} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            {modal !== null && (
                <Modal title={modal === "add" ? "Add Notification Recipient" : "Edit Recipient"} onClose={() => setModal(null)} onSave={save}>
                    <div className="cfg-form-group">
                        <label className="cfg-label">Full Name *</label>
                        <input className="cfg-inp" value={draft.name} onChange={set("name")} placeholder="Recipient's name" />
                    </div>
                    <div className="cfg-form-row">
                        <div>
                            <label className="cfg-label">Email</label>
                            <input className="cfg-inp" value={draft.email} onChange={set("email")} placeholder="email@plant.com" />
                        </div>
                        <div>
                            <label className="cfg-label">Phone</label>
                            <input className="cfg-inp mono" value={draft.phone} onChange={set("phone")} placeholder="+91 ..." />
                        </div>
                    </div>
                    <div className="cfg-form-group">
                        <label className="cfg-label">Notification delay after line goes down</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input className="cfg-delay-inp" type="number" value={draft.delayMin} min={1} max={120} onChange={(e) => setDraft((p) => ({ ...p, delayMin: parseInt(e.target.value) || 5 }))} />
                            <span style={{ fontSize: 12, color: "var(--text-3)" }}>minutes — notification sent after this delay</span>
                        </div>
                    </div>
                    <div className="cfg-form-group">
                        <label className="cfg-label">Lines to notify for</label>
                        <div style={{ padding: "10px 12px", background: "var(--bg-raised)", borderRadius: 8, border: "1px solid var(--border)" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", marginBottom: 8 }}>
                                <input type="checkbox" checked={!draft.lineIds?.length} onChange={() => setDraft((p) => ({ ...p, lineIds: [] }))} />
                                <span>All lines</span>
                            </label>
                            {lines.map((l) => (
                                <label key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer", marginBottom: 4 }}>
                                    <input
                                        type="checkbox"
                                        checked={draft.lineIds?.includes(l.formId) || false}
                                        onChange={(e) => {
                                            const ids = draft.lineIds || [];
                                            setDraft((p) => ({
                                                ...p, lineIds: e.target.checked
                                                    ? [...ids, l.formId]
                                                    : ids.filter((id) => id !== l.formId) }));
                                        }}
                                    />
                                    <span style={{ color: "var(--text-2)" }}>{l.plant || "Unnamed"} <code style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10 }}>#{l.formId}</code></span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="cfg-form-group">
                        <label className="cfg-label">Platform</label>
                        <div style={{ display: "flex", gap: 16 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                                <input type="checkbox" checked={draft.android} onChange={set("android")} />
                                <Icon d={Icons.android} size={14} /> Android (FCM)
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                                <input type="checkbox" checked={draft.ios} onChange={set("ios")} />
                                <Icon d={Icons.apple} size={14} /> iOS (APNs)
                            </label>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}

// ── Quiet Hours page ──────────────────────────────────────────────────────────
function PageQuietHours({ quietHours, setQuietHours, shifts }) {
    const set = (k) => (e) => setQuietHours((p) => ({
        ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

    // Build timeline blocks
    const pct = (hh, mm) => ((hh * 60 + mm) / (24 * 60)) * 100;
    const parseBlock = (start, end, color, label) => {
        const [sh, sm] = start.split(":").map(Number);
        const [eh, em] = end.split(":").map(Number);
        const s = pct(sh, sm);
        let w = pct(eh, em) - s;
        if (w < 0) w += 100;
        return { s, w: Math.max(w, 0.5), color, label };
    };

    const blocks = [];
    // Break windows from shifts
    if (quietHours.skipBreaks) {
        shifts.forEach((sh) => {
            sh.breaks.forEach((b) => {
                const dur = timeToMinutes(b.end) - timeToMinutes(b.start);
                const color = dur >= 15 ? "rgba(248,81,73,.4)" : "rgba(227,179,65,.35)";
                blocks.push(parseBlock(b.start, b.end, color, b.name));
            });
        });
    }
    // Manual quiet window
    if (quietHours.enabled) {
        blocks.push(parseBlock(quietHours.start, quietHours.end, "rgba(88,166,255,.4)", "Quiet Window"));
    }
    const nowPct = pct(new Date().getHours(), new Date().getMinutes());

    return (
        <>
            <div className="cfg-card" style={{ marginBottom: 16 }}>
                <div className="cfg-card-header">
                    <div><div className="cfg-card-title">Manual Quiet Window</div><div className="cfg-card-sub">No notifications sent in this time window, regardless of line status</div></div>
                    <label className="cfg-toggle">
                        <input type="checkbox" checked={quietHours.enabled} onChange={set("enabled")} />
                        <span className="cfg-toggle-slider" />
                    </label>
                </div>
                {quietHours.enabled && (
                    <div className="cfg-card-body">
                        <div className="cfg-form-row" style={{ maxWidth: 320 }}>
                            <div>
                                <label className="cfg-label">Start</label>
                                <input type="time" className="cfg-inp mono" value={quietHours.start} onChange={set("start")} />
                            </div>
                            <div>
                                <label className="cfg-label">End</label>
                                <input type="time" className="cfg-inp mono" value={quietHours.end} onChange={set("end")} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="cfg-card" style={{ marginBottom: 16 }}>
                <div className="cfg-card-header">
                    <div><div className="cfg-card-title">Break-Based Suppression</div><div className="cfg-card-sub">Automatically suppress notifications during shift break windows</div></div>
                </div>
                <div className="cfg-card-body">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--bg-raised)", borderRadius: 8, border: "1px solid var(--border)", marginBottom: 10 }}>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-1)" }}>Skip all break windows</div>
                            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Reads break times from your shift configuration above</div>
                        </div>
                        <label className="cfg-toggle">
                            <input type="checkbox" checked={quietHours.skipBreaks} onChange={set("skipBreaks")} />
                            <span className="cfg-toggle-slider" />
                        </label>
                    </div>

                    {quietHours.skipBreaks && (
                        <div style={{ paddingLeft: 12, borderLeft: "2px solid var(--border)" }}>
                            {shifts.map((sh) => (
                                <div key={sh.key} style={{ marginBottom: 10 }}>
                                    <div style={{ marginBottom: 5, display: "flex", alignItems: "center", gap: 6 }}>
                                        <ShiftPill shift={sh.key} />
                                        <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "'IBM Plex Mono',monospace" }}>{sh.start}–{sh.end}</span>
                                    </div>
                                    {sh.breaks.map((b) => {
                                        const dur = timeToMinutes(b.end) - timeToMinutes(b.start);
                                        const detail = b.name
                                        return (
                                            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--text-2)", marginBottom: 4 }}>
                                                <code style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, minWidth: 120 }}>{b.start} – {b.end}</code>
                                                <span>{b.name}</span>
                                                {dur >= 15 && <span className="cfg-badge cfg-badge-red" style={{ fontSize: 9 }}>{b.name.toLowerCase().includes("dinner") ? "Dinner" : "Lunch" }</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 24h Timeline */}
            <div className="cfg-card">
                <div className="cfg-card-header">
                    <div><div className="cfg-card-title">24-Hour Suppression Timeline</div><div className="cfg-card-sub">Visual overview of when notifications are paused today</div></div>
                </div>
                <div className="cfg-card-body">
                    <div className="cfg-timeline">
                        {/* Hour ticks */}
                        {[0, 6, 12, 18].map((h) => (
                            <div key={h} className="cfg-timeline-tick" style={{ left: `${(h / 24) * 100}%` }} />
                        ))}
                        {/* Blocks */}
                        {blocks.map((b, i) => (
                            <div key={i} className="cfg-timeline-block" style={{ left: `${b.s}%`, width: `${b.w}%`, background: b.color }} title={b.label} />
                        ))}
                        {/* Now line */}
                        <div className="cfg-timeline-now" style={{ left: `${nowPct}%` }} />
                    </div>
                    <div className="cfg-timeline-label">
                        {["00:00", "06:00", "12:00", "18:00", "24:00"].map((t) => <span key={t}>{t}</span>)}
                    </div>
                    <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-3)" }}>
                            <span style={{ width: 12, height: 10, background: "rgba(227,179,65,.35)", borderRadius: 2, display: "inline-block" }} />Short break
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-3)" }}>
                            <span style={{ width: 12, height: 10, background: "rgba(248,81,73,.4)", borderRadius: 2, display: "inline-block" }} />Lunch / Dinner break (≥15 min)
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-3)" }}>
                            <span style={{ width: 12, height: 10, background: "rgba(88,166,255,.4)", borderRadius: 2, display: "inline-block" }} />Manual quiet window
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-3)" }}>
                            <span style={{ width: 2, height: 12, background: "var(--text-1)", display: "inline-block" }} />Now
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// ── Nav items config ──────────────────────────────────────────────────────────
const NAV_ITEMS = [
    { id: "overview", label: "Overview", icon: "overview", section: "Monitor" },
    { id: "lines", label: "Lines & Personnel", icon: "lines", section: null },
    { id: "shifts", label: "Shifts & Breaks", icon: "shifts", section: null },
    { id: "notifications", label: "Notifications", icon: "notif", section: "Alerting" },
    { id: "quiet", label: "Quiet Hours", icon: "quiet", section: null },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function ProductionMonitorConfig() {
    const [theme, setTheme] = useState(() => load(STORAGE.theme, "dark"));
    const [page, setPage] = useState("overview");
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState("");
    const [shiftTemplates, setShiftTemplates] = useState([]);

    const [lines, setLines] = useState(() => load(STORAGE.lines, []));
    const [recipients, setRecipients] = useState(() => load(STORAGE.recipients, []));
    const [quietHours, setQuietHours] = useState(() => load(STORAGE.quietHours, defaultQuietHours()));
    const [shifts, setShifts] = useState(() => load(STORAGE.shifts, SHIFTS_DEFAULT));

    // Persist all state
    useEffect(() => { save(STORAGE.lines, lines); }, [lines]);
    useEffect(() => { save(STORAGE.recipients, recipients); }, [recipients]);
    useEffect(() => { save(STORAGE.quietHours, quietHours); }, [quietHours]);
    useEffect(() => { save(STORAGE.shifts, shifts); }, [shifts]);
    useEffect(() => { save(STORAGE.theme, theme); }, [theme]);

    // Inject CSS once
    useEffect(() => {
        const id = "pmcfg-styles";
        if (document.getElementById(id)) return;
        const tag = document.createElement("style");
        tag.id = id; tag.textContent = STYLES;
        document.head.appendChild(tag);
        return () => tag.remove();
    }, []);

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const { data } = await axios.get(
                    `${APP_CONSTANTS.API_BASE_URL}/api/monitor/templates/shift`,
                    { headers: getAuthHeaders() }
                );
                setShiftTemplates(data);
            } catch (err) {
                console.error("Failed to load shift templates", err);
            }
        };
        fetchTemplates();
    }, []);

    // ── Save to backend ────────────────────────────────────────────────────────
    const normalizePayload = (data) => ({
        ...data,

        lines: data.lines.map(l => ({
            ...l,
            id: Number(l.id) || 0,
            shiftTemplateId: l.shiftTemplateId || null,
            supervisors: l.supervisors ?? []
        })),

        shifts: data.shifts.map(s => ({
            ...s,
            breaks: s.breaks.map((b, i) => ({
                ...b,
                id: Number(b.id) || (i + 1)
            }))
        }))
    });

    const handleSave = useCallback(async () => {
        setSaving(true);
        setSaveMsg("");

        try {
            const rawPayload = { lines, recipients, quietHours, shifts };

            const payload = normalizePayload(rawPayload); // ✅ FIX HERE

            console.log("Saving config to backend...", payload);

            await axios.post(
                `${APP_CONSTANTS.API_BASE_URL}/api/monitor/config`,
                payload, // ✅ send normalized data
                { headers: getAuthHeaders() }
            );

            setSaveMsg("Saved successfully");
        } catch {
            setSaveMsg("Save failed — changes stored locally");
        } finally {
            setSaving(false);
            setTimeout(() => setSaveMsg(""), 3000);
        }
    }, [lines, recipients, quietHours, shifts]);

    // ── Sync lines from DB (reuse existing endpoint) ───────────────────────────
    const syncFromDb = useCallback(async () => {
        setSaving(true); setSaveMsg("");
        try {
            const { data } = await axios.get(
                `${APP_CONSTANTS.API_BASE_URL}/api/forms/config`,
                { headers: getAuthHeaders() }
            );
            if (Array.isArray(data) && data.length > 0) {
                const normalised = data.map((item) => {
                    const existingLine = lines.find(
                        (l) => l.formId === String(item.formId || item.FormId || item.FORMID || "")
                    );
                    return {
                        id: String(item.id || item.Id || item.ID || uid()),
                        plant: item.plant || item.Plant || item.PLANT || item.SERVER_NAME || "Unnamed Line",
                        formId: String(item.formId || item.FormId || item.FORMID || ""),
                        shiftTemplateId: existingLine?.shiftTemplateId || "",
                        engineers: existingLine?.engineers || [],
                        supervisors: existingLine?.supervisors || [],
                    };
                });
                setLines(normalised);
                setSaveMsg(`Synced ${normalised.length} line(s) from database`);
            } else {
                setSaveMsg("No lines found in database");
            }
        } catch {
            setSaveMsg("DB sync failed");
        } finally {
            setSaving(false);
            setTimeout(() => setSaveMsg(""), 4000);
        }
    }, [lines]);

    // ── Counters for nav badges ────────────────────────────────────────────────
    const badgeCounts = {
        lines: lines.length,
        notifications: recipients.filter((r) => r.enabled).length,
        shifts: shifts.length,
        quiet: quietHours.enabled || quietHours.skipBreaks ? "ON" : null,
    };

    return (
        <div className={`cfg-root ${theme}`}>
            <div className="cfg-layout">
                {/* ── Sidebar ── */}
                <aside className="cfg-sidebar">
                    <div className="cfg-sidebar-head">
                        <div className="cfg-logo">
                            <div className="cfg-logo-mark">PM</div>
                            <div>
                                <div className="cfg-logo-text">Monitor Config</div>
                            </div>
                        </div>
                        <div className="cfg-logo-sub">Production Intelligence</div>
                    </div>

                    <nav className="cfg-nav">
                        {NAV_ITEMS.map((item, i) => {
                            const prevItem = NAV_ITEMS[i - 1];
                            const showSection = item.section && (!prevItem || prevItem.section !== item.section);
                            return (
                                <div key={item.id}>
                                    {showSection && <div className="cfg-nav-section">{item.section}</div>}
                                    <div
                                        className={`cfg-nav-item ${page === item.id ? "active" : ""}`}
                                        onClick={() => setPage(item.id)}
                                    >
                                        <svg className="cfg-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d={Icons[item.icon]} />
                                        </svg>
                                        {item.label}
                                        {badgeCounts[item.id] ? (
                                            <span className="cfg-nav-badge">{badgeCounts[item.id]}</span>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })}
                    </nav>

                    <div className="cfg-sidebar-footer">
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <button
                                className="cfg-btn cfg-btn-sm"
                                onClick={syncFromDb}
                                disabled={saving}
                                style={{ flex: 1, justifyContent: "center" }}
                                title="Pull lines from FF_FTPSERVERENTITY"
                            >
                                {saving ? <span className="cfg-spin" /> : <Icon d={Icons.db} size={13} />}
                                {saving ? "Syncing…" : "Sync DB"}
                            </button>
                            <button
                                className="cfg-theme-btn"
                                onClick={() => setTheme((p) => p === "dark" ? "light" : "dark")}
                                title="Toggle theme"
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d={theme === "dark" ? Icons.sun : Icons.moon} />
                                </svg>
                            </button>
                        </div>
                        {saveMsg && (
                            <div style={{ fontSize: 11, color: saveMsg.includes("fail") ? "var(--red)" : "var(--green)", marginTop: 8, fontFamily: "'IBM Plex Mono',monospace", textAlign: "center" }}>
                                {saveMsg}
                            </div>
                        )}
                    </div>
                </aside>

                {/* ── Main content ── */}
                <main className="cfg-main">
                    <div className="cfg-page-head">
                        <div className="cfg-page-eyebrow">Production Monitor</div>
                        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                            <div>
                                <div className="cfg-page-title">
                                    {page === "overview" && "Overview"}
                                    {page === "lines" && "Lines & Personnel"}
                                    {page === "shifts" && "Shifts & Breaks"}
                                    {page === "notifications" && "Notification Recipients"}
                                    {page === "quiet" && "Quiet Hours & Suppression"}
                                </div>
                                <div className="cfg-page-sub">
                                    {page === "overview" && "Summary of your monitoring configuration"}
                                    {page === "lines" && "Manage engineers and supervisors per production line"}
                                    {page === "shifts" && "Configure shift times and break windows"}
                                    {page === "notifications" && "Define who gets alerted and when"}
                                    {page === "quiet" && "Control when notifications are suppressed"}
                                </div>
                            </div>
                            <button className="cfg-btn cfg-btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? <span className="cfg-spin" /> : <Icon d={Icons.save} size={14} />}
                                {saving ? "Saving…" : "Save Changes"}
                            </button>
                        </div>
                    </div>

                    {page === "overview" && <PageOverview lines={lines} recipients={recipients} shifts={shifts} quietHours={quietHours} />}
                    {page === "lines" && <PageLines lines={lines} setLines={setLines} shiftTemplates={shiftTemplates} />}
                    {page === "shifts" && <PageShifts shifts={shifts} setShifts={setShifts} />}
                    {page === "notifications" && <PageNotifications recipients={recipients} setRecipients={setRecipients} lines={lines} />}
                    {page === "quiet" && <PageQuietHours quietHours={quietHours} setQuietHours={setQuietHours} shifts={shifts} />}
                </main>
            </div>
        </div>
    );
}