'use strict';
/* =====================================================================
   Stride: a personal progress tracker
   Goals  →  Projects  →  Tasks + timed work Sessions
   Everything is saved on this phone (localStorage). No server, no login.
   ===================================================================== */

const KEY = 'stride.v1';
const DAY = 86400000;
// Project/goal colours: the brand blues first, then a few muted accents so projects stay easy to tell apart
const COLORS = ['#5483B3', '#052659', '#7DA0CA', '#2a8c9e', '#3f6a99', '#d38b3c', '#b8566b', '#6d6fc4'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ---------------- icons (inline SVG) ---------------- */
const I = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const ICON = {
  home: I('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>'),
  target: I('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>'),
  chart: I('<path d="M5 20v-7"/><path d="M12 20V5"/><path d="M19 20v-10"/>'),
  settings: I('<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>'),
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.6v12.8a1 1 0 0 0 1.53.85l10.2-6.4a1 1 0 0 0 0-1.7L9.53 4.75A1 1 0 0 0 8 5.6z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.3"/><rect x="14" y="5" width="4" height="14" rx="1.3"/></svg>',
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  check: I('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  back: I('<path d="m15 5-7 7 7 7"/>'),
  chev: I('<path d="m9 5 7 7-7 7"/>'),
  x: I('<path d="M6 6l12 12M18 6 6 18"/>'),
  flame: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5s6 4.6 6 10.5a6 6 0 0 1-12 0c0-2.8 1.6-4.7 1.6-4.7s.4 2.7 2.6 2.7C10.2 7.6 12 2.5 12 2.5z"/></svg>',
  clock: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  edit: I('<path d="M4 20h4L19 9l-4-4L4 16v4z"/>'),
  download: I('<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>'),
  upload: I('<path d="M12 20V9"/><path d="m7 14 5-5 5 5"/><path d="M5 4h14"/>'),
  spark: I('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>'),
  trash: I('<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>'),
  todo: I('<path d="M11 6h9M11 12h9M11 18h9"/><path d="m3.5 6 1.5 1.5L8 4.5"/><path d="m3.5 12 1.5 1.5L8 10.5"/><path d="m3.5 18 1.5 1.5L8 16.5"/>'),
  phone: I('<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18h2"/>'),
  alert: I('<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>'),
};
const LOGO = `<svg class="logo" viewBox="0 0 32 32" fill="none"><rect x="3" y="17" width="6.5" height="11" rx="3.25" fill="currentColor" opacity=".5"/><rect x="12.75" y="10" width="6.5" height="18" rx="3.25" fill="currentColor" opacity=".78"/><rect x="22.5" y="3" width="6.5" height="25" rx="3.25" fill="currentColor"/></svg>`;

/* ---------------- small helpers ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const clamp01 = n => Math.max(0, Math.min(1, n || 0));

function fmtDur(ms) {
  const m = Math.floor(Math.max(0, ms) / 60000), h = Math.floor(m / 60), r = m % 60;
  if (h && r) return `${h}h ${r}m`;
  return h ? `${h}h` : `${r}m`;
}
function fmtHours(ms) {
  const h = ms / 3600000;
  if (h <= 0) return '0h';
  return h < 10 ? `${Math.round(h * 10) / 10}h` : `${Math.round(h)}h`;
}
const fmtBig = ms => (ms < 100 * 3600000 ? fmtDur(ms) : fmtHours(ms));
function fmtClock(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(t / 3600))}:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`;
}
function dayKey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function startOfDay(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
function addDays(ts, n) { const d = new Date(ts); d.setDate(d.getDate() + n); return d.getTime(); }
function weekStart(ts = Date.now()) { const d = startOfDay(ts); return addDays(d, -((new Date(d).getDay() + 6) % 7)); } // Monday
const fmtTime = ts => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
function fmtDate(ts) {
  const k = dayKey(ts);
  if (k === dayKey(Date.now())) return 'Today';
  if (k === dayKey(addDays(Date.now(), -1))) return 'Yesterday';
  return new Date(ts).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}
function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/* ---------------- data (saved on the phone) ---------------- */
const defaultState = () => ({
  v: 1, onboarded: false,
  profile: { name: '', dailyTargetMin: 120 },
  goals: [], projects: [], tasks: [], sessions: [],
  todos: [], // simple personal to-do list, separate from goals
  timer: null, lastProject: null, lastBackup: null,
});
let S = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      return normalize({ ...defaultState(), ...d, profile: { ...defaultState().profile, ...(d.profile || {}) } });
    }
  } catch (e) { /* corrupted or blocked storage: start fresh */ }
  return defaultState();
}
/* Fill in fields that older saved data doesn't have yet */
function normalize(s) {
  if (!Array.isArray(s.todos)) s.todos = [];
  s.todos.forEach(t => { if (!t.date) t.date = dayKey(t.createdAt || Date.now()); }); // each to-do belongs to one day
  (s.goals || []).forEach(g => { if (!g.startDate) g.startDate = dayKey(g.createdAt || Date.now()); }); // goals run from a start date
  return s;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('Could not save. Phone storage may be full.'); }
}

const goal = id => S.goals.find(g => g.id === id);
const project = id => S.projects.find(p => p.id === id);
const projectsOf = gid => S.projects.filter(p => p.goalId === gid);

function newGoal(name, targetHours, color, deadline = '', startDate = dayKey(Date.now())) {
  const g = { id: uid(), name, targetHours: Math.max(1, targetHours || 100), color: color || COLORS[S.goals.length % COLORS.length], startDate, deadline, createdAt: Date.now() };
  S.goals.push(g); return g;
}
function newProject(name, goalId, color) {
  const p = { id: uid(), name, goalId, color: color || COLORS[S.projects.length % COLORS.length], createdAt: Date.now() };
  S.projects.push(p); return p;
}
function deleteProject(id) {
  S.projects = S.projects.filter(p => p.id !== id);
  S.tasks = S.tasks.filter(t => t.projectId !== id);
  S.sessions = S.sessions.filter(s => s.projectId !== id);
  if (S.timer?.projectId === id) S.timer = null;
  if (ui.pick === id) ui.pick = null;
}
function deleteGoal(id) {
  projectsOf(id).forEach(p => deleteProject(p.id));
  S.goals = S.goals.filter(g => g.id !== id);
}

/* ---------------- timer ---------------- */
function timerElapsed() {
  const t = S.timer;
  return t ? Math.max(0, (t.pausedAt ?? Date.now()) - t.startedAt - t.pausedMs) : 0;
}
function startTimer(projectId, targetMin) {
  S.timer = { projectId, startedAt: Date.now(), pausedMs: 0, pausedAt: null, targetMin: targetMin || 0, notified: false };
  S.lastProject = ui.pick = projectId;
  save();
}

/* ---------------- maths for stats ---------------- */
function allSessions() {
  const list = S.sessions.slice();
  if (S.timer) list.push({ id: 'live', projectId: S.timer.projectId, start: S.timer.startedAt, ms: timerElapsed(), live: true });
  return list;
}
const sumWhere = fn => allSessions().reduce((a, s) => (fn(s) ? a + s.ms : a), 0);
const projectMs = pid => sumWhere(s => s.projectId === pid);
function goalMs(gid) { const ids = new Set(projectsOf(gid).map(p => p.id)); return sumWhere(s => ids.has(s.projectId)); }
function todayMs() { const k = dayKey(Date.now()); return sumWhere(s => dayKey(s.start) === k); }
function weekMs() { const ws = weekStart(); return sumWhere(s => s.start >= ws); }
function byDay() {
  const m = {};
  for (const s of allSessions()) { const k = dayKey(s.start); m[k] = (m[k] || 0) + s.ms; }
  return m;
}
function streak() {
  const m = byDay();
  let d = Date.now(), n = 0;
  if (!(m[dayKey(d)] >= 60000)) d = addDays(d, -1); // today not started yet → count from yesterday
  while ((m[dayKey(d)] || 0) >= 60000) { n++; d = addDays(d, -1); }
  return n;
}
function bestStreak() {
  const m = byDay();
  const keys = Object.keys(m).filter(k => m[k] >= 60000).sort();
  let best = 0, cur = 0, prev = null;
  for (const k of keys) {
    cur = prev && dayKey(addDays(new Date(prev + 'T00:00').getTime(), 1)) === k ? cur + 1 : 1;
    best = Math.max(best, cur); prev = k;
  }
  return best;
}
/* ---------- daily time plan for a goal ----------
   Daily plan = hours still left ÷ days still left (today and the deadline both count).
   It is worked out at the start of each day: hours you log today don't shrink today's plan,
   but tomorrow's plan is recalculated with them taken off.
   e.g. 20h goal, 15–30 Nov. On 19 Nov with 0h done: 20h ÷ 12 days = 1h 40m a day.
        Do 4h that day → on 20 Nov: 16h ÷ 11 days = 1h 28m a day. */
