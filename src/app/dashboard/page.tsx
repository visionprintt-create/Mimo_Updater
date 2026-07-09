'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useSessionStore } from '@/store/sessionStore';
import { getUserSessions } from '@/lib/firestore';
import { SESSION_DURATION_MS, DEPARTMENTS } from '@/types';
import type { WorkSession, TaskEntry } from '@/types';
import { TASK_CATEGORIES, MOODS } from '@/types';

function formatTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth()+1}/${String(d.getFullYear()).slice(2)}`;
}

function shortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

type Tab = 'Today' | 'History' | 'Tasks';

export default function DashboardPage() {
  const { mimoUser } = useAuthStore();
  const {
    activeSession, isWorking, isOnBreak, remainingMs,
    clockIn, clockOut, startBreak, endBreak, submitWorkLog,
    loadActiveSession, draftTasks, draftSummary, draftMood,
    draftBlockers, draftAchievements, setDraftTasks, setDraftSummary,
    setDraftMood, setDraftBlockers, setDraftAchievements,
  } = useSessionStore();

  const [allSessions, setAllSessions] = useState<WorkSession[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('History');
  const [deptFilter, setDeptFilter] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!mimoUser) return;
    loadActiveSession(mimoUser.uid);
    getUserSessions(mimoUser.uid).then(setAllSessions);
  }, [mimoUser, loadActiveSession]);

  useEffect(() => {
    if (activeSession && !isWorking) setActiveTab('Tasks');
  }, [activeSession, isWorking]);

  const handleClockIn = async () => {
    if (!mimoUser) return;
    await clockIn(mimoUser.uid, mimoUser.displayName, mimoUser.department);
    setActiveTab('Today');
  };
  const handleClockOut = () => { clockOut(); setActiveTab('Tasks'); };
  const handleBreakToggle = () => isOnBreak ? endBreak() : startBreak();
  const handleAddTask = () => setDraftTasks([...draftTasks, { id: generateId(), title: '', description: '', category: 'Development' }]);
  const handleUpdateTask = (id: string, field: keyof TaskEntry, val: string) =>
    setDraftTasks(draftTasks.map((t) => t.id === id ? { ...t, [field]: val } : t));
  const handleRemoveTask = (id: string) => setDraftTasks(draftTasks.filter((t) => t.id !== id));

  const handleSubmit = async () => {
    if (!draftTasks.some((t) => t.title.trim())) {
      setSubmitError('Add at least one task.'); return;
    }
    setSubmitError('');
    setSubmitting(true);
    await submitWorkLog();
    setSubmitting(false);
    if (mimoUser) getUserSessions(mimoUser.uid).then(setAllSessions);
    setActiveTab('History');
  };

  // Group sessions by date, sorted newest first
  const groupedSessions = useMemo(() => {
    const filtered = deptFilter
      ? allSessions.filter((s) => s.userDepartment === deptFilter || s.tasks.some(() => true))
      : allSessions;
    const sorted = [...filtered]
      .filter((s) => s.status !== 'active')
      .sort((a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime());
    const map: Record<string, WorkSession[]> = {};
    for (const s of sorted) {
      const key = shortDate(s.clockInTime);
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return Object.entries(map);
  }, [allSessions, deptFilter]);

  const tabStyle = (tab: Tab) => ({
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px 22px',
    fontWeight: 700 as const,
    fontSize: '18px',
    color: activeTab === tab ? '#ffffff' : 'rgba(255,255,255,0.45)',
    transition: 'color 0.15s',
  });

  const deptChipStyle = (dept: string) => ({
    background: deptFilter === dept ? '#ffffff' : '#1e1e1e',
    color: deptFilter === dept ? '#000000' : '#ffffff',
    border: `1px solid ${deptFilter === dept ? '#fff' : '#333'}`,
    borderRadius: '8px',
    padding: '9px 14px',
    cursor: 'pointer',
    fontWeight: 700 as const,
    fontSize: '13px',
    textAlign: 'left' as const,
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
    width: '100%',
  });

  return (
    /* Full bleed dark container */
    <div style={{
      margin: 'calc(-1 * var(--space-xl))',
      background: '#0a0a0a',
      minHeight: '100vh',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-sans)',
    }}>

      {/* ══ TOP BAR ══ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '18px 24px',
        gap: '16px',
        borderBottom: '1px solid #1e1e1e',
      }}>
        {/* User name + role */}
        <div style={{ minWidth: '140px' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', lineHeight: 1.2 }}>
            {mimoUser?.displayName?.split(' ')[0]}
          </div>
          <div style={{ fontSize: '12px', color: '#666', textTransform: 'capitalize' }}>
            ({mimoUser?.role})
          </div>
        </div>

        {/* Tab pill - center */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{
            background: '#2c1a1a',
            borderRadius: '16px',
            padding: '6px 6px',
            display: 'inline-flex',
            gap: '2px',
            border: '1px solid #3d2222',
          }}>
            <button style={tabStyle('Today')} onClick={() => setActiveTab('Today')}>Today</button>
            <button style={tabStyle('History')} onClick={() => setActiveTab('History')}>History</button>
            <button style={tabStyle('Tasks')} onClick={() => setActiveTab('Tasks')}>tasks</button>
          </div>
        </div>

        {/* Timer */}
        <div style={{
          background: '#000',
          border: '1.5px solid #2a2a2a',
          borderRadius: '10px',
          padding: '6px 18px',
          fontFamily: 'var(--font-mono)',
          fontSize: '22px',
          fontWeight: 800,
          letterSpacing: '0.04em',
          color: isWorking && remainingMs < 600000 ? '#ef4444' : '#ffffff',
          minWidth: '130px',
          textAlign: 'center',
        }}>
          {isWorking ? formatTime(remainingMs) : '3:00:00'}
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT: Department filter pills */}
        <div style={{
          width: '155px',
          flexShrink: 0,
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          borderRight: '1px solid #1e1e1e',
        }}>
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept}
              style={deptChipStyle(dept)}
              onClick={() => setDeptFilter(deptFilter === dept ? null : dept)}
            >
              {dept}
            </button>
          ))}
          {deptFilter && (
            <button
              style={{ ...deptChipStyle(''), background: 'transparent', color: '#666', border: '1px dashed #333', fontSize: '11px' }}
              onClick={() => setDeptFilter(null)}
            >
              Clear filter
            </button>
          )}
        </div>

        {/* RIGHT: Content area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>

          {/* ──── HISTORY TAB ──── */}
          {activeTab === 'History' && (
            <div>
              {groupedSessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 24px', color: '#444' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#666' }}>No sessions yet</div>
                  <div style={{ fontSize: '13px', marginTop: '8px', color: '#444' }}>
                    Go to <button onClick={() => setActiveTab('Today')} style={{ background: 'none', border: 'none', color: '#6C5CE7', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>Today</button> and clock in!
                  </div>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1e1e1e' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#555', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', width: '120px' }}>Date</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#555', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', width: '90px' }}>Loggin</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#555', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Task completed</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#555', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', width: '130px' }}>Logout time</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#c0392b', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', width: '200px' }}>Remark for the day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedSessions.map(([date, sessions]) =>
                      sessions.map((s, idx) => (
                        <tr
                          key={s.id}
                          style={{ borderBottom: '1px solid #141414', background: idx % 2 === 0 ? 'transparent' : '#0d0d0d' }}
                        >
                          {/* Date — only on first row of group */}
                          <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                            {idx === 0 && (
                              <span style={{
                                background: '#059669',
                                color: '#ffffff',
                                borderRadius: '99px',
                                padding: '4px 12px',
                                fontSize: '12px',
                                fontWeight: 700,
                                fontFamily: 'var(--font-mono)',
                                whiteSpace: 'nowrap',
                                display: 'inline-block',
                              }}>
                                {date}
                              </span>
                            )}
                          </td>

                          {/* Loggin — session number for this date */}
                          <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                            <span style={{
                              background: '#1a1a1a',
                              border: '1px solid #2a2a2a',
                              borderRadius: '6px',
                              padding: '4px 12px',
                              fontWeight: 800,
                              fontSize: '14px',
                              color: '#fff',
                              display: 'inline-block',
                              minWidth: '28px',
                              textAlign: 'center',
                            }}>
                              {idx + 1}
                            </span>
                          </td>

                          {/* Tasks */}
                          <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                            {s.tasks.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {s.tasks.slice(0, 3).map((t) => (
                                  <div key={t.id} style={{
                                    fontSize: '12px', color: '#aaa',
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                  }}>
                                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#555', flexShrink: 0, display: 'inline-block' }} />
                                    {t.title}
                                  </div>
                                ))}
                                {s.tasks.length > 3 && (
                                  <div style={{ fontSize: '11px', color: '#555' }}>+{s.tasks.length - 3} more</div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#333', fontSize: '13px' }}>—</span>
                            )}
                            {/* Duration subtext */}
                            <div style={{ fontSize: '11px', color: '#444', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                              {formatDuration(s.totalDurationMs)}
                            </div>
                          </td>

                          {/* Logout time */}
                          <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#888' }}>
                            {s.clockOutTime ? shortTime(s.clockOutTime) : <span style={{ color: '#333' }}>—</span>}
                          </td>

                          {/* Remark */}
                          <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                            <span style={{
                              fontSize: '12px',
                              color: '#e07070',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}>
                              {s.workSummary || (s.tasks.length > 0 ? s.tasks.map(t => t.title).join(' · ') : '—')}
                            </span>
                            {s.review && (
                              <div style={{ marginTop: '4px' }}>
                                <span style={{
                                  fontSize: '10px', fontWeight: 700,
                                  padding: '2px 6px', borderRadius: '4px',
                                  background: s.review.action === 'starred' ? 'rgba(251,191,36,0.15)' : s.review.action === 'flagged' ? 'rgba(239,68,68,0.15)' : 'rgba(5,150,105,0.15)',
                                  color: s.review.action === 'starred' ? '#fbbf24' : s.review.action === 'flagged' ? '#ef4444' : '#34d399',
                                }}>
                                  {s.review.action === 'starred' ? '⭐ Starred' : s.review.action === 'flagged' ? '🔴 Flagged' : '✅ Approved'}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ──── TODAY TAB ──── */}
          {activeTab === 'Today' && (
            <div style={{ padding: '32px 24px', maxWidth: '560px' }}>
              {isWorking && activeSession ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Big timer card */}
                  <div style={{
                    background: '#111', border: '1px solid #222',
                    borderRadius: '16px', padding: '36px 24px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.15em', marginBottom: '10px', textTransform: 'uppercase' }}>
                      {isOnBreak ? '☕ On Break' : '🔥 Session Active'}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 'clamp(36px, 7vw, 64px)',
                      fontWeight: 900, letterSpacing: '0.04em',
                      color: isOnBreak ? '#f59e0b' : remainingMs < 600000 ? '#ef4444' : '#ffffff',
                    }}>
                      {formatTime(remainingMs)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#444', marginTop: '6px' }}>time remaining</div>
                  </div>

                  {/* Meta */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {[
                      { label: 'Login', value: shortTime(activeSession.clockInTime) },
                      { label: 'Breaks', value: String(activeSession.breaks.length) },
                      { label: 'Break time', value: formatDuration(activeSession.breakDurationMs) },
                    ].map((item) => (
                      <div key={item.label} style={{ flex: 1, minWidth: '90px', background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#555', marginBottom: '4px' }}>{item.label}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '16px' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={handleBreakToggle}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #333',
                        background: '#1a1a1a', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                      }}
                    >
                      {isOnBreak ? '▶️ Resume Work' : '☕ Take Break'}
                    </button>
                    <button
                      onClick={handleClockOut}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                        background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '14px',
                      }}
                    >
                      ⏹️ Clock Out
                    </button>
                  </div>
                </div>

              ) : (
                <div style={{ textAlign: 'center', paddingTop: '40px' }}>
                  <div style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>
                    Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},{' '}
                    {mimoUser?.displayName?.split(' ')[0]}! 👋
                  </div>
                  <div style={{ color: '#555', marginBottom: '48px', fontSize: '14px' }}>Ready to start your 3-hour session?</div>
                  <button
                    onClick={handleClockIn}
                    style={{
                      width: '180px', height: '180px', borderRadius: '50%',
                      background: '#fff', color: '#000',
                      border: 'none', cursor: 'pointer',
                      fontSize: '18px', fontWeight: 700,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: '8px', margin: '0 auto',
                      boxShadow: '0 0 40px rgba(255,255,255,0.1)',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                  >
                    <span style={{ fontSize: '36px' }}>▶️</span>
                    <span>Clock In</span>
                  </button>
                  <div style={{ color: '#333', fontSize: '12px', marginTop: '16px' }}>Auto-stops after 3 hours</div>
                </div>
              )}
            </div>
          )}

          {/* ──── TASKS TAB ──── */}
          {activeTab === 'Tasks' && (
            <div style={{ padding: '24px' }}>
              {!activeSession ? (
                <div style={{ textAlign: 'center', padding: '80px 24px', color: '#444' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>⏱️</div>
                  <div style={{ fontWeight: 600, color: '#666' }}>No active session</div>
                  <div style={{ fontSize: '13px', marginTop: '8px' }}>
                    <button onClick={() => setActiveTab('Today')} style={{ background: 'none', border: 'none', color: '#6C5CE7', cursor: 'pointer', fontWeight: 600 }}>
                      Go to Today →
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Session info */}
                  <div style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '14px 18px', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: '#555' }}>Login</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{shortTime(activeSession.clockInTime)}</div>
                    </div>
                    {activeSession.clockOutTime && (
                      <div>
                        <div style={{ fontSize: '10px', color: '#555' }}>Logout</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{shortTime(activeSession.clockOutTime)}</div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '10px', color: '#555' }}>Duration</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{formatDuration(SESSION_DURATION_MS - remainingMs - activeSession.breakDurationMs)}</div>
                    </div>
                    {isWorking && (
                      <div style={{ marginLeft: 'auto' }}>
                        <div style={{ fontSize: '10px', color: '#555' }}>Remaining</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: remainingMs < 600000 ? '#ef4444' : '#fff', fontSize: '18px' }}>{formatTime(remainingMs)}</div>
                      </div>
                    )}
                  </div>

                  {/* Tasks input */}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#888', marginBottom: '10px' }}>What did you work on? *</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {draftTasks.map((task, idx) => (
                        <div key={task.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11px', color: '#555' }}>Task #{idx + 1}</span>
                            <button onClick={() => handleRemoveTask(task.id)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                          </div>
                          <input
                            style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', marginBottom: '8px', outline: 'none', boxSizing: 'border-box' as const }}
                            placeholder="Task title"
                            value={task.title}
                            onChange={(e) => handleUpdateTask(task.id, 'title', e.target.value)}
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <select
                              style={{ flex: '0 0 150px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '12px', outline: 'none' }}
                              value={task.category}
                              onChange={(e) => handleUpdateTask(task.id, 'category', e.target.value)}
                            >
                              {TASK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <input
                              style={{ flex: 1, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '12px', outline: 'none' }}
                              placeholder="Description (optional)"
                              value={task.description}
                              onChange={(e) => handleUpdateTask(task.id, 'description', e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={handleAddTask} style={{ background: 'none', border: '1px dashed #333', borderRadius: '8px', color: '#555', cursor: 'pointer', padding: '8px 16px', marginTop: '8px', width: '100%', fontSize: '13px' }}>
                      + Add Task
                    </button>
                  </div>

                  {/* Remark */}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#888', marginBottom: '8px' }}>Remark for the day</div>
                    <textarea
                      style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '12px', color: '#fff', fontSize: '13px', minHeight: '80px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const }}
                      placeholder="Brief summary of your session..."
                      value={draftSummary}
                      onChange={(e) => setDraftSummary(e.target.value)}
                    />
                  </div>

                  {/* Mood */}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#888', marginBottom: '8px' }}>How was your session?</div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {MOODS.map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => setDraftMood(draftMood === m.value ? null : m.value)}
                          style={{
                            background: draftMood === m.value ? '#2a2a2a' : '#111',
                            border: `1px solid ${draftMood === m.value ? '#555' : '#222'}`,
                            borderRadius: '10px', padding: '10px 16px', cursor: 'pointer',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                          }}
                        >
                          <span style={{ fontSize: '24px' }}>{m.emoji}</span>
                          <span style={{ fontSize: '11px', color: '#888' }}>{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Blockers */}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#888', marginBottom: '8px' }}>Blockers (optional)</div>
                    <textarea
                      style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '12px', color: '#fff', fontSize: '13px', minHeight: '60px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const }}
                      placeholder="Any blockers..."
                      value={draftBlockers}
                      onChange={(e) => setDraftBlockers(e.target.value)}
                    />
                  </div>

                  {submitError && (
                    <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', color: '#ef4444', fontSize: '13px' }}>
                      {submitError}
                    </div>
                  )}

                  {isWorking && (
                    <button
                      onClick={handleClockOut}
                      style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '15px', marginBottom: '-8px' }}
                    >
                      ⏹️ Clock Out First
                    </button>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={submitting || isWorking}
                    style={{
                      width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
                      background: isWorking ? '#222' : '#ffffff', color: isWorking ? '#555' : '#000',
                      cursor: isWorking ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '15px',
                    }}
                  >
                    {submitting ? 'Submitting...' : isWorking ? 'Clock out first' : '✅ Submit Work Log'}
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
