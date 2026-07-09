'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useSessionStore } from '@/store/sessionStore';
import { getUserSessions } from '@/lib/firestore';
import { signOutUser } from '@/lib/auth';
import { SESSION_DURATION_MS, DEPARTMENTS } from '@/types';
import type { WorkSession, TaskEntry } from '@/types';
import { TASK_CATEGORIES, MOODS } from '@/types';

/* ─── helpers ─── */
function formatTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
function fmtDuration(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
}
function shortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

type Tab = 'Today' | 'History' | 'Tasks';

/* ─── shared inline style helpers ─── */
const INPUT: React.CSSProperties = {
  width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a',
  borderRadius: '8px', padding: '10px 12px', color: '#fff',
  fontSize: '13px', outline: 'none', boxSizing: 'border-box',
};
const TEXTAREA: React.CSSProperties = {
  ...INPUT, resize: 'vertical', minHeight: '72px', fontFamily: 'inherit',
};
const LABEL: React.CSSProperties = { fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '8px', display: 'block' };

export default function DashboardPage() {
  const router = useRouter();
  const { mimoUser } = useAuthStore();
  const {
    activeSession, isWorking, isOnBreak, remainingMs,
    clockIn, clockOut, startBreak, endBreak, submitWorkLog,
    loadActiveSession, draftTasks, draftSummary, draftMood,
    draftBlockers, draftAchievements,
    setDraftTasks, setDraftSummary, setDraftMood, setDraftBlockers, setDraftAchievements,
  } = useSessionStore();

  const [sessions, setSessions]         = useState<WorkSession[]>([]);
  const [tab, setTab]                   = useState<Tab>('History');
  const [deptFilter, setDeptFilter]     = useState<string | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [submitError, setSubmitError]   = useState('');
  const [showSignOut, setShowSignOut]   = useState(false);

  /* load data */
  useEffect(() => {
    if (!mimoUser) return;
    loadActiveSession(mimoUser.uid);
    getUserSessions(mimoUser.uid).then(setSessions);
  }, [mimoUser, loadActiveSession]);

  /* auto-switch to Tasks after clock-out */
  useEffect(() => {
    if (activeSession && !isWorking) setTab('Tasks');
  }, [activeSession, isWorking]);

  /* handlers */
  const handleClockIn     = async () => { if (!mimoUser) return; await clockIn(mimoUser.uid, mimoUser.displayName, mimoUser.department); setTab('Today'); };
  const handleClockOut    = () => { clockOut(); setTab('Tasks'); };
  const handleBreak       = () => isOnBreak ? endBreak() : startBreak();
  const addTask           = () => setDraftTasks([...draftTasks, { id: genId(), title: '', description: '', category: 'Development' }]);
  const updateTask        = (id: string, f: keyof TaskEntry, v: string) => setDraftTasks(draftTasks.map((t) => t.id === id ? { ...t, [f]: v } : t));
  const removeTask        = (id: string) => setDraftTasks(draftTasks.filter((t) => t.id !== id));

  const handleSubmit = async () => {
    if (!draftTasks.some((t) => t.title.trim())) { setSubmitError('Add at least one task with a title.'); return; }
    setSubmitError('');
    setSubmitting(true);
    await submitWorkLog();
    setSubmitting(false);
    if (mimoUser) getUserSessions(mimoUser.uid).then(setSessions);
    setTab('History');
  };

  const handleSignOut = async () => {
    await signOutUser();
    router.push('/login');
  };

  /* group sessions by date (newest first) */
  const grouped = useMemo(() => {
    const src = sessions.filter((s) => s.status !== 'active');
    const map: Record<string, WorkSession[]> = {};
    for (const s of [...src].sort((a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime())) {
      const key = shortDate(s.clockInTime);
      (map[key] = map[key] || []).push(s);
    }
    return Object.entries(map);
  }, [sessions]);

  /* ── Styles ── */
  const tabBtn = (t: Tab): React.CSSProperties => ({
    background: tab === t ? 'rgba(255,255,255,0.12)' : 'none',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    padding: '7px 22px',
    fontWeight: tab === t ? 800 : 500,
    fontSize: '16px',
    color: tab === t ? '#fff' : 'rgba(255,255,255,0.4)',
    transition: 'all 0.15s',
    letterSpacing: '-0.01em',
  });

  const deptBtn = (d: string): React.CSSProperties => ({
    background: deptFilter === d ? '#ffffff' : '#1e1e1e',
    color: deptFilter === d ? '#000' : '#fff',
    border: `1px solid ${deptFilter === d ? '#fff' : '#2e2e2e'}`,
    borderRadius: '10px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '13px',
    textAlign: 'left',
    width: '100%',
    transition: 'all 0.15s',
  });

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#0a0a0a', color: '#fff' }}>

      {/* ══════════ TOP BAR ══════════ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '14px 24px', borderBottom: '1px solid #1a1a1a',
        flexShrink: 0,
      }}>
        {/* User name + role — clickable to reveal sign out */}
        <div
          style={{ minWidth: '130px', cursor: 'pointer', position: 'relative' }}
          onClick={() => setShowSignOut((v) => !v)}
        >
          <div style={{ fontWeight: 800, fontSize: '15px', lineHeight: 1.2 }}>
            {mimoUser?.displayName?.split(' ')[0]}
          </div>
          <div style={{ fontSize: '12px', color: '#555', textTransform: 'capitalize' }}>
            ({mimoUser?.role})
          </div>
          {showSignOut && (
            <button
              onClick={(e) => { e.stopPropagation(); handleSignOut(); }}
              style={{
                position: 'absolute', top: '110%', left: 0, zIndex: 100,
                background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px',
                padding: '8px 16px', color: '#ef4444', fontWeight: 600, fontSize: '13px',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Sign Out
            </button>
          )}
        </div>

        {/* Tab pill — centered */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{
            background: '#2c1a1a', border: '1px solid #3d2222',
            borderRadius: '14px', padding: '5px',
            display: 'inline-flex', gap: '2px',
          }}>
            {(['Today', 'History', 'Tasks'] as Tab[]).map((t) => (
              <button key={t} style={tabBtn(t)} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
        </div>

        {/* Timer */}
        <div style={{
          background: '#000', border: '1.5px solid #222',
          borderRadius: '10px', padding: '6px 18px',
          fontFamily: 'monospace', fontSize: '22px', fontWeight: 900,
          letterSpacing: '0.06em', minWidth: '130px', textAlign: 'center',
          color: isWorking && remainingMs < 600000 ? '#ef4444' : '#fff',
        }}>
          {isWorking ? formatTime(remainingMs) : '3:00:00'}
        </div>
      </div>

      {/* ══════════ BODY ══════════ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT — dept filters */}
        <div style={{
          width: '160px', flexShrink: 0,
          padding: '20px 14px',
          display: 'flex', flexDirection: 'column', gap: '10px',
          borderRight: '1px solid #1a1a1a',
          overflowY: 'auto',
        }}>
          {DEPARTMENTS.map((d) => (
            <button key={d} style={deptBtn(d)} onClick={() => setDeptFilter(deptFilter === d ? null : d)}>
              {d}
            </button>
          ))}
          {deptFilter && (
            <button onClick={() => setDeptFilter(null)} style={{ background: 'none', border: '1px dashed #2a2a2a', borderRadius: '8px', color: '#555', cursor: 'pointer', padding: '6px', fontSize: '11px' }}>
              ✕ Clear
            </button>
          )}
        </div>

        {/* RIGHT — content */}
        <div style={{ flex: 1, overflow: 'auto' }}>

          {/* ══ HISTORY TAB ══ */}
          {tab === 'History' && (
            grouped.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 24px', color: '#333' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
                <div style={{ fontWeight: 600, color: '#555', marginBottom: '8px' }}>No sessions yet</div>
                <button onClick={() => setTab('Today')} style={{ background: 'none', border: 'none', color: '#6C5CE7', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                  → Go Clock In
                </button>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '110px' }} />
                  <col style={{ width: '70px' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '110px' }} />
                  <col />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, background: '#0a0a0a', zIndex: 10 }}>
                    <th style={{ padding: '12px 14px', textAlign: 'left', color: '#444', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Date</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', color: '#444', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loggin</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', color: '#444', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Task completed</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', color: '#444', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Logout time</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', color: '#7f1d1d', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Remark for the day</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map(([date, daySessions]) =>
                    daySessions.map((s, idx) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #111' }}>

                        {/* Date — first row only */}
                        <td style={{ padding: '13px 14px', verticalAlign: 'top' }}>
                          {idx === 0 && (
                            <span style={{
                              display: 'inline-block',
                              background: '#059669', color: '#fff',
                              borderRadius: '99px', padding: '4px 12px',
                              fontSize: '12px', fontWeight: 700,
                              fontFamily: 'monospace', whiteSpace: 'nowrap',
                            }}>
                              {date}
                            </span>
                          )}
                        </td>

                        {/* Loggin number */}
                        <td style={{ padding: '13px 14px', verticalAlign: 'top' }}>
                          <span style={{
                            display: 'inline-block',
                            background: '#1a1a1a', border: '1px solid #2a2a2a',
                            borderRadius: '6px', padding: '4px 10px',
                            fontWeight: 800, fontSize: '14px', color: '#fff',
                            minWidth: '28px', textAlign: 'center',
                          }}>
                            {idx + 1}
                          </span>
                        </td>

                        {/* Tasks */}
                        <td style={{ padding: '13px 14px', verticalAlign: 'top' }}>
                          {s.tasks.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {s.tasks.slice(0, 4).map((t) => (
                                <div key={t.id} style={{ fontSize: '12px', color: '#aaa', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#555', flexShrink: 0, marginTop: '5px', display: 'inline-block' }} />
                                  <span>{t.title}</span>
                                </div>
                              ))}
                              {s.tasks.length > 4 && <div style={{ fontSize: '11px', color: '#444' }}>+{s.tasks.length - 4} more</div>}
                            </div>
                          ) : (
                            <span style={{ color: '#2a2a2a' }}>—</span>
                          )}
                          <div style={{ fontSize: '10px', color: '#333', marginTop: '4px', fontFamily: 'monospace' }}>{fmtDuration(s.totalDurationMs)}</div>
                        </td>

                        {/* Logout */}
                        <td style={{ padding: '13px 14px', verticalAlign: 'top', fontFamily: 'monospace', fontSize: '13px', color: '#666' }}>
                          {s.clockOutTime ? shortTime(s.clockOutTime) : <span style={{ color: '#2a2a2a' }}>—</span>}
                        </td>

                        {/* Remark */}
                        <td style={{ padding: '13px 14px', verticalAlign: 'top' }}>
                          <div style={{ fontSize: '12px', color: '#e07070', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {s.workSummary || (s.tasks.length > 0 ? s.tasks.map((t) => t.title).join(' · ') : '—')}
                          </div>
                          {s.review && (
                            <span style={{
                              marginTop: '6px', display: 'inline-block', fontSize: '10px', fontWeight: 700,
                              padding: '2px 8px', borderRadius: '4px',
                              background: s.review.action === 'starred' ? 'rgba(251,191,36,0.12)' : s.review.action === 'flagged' ? 'rgba(239,68,68,0.12)' : 'rgba(5,150,105,0.12)',
                              color: s.review.action === 'starred' ? '#fbbf24' : s.review.action === 'flagged' ? '#ef4444' : '#34d399',
                            }}>
                              {s.review.action === 'starred' ? '⭐ Starred' : s.review.action === 'flagged' ? '🔴 Flagged' : '✅ Approved'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )
          )}

          {/* ══ TODAY TAB ══ */}
          {tab === 'Today' && (
            <div style={{ padding: '32px 28px', maxWidth: '520px' }}>
              {isWorking && activeSession ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Big timer */}
                  <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '36px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#444', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>
                      {isOnBreak ? '☕ On Break' : '🔥 Session Active'}
                    </div>
                    <div style={{
                      fontFamily: 'monospace', fontWeight: 900,
                      fontSize: 'clamp(40px, 8vw, 68px)', letterSpacing: '0.04em',
                      color: isOnBreak ? '#f59e0b' : remainingMs < 600000 ? '#ef4444' : '#fff',
                    }}>
                      {formatTime(remainingMs)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#333', marginTop: '6px' }}>time remaining</div>
                  </div>

                  {/* Meta row */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {[
                      { label: 'Login time', value: shortTime(activeSession.clockInTime) },
                      { label: 'Breaks', value: String(activeSession.breaks.length) },
                      { label: 'Break time', value: fmtDuration(activeSession.breakDurationMs) },
                    ].map((item) => (
                      <div key={item.label} style={{ flex: 1, background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#444', marginBottom: '4px' }}>{item.label}</div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '15px' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={handleBreak} style={{ flex: 1, padding: '13px', borderRadius: '10px', border: '1px solid #2a2a2a', background: '#1a1a1a', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                      {isOnBreak ? '▶️ Resume Work' : '☕ Take Break'}
                    </button>
                    <button onClick={handleClockOut} style={{ flex: 1, padding: '13px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>
                      ⏹️ Clock Out
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', paddingTop: '48px' }}>
                  <div style={{ fontWeight: 800, fontSize: '22px', marginBottom: '8px' }}>
                    Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {mimoUser?.displayName?.split(' ')[0]}! 👋
                  </div>
                  <div style={{ color: '#444', fontSize: '14px', marginBottom: '48px' }}>Ready to start your 3-hour work session?</div>
                  <button onClick={handleClockIn} style={{
                    width: '170px', height: '170px', borderRadius: '50%',
                    background: '#fff', color: '#000', border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: '17px', display: 'flex',
                    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: '8px', margin: '0 auto',
                    boxShadow: '0 0 40px rgba(255,255,255,0.08)',
                  }}>
                    <span style={{ fontSize: '36px' }}>▶️</span>
                    <span>Clock In</span>
                  </button>
                  <div style={{ color: '#333', fontSize: '12px', marginTop: '20px' }}>Auto-stops after 3 hours</div>
                </div>
              )}
            </div>
          )}

          {/* ══ TASKS TAB ══ */}
          {tab === 'Tasks' && (
            <div style={{ padding: '24px 28px', maxWidth: '640px' }}>
              {!activeSession ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#333' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>⏱️</div>
                  <div style={{ fontWeight: 600, color: '#555', marginBottom: '8px' }}>No active session</div>
                  <button onClick={() => setTab('Today')} style={{ background: 'none', border: 'none', color: '#6C5CE7', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                    → Go Clock In
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Session info */}
                  <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '14px 18px', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: '#444' }}>Login</div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>{shortTime(activeSession.clockInTime)}</div>
                    </div>
                    {activeSession.clockOutTime && (
                      <div>
                        <div style={{ fontSize: '10px', color: '#444' }}>Logout</div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>{shortTime(activeSession.clockOutTime)}</div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '10px', color: '#444' }}>Worked</div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>{fmtDuration(SESSION_DURATION_MS - remainingMs - activeSession.breakDurationMs)}</div>
                    </div>
                    {isWorking && (
                      <div style={{ marginLeft: 'auto' }}>
                        <div style={{ fontSize: '10px', color: '#444' }}>Remaining</div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '18px', color: remainingMs < 600000 ? '#ef4444' : '#fff' }}>{formatTime(remainingMs)}</div>
                      </div>
                    )}
                  </div>

                  {/* Tasks */}
                  <div>
                    <label style={LABEL}>What did you work on? *</label>
                    {draftTasks.map((task, idx) => (
                      <div key={task.id} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', color: '#444' }}>Task #{idx + 1}</span>
                          <button onClick={() => removeTask(task.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                        </div>
                        <input style={{ ...INPUT, marginBottom: '8px' }} placeholder="Task title" value={task.title} onChange={(e) => updateTask(task.id, 'title', e.target.value)} />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <select style={{ ...INPUT, flex: '0 0 150px' }} value={task.category} onChange={(e) => updateTask(task.id, 'category', e.target.value)}>
                            {TASK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <input style={INPUT} placeholder="Description (optional)" value={task.description} onChange={(e) => updateTask(task.id, 'description', e.target.value)} />
                        </div>
                      </div>
                    ))}
                    <button onClick={addTask} style={{ width: '100%', background: 'none', border: '1px dashed #2a2a2a', borderRadius: '8px', color: '#444', cursor: 'pointer', padding: '10px', fontSize: '13px' }}>
                      + Add Task
                    </button>
                  </div>

                  {/* Remark */}
                  <div>
                    <label style={LABEL}>Remark for the day</label>
                    <textarea style={TEXTAREA} placeholder="Brief summary of your session..." value={draftSummary} onChange={(e) => setDraftSummary(e.target.value)} />
                  </div>

                  {/* Mood */}
                  <div>
                    <label style={LABEL}>How was your session?</label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {MOODS.map((m) => (
                        <button key={m.value} type="button" onClick={() => setDraftMood(draftMood === m.value ? null : m.value)} style={{ background: draftMood === m.value ? '#2a2a2a' : '#111', border: `1px solid ${draftMood === m.value ? '#555' : '#1e1e1e'}`, borderRadius: '10px', padding: '10px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '24px' }}>{m.emoji}</span>
                          <span style={{ fontSize: '11px', color: '#666' }}>{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Blockers */}
                  <div>
                    <label style={LABEL}>Blockers (optional)</label>
                    <textarea style={{ ...TEXTAREA, minHeight: '60px' }} placeholder="Any blockers you faced..." value={draftBlockers} onChange={(e) => setDraftBlockers(e.target.value)} />
                  </div>

                  {/* Achievements */}
                  <div>
                    <label style={LABEL}>Key Achievements (optional)</label>
                    <textarea style={{ ...TEXTAREA, minHeight: '60px' }} placeholder="Proud moments from this session..." value={draftAchievements} onChange={(e) => setDraftAchievements(e.target.value)} />
                  </div>

                  {submitError && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '10px 14px', color: '#ef4444', fontSize: '13px' }}>
                      {submitError}
                    </div>
                  )}

                  {isWorking && (
                    <button onClick={handleClockOut} style={{ width: '100%', padding: '13px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '15px' }}>
                      ⏹️ Clock Out First
                    </button>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={submitting || isWorking}
                    style={{ width: '100%', padding: '13px', borderRadius: '10px', border: 'none', background: isWorking ? '#1a1a1a' : '#fff', color: isWorking ? '#333' : '#000', cursor: isWorking ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '15px' }}
                  >
                    {submitting ? 'Submitting...' : isWorking ? 'Clock out first to submit' : '✅ Submit Work Log'}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