const dayDiff = (a, b) => Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / DAY); // days from a to b
const fmtPlan = ms => fmtDur(Math.ceil(ms / 60000) * 60000); // round up to the next minute
function goalTodayMs(gid) {
  const ids = new Set(projectsOf(gid).map(p => p.id)), k = dayKey(Date.now());
  return sumWhere(s => ids.has(s.projectId) && dayKey(s.start) === k);
}
function goalPlan(g, ms = goalMs(g.id)) {
  const today = dayKey(Date.now());
  const start = g.startDate || dayKey(g.createdAt || Date.now());
  const target = g.targetHours * 3600000, left = Math.max(0, target - ms);
  const p = { start, deadline: g.deadline || '', target, left, reached: left === 0 };
  if (!p.deadline) return p;
  p.totalDays = dayDiff(start, p.deadline) + 1;
  if (p.totalDays < 1) return { ...p, deadline: '' }; // bad dates (deadline before start): no plan
  p.notStarted = start > today;
  p.startsIn = dayDiff(today, start);
  p.passed = p.deadline < today;
  p.daysLeft = Math.max(0, dayDiff(p.notStarted ? start : today, p.deadline) + 1);
  const doneBeforeToday = p.notStarted ? ms : ms - goalTodayMs(g.id);
  p.leftAtDayStart = Math.max(0, target - doneBeforeToday);
  p.perDay = p.daysLeft ? p.leftAtDayStart / p.daysLeft : 0; // today's share of what is left
  return p;
}
function goalPace(g, ms) {
  const p = goalPlan(g, ms);
  if (p.reached) return 'Target reached 🎉';
  if (!p.deadline) return '';
  if (p.passed) return 'Deadline passed';
  if (p.notStarted) return `Starts in ${p.startsIn} day${p.startsIn === 1 ? '' : 's'}`;
  return `${p.daysLeft} day${p.daysLeft === 1 ? '' : 's'} left · ${fmtPlan(p.perDay)} a day`;
}
/* Hours already logged on a goal before today (used by the edit form) */
function goalDoneBeforeToday(id) { const g = id && goal(id); return g ? goalMs(g.id) - goalTodayMs(g.id) : 0; }
/* Live text under the goal form: "About 5h a day for 16 days" */
function planPreview(hours, start, deadline, doneMs = 0) {
  if (!deadline) return { text: 'Add a deadline to see how much time you need to give this goal every day.' };
  const today = dayKey(Date.now());
  if (deadline < today) return { warn: true, text: 'The deadline is in the past. Pick today or a later date.' };
  if (start && deadline < start) return { warn: true, text: 'The deadline must be on or after the start date.' };
  const from = start > today ? start : today;
  const days = dayDiff(from, deadline) + 1, left = Math.max(0, (Number(hours) || 0) * 3600000 - doneMs);
  if (!left) return { text: 'You have already reached this target. 🎉' };
  const per = left / days;
  if (per >= DAY) return { warn: true, text: `That's ${fmtPlan(per)} a day, more than 24 hours. Pick a later deadline or fewer hours.` };
  return { text: `About <b>${fmtPlan(per)}</b> a day for <b>${days} day${days === 1 ? '' : 's'}</b>${doneMs > 0 ? `, after the ${fmtHours(doneMs)} you've already done` : ''}. It updates every day as you log time.` };
}
function updatePlanPreview(f) {
  const out = f.querySelector('[data-plan-preview]');
  if (!out) return;
  const r = planPreview(f.hours.value, f.start.value || dayKey(Date.now()), f.deadline.value, goalDoneBeforeToday(f.dataset.id));
  out.innerHTML = r.text; out.classList.toggle('warn', !!r.warn);
}
function planTiles(g, ms) {
  const p = goalPlan(g, ms);
  if (!p.deadline) return `<div class="plan-empty"><span>Add a deadline to get a daily time plan for this goal.</span>
    <button class="link" data-action="edit-goal" data-id="${g.id}">Add deadline</button></div>`;
  const t = goalTodayMs(g.id);
  const todayTile = p.notStarted
    ? `<div class="plan-t"><span>Today</span><b>–</b><em>starts ${shortDate(p.start)}</em></div>`
    : `<div class="plan-t"><span>Today</span><b>${fmtDur(t)}</b><em>of ${fmtPlan(p.perDay)}</em>
        <div class="bar"><i style="width:${clamp01(t / p.perDay) * 100}%"></i></div></div>`;
  const plural = n => (n === 1 ? '' : 's');
  return `<div class="plan">
    <div class="plan-t"><span>Daily plan</span><b>${p.reached ? 'Done' : p.passed ? '–' : fmtPlan(p.perDay)}</b>
      <em>${p.reached ? 'target reached' : p.passed ? 'deadline passed' : `for ${p.daysLeft} day${plural(p.daysLeft)}`}</em></div>
    ${todayTile}
    <div class="plan-t"><span>Hours left</span><b>${p.reached ? '0h' : fmtBig(p.left)}</b><em>of ${g.targetHours}h</em></div></div>
    ${!p.reached && !p.passed ? `<p class="hint" style="margin-top:10px">Daily plan = hours left ÷ days left. It updates every day as you log time.</p>` : ''}`;
}

/* ---------------- UI state (not saved) ---------------- */
const ui = {
  tab: 'home', layers: [], onb: 0, statsRange: 'week', focusMode: 'timer',
  pick: null, openProj: {}, confirm: null, renderDay: dayKey(Date.now()),
  sessLen: 0, customH: 0, customM: 30, showDone: false, // focus screen: chosen session length (0 = open) and the custom boxes
};
let installPrompt = null;

/* Screens and sheets are "layers" tied to browser history, so the
   Android back button closes the top one instead of quitting the app. */
function topScreen() {
  for (let i = ui.layers.length - 1; i >= 0; i--) if (ui.layers[i].type !== 'sheet') return ui.layers[i];
  return null;
}
function pushLayer(layer) {
  ui.layers.push(layer);
  history.pushState({ d: ui.layers.length }, '');
  if (layer.type !== 'sheet') { render(); window.scrollTo(0, 0); }
}
function back(n = 1) { if (n > 0) history.go(-n); }
function sheetsOnTop() { let n = 0; for (let i = ui.layers.length - 1; i >= 0 && ui.layers[i].type === 'sheet'; i--) n++; return n; }
window.addEventListener('popstate', e => {
  const depth = (e.state && e.state.d) || 0;
  let screenChanged = false;
  while (ui.layers.length > depth) {
    const l = ui.layers.pop();
    if (l.type === 'sheet') removeTopSheet(); else screenChanged = true;
  }
  if (screenChanged) { render(); window.scrollTo(0, 0); }
});
/* Turn the open sheet into a full screen (e.g. "Create goal" → open that goal) */
function sheetInto(layer) {
  ui.layers[ui.layers.length - 1] = layer;
  history.replaceState({ d: ui.layers.length }, '');
  removeTopSheet(); render(); window.scrollTo(0, 0);
}

function openSheet(html) {
  const el = document.createElement('div');
  el.className = 'sheet-wrap';
  el.innerHTML = `<div class="sheet-bg" data-action="back"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  $('#overlay').appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('open')));
  pushLayer({ type: 'sheet' });
}
function removeTopSheet() {
  const open = $$('#overlay .sheet-wrap:not(.closing)');
  const el = open[open.length - 1];
  if (!el) return;
  el.classList.add('closing'); el.classList.remove('open');
  setTimeout(() => el.remove(), 320);
}
function confirmSheet(title, text, okLabel, fn, danger = true) {
  ui.confirm = fn; // fn returns how many layers to close afterwards
  openSheet(`<div class="sheet-hero"><h3 class="sheet-t">${title}</h3><p class="muted">${text}</p></div>
    <button class="btn ${danger ? 'danger' : 'primary'}" data-action="confirm-ok">${okLabel}</button>
    <button class="btn text" data-action="back">Cancel</button>`);
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------------- reusable bits ---------------- */
function ring(pct, size, key, inner = '') {
  const sw = size > 150 ? 14 : 9, r = (size - sw) / 2, c = 2 * Math.PI * r, p = clamp01(pct), h = size / 2;
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}">
    <circle class="rt" cx="${h}" cy="${h}" r="${r}" stroke-width="${sw}" fill="none"/>
    <circle class="rp" data-ring="${key}" data-c="${c}" cx="${h}" cy="${h}" r="${r}" stroke-width="${sw}" fill="none" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" stroke-opacity="${p > 0.001 ? 1 : 0}" transform="rotate(-90 ${h} ${h})"/>
  </svg><div class="ring-in">${inner}</div></div>`;
}
function setRing(key, pct) {
  const p = clamp01(pct);
  $$(`[data-ring="${key}"]`).forEach(el => {
    el.setAttribute('stroke-dashoffset', +el.dataset.c * (1 - p));
    el.setAttribute('stroke-opacity', p > 0.001 ? 1 : 0);
  });
}
function empty(icon, title, text, btn, action, extra = '') {
  return `<div class="empty"><div class="e-ic">${icon}</div><h3>${title}</h3><p>${text}</p>
    ${btn ? `<button class="btn primary" data-action="${action}" ${extra}>${ICON.plus} ${btn}</button>` : ''}</div>`;
}
function sessionRow(s, showDate = false) {
  const p = project(s.projectId), g = p && goal(p.goalId);
  const when = showDate ? `${fmtDate(s.start)} · ${fmtTime(s.start)}` : fmtTime(s.start);
  const sub = s.live ? 'In progress…' : [when, g ? g.name : '', s.note || ''].filter(Boolean).join(' · ');
  return `<button class="row" data-action="session" data-id="${s.id}">
    <span class="pdot" style="background:${p?.color || '#666'}"></span>
    <div class="row-main"><b>${esc(p?.name || 'Deleted project')}</b><span>${esc(sub)}</span></div>
    <span class="row-end" ${s.live ? 'data-live="timer-short"' : ''}>${fmtDur(s.ms)}</span></button>`;
}
function colorPicker(sel) {
  return `<div class="field"><span>Colour</span><div class="colors">${COLORS.map(c =>
    `<label class="sw"><input type="radio" name="color" value="${c}" ${c === sel ? 'checked' : ''}><i style="background:${c}"></i></label>`).join('')}</div></div>`;
}
function projectPicker() {
  const groups = S.goals.map(g => {
    const ps = projectsOf(g.id);
    if (!ps.length) return '';
    return `<p class="group-l">${esc(g.name)}</p><div class="list">${ps.map(p => `
      <label class="row pick"><span class="pdot" style="background:${p.color}"></span>
        <div class="row-main"><b>${esc(p.name)}</b><span>${fmtHours(projectMs(p.id))} so far</span></div>
        <input type="radio" name="pick" value="${p.id}" ${ui.pick === p.id ? 'checked' : ''}><span class="radio"></span></label>`).join('')}</div>`;
  }).join('');
  return groups + `<button class="btn soft" type="button" data-action="new-project">${ICON.plus} New project</button>`;
}

/* =====================================================================
   VIEWS
   ===================================================================== */
function render() {
  ui.renderDay = dayKey(Date.now());
  const app = $('#app');
  if (!S.onboarded) { app.innerHTML = viewOnboarding(); return; }
  const top = topScreen();
  if (top?.type === 'goal') app.innerHTML = `<div class="view no-nav">${viewGoal(top.id)}</div>`;
  else if (top?.type === 'focus') app.innerHTML = `<div class="view no-nav">${viewFocus()}</div>`;
  else {
    const v = { todo: viewTodo, home: viewHome, goals: viewGoals, stats: viewStats, settings: viewSettings }[ui.tab] || viewHome;
    app.innerHTML = `<div class="view">${v()}</div>${navBar()}`;
  }
  tick();
}

function navBar() {
  const b = (t, ic, label, extra = '') => `<button class="nav-b ${ui.tab === t ? 'on' : ''}" data-action="tab" data-tab="${t}">${ic}<span>${label}</span>${extra}</button>`;
  const today = dayKey(Date.now());
  const left = S.todos.filter(t => !t.done && t.date === today).length; // badge = what's left for today
  return `<nav class="nav">
    ${b('todo', ICON.todo, 'To-do', left ? `<i class="nav-count">${left > 99 ? '99+' : left}</i>` : '')}
    ${b('goals', ICON.target, 'Goals')}
    <button class="nav-b home ${ui.tab === 'home' ? 'on' : ''}" data-action="tab" data-tab="home">
      <i class="hb">${ICON.home}</i><span>Home</span>${S.timer ? '<i class="live-dot" title="Timer running"></i>' : ''}</button>
    ${b('stats', ICON.chart, 'Progress')}
    ${b('settings', ICON.settings, 'Settings')}</nav>`;
}

/* ---------- to-do list ---------- */
/* Each to-do belongs to one day (t.date = "YYYY-MM-DD"). The screen shows one day at a time. */
function dayLabel(k) {
  const today = dayKey(Date.now());
  if (k === today) return 'Today';
  if (k === dayKey(addDays(Date.now(), 1))) return 'Tomorrow';
  if (k === dayKey(addDays(Date.now(), -1))) return 'Yesterday';
  return new Date(k + 'T00:00').toLocaleDateString([], { weekday: 'long' });
}
const longDate = k => new Date(k + 'T00:00').toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
const shortDate = k => new Date(k + 'T00:00').toLocaleDateString([], { day: 'numeric', month: 'short' });

function todoRow(t, showDate = false) {
  return `<div class="todo ${t.done ? 'done' : ''}">
    <button class="tick" data-action="todo-toggle" data-id="${t.id}" aria-label="${t.done ? 'Mark as not done' : 'Mark as done'}">${t.done ? ICON.check : ''}</button>
    <button class="todo-t" data-action="todo-edit" data-id="${t.id}">${esc(t.title)}${showDate ? `<small>${dayLabel(t.date)}, ${shortDate(t.date)}</small>` : ''}</button>
    <button class="icon-b xs" data-action="todo-del" data-id="${t.id}" aria-label="Delete">${ICON.x}</button></div>`;
}

function viewTodo() {
  const today = dayKey(Date.now());
  const day = ui.todoDay || today;
  const dayTs = new Date(day + 'T00:00').getTime();
  const isPast = day < today;
  const items = S.todos.filter(t => t.date === day);
  const open = items.filter(t => !t.done).sort((a, b) => b.createdAt - a.createdAt);
  const done = items.filter(t => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));

  // week strip (Mon–Sun) around the chosen day
  const ws = weekStart(dayTs);
  const strip = Array.from({ length: 7 }, (_, i) => {
    const k = dayKey(addDays(ws, i)), list = S.todos.filter(t => t.date === k);
    const dot = list.some(t => !t.done) ? 'has' : list.length ? 'all' : '';
    const d = new Date(k + 'T00:00');
    return `<button class="day ${k === day ? 'on' : ''} ${k === today ? 'today' : ''}" data-action="todo-day" data-day="${k}" aria-label="${longDate(k)}" ${k === day ? 'aria-current="date"' : ''}>
      <span>${WD[d.getDay()].slice(0, 3)}</span><b>${d.getDate()}</b><i class="${dot}"></i></button>`;
  }).join('');
  const we = addDays(ws, 6);

  let html = `<header class="top"><div><p class="muted sm">${longDate(day)}</p><h2>${dayLabel(day)}</h2></div>
      ${day !== today ? `<button class="link" data-action="todo-day" data-day="${today}">Go to today</button>` : `<span class="muted sm">${open.length ? `${open.length} left` : items.length ? 'All done' : ''}</span>`}</header>
    <div class="wk"><button class="icon-b sm" data-action="todo-week" data-step="-7" aria-label="Previous week">${ICON.back}</button>
      <span>${shortDate(dayKey(ws))} – ${shortDate(dayKey(we))}</span>
      <button class="icon-b sm" data-action="todo-week" data-step="7" aria-label="Next week"><span class="flip">${ICON.back}</span></button></div>
    <div class="days">${strip}</div>`;

  // unfinished items from earlier days, offered on today's page
  if (day === today) {
    const late = S.todos.filter(t => !t.done && t.date < today).sort((a, b) => (a.date < b.date ? 1 : -1));
    if (late.length) html += `<div class="carry"><div class="carry-h"><b>${late.length} unfinished from earlier</b>
        <button class="btn primary sm" data-action="todo-carry">Move to today</button></div>
        <div class="list">${late.map(t => todoRow(t, true)).join('')}</div></div>`;
  }

  if (isPast) html += `<p class="hint" style="margin:0 0 14px">This day has passed. You can still tick items off, but not add new ones.</p>`;
  else html += `<form class="todo-add" data-form="todo" autocomplete="off">
      <input name="title" maxlength="120" placeholder="Add to ${dayLabel(day) === 'Today' || dayLabel(day) === 'Tomorrow' ? dayLabel(day).toLowerCase() : dayLabel(day)}…" aria-label="New to-do for ${longDate(day)}">
      <button class="icon-b solid" type="submit" aria-label="Add to-do">${ICON.plus}</button></form>`;

  if (open.length) html += `<div class="list">${open.map(t => todoRow(t)).join('')}</div>`;
  else if (done.length) html += `<p class="hint">Everything for this day is ticked off. Nice work!</p>`;
  else html += empty(ICON.todo, isPast ? 'Nothing was planned' : 'Nothing planned yet', isPast ? 'There were no to-dos on this day.' : 'Write down what you want to get done on this day. Tick it off when it is done.', '', '');

  if (done.length) {
    html += `<div class="sec-h"><button class="link" data-action="todo-show-done">${ui.showDone ? 'Hide' : 'Show'} completed (${done.length})</button>
      <button class="link danger-t" data-action="todo-clear">Clear completed</button></div>`;
    if (ui.showDone) html += `<div class="list">${done.map(t => todoRow(t)).join('')}</div>`;
  }
  return html + (items.length ? `<p class="hint">Tap an item to edit it or move it to another day.</p>` : '');
}
function todoSheet(id) {
  const t = S.todos.find(x => x.id === id);
  if (!t) return;
  openSheet(`<form data-form="todo-edit" data-id="${id}" autocomplete="off" novalidate><h3 class="sheet-t">Edit to-do</h3>
    <label class="field"><span>To-do</span><input name="title" maxlength="120" value="${esc(t.title)}"></label>
    <label class="field"><span>Day</span><input name="date" type="date" min="${dayKey(Date.now())}" value="${t.date}"></label>
    <button class="btn primary" type="submit">Save</button>
    <button class="btn text danger-t" type="button" data-action="todo-del" data-id="${id}">Delete</button></form>`);
}

