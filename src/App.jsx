import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  BookOpen, Dumbbell, Utensils, Droplet, Moon, Brain, Briefcase, Coffee, Sun,
  Heart, Music, PenTool, Code2, Target, Check, X, Plus, Calendar as CalendarIcon,
  BarChart3, ListChecks, Clock, Trash2, Pencil, ChevronLeft, ChevronRight,
  Flame, Trophy, StickyNote, Bell, BellOff, Sparkles
} from 'lucide-react';

/* ---------------------------------- tokens ---------------------------------- */
const T = {
  void: '#0A0C10',
  surface: '#14171D',
  raised: '#1C2028',
  line: '#242832',
  ink: '#EDEFF2',
  inkMuted: '#8A8F98',
  inkFaint: '#5B606B',
  signature: '#7FE7C4',
  signatureDim: 'rgba(127,231,196,0.14)',
  danger: '#F87171',
};

const PORTFOLIO_URL_FALLBACK = 'https://marwan-web-dev.vercel.app';
const DEMO_MODE_ENABLED = (() => {
  const rawValue = String(import.meta.env.VITE_DEMO_MODE ?? '').trim().toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(rawValue);
})();

function getPortfolioUrl() {
  const configuredUrl = String(import.meta.env.NEXT_PUBLIC_PORTFOLIO_URL ?? '').trim();
  const candidateUrl = configuredUrl || PORTFOLIO_URL_FALLBACK;

  try {
    const url = new URL(candidateUrl);
    const isSafeProtocol = url.protocol === 'http:' || url.protocol === 'https:';
    return isSafeProtocol ? url.href : PORTFOLIO_URL_FALLBACK;
  } catch {
    return PORTFOLIO_URL_FALLBACK;
  }
}
const inkMuted = '#8A8F98';

const ICONS = { BookOpen, Dumbbell, Utensils, Droplet, Moon, Brain, Briefcase, Coffee, Sun, Heart, Music, PenTool, Code2, Target };
const ICON_KEYS = Object.keys(ICONS);

const COLORS = [
  { name: 'Sky', hex: '#5B9EF6' },
  { name: 'Mint', hex: '#4ADE80' },
  { name: 'Coral', hex: '#F87171' },
  { name: 'Amber', hex: '#FBBF24' },
  { name: 'Violet', hex: '#A78BFA' },
  { name: 'Rose', hex: '#F472B6' },
  { name: 'Cyan', hex: '#22D3EE' },
  { name: 'Tangerine', hex: '#FB923C' },
];

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_LABELS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_LABELS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const MOTIVATION = [
  "Small steps, repeated daily, become momentum.",
  "Show up for the version of you that you're building.",
  "Consistency beats intensity.",
  "One task at a time. That's the whole system.",
  "Progress hides inside ordinary, repeated days.",
  "You don't need a perfect day. You need a done day.",
  "Discipline is choosing what you want most over what feels easiest now.",
  "Today's ring gets drawn one task at a time.",
  "The days you don't feel like it are the ones that count most.",
  "Build the routine. The routine builds you.",
];

