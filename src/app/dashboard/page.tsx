'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useSessionStore } from '@/store/sessionStore';
import { getUserSessions } from '@/lib/firestore';
import { SESSION_DURATION_MS } from '@/types';
import type { WorkSession, TaskEntry } from '@/types';
import { TASK_CATEGORIES, MOODS } from '@/types';

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
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

const DEPT_COLORS: Record<string, string> = {
  'Marketing': '#E17055',
  'Technical Team': '#6C5CE7',
  'Hardware Team': '#00CEC9',
  'Finance': '#FDCB6E',
  'Design': '#E84393',
};

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
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('Today');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const deptColor = mimoUser ? (DEPT_COLORS[mimoUser.department] || '#6C5CE7') : '#6C5CE7';

  useEffect(() => {
    if (!mimoUser) return;
    loadActiveSession(mimoUser.uid);
    getUserSessions(mimoUser.uid).then((s) => {
      setAllSessions(s);
      setLoadingHistory(false);
    });
  }, [mimoUser, loadActiveSession]);

  // Auto-switch to tasks tab when session ends
  useEffect(() => {
    if (activeSession && !isWorking) setActiveTab('Tasks');
  }, [activeSession, isWorking]);

  const handleClockIn = async () => {
    if (!mimoUser) return;
    await clockIn(mimoUser.uid, mimoUser.displayName, mimoUser.department);
  };
  const handleClockOut = () => { clockOut(); setActiveTab('Tasks'); };
  const handleBreakToggle = () => isOnBreak ? endBreak() : startBreak();
  const handleAddTask = () => setDraftTasks([...draftTasks, { id: generateId(), title: '', description: '', category: 'Development' }]);
  const handleUpdateTask = (id: string, field: keyof TaskEntry, val: string) =>
    setDraftTasks(draftTasks.map((t) => t.id === id ? { ...t, [field]: val } : t));
  const handleRemoveTask = (id: string) => setDraftTasks(draftTasks.filter((t) => t.id !== id));

  const handleSubmitWorkLog = async () => {
    if (!draftTasks.some((t) => t.title.trim())) {
      setSubmitError('Add at least one task with a title.'); return;
    }
    setSubmitError('');
    setSubmitting(true);
    await submitWorkLog();
    setSubmitting(false);
    setActiveTab('History');
    if (mimoUser) {
      const s = await getUserSessions(mimoUser.uid);
      setAllSessions(s);
    }
  };

  // History sorted newest first
  const sortedSessions = useMemo(() =>
    [...allSessions].sort((a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime()),
    [allSessions]
  );

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── TOP IDENTITY BAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '0 0 16px 0', flexWrap: 'wrap',
        borderBottom: '1px solid var(--border-color)', marginBottom: '0',
      }}>
        {/* Department chip */}
        <span style={{
          padding: '5px 14px', borderRadius: '99px',
          background: `${deptColor}20`, border: `1.5px solid ${deptColor}60`,
          color: deptColor, fontWeight: 700, fontSize: 'var(--font-size-xs)',
          letterSpacing: '0.02em',
        }}>
          {mimoUser?.department}
        </span>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Name + role */}
        <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
          {mimoUser?.displayName?.split(' ')[0]}{' '}
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 'var(--font-size-xs)' }}>
            ({mimoUser?.role})
          </span>
        </span>

        {/* Live timer badge — always visible when active */}
        {isWorking && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontWeight: 800,
            fontSize: 'var(--font-size-lg)', padding: '4px 14px',
            borderRadius: '8px', letterSpacing: '0.04em',
            background: remainingMs < 600000 ? 'rgba(220,38,38,0.15)' : `${deptColor}20`,
            color: remainingMs < 600000 ? 'var(--status-flagged)' : deptColor,
            border: `1.5px solid ${remainingMs < 600000 ? 'var(--status-flagged)' : deptColor}60`,
          }}>
            {formatTime(remainingMs)}
          </span>
        )}
      </div>

      {/* ── TAB BAR ── */}
      <div style={{
        display: 'flex', alignItems: 'stretch',
        borderBottom: '2px solid var(--border-color)',
        marginBottom: '24px',
      }}>
        {(['Today', 'History', 'Tasks'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '14px 28px',
              fontWeight: 800, fontSize: 'var(--font-size-xl)',
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? `3px solid ${deptColor}` : '3px solid transparent',
              marginBottom: '-2px',
              transition: 'all 0.15s ease',
              letterSpacing: '-0.01em',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ════ TODAY TAB ════ */}
      {activeTab === 'Today' && (
        <div style={{ flex: 1 }}>
          {isWorking && activeSession ? (
            /* ── Active Session ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' }}>
              {/* Big clock display */}
              <div style={{
                background: 'var(--bg-card)', border: `2px solid ${deptColor}40`,
                borderRadius: 'var(--radius-xl)', padding: '32px 24px', textAlign: 'center',
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Subtle dept color top bar */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: deptColor }} />

                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  {isOnBreak ? '☕ On Break' : '🔥 Session Active'}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontWeight: 900,
                  fontSize: 'clamp(40px, 8vw, 72px)', letterSpacing: '0.04em',
                  color: isOnBreak ? 'var(--status-break)'
                    : remainingMs < 600000 ? 'var(--status-flagged)' : deptColor,
                  lineHeight: 1.1,
                }}>
                  {formatTime(remainingMs)}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '6px' }}>
                  time remaining
                </div>
              </div>

              {/* Session meta row */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div className="stat-card" style={{ flex: 1, minWidth: '100px', textAlign: 'center' }}>
                  <div className="stat-label">Login</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>
                    {shortTime(activeSession.clockInTime)}
                  </div>
                </div>
                <div className="stat-card" style={{ flex: 1, minWidth: '100px', textAlign: 'center' }}>
                  <div className="stat-label">Breaks</div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>
                    {activeSession.breaks.length}
                  </div>
                </div>
                <div className="stat-card" style={{ flex: 1, minWidth: '100px', textAlign: 'center' }}>
                  <div className="stat-label">Break time</div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>
                    {formatDuration(activeSession.breakDurationMs)}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  className={`btn ${isOnBreak ? 'btn-accent' : 'btn-ghost'}`}
                  onClick={handleBreakToggle}
                  style={{ flex: 1 }}
                >
                  {isOnBreak ? '▶️ Resume Work' : '☕ Take Break'}
                </button>
                <button className="btn btn-danger" onClick={handleClockOut} style={{ flex: 1 }}>
                  ⏹️ Clock Out
                </button>
              </div>
            </div>

          ) : (
            /* ── Idle: Clock in ── */
            <div style={{ textAlign: 'center', paddingTop: '40px' }}>
              <div style={{ marginBottom: '12px', fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
                Good{' '}
                {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},{' '}
                {mimoUser?.displayName?.split(' ')[0]}! 👋
              </div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '48px' }}>
                Ready to start your 3-hour work session?
              </p>
              <button className="clock-btn" onClick={handleClockIn}>
                <span className="clock-icon">▶️</span>
                <span>Clock In</span>
              </button>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', marginTop: '16px' }}>
                Session auto-stops after 3 hours
              </p>

              {/* Quick history preview below clock in */}
              {sortedSessions.length > 0 && (
                <div style={{ marginTop: '48px', textAlign: 'left', maxWidth: '600px', margin: '48px auto 0' }}>
                  <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Recent Sessions
                  </div>
                  {sortedSessions.slice(0, 3).map((s) => (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
                      borderRadius: 'var(--radius-md)', marginBottom: '6px',
                      background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                      flexWrap: 'wrap',
                    }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: '99px',
                        fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', fontWeight: 700,
                        background: `${deptColor}20`, color: deptColor, border: `1px solid ${deptColor}40`,
                      }}>
                        {shortDate(s.clockInTime)}
                      </span>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                        {shortTime(s.clockInTime)}{s.clockOutTime ? ` → ${shortTime(s.clockOutTime)}` : ''}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'var(--font-size-sm)', color: deptColor, marginLeft: 'auto' }}>
                        {formatDuration(s.totalDurationMs)}
                      </span>
                      {s.review && (
                        <span className={`badge badge-${s.review.action === 'starred' ? 'starred' : s.review.action === 'flagged' ? 'flagged' : 'approved'}`}>
                          {s.review.action === 'starred' ? '⭐' : s.review.action === 'flagged' ? '🔴' : '✅'}
                        </span>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setActiveTab('History')} style={{
                    background: 'none', border: 'none', color: deptColor, cursor: 'pointer',
                    fontSize: 'var(--font-size-xs)', fontWeight: 600, marginTop: '8px',
                  }}>
                    View all history →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════ HISTORY TAB ════ */}
      {activeTab === 'History' && (
        <div>
          {/* Summary strip */}
          <div className="grid-stats" style={{ marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-label">Total Sessions</div>
              <div className="stat-value">{allSessions.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Hours</div>
              <div className="stat-value" style={{ color: deptColor }}>
                {formatDuration(allSessions.reduce((a, s) => a + s.totalDurationMs, 0))}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">⭐ Stars</div>
              <div className="stat-value" style={{ color: 'var(--status-starred)' }}>
                {allSessions.filter((s) => s.review?.action === 'starred').length}
              </div>
            </div>
          </div>

          {loadingHistory ? (
            <div className="loading-screen" style={{ minHeight: '30vh' }}><div className="spinner" /></div>
          ) : sortedSessions.length === 0 ? (
            <div className="empty-state glass-card-static">
              <div className="empty-icon">📋</div>
              <h3>No sessions yet</h3>
              <p>Clock in to start your first work session!</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table" style={{ minWidth: '640px' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Login</th>
                    <th>Logout time</th>
                    <th>Task completed</th>
                    <th>Remark for the day</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSessions.map((s, idx) => (
                    <tr key={s.id}>
                      {/* Date chip — alternating colors like wireframe */}
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '3px 12px', borderRadius: '99px',
                          fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', fontWeight: 700,
                          background: idx % 2 === 0 ? `${deptColor}22` : 'rgba(5,150,105,0.15)',
                          color: idx % 2 === 0 ? deptColor : 'var(--status-active)',
                          border: `1px solid ${idx % 2 === 0 ? deptColor + '50' : 'rgba(5,150,105,0.3)'}`,
                          whiteSpace: 'nowrap',
                        }}>
                          {shortDate(s.clockInTime)}
                        </span>
                      </td>
                      {/* Login time */}
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: '6px',
                          background: 'var(--bg-glass)', fontFamily: 'var(--font-mono)',
                          fontSize: 'var(--font-size-sm)', fontWeight: 700,
                          border: '1px solid var(--border-color)',
                        }}>
                          {shortTime(s.clockInTime)}
                        </span>
                      </td>
                      {/* Logout time */}
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                        {s.clockOutTime ? shortTime(s.clockOutTime) : '—'}
                        {s.totalDurationMs > 0 && (
                          <div style={{ fontSize: '10px', color: deptColor, fontWeight: 600 }}>
                            {formatDuration(s.totalDurationMs)}
                          </div>
                        )}
                      </td>
                      {/* Tasks completed — numbered badge like wireframe */}
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '3px 12px', borderRadius: '6px',
                          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                          fontWeight: 800, fontSize: 'var(--font-size-sm)', minWidth: '28px', textAlign: 'center',
                        }}>
                          {s.tasks.length}
                        </span>
                      </td>
                      {/* Remark */}
                      <td style={{ maxWidth: '180px' }}>
                        <span style={{
                          fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)',
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {s.workSummary || (s.tasks.length > 0 ? s.tasks.map((t) => t.title).join(', ') : '—')}
                        </span>
                      </td>
                      {/* Review */}
                      <td>
                        {s.review ? (
                          <span className={`badge badge-${s.review.action === 'starred' ? 'starred' : s.review.action === 'flagged' ? 'flagged' : s.review.action === 'approved' ? 'approved' : 'pending'}`}>
                            {s.review.action === 'starred' ? '⭐' : s.review.action === 'flagged' ? '🔴' : s.review.action === 'approved' ? '✅' : '📝'}{' '}
                            {s.review.action}
                          </span>
                        ) : (
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════ TASKS TAB ════ */}
      {activeTab === 'Tasks' && (
        <div style={{ maxWidth: '680px' }}>
          {!activeSession ? (
            <div className="empty-state glass-card-static">
              <div className="empty-icon">⏱️</div>
              <h3>No active session</h3>
              <p>Go to Today tab and clock in first.</p>
              <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setActiveTab('Today')}>
                Go to Today →
              </button>
            </div>
          ) : (
            <div className="glass-card-static">
              {/* Session info */}
              <div style={{
                display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px',
                padding: '12px 16px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Login</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{shortTime(activeSession.clockInTime)}</div>
                </div>
                {activeSession.clockOutTime && (
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Logout</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{shortTime(activeSession.clockOutTime)}</div>
                  </div>
                )}
                {isWorking && (
                  <div style={{ marginLeft: 'auto' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Remaining</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: deptColor, fontSize: 'var(--font-size-lg)' }}>
                      {formatTime(remainingMs)}
                    </div>
                  </div>
                )}
              </div>

              <div className="worklog-form">
                <div className="form-group">
                  <label className="form-label">What did you work on? *</label>
                  <div className="task-list">
                    {draftTasks.map((task, idx) => (
                      <div key={task.id} className="task-entry">
                        <div className="task-entry-header">
                          <span className="task-entry-number">Task #{idx + 1}</span>
                          <button className="task-remove" onClick={() => handleRemoveTask(task.id)}>✕</button>
                        </div>
                        <input
                          className="form-input"
                          placeholder="Task title"
                          value={task.title}
                          onChange={(e) => handleUpdateTask(task.id, 'title', e.target.value)}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <select
                            className="form-select"
                            value={task.category}
                            onChange={(e) => handleUpdateTask(task.id, 'category', e.target.value)}
                            style={{ flex: '0 0 160px' }}
                          >
                            {TASK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <input
                            className="form-input"
                            placeholder="Description (optional)"
                            value={task.description}
                            onChange={(e) => handleUpdateTask(task.id, 'description', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={handleAddTask}>+ Add Task</button>
                </div>

                <div className="form-group">
                  <label className="form-label">Remark for the day</label>
                  <textarea className="form-textarea" placeholder="Brief summary..." value={draftSummary} onChange={(e) => setDraftSummary(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">How was your session?</label>
                  <div className="mood-selector">
                    {MOODS.map((m) => (
                      <button key={m.value} type="button"
                        className={`mood-option ${draftMood === m.value ? 'selected' : ''}`}
                        onClick={() => setDraftMood(draftMood === m.value ? null : m.value)}>
                        <span className="mood-emoji">{m.emoji}</span>
                        <span className="mood-label">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Blockers (optional)</label>
                  <textarea className="form-textarea" placeholder="Any blockers..." value={draftBlockers}
                    onChange={(e) => setDraftBlockers(e.target.value)} style={{ minHeight: '70px' }} />
                </div>

                <div className="form-group">
                  <label className="form-label">Key Achievements (optional)</label>
                  <textarea className="form-textarea" placeholder="Proud moments..." value={draftAchievements}
                    onChange={(e) => setDraftAchievements(e.target.value)} style={{ minHeight: '70px' }} />
                </div>

                {submitError && <div className="auth-error" style={{ marginBottom: '8px' }}>{submitError}</div>}

                {isWorking && (
                  <button className="btn btn-danger" onClick={handleClockOut} style={{ width: '100%', marginBottom: '8px' }}>
                    ⏹️ Clock Out First
                  </button>
                )}
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleSubmitWorkLog}
                  disabled={submitting || isWorking}
                  style={{ width: '100%' }}
                >
                  {submitting
                    ? <span className="spinner spinner-sm" style={{ borderTopColor: 'white' }} />
                    : isWorking ? 'Clock out first to submit' : '✅ Submit Work Log'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