/* ---------- onboarding ---------- */
const SLIDES = [
  { a: 'Own Your Time,', b: 'Shape Your Goals.', p: 'Every focused hour adds up. Track it, see it, and watch your goals start to rise.' },
  { a: 'Goals. Projects.', b: 'Real Hours.', p: 'Break a big goal into projects, then log every work session with a single tap.' },
  { a: 'Progress You', b: 'Can Actually See.', p: 'Streaks, weekly charts and a consistency map keep you honest and motivated.' },
];
function viewOnboarding() {
  const i = ui.onb;
  const dots = `<div class="dots">${[0, 1, 2, 3].map(n => `<i class="${n === i ? 'on' : ''}"></i>`).join('')}</div>`;
  if (i < 3) {
    const s = SLIDES[i];
    return `<div class="onb"><div class="onb-glow v${i}"></div><div class="onb-body">
      <div class="brand">${LOGO}<span>Stride</span></div>
      <h1>${s.a}<br><span class="accent">${s.b}</span></h1>
      <p class="lead">${s.p}</p>${dots}
      <button class="btn primary" data-action="onb-next">Next</button>
      <button class="btn text" data-action="onb-skip">Skip</button></div></div>`;
  }
  return `<div class="onb setup"><div class="onb-glow v3"></div><form class="onb-body" data-form="setup" autocomplete="off">
    <div class="brand">${LOGO}<span>Stride</span></div>
    <h1>Let's set you <span class="accent">up.</span></h1>
    <label class="field"><span>What should we call you?</span><input name="name" maxlength="30" placeholder="Your first name"></label>
    <div class="field"><span>Daily focus target</span><div class="chips">${[60, 120, 180, 240, 360].map(m =>
      `<label class="chip"><input type="radio" name="target" value="${m}" ${m === 120 ? 'checked' : ''}><b>${m / 60}h</b></label>`).join('')}</div></div>
    <label class="field"><span>Your first goal <em>(optional)</em></span><input name="goal" maxlength="60" placeholder="e.g. Become a web developer"></label>
    <label class="field"><span>Hours you plan to put into it</span><input name="goalHours" type="number" inputmode="numeric" min="1" value="100"></label>
    ${dots}
    <button class="btn primary" type="submit">Start tracking</button>
    <button class="btn text" type="button" data-action="onb-demo">Explore with sample data</button>
  </form></div>`;
}