/* ---------------------------------- utils ---------------------------------- */
function todayStr(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return todayStr(d);
}
function weekdayOf(dateStr) {
  return new Date(dateStr + 'T00:00:00').getDay();
}
function fmtLongDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${MONTH_LABELS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

const DEFAULT_TASKS = [
  { id: 't1', name: 'Read Book', description: 'Chip away at whatever is on the nightstand.', time: '08:00', days: [0,1,2,3,4,5,6], color: '#5B9EF6', icon: 'BookOpen', reminder: true, createdAt: todayStr() },
  { id: 't2', name: 'Breakfast', description: '', time: '10:00', days: [0,1,2,3,4,5,6], color: '#4ADE80', icon: 'Utensils', reminder: false, createdAt: todayStr() },
  { id: 't3', name: 'Gym', description: 'Push / pull / legs rotation.', time: '17:00', days: [1,3,5], color: '#F87171', icon: 'Dumbbell', reminder: true, createdAt: todayStr() },
];

const STREAK_THRESHOLD = 80;

/* ---------------------------------- storage shim ----------------------------------
   Uses localStorage so the app works as a normal deployed website.
   Swap this out for a real backend (see README) when you add accounts / cloud sync. */
const storage = {
  async get(key) {
    const raw = window.localStorage.getItem(key);
    if (raw === null) throw new Error('not found');
    return { key, value: raw };
  },
  async set(key, value) {
    window.localStorage.setItem(key, value);
    return { key, value };
  },
};

/* ---------------------------------- app ---------------------------------- */
export default function RoutineTracker() {
  const [tasks, setTasks] = useState([]);
  const [completions, setCompletions] = useState({}); // { dateStr: { taskId: { completed, completedAt, note } } }
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState('today');
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [calCursor, setCalCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [noteEditorFor, setNoteEditorFor] = useState(null);
  const [bursts, setBursts] = useState([]);

  /* ---- load ---- */
  useEffect(() => {
    (async () => {
      let t = DEFAULT_TASKS, c = {};
      try { const r = await storage.get('tasks'); if (r) t = JSON.parse(r.value); }
      catch (e) { /* no tasks saved yet, seed defaults */ try { await storage.set('tasks', JSON.stringify(DEFAULT_TASKS)); } catch(_){} }
      try { const r = await storage.get('completions'); if (r) c = JSON.parse(r.value); }
      catch (e) { /* none yet */ }
      setTasks(t); setCompletions(c); setLoaded(true);
    })();
  }, []);

  const persistTasks = useCallback(async (next) => {
    setTasks(next);
    try { await storage.set('tasks', JSON.stringify(next)); } catch (e) { console.error(e); }
  }, []);
  const persistCompletions = useCallback(async (next) => {
    setCompletions(next);
    try { await storage.set('completions', JSON.stringify(next)); } catch (e) { console.error(e); }
  }, []);

  /* ---- derived helpers ---- */
  const tasksForDate = useCallback((dateStr) => {
    const wd = weekdayOf(dateStr);
    return tasks
      .filter(t => t.days.includes(wd) && (!t.createdAt || t.createdAt <= dateStr))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [tasks]);

  const productivityFor = useCallback((dateStr) => {
    const list = tasksForDate(dateStr);
    if (list.length === 0) return null;
    const day = completions[dateStr] || {};
    const done = list.filter(t => day[t.id]?.completed).length;
    return Math.round((done / list.length) * 100);
  }, [tasksForDate, completions]);

  const toggleComplete = (taskId, dateStr, colorHex) => {
    const day = { ...(completions[dateStr] || {}) };
    const wasComplete = !!day[taskId]?.completed;
    day[taskId] = wasComplete
      ? { ...day[taskId], completed: false, completedAt: null }
      : { ...day[taskId], completed: true, completedAt: new Date().toISOString() };
    const next = { ...completions, [dateStr]: day };
    persistCompletions(next);
    if (!wasComplete) {
      const id = Math.random().toString(36).slice(2);
      setBursts(b => [...b, { id, color: colorHex }]);
      setTimeout(() => setBursts(b => b.filter(x => x.id !== id)), 700);
    }
  };

  const saveNote = (taskId, dateStr, note) => {
    const day = { ...(completions[dateStr] || {}) };
    day[taskId] = { ...(day[taskId] || {}), note };
    persistCompletions({ ...completions, [dateStr]: day });
    setNoteEditorFor(null);
  };

  const saveTask = (task) => {
    if (editingTask) {
      persistTasks(tasks.map(t => t.id === task.id ? task : t));
    } else {
      persistTasks([...tasks, { ...task, id: 'task_' + Math.random().toString(36).slice(2), createdAt: todayStr() }]);
    }
    setShowModal(false); setEditingTask(null);
  };
  const deleteTask = (id) => {
    persistTasks(tasks.filter(t => t.id !== id));
  };

  /* ---- stats ---- */
  const stats = useMemo(() => {
    if (!loaded) return null;
    const today = todayStr();
    const last7 = [...Array(7)].map((_, i) => addDays(today, -6 + i));
    const weekPct = last7.map(d => ({ date: d, pct: productivityFor(d) }));
    const validWeek = weekPct.filter(w => w.pct !== null);
    const weeklyAvg = validWeek.length ? Math.round(validWeek.reduce((s, w) => s + w.pct, 0) / validWeek.length) : null;

    const last30 = [...Array(30)].map((_, i) => addDays(today, -29 + i));
    const validMonth = last30.map(d => productivityFor(d)).filter(p => p !== null);
    const monthlyAvg = validMonth.length ? Math.round(validMonth.reduce((s, p) => s + p, 0) / validMonth.length) : null;

    // streaks over last 120 days
    const window_ = [...Array(120)].map((_, i) => addDays(today, -119 + i));
    const dayResults = window_.map(d => productivityFor(d));
    let longest = 0, run = 0;
    dayResults.forEach(p => { if (p !== null && p >= STREAK_THRESHOLD) { run++; longest = Math.max(longest, run); } else if (p !== null) { run = 0; } });
    let current = 0;
    for (let i = dayResults.length - 1; i >= 0; i--) {
      const p = dayResults[i];
      if (p === null) continue;
      if (p >= STREAK_THRESHOLD) current++; else break;
    }

    // per-task consistency
    const taskStats = tasks.map(t => {
      let scheduled = 0, done = 0;
      window_.forEach(d => { if (weekdayOf(d) !== undefined && tasksForDate(d).some(x => x.id === t.id)) { scheduled++; if (completions[d]?.[t.id]?.completed) done++; } });
      return { task: t, scheduled, done, rate: scheduled ? done / scheduled : 0 };
    }).filter(s => s.scheduled > 0);
    const mostConsistent = [...taskStats].sort((a, b) => b.rate - a.rate)[0];
    const mostCompleted = [...taskStats].sort((a, b) => b.done - a.done)[0];

    // best day of week
    const byWeekday = [0,1,2,3,4,5,6].map(wd => {
      const days = window_.filter(d => weekdayOf(d) === wd);
      const vals = days.map(d => productivityFor(d)).filter(p => p !== null);
      return { wd, avg: vals.length ? Math.round(vals.reduce((s,v)=>s+v,0)/vals.length) : null };
    }).filter(x => x.avg !== null);
    const bestDay = [...byWeekday].sort((a,b) => b.avg - a.avg)[0];

    return { weekPct, weeklyAvg, monthlyAvg, longest, current, mostConsistent, mostCompleted, bestDay };
  }, [loaded, tasks, completions, productivityFor, tasksForDate]);

  const todayList = tasksForDate(selectedDate === todayStr() ? todayStr() : selectedDate);
  const todayPct = productivityFor(todayStr());

  if (!loaded) {
    return <div style={{ background: T.void, minHeight: '100vh' }} className="flex items-center justify-center">
      <div style={{ color: inkMuted }} className="text-sm tracking-wide">Loading your routine…</div>
    </div>;
  }

  return (
    <div style={{ background: T.void, color: T.ink, minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif" }} className="w-full pb-24">
      <GlobalStyle />
      {DEMO_MODE_ENABLED && <DemoNotice />}
      <BurstLayer bursts={bursts} />

      {view === 'today' && (
        <TodayView
          dateStr={todayStr()}
          list={tasksForDate(todayStr())}
          pct={todayPct}
          completions={completions[todayStr()] || {}}
          onToggle={(taskId, color) => toggleComplete(taskId, todayStr(), color)}
          onNote={(taskId) => setNoteEditorFor(taskId)}
        />
      )}

      {view === 'calendar' && (
        <CalendarView
          cursor={calCursor} setCursor={setCalCursor}
          selectedDate={selectedDate} setSelectedDate={setSelectedDate}
          productivityFor={productivityFor}
          tasksForDate={tasksForDate}
          completions={completions}
        />
      )}

      {view === 'stats' && <StatsView stats={stats} />}

      {view === 'tasks' && (
        <TasksView
          tasks={tasks}
          onAdd={() => { setEditingTask(null); setShowModal(true); }}
          onEdit={(t) => { setEditingTask(t); setShowModal(true); }}
          onDelete={deleteTask}
        />
      )}

      <BottomNav view={view} setView={setView} onAdd={() => { setEditingTask(null); setShowModal(true); }} />

      {showModal && (
        <TaskModal
          initial={editingTask}
          onCancel={() => { setShowModal(false); setEditingTask(null); }}
          onSave={saveTask}
        />
      )}

      {noteEditorFor && (
        <NoteModal
          taskName={tasks.find(t => t.id === noteEditorFor)?.name}
          initial={completions[todayStr()]?.[noteEditorFor]?.note || ''}
          onCancel={() => setNoteEditorFor(null)}
          onSave={(note) => saveNote(noteEditorFor, todayStr(), note)}
        />
      )}
    </div>
  );
}

function DemoNotice() {
  return (
    <div style={{ background: T.surface, borderBottom: `1px solid ${T.line}` }} className="px-4 py-2 text-center">
      <a
        href={getPortfolioUrl()}
        target="_self"
        rel="noreferrer"
        style={{ color: T.signature }}
        className="inline-flex min-h-10 items-center justify-center rounded-md border border-transparent px-2 text-[11px] font-medium tracking-wide text-left transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0C10] sm:text-xs"
      >
        ← Back to Marwan Web Dev
      </a>
    </div>
  );
}

/* ---------------------------------- global style ---------------------------------- */
function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap');
      .font-display { font-family: 'Space Grotesk', sans-serif; }
      .font-mono { font-family: 'JetBrains Mono', monospace; }
      @keyframes pop { 0% { transform: scale(1); } 40% { transform: scale(1.18); } 100% { transform: scale(1); } }
      .pop-anim { animation: pop 0.35s cubic-bezier(.34,1.56,.64,1); }
      @keyframes flyOut {
        0% { transform: translate(0,0) scale(1); opacity: 1; }
        100% { transform: translate(var(--dx), var(--dy)) scale(0.3); opacity: 0; }
      }
      .burst-dot { animation: flyOut 0.65s ease-out forwards; }
      @keyframes ringGrow { from { stroke-dashoffset: 283; } }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      .fade-up { animation: fadeUp 0.3s ease-out; }
      ::-webkit-scrollbar { width: 0px; height: 0px; }
      * { -webkit-tap-highlight-color: transparent; }
    `}</style>
  );
}

function BurstLayer({ bursts }) {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 60 }}>
      {bursts.map(b => (
        <div key={b.id} style={{ position: 'absolute', top: '40%', left: '50%' }}>
          {[...Array(8)].map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const dx = Math.cos(angle) * 60, dy = Math.sin(angle) * 60;
            return <span key={i} className="burst-dot" style={{ position: 'absolute', width: 6, height: 6, borderRadius: 999, background: b.color, '--dx': `${dx}px`, '--dy': `${dy}px` }} />;
          })}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------- today view ---------------------------------- */
function TodayView({ dateStr, list, pct, completions, onToggle, onNote }) {
  const d = new Date(dateStr + 'T00:00:00');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const msg = MOTIVATION[hashStr(dateStr) % MOTIVATION.length];
  const doneCount = list.filter(t => completions[t.id]?.completed).length;

  const ringStyle = useMemo(() => {
    if (list.length === 0) return { background: T.raised };
    let stops = []; let acc = 0;
    list.forEach((t) => {
      const slice = 100 / list.length;
      const isDone = completions[t.id]?.completed;
      stops.push(`${isDone ? t.color : '#20242C'} ${acc}% ${acc + slice}%`);
      acc += slice;
    });
    return { background: `conic-gradient(${stops.join(',')})` };
  }, [list, completions]);

  return (
    <div className="max-w-md mx-auto px-5 pt-8">
      <div className="flex items-center justify-between mb-1">
        <div>
          <div style={{ color: inkMuted }} className="text-xs tracking-widest uppercase font-medium">{DAY_LABELS_FULL[d.getDay()]}, {MONTH_LABELS[d.getMonth()]} {d.getDate()}</div>
          <h1 className="font-display text-2xl font-semibold mt-0.5">{greeting}</h1>
        </div>
        <Sparkles size={18} color={T.signature} />
      </div>
      <p style={{ color: inkMuted }} className="text-sm mb-6 fade-up">{msg}</p>

      <div className="flex flex-col items-center mb-8">
        <div style={{ width: 168, height: 168, borderRadius: '50%', padding: 10, ...ringStyle }} className="flex items-center justify-center">
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: T.void }} className="flex flex-col items-center justify-center">
            <span className="font-mono text-3xl font-semibold" style={{ color: T.signature }}>{pct === null ? '—' : `${pct}%`}</span>
            <span style={{ color: inkMuted }} className="text-[11px] mt-1 tracking-wide">{doneCount}/{list.length} done</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {list.length === 0 && (
          <div style={{ background: T.surface, border: `1px solid ${T.line}` }} className="rounded-2xl p-6 text-center">
            <p style={{ color: inkMuted }} className="text-sm">Nothing scheduled today. Add a routine to get started.</p>
          </div>
        )}
        {list.map(t => {
          const isDone = !!completions[t.id]?.completed;
          const Icon = ICONS[t.icon] || Target;
          const hasNote = !!completions[t.id]?.note;
          return (
            <div key={t.id} style={{ background: T.surface, border: `1px solid ${T.line}`, opacity: isDone ? 0.72 : 1 }} className="rounded-2xl p-4 flex items-center gap-3 transition-opacity duration-300">
              <div style={{ background: t.color + '22', color: t.color }} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium text-[15px] ${isDone ? 'line-through' : ''}`} style={{ color: isDone ? inkMuted : T.ink }}>{t.name}</span>
                  {hasNote && <StickyNote size={12} color={inkMuted} />}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock size={11} color={inkMuted} />
                  <span className="font-mono text-[11px]" style={{ color: inkMuted }}>{fmtTime(t.time)}</span>
                </div>
              </div>
              <button onClick={() => onNote(t.id)} className="p-1.5 rounded-lg" style={{ color: inkMuted }}>
                <StickyNote size={15} />
              </button>
              <button
                onClick={() => onToggle(t.id, t.color)}
                className={isDone ? 'pop-anim' : ''}
                style={{
                  width: 30, height: 30, borderRadius: 999, flexShrink: 0,
                  border: `2px solid ${isDone ? t.color : T.line}`,
                  background: isDone ? t.color : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                {isDone && <Check size={16} color="#0A0C10" strokeWidth={3} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------- calendar view ---------------------------------- */
function CalendarView({ cursor, setCursor, selectedDate, setSelectedDate, productivityFor, tasksForDate, completions }) {
  const { y, m } = cursor;
  const firstOfMonth = new Date(y, m, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dateStrFor = (day) => `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const selList = tasksForDate(selectedDate);
  const selCompletions = completions[selectedDate] || {};
  const selPct = productivityFor(selectedDate);
  const missed = selList.filter(t => !selCompletions[t.id]?.completed);
  const done = selList.filter(t => selCompletions[t.id]?.completed);

  return (
    <div className="max-w-md mx-auto px-5 pt-8">
      <h1 className="font-display text-2xl font-semibold mb-5">History</h1>

      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCursor(m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 })} style={{ color: inkMuted }}><ChevronLeft size={20} /></button>
        <span className="font-display font-medium text-[15px]">{MONTH_LABELS[m]} {y}</span>
        <button onClick={() => setCursor(m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 })} style={{ color: inkMuted }}><ChevronRight size={20} /></button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((d, i) => <div key={i} className="text-center text-[10px] tracking-wider" style={{ color: T.inkFaint }}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 mb-6">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const ds = dateStrFor(day);
          const pct = productivityFor(ds);
          const isSelected = ds === selectedDate;
          const isToday = ds === todayStr();
          const alpha = pct === null ? 0 : Math.max(0.12, pct / 100);
          return (
            <button
              key={i}
              onClick={() => setSelectedDate(ds)}
              style={{
                aspectRatio: '1', borderRadius: 10,
                background: pct === null ? 'transparent' : `rgba(127,231,196,${alpha * 0.55})`,
                border: isSelected ? `1.5px solid ${T.signature}` : isToday ? `1px solid ${T.inkFaint}` : '1px solid transparent',
              }}
              className="flex items-center justify-center text-[12px] font-mono"
            >
              {day}
            </button>
          );
        })}
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.line}` }} className="rounded-2xl p-5 fade-up">
        <div className="flex items-center justify-between mb-4">
          <span className="font-display font-medium">{fmtLongDate(selectedDate)}</span>
          <span className="font-mono text-lg font-semibold" style={{ color: T.signature }}>{selPct === null ? '—' : `${selPct}%`}</span>
        </div>
        {selList.length === 0 ? (
          <p className="text-sm" style={{ color: inkMuted }}>No tasks were scheduled this day.</p>
        ) : (
          <>
            <div className="text-xs mb-2 tracking-wide" style={{ color: inkMuted }}>COMPLETED · {done.length}/{selList.length}</div>
            <div className="space-y-1.5 mb-4">
              {done.map(t => <TaskChip key={t.id} task={t} state="done" />)}
              {done.length === 0 && <span className="text-xs" style={{ color: T.inkFaint }}>None yet</span>}
            </div>
            {missed.length > 0 && (
              <>
                <div className="text-xs mb-2 tracking-wide" style={{ color: inkMuted }}>MISSED</div>
                <div className="space-y-1.5">
                  {missed.map(t => <TaskChip key={t.id} task={t} state="missed" />)}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
function TaskChip({ task, state }) {
  const Icon = ICONS[task.icon] || Target;
  return (
    <div className="flex items-center gap-2">
      <div style={{ width: 22, height: 22, borderRadius: 7, background: task.color + '22', color: task.color }} className="flex items-center justify-center shrink-0">
        <Icon size={12} />
      </div>
      <span className="text-sm" style={{ color: state === 'missed' ? inkMuted : T.ink, textDecoration: state === 'missed' ? 'line-through' : 'none' }}>{task.name}</span>
      <span className="font-mono text-[10px] ml-auto" style={{ color: T.inkFaint }}>{fmtTime(task.time)}</span>
    </div>
  );
}

/* ---------------------------------- stats view ---------------------------------- */
function StatsView({ stats }) {
  if (!stats) return null;
  const { weekPct, weeklyAvg, monthlyAvg, longest, current, mostConsistent, mostCompleted, bestDay } = stats;
  const maxBar = Math.max(20, ...weekPct.map(w => w.pct || 0));

  return (
    <div className="max-w-md mx-auto px-5 pt-8">
      <h1 className="font-display text-2xl font-semibold mb-5">Statistics</h1>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard icon={<Flame size={16} color="#FB923C" />} label="Current streak" value={`${current}d`} />
        <StatCard icon={<Trophy size={16} color="#FBBF24" />} label="Longest streak" value={`${longest}d`} />
        <StatCard icon={<BarChart3 size={16} color={T.signature} />} label="Weekly avg" value={weeklyAvg === null ? '—' : `${weeklyAvg}%`} />
        <StatCard icon={<CalendarIcon size={16} color="#A78BFA" />} label="Monthly avg" value={monthlyAvg === null ? '—' : `${monthlyAvg}%`} />
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.line}` }} className="rounded-2xl p-5 mb-5">
        <div className="text-xs tracking-wide mb-4" style={{ color: inkMuted }}>LAST 7 DAYS</div>
        <div className="flex items-end justify-between gap-2" style={{ height: 110 }}>
          {weekPct.map((w, i) => {
            const d = new Date(w.date + 'T00:00:00');
            const h = w.pct === null ? 4 : Math.max(4, (w.pct / maxBar) * 90);
            return (
              <div key={i} className="flex flex-col items-center flex-1 gap-2">
                <div className="w-full rounded-md flex items-end justify-center" style={{ height: 90 }}>
                  <div style={{ height: h, width: '70%', borderRadius: 6, background: w.pct === null ? T.line : T.signature, opacity: w.date === todayStr() ? 1 : 0.65 }} />
                </div>
                <span className="text-[10px] font-mono" style={{ color: inkMuted }}>{DAY_LABELS[d.getDay()]}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {mostConsistent && (
          <InsightRow icon={mostConsistent.task.icon} color={mostConsistent.task.color} label="Most consistent habit" value={mostConsistent.task.name} sub={`${Math.round(mostConsistent.rate * 100)}% completion rate`} />
        )}
        {mostCompleted && (
          <InsightRow icon={mostCompleted.task.icon} color={mostCompleted.task.color} label="Most completed task" value={mostCompleted.task.name} sub={`${mostCompleted.done} times done`} />
        )}
        {bestDay && (
          <InsightRow icon="Sun" color={T.signature} label="Best performing day" value={DAY_LABELS_FULL[bestDay.wd]} sub={`${bestDay.avg}% average`} />
        )}
        {!mostConsistent && !mostCompleted && (
          <div style={{ background: T.surface, border: `1px solid ${T.line}` }} className="rounded-2xl p-6 text-center">
            <p className="text-sm" style={{ color: inkMuted }}>Complete a few tasks to unlock insights.</p>
          </div>
        )}
      </div>
    </div>
  );
}
function StatCard({ icon, label, value }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.line}` }} className="rounded-2xl p-4">
      <div className="flex items-center gap-1.5 mb-2">{icon}<span className="text-[11px] tracking-wide" style={{ color: inkMuted }}>{label}</span></div>
      <span className="font-mono text-xl font-semibold">{value}</span>
    </div>
  );
}
function InsightRow({ icon, color, label, value, sub }) {
  const Icon = ICONS[icon] || Sun;
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.line}` }} className="rounded-2xl p-4 flex items-center gap-3">
      <div style={{ background: color + '22', color }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"><Icon size={16} /></div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] tracking-wide" style={{ color: inkMuted }}>{label.toUpperCase()}</div>
        <div className="font-medium text-[15px]">{value}</div>
      </div>
      <span className="font-mono text-xs" style={{ color: inkMuted }}>{sub}</span>
    </div>
  );
}

/* ---------------------------------- tasks manage view ---------------------------------- */
function TasksView({ tasks, onAdd, onEdit, onDelete }) {
  const [confirmId, setConfirmId] = useState(null);
  const sorted = [...tasks].sort((a, b) => a.time.localeCompare(b.time));
  return (
    <div className="max-w-md mx-auto px-5 pt-8">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-2xl font-semibold">Your Routines</h1>
        <button onClick={onAdd} style={{ background: T.signature }} className="w-9 h-9 rounded-xl flex items-center justify-center">
          <Plus size={18} color={T.void} />
        </button>
      </div>
      <div className="space-y-3">
        {sorted.map(t => {
          const Icon = ICONS[t.icon] || Target;
          return (
            <div key={t.id} style={{ background: T.surface, border: `1px solid ${T.line}` }} className="rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div style={{ background: t.color + '22', color: t.color }} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"><Icon size={18} /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[15px]">{t.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[11px]" style={{ color: inkMuted }}>{fmtTime(t.time)}</span>
                    <span className="text-[11px]" style={{ color: T.inkFaint }}>· {t.days.length === 7 ? 'Every day' : t.days.map(d => DAY_LABELS[d]).join(' ')}</span>
                    {t.reminder && <Bell size={11} color={inkMuted} />}
                  </div>
                </div>
                <button onClick={() => onEdit(t)} className="p-1.5" style={{ color: inkMuted }}><Pencil size={15} /></button>
                <button onClick={() => setConfirmId(t.id)} className="p-1.5" style={{ color: inkMuted }}><Trash2 size={15} /></button>
              </div>
              {t.description && <p className="text-xs mt-2 pl-[52px]" style={{ color: inkMuted }}>{t.description}</p>}
              {confirmId === t.id && (
                <div className="flex items-center gap-2 mt-3 pl-[52px]">
                  <span className="text-xs" style={{ color: inkMuted }}>Delete this routine?</span>
                  <button onClick={() => { onDelete(t.id); setConfirmId(null); }} className="text-xs px-2 py-1 rounded-lg" style={{ background: T.danger + '22', color: T.danger }}>Delete</button>
                  <button onClick={() => setConfirmId(null)} className="text-xs px-2 py-1 rounded-lg" style={{ color: inkMuted }}>Cancel</button>
                </div>
              )}
            </div>
          );
        })}
        {sorted.length === 0 && (
          <div style={{ background: T.surface, border: `1px solid ${T.line}` }} className="rounded-2xl p-8 text-center">
            <p className="text-sm mb-3" style={{ color: inkMuted }}>No routines yet.</p>
            <button onClick={onAdd} style={{ background: T.signature, color: T.void }} className="px-4 py-2 rounded-xl text-sm font-medium">Create your first routine</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------- task modal ---------------------------------- */
function TaskModal({ initial, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [time, setTime] = useState(initial?.time || '09:00');
  const [days, setDays] = useState(initial?.days || [0,1,2,3,4,5,6]);
  const [color, setColor] = useState(initial?.color || COLORS[0].hex);
  const [icon, setIcon] = useState(initial?.icon || ICON_KEYS[0]);
  const [reminder, setReminder] = useState(initial?.reminder || false);

  const toggleDay = (d) => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());

  const canSave = name.trim().length > 0 && days.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ ...(initial || {}), name: name.trim(), description: description.trim(), time, days, color, icon, reminder });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50 }} className="flex items-end sm:items-center justify-center">
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, maxHeight: '88vh' }} className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-semibold">{initial ? 'Edit Routine' : 'New Routine'}</h2>
          <button onClick={onCancel} style={{ color: inkMuted }}><X size={20} /></button>
        </div>

        <Field label="Name">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Morning walk"
            style={{ background: T.raised, border: `1px solid ${T.line}`, color: T.ink }} className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" />
        </Field>

        <Field label="Description (optional)">
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add a short note" rows={2}
            style={{ background: T.raised, border: `1px solid ${T.line}`, color: T.ink }} className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none" />
        </Field>

        <Field label="Time">
          <input type="time" value={time} onChange={e => setTime(e.target.value)}
            style={{ background: T.raised, border: `1px solid ${T.line}`, color: T.ink, colorScheme: 'dark' }} className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" />
        </Field>

        <Field label="Days of the week">
          <div className="flex gap-2">
            {DAY_LABELS.map((d, i) => (
              <button key={i} onClick={() => toggleDay(i)}
                style={{ background: days.includes(i) ? color : T.raised, color: days.includes(i) ? T.void : inkMuted, border: `1px solid ${days.includes(i) ? color : T.line}` }}
                className="w-9 h-9 rounded-full text-xs font-medium">{d}</button>
            ))}
          </div>
        </Field>

        <Field label="Color">
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c.hex} onClick={() => setColor(c.hex)} style={{ background: c.hex, border: color === c.hex ? `2px solid ${T.ink}` : '2px solid transparent' }} className="w-8 h-8 rounded-full" />
            ))}
          </div>
        </Field>

        <Field label="Icon">
          <div className="grid grid-cols-7 gap-2">
            {ICON_KEYS.map(k => {
              const Ic = ICONS[k];
              const active = icon === k;
              return (
                <button key={k} onClick={() => setIcon(k)}
                  style={{ background: active ? color + '22' : T.raised, color: active ? color : inkMuted, border: `1px solid ${active ? color : T.line}` }}
                  className="aspect-square rounded-xl flex items-center justify-center"><Ic size={16} /></button>
              );
            })}
          </div>
        </Field>

        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-medium flex items-center gap-2">{reminder ? <Bell size={15} /> : <BellOff size={15} color={inkMuted} />} Reminder notification</span>
          <button onClick={() => setReminder(r => !r)} style={{ background: reminder ? T.signature : T.raised, border: `1px solid ${T.line}` }} className="w-11 h-6 rounded-full relative">
            <span style={{ background: reminder ? T.void : inkMuted, left: reminder ? 22 : 3 }} className="absolute top-0.5 w-4 h-4 rounded-full transition-all" />
          </button>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} style={{ background: T.raised, color: inkMuted }} className="flex-1 py-3 rounded-xl text-sm font-medium">Cancel</button>
          <button onClick={handleSave} disabled={!canSave} style={{ background: canSave ? color : T.line, color: canSave ? T.void : inkMuted, opacity: canSave ? 1 : 0.6 }} className="flex-1 py-3 rounded-xl text-sm font-medium">Save routine</button>
        </div>
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div className="mb-4">
      <div className="text-xs tracking-wide mb-2" style={{ color: inkMuted }}>{label.toUpperCase()}</div>
      {children}
    </div>
  );
}

/* ---------------------------------- note modal ---------------------------------- */
function NoteModal({ taskName, initial, onCancel, onSave }) {
  const [note, setNote] = useState(initial);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50 }} className="flex items-end sm:items-center justify-center">
      <div style={{ background: T.surface, border: `1px solid ${T.line}` }} className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6">
        <h2 className="font-display text-lg font-semibold mb-1">Note</h2>
        <p className="text-xs mb-4" style={{ color: inkMuted }}>{taskName}</p>
        <textarea autoFocus value={note} onChange={e => setNote(e.target.value)} rows={4} placeholder="Anything worth remembering about this…"
          style={{ background: T.raised, border: `1px solid ${T.line}`, color: T.ink }} className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none mb-5" />
        <div className="flex gap-3">
          <button onClick={onCancel} style={{ background: T.raised, color: inkMuted }} className="flex-1 py-3 rounded-xl text-sm font-medium">Cancel</button>
          <button onClick={() => onSave(note)} style={{ background: T.signature, color: T.void }} className="flex-1 py-3 rounded-xl text-sm font-medium">Save note</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- bottom nav ---------------------------------- */
function BottomNav({ view, setView, onAdd }) {
  const items = [
    { key: 'today', label: 'Today', icon: Sun },
    { key: 'calendar', label: 'History', icon: CalendarIcon },
    { key: 'add', label: 'Add', icon: Plus, isAdd: true },
    { key: 'stats', label: 'Stats', icon: BarChart3 },
    { key: 'tasks', label: 'Routines', icon: ListChecks },
  ];
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(20,23,29,0.92)', borderTop: `1px solid ${T.line}`, backdropFilter: 'blur(12px)' }} className="z-40">
      <div className="max-w-md mx-auto flex items-center justify-between px-6 py-3">
        {items.map(it => {
          const Icon = it.icon;
          if (it.isAdd) {
            return (
              <button key={it.key} onClick={onAdd} style={{ background: T.signature }} className="w-11 h-11 -mt-6 rounded-full flex items-center justify-center shadow-lg">
                <Icon size={20} color={T.void} />
              </button>
            );
          }
          const active = view === it.key;
          return (
            <button key={it.key} onClick={() => setView(it.key)} className="flex flex-col items-center gap-1 px-2">
              <Icon size={19} color={active ? T.signature : T.inkFaint} />
              <span className="text-[10px]" style={{ color: active ? T.signature : T.inkFaint }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