/* ---------- home ---------- */
function viewHome() {
  const name = S.profile.name || 'there';
  const target = S.profile.dailyTargetMin * 60000, today = todayMs();
  const todays = allSessions().filter(s => dayKey(s.start) === dayKey(Date.now())).sort((a, b) => b.start - a.start);
  const st = streak();
  const needBackup = S.sessions.length >= 5 && (!S.lastBackup || Date.now() - S.lastBackup > 7 * DAY);

  let html = `<header class="top"><div><p class="muted sm">${greeting()},</p><h2>${esc(name)}</h2></div>
    <button class="avatar" data-action="tab" data-tab="settings" aria-label="Settings">${esc((S.profile.name || 'S')[0].toUpperCase())}</button></header>
  <section class="hero"><div class="hero-glow"></div>
    <div class="hero-in">
      <div><p class="label">Focused today</p><div class="big" data-live="today">${fmtDur(today)}</div>
        <p class="muted sm">of your ${fmtDur(target)} goal</p></div>
      ${ring(today / target, 96, 'today', `<span class="ring-pct" data-live="today-pct">${Math.round(clamp01(today / target) * 100)}%</span>`)}
    </div>
    <div class="hero-stats">
      <div><b>${ICON.flame}${st}</b><span>day streak</span></div>
      <div><b>${fmtDur(weekMs())}</b><span>this week</span></div>
      <div><b>${todays.length}</b><span>session${todays.length === 1 ? '' : 's'} today</span></div>
    </div></section>`;

  if (needBackup) html += `<button class="banner" data-action="tab" data-tab="settings">${ICON.alert}<span>Your data lives only on this phone. Tap to save a backup${S.lastBackup ? '' : ' (never backed up yet)'}.</span></button>`;

  html += S.timer ? timerCard() : `<button class="btn primary lg" data-action="open-focus">${ICON.play} Start a focus session</button>`;

  if (!S.goals.length) {
    html += `<div class="sec-h"><h3>Get started</h3></div>
      <div class="list steps">
        <button class="row" data-action="new-goal"><div class="row-main"><b>Create a goal</b><span>The big thing you're working towards</span></div><span class="chev">${ICON.chev}</span></button>
        <div class="row"><div class="row-main"><b>Add projects inside it</b><span>e.g. "Portfolio site", "DSA practice"</span></div></div>
        <div class="row"><div class="row-main"><b>Start the timer &amp; work</b><span>Every minute is counted towards your goal</span></div></div>
      </div>`;
  } else {
    html += `<div class="sec-h"><h3>Your goals</h3><button class="link" data-action="tab" data-tab="goals">See all</button></div>
      <div class="hscroll">${S.goals.map(g => {
        const ms = goalMs(g.id), pct = ms / (g.targetHours * 3600000), p = goalPlan(g, ms);
        const planLine = p.perDay && !p.passed && !p.reached
          ? `<span class="today-l">${p.notStarted ? `Starts ${shortDate(p.start)} · ${fmtPlan(p.perDay)}/day` : `Today ${fmtDur(goalTodayMs(g.id))} of ${fmtPlan(p.perDay)}`}</span>` : '';
        return `<button class="gcard" data-action="open-goal" data-id="${g.id}"><span class="dot" style="background:${g.color}"></span>
          <b>${esc(g.name)}</b><span class="muted sm">${fmtHours(ms)} of ${g.targetHours}h · ${Math.round(clamp01(pct) * 100)}%</span>${planLine}
          <div class="bar"><i style="width:${clamp01(pct) * 100}%;background:${g.color}"></i></div></button>`;
      }).join('')}</div>`;
  }

  html += `<div class="sec-h"><h3>Today</h3>${todays.length ? `<span class="muted sm">${fmtDur(today)}</span>` : ''}</div>`;
  html += todays.length
    ? `<div class="list">${todays.map(s => sessionRow(s)).join('')}</div>`
    : `<p class="hint">No sessions yet today. Even 25 minutes counts.</p>`;
  return html;
}
function timerCard() {
  const t = S.timer, p = project(t.projectId);
  return `<button class="live-card" data-action="open-focus"><span class="live-pulse ${t.pausedAt ? 'paused' : ''}"></span>
    <div class="row-main"><span class="label">${t.pausedAt ? 'Paused' : 'Focusing on'}</span><b>${esc(p?.name || '')}</b></div>
    <span class="live-time" data-live="timer">${fmtClock(timerElapsed())}</span></button>`;
}

/* ---------- goals ---------- */
function viewGoals() {
  const head = `<header class="top"><div><p class="muted sm">${S.goals.length} goal${S.goals.length === 1 ? '' : 's'}</p><h2>Goals</h2></div>
    <button class="icon-b solid" data-action="new-goal" aria-label="New goal">${ICON.plus}</button></header>`;
  if (!S.goals.length) return head + empty(ICON.target, 'No goals yet', 'A goal is the big thing you are working towards, like "Learn Flutter" or "Crack the exam".', 'Create a goal', 'new-goal');
  return head + `<div class="list">${S.goals.map(g => {
    const ms = goalMs(g.id), pct = ms / (g.targetHours * 3600000), n = projectsOf(g.id).length, p = goalPlan(g, ms);
    return `<button class="row" data-action="open-goal" data-id="${g.id}">
      <div class="row-main"><b>${esc(g.name)}</b><span>${fmtHours(ms)} of ${g.targetHours}h · ${p.perDay ? `${fmtPlan(p.perDay)}/day` : `${n} project${n === 1 ? '' : 's'}`}</span>
        <div class="bar"><i style="width:${clamp01(pct) * 100}%;background:${g.color}"></i></div></div>
      <span class="pct">${Math.round(clamp01(pct) * 100)}%</span></button>`;
  }).join('')}</div><p class="hint">Tap a goal to add projects and tasks.</p>`;
}

function viewGoal(id) {
  const g = goal(id);
  const head = (title, right = '<span></span>') => `<header class="bar-h"><button class="icon-b" data-action="back" aria-label="Back">${ICON.back}</button><h2>${title}</h2>${right}</header>`;
  if (!g) return head('Goal');
  const ms = goalMs(id), pct = ms / (g.targetHours * 3600000), ps = projectsOf(id), p = goalPlan(g, ms);
  const dates = p.deadline
    ? `${shortDate(p.start)} → ${shortDate(p.deadline)} · ${p.totalDays} day${p.totalDays === 1 ? '' : 's'}`
    : `${p.start > dayKey(Date.now()) ? 'Starts' : 'Started'} ${shortDate(p.start)} · no deadline`;
  return head('Goal', `<button class="icon-b" data-action="edit-goal" data-id="${id}" aria-label="Edit goal">${ICON.edit}</button>`) + `
    <section class="hero"><div class="hero-glow" style="--c:${g.color}"></div><div class="hero-col">
      <h1 class="g-title">${esc(g.name)}</h1>
      <p class="g-dates">${dates}</p>
      <p class="muted sm">${goalPace(g, ms) || 'Keep showing up. It compounds.'}</p>
      <div class="g-nums"><b>${fmtHours(ms)}</b><span>/ ${g.targetHours}h</span><em>${Math.round(clamp01(pct) * 100)}%</em></div>
      <div class="bar lg"><i style="width:${clamp01(pct) * 100}%"></i></div></div></section>
    ${planTiles(g, ms)}
    <div class="sec-h"><h3>Projects</h3><button class="link" data-action="new-project" data-goal="${id}">+ Add project</button></div>
    ${ps.length ? ps.map(projectCard).join('') : empty(ICON.spark, 'Add your first project', 'Projects are the pieces of this goal you actually work on.', 'Add project', 'new-project', `data-goal="${id}"`)}`;
}
function projectCard(p) {
  const tasks = S.tasks.filter(t => t.projectId === p.id), done = tasks.filter(t => t.done).length, open = !!ui.openProj[p.id];
  const wk = sumWhere(s => s.projectId === p.id && s.start >= weekStart());
  return `<div class="pcard"><div class="pcard-h"><span class="pdot lg" style="background:${p.color}"></span>
      <button class="row-main" data-action="toggle-proj" data-id="${p.id}"><b>${esc(p.name)}</b>
        <span>${fmtHours(projectMs(p.id))} total · ${fmtDur(wk)} this week${tasks.length ? ` · ${done}/${tasks.length} tasks` : ''}</span></button>
      <button class="icon-b sm solid" data-action="start-proj" data-id="${p.id}" aria-label="Start timer">${ICON.play}</button></div>
    ${open ? `<div class="tasks">${tasks.map(t => `<div class="task ${t.done ? 'done' : ''}">
          <button class="tick" data-action="task-toggle" data-id="${t.id}" aria-label="Toggle task">${t.done ? ICON.check : ''}</button>
          <span>${esc(t.title)}</span><button class="icon-b xs" data-action="task-del" data-id="${t.id}" aria-label="Delete task">${ICON.x}</button></div>`).join('')}
        <form class="task-add" data-form="task" data-proj="${p.id}" autocomplete="off"><input name="title" maxlength="80" placeholder="Add a task…">
          <button class="icon-b sm solid" type="submit" aria-label="Add task">${ICON.plus}</button></form>
        <div class="pcard-f"><button class="link" data-action="edit-project" data-id="${p.id}">Edit project</button></div></div>`
      : `<button class="pcard-more" data-action="toggle-proj" data-id="${p.id}">${tasks.length ? 'Show tasks' : 'Add tasks'} ${ICON.chev}</button>`}
  </div>`;
}

/* ---------- focus (timer + manual log) ---------- */
function viewFocus() {
  const head = `<header class="bar-h"><button class="icon-b" data-action="back" aria-label="Back">${ICON.back}</button><h2>Focus</h2><span></span></header>`;
  if (S.timer) return head + focusRunning();
  const seg = `<div class="seg-wrap"><div class="seg">${[['timer', 'Timer'], ['log', 'Log manually']].map(([m, l]) =>
    `<button class="${ui.focusMode === m ? 'on' : ''}" data-action="focus-mode" data-mode="${m}">${l}</button>`).join('')}</div></div>`;
  if (!S.projects.length) return head + empty(ICON.spark, 'Create a project first', 'Every session belongs to a project, like "Portfolio website" or "Maths practice".', 'New project', 'new-project');
  if (ui.focusMode === 'log') {
    const now = new Date();
    return head + seg + `<form class="stack" data-form="log" autocomplete="off">
      <p class="h-q">What did you work on?</p>${projectPicker()}
      <div class="grid2" style="margin-top:8px"><label class="field"><span>Date</span><input type="date" name="date" value="${dayKey(Date.now())}" max="${dayKey(Date.now())}"></label>
        <label class="field"><span>Started at</span><input type="time" name="time" value="${pad(Math.max(0, now.getHours() - 1))}:${pad(now.getMinutes())}"></label></div>
      <div class="grid2"><label class="field"><span>Hours</span><input type="number" name="h" min="0" max="23" value="1" inputmode="numeric"></label>
        <label class="field"><span>Minutes</span><input type="number" name="m" min="0" max="59" value="0" inputmode="numeric"></label></div>
      <label class="field"><span>Note <em>(optional)</em></span><textarea name="note" rows="2" maxlength="200" placeholder="What did you get done?"></textarea></label>
      <button class="btn primary" type="submit">Save session</button></form>`;
  }
  return head + seg + `<form class="stack" data-form="start" novalidate>
    <p class="h-q">What are you working on?</p>${projectPicker()}
    <p class="h-q" style="margin-top:10px">Session length</p>
    <div class="chips">${[[0, 'Open'], [25, '25m'], [45, '45m'], [60, '1h'], [90, '1.5h'], ['custom', 'Custom']].map(([m, l]) =>
      `<label class="chip"><input type="radio" name="target" value="${m}" ${m === ui.sessLen ? 'checked' : ''}><b>${l}</b></label>`).join('')}</div>
    <div class="custom-len" data-custom-len ${ui.sessLen === 'custom' ? '' : 'hidden'}>
      <div class="dur-in">
        <label><input class="inline" type="number" inputmode="numeric" min="0" max="23" step="1" name="ch" value="${ui.customH}" aria-label="Custom hours"><span>h</span></label>
        <label><input class="inline" type="number" inputmode="numeric" min="0" max="59" step="1" name="cm" value="${ui.customM}" aria-label="Custom minutes"><span>m</span></label>
      </div>
      <span class="muted sm">Any length under 24 hours</span>
    </div>
    <div class="sticky-cta"><button class="btn primary" type="submit">${ICON.play} Start focus</button></div></form>`;
}
function focusPct() {
  const t = S.timer, el = timerElapsed();
  return t.targetMin ? el / (t.targetMin * 60000) : (el % 3600000) / 3600000;
}
function focusSub() {
  const t = S.timer;
  if (!t) return '';
  if (t.pausedAt) return 'Paused';
  if (t.targetMin) { const left = t.targetMin * 60000 - timerElapsed(); return left > 0 ? `${fmtDur(left + 59999)} left` : 'Target reached 🎉'; }
  return `Started ${fmtTime(t.startedAt)}`;
}
function focusRunning() {
  const t = S.timer, p = project(t.projectId), g = p && goal(p.goalId);
  const size = Math.min(264, window.innerWidth - 80);
  return `<div class="focus-run"><div class="focus-glow ${t.pausedAt ? 'paused' : ''}"></div>
    <span class="chip-tag"><i style="background:${p?.color}"></i>${esc(p?.name || '')}</span>
    <p class="muted sm" style="margin-bottom:14px">${esc(g?.name || '')}</p>
    ${ring(focusPct(), size, 'focus', `<div class="clock" data-live="timer">${fmtClock(timerElapsed())}</div><span class="muted sm" data-live="focus-sub">${focusSub()}</span>`)}
    <div class="focus-actions">
      <button class="round-b" data-action="timer-discard"><i>${ICON.x}</i>Discard</button>
      <button class="round-b main" data-action="timer-toggle"><i>${t.pausedAt ? ICON.play : ICON.pause}</i>${t.pausedAt ? 'Resume' : 'Pause'}</button>
      <button class="round-b" data-action="timer-finish"><i>${ICON.check}</i>Finish</button>
    </div>
    <p class="hint">You can close the app. The timer keeps counting.</p></div>`;
}

/* ---------- stats ---------- */
function rangeBuckets(r) {
  const now = Date.now(), out = [];
  if (r === 'week') for (let i = 6; i >= 0; i--) { const f = startOfDay(addDays(now, -i)); out.push({ from: f, to: addDays(f, 1), label: WD[new Date(f).getDay()] }); }
  else if (r === 'month') for (let i = 29; i >= 0; i--) { const f = startOfDay(addDays(now, -i)); out.push({ from: f, to: addDays(f, 1), label: i % 5 === 0 ? String(new Date(f).getDate()) : '' }); }
  else { const d = new Date(now); for (let i = 11; i >= 0; i--) { const f = new Date(d.getFullYear(), d.getMonth() - i, 1).getTime(); out.push({ from: f, to: new Date(d.getFullYear(), d.getMonth() - i + 1, 1).getTime(), label: MO[new Date(f).getMonth()] }); } }
  const ss = allSessions();
  out.forEach(b => { b.ms = ss.reduce((a, s) => (s.start >= b.from && s.start < b.to ? a + s.ms : a), 0); });
  return out;
}
function barChart(b) {
  const W = 320, H = 156, pt = 18, pb = 20, n = b.length, gap = n > 14 ? 3 : 9;
  const bw = (W - gap * (n - 1)) / n, max = Math.max(3600000, ...b.map(x => x.ms));
  const bars = b.map((x, i) => {
    const h = x.ms ? Math.max(4, (x.ms / max) * (H - pt - pb)) : 3, X = i * (bw + gap), Y = H - pb - h, cur = i === n - 1;
    return `<rect x="${X}" y="${Y}" width="${bw}" height="${h}" rx="${Math.min(6, bw / 2)}" class="${cur ? 'b-cur' : x.ms ? 'b-on' : 'b-off'}"/>`
      + (x.label ? `<text x="${X + bw / 2}" y="${H - 5}">${x.label}</text>` : '')
      + (n <= 12 && x.ms ? `<text class="v" x="${X + bw / 2}" y="${Y - 5}">${fmtHours(x.ms)}</text>` : '');
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}"><line class="b-axis" x1="0" x2="${W}" y1="${H - pb + .5}" y2="${H - pb + .5}"/>${bars}</svg>`;
}
function heatmap() {
  const m = byDay(), weeks = 18, start = addDays(weekStart(), -(weeks - 1) * 7), target = S.profile.dailyTargetMin * 60000, now = Date.now();
  let cols = '';
  for (let w = 0; w < weeks; w++) {
    let cells = '';
    for (let d = 0; d < 7; d++) {
      const ts = addDays(start, w * 7 + d), v = m[dayKey(ts)] || 0;
      const lv = ts > now ? 'f' : v <= 0 ? 0 : v < target * 0.25 ? 1 : v < target * 0.5 ? 2 : v < target ? 3 : 4;
      cells += `<i class="l${lv}" title="${dayKey(ts)}: ${fmtDur(v)}"></i>`;
    }
    cols += `<div class="hm-col">${cells}</div>`;
  }
  return `<div class="hm">${cols}</div><div class="hm-legend"><span>Less</span><i></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i><span>More</span></div>`;
}
function viewStats() {
  const r = ui.statsRange, b = rangeBuckets(r), from = b[0].from, now = Date.now();
  const total = b.reduce((a, x) => a + x.ms, 0);
  const prevFrom = r === 'week' ? addDays(from, -7) : r === 'month' ? addDays(from, -30) : new Date(new Date(from).getFullYear() - 1, new Date(from).getMonth(), 1).getTime();
  const prev = sumWhere(s => s.start >= prevFrom && s.start < from);
  const days = Math.max(1, Math.ceil((now - from) / DAY));
  const best = b.reduce((m, x) => (x.ms > m.ms ? x : m), b[0]);
  const change = prev ? Math.round(((total - prev) / prev) * 100) : null;
  const unit = { week: 'week', month: '30 days', year: 'year' }[r];
  const bestLabel = !best.ms ? '' : r === 'year' ? MO[new Date(best.from).getMonth()] : fmtDate(best.from);

  const per = {};
  allSessions().forEach(s => { if (s.start >= from) per[s.projectId] = (per[s.projectId] || 0) + s.ms; });
  const rows = Object.entries(per).sort((a, c) => c[1] - a[1]);
  const top = rows[0]?.[1] || 1;
  const recent = S.sessions.slice().sort((a, c) => c.start - a.start).slice(0, 15);

  return `<header class="top"><div><p class="muted sm">Your progress</p><h2>Progress</h2></div></header>
    <div class="seg-wrap"><div class="seg">${[['week', 'Week'], ['month', 'Month'], ['year', 'Year']].map(([k, l]) =>
      `<button class="${r === k ? 'on' : ''}" data-action="range" data-r="${k}">${l}</button>`).join('')}</div></div>
    <div class="tiles">
      <div class="tile"><span>Total focus</span><b>${fmtBig(total)}</b>${change === null ? `<em class="flat">this ${unit}</em>` : `<em class="${change < 0 ? 'down' : change === 0 ? 'flat' : ''}">${change > 0 ? '▲' : change < 0 ? '▼' : ''} ${Math.abs(change)}% vs last ${unit}</em>`}</div>
      <div class="tile"><span>Daily average</span><b>${fmtDur(total / days)}</b><em class="flat">over ${days} day${days === 1 ? '' : 's'}</em></div>
      <div class="tile"><span>Best ${r === 'year' ? 'month' : 'day'}</span><b>${best.ms ? fmtBig(best.ms) : '–'}</b><em class="flat">${bestLabel || 'no data yet'}</em></div>
      <div class="tile"><span>Streak</span><b>${streak()} day${streak() === 1 ? '' : 's'}</b><em class="flat">best ever: ${bestStreak()}</em></div>
    </div>
    <div class="card"><div class="card-h"><h3>Focus hours</h3><span>${r === 'year' ? 'last 12 months' : `last ${b.length} days`}</span></div>${barChart(b)}</div>
    <div class="card"><div class="card-h"><h3>By project</h3><span>this ${unit}</span></div>
      ${rows.length ? `<div class="share">${rows.map(([pid, ms]) => {
        const p = project(pid);
        return `<div class="share-r"><div class="share-t"><b><span class="pdot" style="background:${p?.color || '#666'}"></span>${esc(p?.name || 'Deleted')}</b><span>${fmtDur(ms)} · ${Math.round(ms / (total || 1) * 100)}%</span></div>
          <div class="bar"><i style="width:${(ms / top) * 100}%;background:${p?.color || '#666'}"></i></div></div>`;
      }).join('')}</div>` : `<p class="hint" style="margin:0">Nothing tracked in this period yet.</p>`}</div>
    <div class="card"><div class="card-h"><h3>Consistency</h3><span>last 18 weeks</span></div>${heatmap()}</div>
    <div class="sec-h"><h3>Recent sessions</h3></div>
    ${recent.length ? `<div class="list">${recent.map(s => sessionRow(s, true)).join('')}</div>`
      : empty(ICON.clock, 'No sessions yet', 'Start the timer or log time manually and your charts will come alive.', '', '')}`;
}

/* ---------- settings ---------- */
function viewSettings() {
  const tH = Math.floor(S.profile.dailyTargetMin / 60), tM = S.profile.dailyTargetMin % 60;
  return `<header class="top"><div><p class="muted sm">Make it yours</p><h2>Settings</h2></div></header>
    <p class="group-l">Profile</p>
    <div class="list">
      <label class="row field-row"><div class="row-main"><b>Name</b></div>
        <input class="inline" data-setting="name" maxlength="30" value="${esc(S.profile.name)}" placeholder="Your name"></label>
      <div class="row field-row"><div class="row-main"><b>Daily focus target</b><span>Under 24 hours</span></div>
        <div class="dur-in">
          <label><input class="inline" type="number" inputmode="numeric" min="0" max="23" step="1" data-setting="target-h" value="${tH}" aria-label="Target hours"><span>h</span></label>
          <label><input class="inline" type="number" inputmode="numeric" min="0" max="59" step="1" data-setting="target-m" value="${tM}" aria-label="Target minutes"><span>m</span></label>
        </div></div>
    </div>
    ${installPrompt ? `<p class="group-l">App</p><div class="list"><button class="row" data-action="install"><span class="r-ic">${ICON.phone}</span>
      <div class="row-main"><b>Install on this phone</b><span>Open it from your home screen like any app</span></div></button></div>` : ''}
    <p class="group-l">Your data</p>
    <div class="list">
      <button class="row" data-action="export"><span class="r-ic">${ICON.download}</span><div class="row-main"><b>Back up data</b>
        <span>${S.lastBackup ? `Last backup: ${fmtDate(S.lastBackup)}` : 'Save a file you can restore later'}</span></div></button>
      <label class="row"><span class="r-ic">${ICON.upload}</span><div class="row-main"><b>Restore from backup</b><span>Load a Stride backup file</span></div>
        <input type="file" id="import-file" accept="application/json,.json" hidden></label>
      ${S.sessions.length ? '' : `<button class="row" data-action="demo"><span class="r-ic">${ICON.spark}</span><div class="row-main"><b>Load sample data</b><span>See how the charts look with 2 months of data</span></div></button>`}
      <button class="row" data-action="reset"><span class="r-ic red">${ICON.trash}</span><div class="row-main"><b class="danger-t">Erase everything</b><span>Start again from zero</span></div></button>
    </div>
    <p class="foot">Stride v1.0<br>Everything is stored only on this phone. No account, no internet needed.<br>Back up once a week so you never lose your progress.</p>`;
}

/* =====================================================================
   SHEETS (pop-up forms)
   ===================================================================== */
function goalSheet(id) {
  const g = id ? goal(id) : null, today = dayKey(Date.now());
  const start = g?.startDate || today, hours = g?.targetHours || 100, deadline = g?.deadline || '';
  const pv = planPreview(hours, start, deadline, goalDoneBeforeToday(id));
  openSheet(`<form data-form="goal" data-id="${id || ''}" autocomplete="off" novalidate><h3 class="sheet-t">${g ? 'Edit goal' : 'New goal'}</h3>
    <label class="field"><span>Goal</span><input name="name" maxlength="60" value="${esc(g?.name || '')}" placeholder="e.g. Become a web developer"></label>
    <div class="grid2"><label class="field"><span>Start date</span><input name="start" type="date" ${start >= today ? `min="${today}"` : ''} value="${start}"></label>
      <label class="field"><span>Deadline <em>(optional)</em></span><input name="deadline" type="date" min="${today}" value="${deadline}"></label></div>
    <label class="field"><span>Target hours</span><input name="hours" type="number" min="1" step="1" inputmode="numeric" value="${hours}"></label>
    <p class="plan-preview ${pv.warn ? 'warn' : ''}" data-plan-preview>${pv.text}</p>
    ${colorPicker(g?.color || COLORS[S.goals.length % COLORS.length])}
    <button class="btn primary" type="submit">${g ? 'Save changes' : 'Create goal'}</button>
    ${g ? `<button class="btn text danger-t" type="button" data-action="del-goal" data-id="${id}">Delete goal</button>` : ''}</form>`);
}
function projectSheet(id, goalId) {
  const p = id ? project(id) : null, top = topScreen();
  const gid = p?.goalId || goalId || (top?.type === 'goal' ? top.id : S.goals[0]?.id);
  openSheet(`<form data-form="project" data-id="${id || ''}" autocomplete="off"><h3 class="sheet-t">${p ? 'Edit project' : 'New project'}</h3>
    <label class="field"><span>Project name</span><input name="name" required maxlength="50" value="${esc(p?.name || '')}" placeholder="e.g. Portfolio website"></label>
    ${S.goals.length
      ? `<label class="field"><span>Part of goal</span><select name="goal">${S.goals.map(g => `<option value="${g.id}" ${g.id === gid ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></label>`
      : `<label class="field"><span>Which goal is it for?</span><input name="newGoal" required maxlength="60" placeholder="e.g. Become a web developer"></label>`}
    ${colorPicker(p?.color || COLORS[S.projects.length % COLORS.length])}
    <button class="btn primary" type="submit">${p ? 'Save changes' : 'Create project'}</button>
    ${p ? `<button class="btn text danger-t" type="button" data-action="del-project" data-id="${id}">Delete project</button>` : ''}</form>`);
}
function finishSheet() {
  const t = S.timer, p = project(t.projectId), tasks = S.tasks.filter(x => x.projectId === t.projectId && !x.done);
  openSheet(`<form data-form="finish" autocomplete="off"><div class="sheet-hero"><div class="badge-ok">${ICON.check}</div>
      <h3 class="sheet-t">Nice work!</h3><p class="muted">${fmtDur(timerElapsed())} on <b style="color:var(--text)">${esc(p?.name || '')}</b></p></div>
    <label class="field"><span>What did you get done? <em>(optional)</em></span><textarea name="note" rows="3" maxlength="200" placeholder="e.g. Finished the login page"></textarea></label>
    ${tasks.length ? `<div><p class="group-l" style="margin-top:0">Tick off finished tasks</p><div class="list">${tasks.map(x =>
      `<label class="row pick"><div class="row-main"><b>${esc(x.title)}</b></div><input type="checkbox" name="task" value="${x.id}"><span class="check"></span></label>`).join('')}</div></div>` : ''}
    <button class="btn primary" type="submit">Save session</button>
    <button class="btn text" type="button" data-action="back">Keep going</button></form>`);
}
function sessionSheet(id) {
  const s = S.sessions.find(x => x.id === id);
  if (!s) return;
  const p = project(s.projectId);
  openSheet(`<div class="sheet-hero"><span class="chip-tag"><i style="background:${p?.color || '#666'}"></i>${esc(p?.name || 'Deleted project')}</span>
      <h3 class="big-n">${fmtDur(s.ms)}</h3><p class="muted sm">${fmtDate(s.start)} · ${fmtTime(s.start)}${s.manual ? ' · logged manually' : ''}</p></div>
    <form data-form="session-note" data-id="${id}" autocomplete="off"><label class="field"><span>Note</span><textarea name="note" rows="3" maxlength="200" placeholder="Add a note">${esc(s.note || '')}</textarea></label>
      <button class="btn primary" type="submit">Save note</button></form>
    <button class="btn text danger-t" data-action="del-session" data-id="${id}">Delete session</button>`);
}

/* =====================================================================
   ACTIONS (taps)
   ===================================================================== */
const ACT = {
  back: () => back(),
  tab: el => { ui.tab = el.dataset.tab; render(); window.scrollTo(0, 0); },
  'onb-next': () => { ui.onb++; render(); },
  'onb-skip': () => { ui.onb = 3; render(); },
  'onb-demo': () => { seedDemo(); S.onboarded = true; save(); render(); toast('Sample data loaded. Erase it any time in Settings.'); },

  'open-focus': () => {
    if (!project(ui.pick)) ui.pick = project(S.lastProject) ? S.lastProject : S.projects[0]?.id || null;
    pushLayer({ type: 'focus' });
  },
  'focus-mode': el => { ui.focusMode = el.dataset.mode; render(); },
  'timer-toggle': () => {
    const t = S.timer;
    if (!t) return;
    if (t.pausedAt) { t.pausedMs += Date.now() - t.pausedAt; t.pausedAt = null; } else t.pausedAt = Date.now();
    save(); render();
  },
  'timer-finish': () => finishSheet(),
  'timer-discard': () => confirmSheet('Discard this session?', `${fmtDur(timerElapsed())} of work won't be saved.`, 'Discard', () => { S.timer = null; save(); render(); return 1; }),

  'new-goal': () => goalSheet(),
  'edit-goal': el => goalSheet(el.dataset.id),
  'open-goal': el => pushLayer({ type: 'goal', id: el.dataset.id }),
  'del-goal': el => {
    const id = el.dataset.id, g = goal(id);
    confirmSheet('Delete this goal?', `"${esc(g.name)}", its projects, tasks and all logged hours will be removed. This can't be undone.`, 'Delete goal', () => {
      deleteGoal(id); save();
      const idx = ui.layers.findIndex(l => l.type === 'goal' && l.id === id);
      return idx >= 0 ? ui.layers.length - idx : sheetsOnTop();
    });
  },
  'new-project': el => projectSheet(null, el.dataset.goal),
  'edit-project': el => projectSheet(el.dataset.id),
  'del-project': el => {
    const id = el.dataset.id, p = project(id);
    confirmSheet('Delete this project?', `"${esc(p.name)}", its tasks and logged hours will be removed. This can't be undone.`, 'Delete project', () => { deleteProject(id); save(); render(); return sheetsOnTop(); });
  },
  'toggle-proj': el => { ui.openProj[el.dataset.id] = !ui.openProj[el.dataset.id]; render(); },
  'start-proj': el => {
    if (S.timer) toast('Finish your current session first');
    else startTimer(el.dataset.id, 0);
    pushLayer({ type: 'focus' });
  },
  'task-toggle': el => { const t = S.tasks.find(x => x.id === el.dataset.id); if (t) { t.done = !t.done; t.doneAt = t.done ? Date.now() : null; save(); render(); } },
  'task-del': el => { S.tasks = S.tasks.filter(x => x.id !== el.dataset.id); save(); render(); },

  session: el => (el.dataset.id === 'live' ? ACT['open-focus']() : sessionSheet(el.dataset.id)),
  'del-session': el => confirmSheet('Delete this session?', 'The time will be removed from your stats.', 'Delete', () => {
    S.sessions = S.sessions.filter(s => s.id !== el.dataset.id); save(); render(); return sheetsOnTop();
  }),
  range: el => { ui.statsRange = el.dataset.r; render(); },

  'todo-toggle': el => {
    const t = S.todos.find(x => x.id === el.dataset.id);
    if (!t) return;
    t.done = !t.done; t.doneAt = t.done ? Date.now() : null;
    save(); render();
    if (t.done) toast('Done ✓');
  },
  'todo-edit': el => todoSheet(el.dataset.id),
  'todo-del': el => {
    S.todos = S.todos.filter(x => x.id !== el.dataset.id); save();
    if (el.closest('.sheet')) back();
    render(); toast('Deleted');
  },
  'todo-show-done': () => { ui.showDone = !ui.showDone; render(); },
  'todo-day': el => { ui.todoDay = el.dataset.day; render(); },
  'todo-week': el => {
    const cur = new Date((ui.todoDay || dayKey(Date.now())) + 'T00:00').getTime();
    ui.todoDay = dayKey(addDays(cur, +el.dataset.step)); render();
  },
  'todo-carry': () => {
    const today = dayKey(Date.now());
    const late = S.todos.filter(t => !t.done && t.date < today);
    late.forEach(t => { t.date = today; });
    save(); render(); toast(`Moved ${late.length} item${late.length === 1 ? '' : 's'} to today`);
  },
  'todo-clear': () => {
    const day = ui.todoDay || dayKey(Date.now());
    const n = S.todos.filter(t => t.done && t.date === day).length;
    confirmSheet('Clear completed?', `${n} finished item${n === 1 ? '' : 's'} on ${dayLabel(day).toLowerCase() === 'today' ? 'today' : longDate(day)} will be removed.`, 'Clear', () => {
      S.todos = S.todos.filter(t => !(t.done && t.date === day)); save(); render(); return 1;
    });
  },

  export: exportData,
  demo: () => { seedDemo(); save(); render(); toast('Sample data loaded'); },
  reset: () => confirmSheet('Erase everything?', 'All goals, projects and hours will be deleted from this phone. Make a backup first if you might want them back.', 'Erase all data', () => {
    S = defaultState(); ui.onb = 0; ui.tab = 'home'; save(); render(); return sheetsOnTop();
  }),
  install: async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice.catch(() => {}); installPrompt = null; render(); },
  'confirm-ok': () => { const fn = ui.confirm; ui.confirm = null; const n = fn ? fn() : 1; back(n || 1); },
};

/* =====================================================================
   FORMS
   ===================================================================== */
const FORM = {
  setup: (f, d) => {
    S.profile.name = (d.get('name') || '').trim();
    S.profile.dailyTargetMin = +d.get('target') || 120;
    const gname = (d.get('goal') || '').trim();
    if (gname) { const g = newGoal(gname, +d.get('goalHours') || 100); newProject('General', g.id, g.color); }
    S.onboarded = true; save(); render();
    toast(gname ? 'All set! Tap ▶ to start your first session.' : 'All set! Create your first goal to begin.');
  },
  start: (f, d) => {
    const pid = d.get('pick');
    if (!pid) return toast('Pick a project first');
    let target = d.get('target');
    if (target === 'custom') {
      const r = parseHM(d.get('ch'), d.get('cm'), 'Session length');
      if (r.error) return toast(r.error);
      target = r.total;
    } else target = +target || 0;
    startTimer(pid, target); render();
  },
  log: (f, d) => {
    const pid = d.get('pick');
    const ms = ((+d.get('h') || 0) * 60 + (+d.get('m') || 0)) * 60000;
    if (!pid) return toast('Pick a project first');
    if (ms <= 0) return toast('Enter how long you worked');
    const start = new Date(`${d.get('date') || dayKey(Date.now())}T${d.get('time') || '12:00'}`).getTime();
    S.sessions.push({ id: uid(), projectId: pid, start, end: start + ms, ms, note: (d.get('note') || '').trim(), manual: true });
    S.lastProject = pid; save(); back(); toast(`Logged ${fmtDur(ms)}`);
  },
  finish: (f, d) => {
    const t = S.timer, ms = timerElapsed();
    if (!t) return back();
    if (ms < 60000) { S.timer = null; save(); back(2); return toast('Sessions under 1 minute are not saved'); }
    S.sessions.push({ id: uid(), projectId: t.projectId, start: t.startedAt, end: Date.now(), ms, note: (d.get('note') || '').trim() });
    d.getAll('task').forEach(id => { const x = S.tasks.find(k => k.id === id); if (x) { x.done = true; x.doneAt = Date.now(); } });
    S.lastProject = t.projectId; S.timer = null; save();
    back(2); toast(`Saved ${fmtDur(ms)}. Keep it up!`);
  },
  goal: (f, d) => {
    const id = f.dataset.id, old = id ? goal(id) : null, today = dayKey(Date.now());
    const name = (d.get('name') || '').trim();
    if (!name) return toast('Give your goal a name');
    const hours = Number(d.get('hours'));
    if (!Number.isFinite(hours) || hours < 1) return toast('Target hours must be at least 1');
    const start = d.get('start') || old?.startDate || today, deadline = d.get('deadline') || '';
    // Dates are "YYYY-MM-DD" text, which compares correctly.
    // Start: today or later (an existing goal may keep the start date it already had).
    if (start < today && start !== old?.startDate) return toast('Pick today or a future date to start');
    // Deadline: today or later, and not before the start.
    if (deadline && deadline < today) return toast('Pick today or a future date for the deadline');
    if (deadline && deadline < start) return toast('The deadline must be on or after the start date');
    if (deadline && planPreview(hours, start, deadline, goalDoneBeforeToday(id)).warn) return toast('That needs more than 24 hours a day. Pick a later deadline or fewer hours.');
    const vals = { name, targetHours: Math.round(hours), startDate: start, deadline, color: d.get('color') || COLORS[0] };
    if (old) { Object.assign(old, vals); save(); back(); render(); toast('Goal updated'); }
    else { const g = newGoal(vals.name, vals.targetHours, vals.color, vals.deadline, vals.startDate); save(); sheetInto({ type: 'goal', id: g.id }); toast('Goal created. Now add a project.'); }
  },
  project: (f, d) => {
    const id = f.dataset.id, name = d.get('name').trim();
    if (!name) return;
    let gid = d.get('goal');
    if (!gid) { const ng = (d.get('newGoal') || '').trim(); if (!ng) return; gid = newGoal(ng, 100).id; }
    if (id) Object.assign(project(id), { name, goalId: gid, color: d.get('color') || COLORS[0] });
    else { const p = newProject(name, gid, d.get('color')); ui.pick = p.id; ui.openProj[p.id] = true; }
    save(); back(); render(); toast(id ? 'Project updated' : 'Project created');
  },
  task: (f, d) => {
    const title = (d.get('title') || '').trim(), pid = f.dataset.proj;
    if (!title) return;
    S.tasks.push({ id: uid(), projectId: pid, title, done: false, createdAt: Date.now() });
    save(); render();
    $(`form[data-proj="${pid}"] input`)?.focus();
  },
  todo: (f, d) => {
    const title = (d.get('title') || '').trim();
    if (!title) return toast('Write something first');
    const date = ui.todoDay || dayKey(Date.now());
    if (date < dayKey(Date.now())) return toast("You can't add to a day that has passed");
    S.todos.push({ id: uid(), title, done: false, date, createdAt: Date.now(), doneAt: null });
    save(); render();
    $('form[data-form="todo"] input')?.focus();
  },
  'todo-edit': (f, d) => {
    const t = S.todos.find(x => x.id === f.dataset.id), title = (d.get('title') || '').trim(), date = d.get('date') || t?.date;
    if (!t) return back();
    if (!title) return toast('Write something first');
    // moving to another day: only today or later (keeping its current day is always fine)
    if (date !== t.date && date < dayKey(Date.now())) return toast('Pick today or a future day');
    const moved = date !== t.date;
    t.title = title; t.date = date; save();
    back(); render(); toast(moved ? `Moved to ${dayLabel(date) === 'Today' || dayLabel(date) === 'Tomorrow' ? dayLabel(date).toLowerCase() : longDate(date)}` : 'Saved');
  },
  'session-note': (f, d) => {
    const s = S.sessions.find(x => x.id === f.dataset.id);
    if (s) { s.note = (d.get('note') || '').trim(); save(); }
    back(); render(); toast('Note saved');
  },
};

/* ---------------- backup / restore ---------------- */
async function exportData() {
  const name = `stride-backup-${dayKey(Date.now())}.json`;
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  const done = () => { S.lastBackup = Date.now(); save(); render(); };
  // On phones, the share sheet lets you send it to Google Drive, WhatsApp, email…
  if (navigator.canShare && navigator.canShare({ files: [file] }) && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try { await navigator.share({ files: [file], title: 'Stride backup' }); done(); toast('Backup shared'); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  done(); toast('Backup saved to your Downloads');
}
function importFile(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!Array.isArray(d.sessions) || !Array.isArray(d.goals) || !Array.isArray(d.projects)) throw new Error('bad');
      confirmSheet('Restore this backup?', `It has ${d.goals.length} goals, ${d.projects.length} projects and ${d.sessions.length} sessions. Your current data on this phone will be replaced.`, 'Restore', () => {
        S = normalize({ ...defaultState(), ...d, profile: { ...defaultState().profile, ...(d.profile || {}) }, onboarded: true });
        save(); render(); toast('Backup restored'); return 1;
      }, false);
    } catch (e) { toast('That file is not a Stride backup'); }
  };
  r.readAsText(file);
}

/* ---------------- sample data ---------------- */
function seedDemo() {
  let a = 20261107;
  const rnd = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const now = Date.now();
  const g1 = newGoal('Become a web developer', 300, COLORS[0], dayKey(addDays(now, 120)), dayKey(addDays(now, -75)));
  const g2 = newGoal('Crack the GATE exam', 250, COLORS[1], dayKey(addDays(now, 210)), dayKey(addDays(now, -60)));
  const g3 = newGoal('Read 12 books this year', 60, COLORS[3], '', dayKey(addDays(now, -40)));
  const ps = [
    newProject('Portfolio website', g1.id, COLORS[0]), newProject('JavaScript course', g1.id, COLORS[2]),
    newProject('React to-do app', g1.id, COLORS[5]), newProject('Maths practice', g2.id, COLORS[1]),
    newProject('Mock tests', g2.id, COLORS[4]), newProject('Reading', g3.id, COLORS[3]),
  ];
  const tasks = [[0, 'Design the home section', true], [0, 'Add projects page', true], [0, 'Make it mobile friendly', false], [0, 'Deploy on GitHub Pages', false],
    [1, 'Arrays & objects', true], [1, 'Promises and async/await', false], [2, 'Set up Vite project', true], [2, 'Add local storage', false],
    [3, 'Linear algebra revision', true], [3, 'Probability problems', false], [4, 'Full mock test #3', false]];
  tasks.forEach(([i, title, done]) => S.tasks.push({ id: uid(), projectId: ps[i].id, title, done, createdAt: now }));
  [['Buy a new notebook', false, 0], ['Call the bank about my card', false, 0], ['Pay the electricity bill', true, 0],
   ['Send invoice to client', false, 1], ['Clean my desk', true, -1], ['Back up phone photos', false, -1]]
    .forEach(([title, done, day], i) => S.todos.push({ id: uid(), title, done, date: dayKey(addDays(now, day)), createdAt: now - i * 60000, doneAt: done ? now : null }));
  const notes = ['', '', 'Good flow today', 'Finished a chapter', 'Fixed a nasty bug', 'Revised notes', 'Practice set done', ''];
  const weights = [3, 3, 2, 3, 1, 2], wsum = weights.reduce((x, y) => x + y);
  const pick = () => { let r = rnd() * wsum; for (let i = 0; i < ps.length; i++) { r -= weights[i]; if (r <= 0) return ps[i]; } return ps[0]; };
  for (let i = 75; i >= 0; i--) {
    if (i > 0 && i < 9 ? false : i > 0 && rnd() < (i > 40 ? 0.35 : 0.18)) continue; // keep a recent streak
    const day = startOfDay(addDays(now, -i)), n = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const ms = (20 + Math.floor(rnd() * 100)) * 60000;
      let start = day + (7 + k * 4 + Math.floor(rnd() * 4)) * 3600000 + Math.floor(rnd() * 60) * 60000;
      if (start + ms > now) { if (i !== 0 || k > 0) continue; start = now - ms - 30 * 60000; if (start < day) continue; }
      S.sessions.push({ id: uid(), projectId: pick().id, start, end: start + ms, ms, note: notes[Math.floor(rnd() * notes.length)] });
    }
  }
  S.lastBackup = now;
}

/* =====================================================================
   EVENTS + LIVE TICK
   ===================================================================== */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = ACT[el.dataset.action];
  if (fn) { e.preventDefault(); fn(el); }
});
document.addEventListener('submit', e => {
  const f = e.target, fn = FORM[f.dataset.form];
  if (!fn) return;
  e.preventDefault();
  fn(f, new FormData(f));
});
document.addEventListener('input', e => {
  if (e.target.form?.dataset.form === 'goal') updatePlanPreview(e.target.form);
});
document.addEventListener('change', e => {
  if (e.target.form?.dataset.form === 'goal') updatePlanPreview(e.target.form);
  const t = e.target;
  if (t.name === 'pick') ui.pick = t.value;
  if (t.name === 'target' && t.form?.dataset.form === 'start') {
    ui.sessLen = t.value === 'custom' ? 'custom' : +t.value;
    const box = $('[data-custom-len]');
    if (box) box.hidden = ui.sessLen !== 'custom';
  }
  if (t.name === 'ch') ui.customH = t.value;
  if (t.name === 'cm') ui.customM = t.value;
  if (t.dataset.setting === 'name') { S.profile.name = t.value.trim(); save(); toast('Name saved'); }
  if (t.dataset.setting === 'target-h' || t.dataset.setting === 'target-m') setDailyTarget();
  if (t.id === 'import-file') { importFile(t.files[0]); t.value = ''; }
});

/* Hours + minutes boxes → total minutes. Must be whole numbers, at least 1 minute, under 24 hours. */
function parseHM(hStr, mStr, what) {
  const h = String(hStr ?? '').trim() === '' ? 0 : Number(hStr);
  const m = String(mStr ?? '').trim() === '' ? 0 : Number(mStr);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || m < 0) return { error: 'Use whole numbers for hours and minutes' };
  if (m > 59) return { error: 'Minutes must be between 0 and 59' };
  const total = h * 60 + m;
  if (total >= 24 * 60) return { error: `${what} must be less than 24 hours` };
  if (total < 1) return { error: `${what} must be at least 1 minute` };
  return { total };
}

/* Daily target from Settings */
function setDailyTarget() {
  const hEl = $('[data-setting="target-h"]'), mEl = $('[data-setting="target-m"]');
  const showSaved = () => { hEl.value = Math.floor(S.profile.dailyTargetMin / 60); mEl.value = S.profile.dailyTargetMin % 60; };
  const r = parseHM(hEl.value, mEl.value, 'Daily target');
  if (r.error) { toast(r.error); return showSaved(); }
  const total = r.total;
  S.profile.dailyTargetMin = total; save(); showSaved();
  toast(`Daily target set to ${fmtDur(total * 60000)}`);
}

function tick() {
  if (!S.timer) return;
  const el = timerElapsed(), t = S.timer, today = todayMs(), target = S.profile.dailyTargetMin * 60000;
  $$('[data-live="timer"]').forEach(n => (n.textContent = fmtClock(el)));
  $$('[data-live="timer-short"]').forEach(n => (n.textContent = fmtDur(el)));
  const td = $('[data-live="today"]'); if (td) td.textContent = fmtDur(today);
  const tp = $('[data-live="today-pct"]'); if (tp) tp.textContent = `${Math.round(clamp01(today / target) * 100)}%`;
  const fs = $('[data-live="focus-sub"]'); if (fs) fs.textContent = focusSub();
  setRing('focus', focusPct());
  setRing('today', today / target);
  if (t.targetMin && !t.notified && !t.pausedAt && el >= t.targetMin * 60000) {
    t.notified = true; save();
    if (navigator.vibrate) navigator.vibrate([250, 120, 250, 120, 500]);
    toast('Session target reached. Great work!');
  }
}
setInterval(tick, 1000);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  if (dayKey(Date.now()) !== ui.renderDay && !sheetsOnTop()) render(); else tick();
});
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; if (ui.tab === 'settings' && !topScreen()) render(); });

/* ---------------- start ---------------- */
history.replaceState({ d: 0 }, '');
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
render();
