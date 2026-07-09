'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useSessionStore } from '@/store/sessionStore';
import { getUserSessions } from '@/lib/firestore';
import { SESSION_DURATION_MS } from '@/types';
import type { WorkSession, TaskEntry, Mood } from '@/types';
import { TASK_CATEGORIES, MOODS } from '@/types';

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function shortDate(isoStr: string): string {
  const d = new Date(isoStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
}

function shortTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const DEPT_COLOR: Record<string, string> = {
  'Marketing':     '#E17055',
  'Technical Team':'#6C5CE7',
  'Hardware Team': '#00CEC9',
  'Finance':       '#FDCB6E',
  'Design':        '#E84393',
};

type Tab = 'today' | 'history' | 'tasks';

export default function DashboardPage() {
  const { mimoUser } = useAuthStore();
  const {
    activeSession, isWorking, isOnBreak, remainingMs,
    clockIn, clockOut, startBreak, endBreak, submitWorkLog,
    loadActiveSession, draftTasks, draftSummary, draftMood,
    draftBlockers, draftAchievements, setDraftTasks, setDraftSummary,
    setDraftMood, setDraftBlockers, setDraftAchievements,
  } = useSessionStore();

  const [allSessions, setAllSessions]   = useState<WorkSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [activeTab, setActiveTab]        = useState<Tab>('today');
  const [submitting, setSubmitting]      = useState(false);
  const [submitError, setSubmitError]    = useState('');

  // Load active session + session history
  useEffect(() => {
    if (!mimoUser) return;
    loadActiveSession(mimoUser.uid);
    getUserSessions(mimoUser.uid).then((s) => {
      setAllSessions(s);
      setSessionsLoading(false);
    });
  }, [mimoUser, loadActiveSession]);

  // Switch to "tasks" tab automatically when clock-out fires
  useEffect(() => {
    if (activeSession && !isWorking) {
      setActiveTab('tasks');
    }
  }, [activeSession, isWorking]);

  const handleClockIn = async () => {
    if (!mimoUser) return;
    await clockIn(mimoUser.uid, mimoUser.displayName, mimoUser.department);
  };

  const handleClockOut = () => {
    clockOut();
    setActiveTab('tasks');
  };

  const handleBreakToggle = () => {
    if (isOnBreak) endBreak();
    else startBreak();
  };

  const handleAddTask = () => {
    setDraftTasks([...draftTasks, { id: generateId(), title: '', description: '', category: 'Development' }]);
  };

  const handleUpdateTask = (id: string, field: keyof TaskEntry, value: string) => {
    setDraftTasks(draftTasks.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const handleRemoveTask = (id: string) => {
    setDraftTasks(draftTasks.filter((t) => t.id !== id));
  };

  const handleSubmitWorkLog = async () => {
    if (!draftTasks.some((t) => t.title.trim())) {
      setSubmitError('Please add at least one task with a title.');
      return;
    }
    setSubmitError('');
    setSubmitting(true);
    await submitWorkLog();
    setSubmitting(false);
    setActiveTab('history');
    if (mimoUser) {
      const s = await getUserSessions(mimoUser.uid);
      setAllSessions(s);
    }
  };

  // Timer ring progress
  const progress = 1 - remainingMs / SESSION_DURATION_MS;
  const circumference = 2 * Math.PI * 44;
  const strokeDashoffset = circumference * (1 - progress);

  // Today's finished session (if any)
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySession = useMemo(
    () => allSessions.find((s) => s.clockInTime.startsWith(todayStr) && s.status !== 'active'),
    [allSessions, todayStr]
  );

  const deptColor = mimoUser ? DEPT_COLOR[mimoUser.department] || '#6C5CE7' : '#6C5CE7';

  // ─── render ───────────────────────────────────────────────────────
  return (
    <div className="animate-in" style={{ maxWidth: '900px' }}>

      {/* ── Top identity strip ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
      }}>
        {/* Department chip */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '6px 16px', borderRadius: '99px',
          background: `${deptColor}18`,
          border: `1.5px solid ${deptColor}50`,
          color: deptColor, fontWeight: 700, fontSize: 'var(--font-size-sm)',
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: deptColor, display: 'inline-block' }} />
          {mimoUser?.department}
        </span>

        {/* Name + role */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, fontSize: 'var(--font-size-md)' }}>
            {mimoUser?.displayName?.split(' ')[0]}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
            ({mimoUser?.role})
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: 'flex', gap: '0', marginBottom: '24px',
        borderBottom: '1px solid var(--border-color)',
      }}>
        {(['today', 'history', 'tasks'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 28px',
              fontWeight: 700, fontSize: 'var(--font-size-sm)',
              textTransform: 'capitalize',
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? `2px solid ${deptColor}` : '2px solid transparent',
              marginBottom: '-1px',
              transition: 'all 0.15s ease',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ════════════ TODAY TAB ════════════ */}
      {activeTab === 'today' && (
        <div>
          {/* Active session live timer card */}
          {isWorking && activeSession ? (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xl)', padding: '32px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px',
            }}>
              {/* Ring + time */}
              <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                <svg width="120" height="120" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="44" fill="none" stroke="var(--border-color)" strokeWidth="6" />
                  <circle
                    cx="50" cy="50" r="44" fill="none"
                    stroke={isOnBreak ? 'var(--status-break)' : deptColor}
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)', textAlign: 'center',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 800,
                    color: isOnBreak ? 'var(--status-break)'
                      : remainingMs < 600000 ? 'var(--status-flagged)' : 'var(--text-primary)',
                  }}>
                    {formatTime(remainingMs)}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {isOnBreak ? 'PAUSED' : 'remaining'}
                  </div>
                </div>
              </div>

              {/* Status */}
              <span className={`badge ${isOnBreak ? 'badge-break' : 'badge-active'}`} style={{ fontSize: 'var(--font-size-sm)', padding: '6px 18px' }}>
                {isOnBreak ? '☕ On Break' : '🔥 Session Active'}
              </span>

              {/* Session meta row */}
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Login</div>
                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {shortTime(activeSession.clockInTime)}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Breaks</div>
                  <div style={{ fontWeight: 700 }}>{activeSession.breaks.length}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Break time</div>
                  <div style={{ fontWeight: 700 }}>{formatDuration(activeSession.breakDurationMs)}</div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  className={`btn ${isOnBreak ? 'btn-accent' : 'btn-ghost'}`}
                  onClick={handleBreakToggle}
                >
                  {isOnBreak ? '▶️ Resume' : '☕ Break'}
                </button>
                <button className="btn btn-danger" onClick={handleClockOut}>
                  ⏹️ Clock Out
                </button>
              </div>
            </div>

          ) : todaySession ? (
            /* Already clocked out today */
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xl)', padding: '28px',
            }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>✅</div>
                <h3 style={{ margin: 0 }}>Session done for today!</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                  You worked {formatDuration(todaySession.totalDurationMs)} today.
                </p>
              </div>
              {/* Today's quick row */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <div className="stat-card" style={{ textAlign: 'center', flex: 1, minWidth: '110px' }}>
                  <div className="stat-label">Login</div>
                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-lg)' }}>
                    {shortTime(todaySession.clockInTime)}
                  </div>
                </div>
                <div className="stat-card" style={{ textAlign: 'center', flex: 1, minWidth: '110px' }}>
                  <div className="stat-label">Logout</div>
                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-lg)' }}>
                    {todaySession.clockOutTime ? shortTime(todaySession.clockOutTime) : '—'}
                  </div>
                </div>
                <div className="stat-card" style={{ textAlign: 'center', flex: 1, minWidth: '110px' }}>
                  <div className="stat-label">Duration</div>
                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-lg)', color: deptColor }}>
                    {formatDuration(todaySession.totalDurationMs)}
                  </div>
                </div>
                <div className="stat-card" style={{ textAlign: 'center', flex: 1, minWidth: '110px' }}>
                  <div className="stat-label">Tasks done</div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>
                    {todaySession.tasks.length}
                  </div>
                </div>
              </div>
              {todaySession.review && (
                <div style={{ marginTop: '16px', padding: '12px 16px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: '4px' }}>Founder's review</div>
                  <span className={`badge badge-${todaySession.review.action === 'starred' ? 'starred' : todaySession.review.action === 'flagged' ? 'flagged' : 'approved'}`}>
                    {todaySession.review.action === 'starred' ? '⭐' : todaySession.review.action === 'flagged' ? '🔴' : '✅'} {todaySession.review.action}
                  </span>
                  {todaySession.review.comment && (
                    <p style={{ margin: '8px 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                      "{todaySession.review.comment}"
                    </p>
                  )}
                </div>
              )}
            </div>

          ) : (
            /* Not yet clocked in */
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <h2 style={{ marginBottom: '8px' }}>
                Good{' '}
                {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},
                {' '}{mimoUser?.displayName?.split(' ')[0]}! 👋
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>
                Ready to start your 3-hour work session?
              </p>
              <button className="clock-btn" onClick={handleClockIn}>
                <span className="clock-icon">▶️</span>
                <span>Clock In</span>
              </button>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', marginTop: '16px' }}>
                Auto-stops after 3 hours
              </p>
            </div>
          )}
        </div>
      )}

      {/* ════════════ HISTORY TAB ════════════ */}
      {activeTab === 'history' && (
        <div>
          {/* Summary row */}
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
            <div className="stat-card">
              <div className="stat-label">Avg Session</div>
              <div className="stat-value">
                {allSessions.length > 0
                  ? formatDuration(allSessions.reduce((a, s) => a + s.totalDurationMs, 0) / allSessions.length)
                  : '—'}
              </div>
            </div>
          </div>

          {sessionsLoading ? (
            <div className="loading-screen" style={{ minHeight: '30vh' }}><div className="spinner" /></div>
          ) : allSessions.length === 0 ? (
            <div className="empty-state glass-card-static">
              <div className="empty-icon">📋</div>
              <h3>No sessions yet</h3>
              <p>Clock in to start your first work session!</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table" style={{ minWidth: '600px' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Login</th>
                    <th>Logout</th>
                    <th>Duration</th>
                    <th>Tasks</th>
                    <th>Remark / Summary</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {allSessions.map((s, idx) => (
                    <tr key={s.id}>
                      {/* Date chip */}
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px',
                          borderRadius: '99px', fontFamily: 'var(--font-mono)',
                          fontSize: 'var(--font-size-xs)', fontWeight: 700,
                          background: idx % 2 === 0 ? `${deptColor}22` : 'rgba(5,150,105,0.15)',
                          color: idx % 2 === 0 ? deptColor : 'var(--status-active)',
                          border: `1px solid ${idx % 2 === 0 ? deptColor + '40' : 'rgba(5,150,105,0.3)'}`,
                        }}>
                          {shortDate(s.clockInTime)}
                        </span>
                      </td>
                      {/* Login number */}
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: '6px',
                          background: 'var(--bg-glass)', fontFamily: 'var(--font-mono)',
                          fontSize: 'var(--font-size-sm)', fontWeight: 600, border: '1px solid var(--border-color)',
                        }}>
                          {shortTime(s.clockInTime)}
                        </span>
                      </td>
                      {/* Logout time */}
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                        {s.clockOutTime ? shortTime(s.clockOutTime) : '—'}
                      </td>
                      {/* Duration */}
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: deptColor }}>
                        {formatDuration(s.totalDurationMs)}
                      </td>
                      {/* Task count */}
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: '6px',
                          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                          fontWeight: 700, fontSize: 'var(--font-size-sm)',
                        }}>
                          {s.tasks.length}
                        </span>
                      </td>
                      {/* Remark */}
                      <td style={{ maxWidth: '200px' }}>
                        <span style={{
                          fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)',
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {s.workSummary || (s.tasks.length > 0 ? s.tasks.map((t) => t.title).join(', ') : '—')}
                        </span>
                      </td>
                      {/* Review badge */}
                      <td>
                        {s.review ? (
                          <span className={`badge badge-${s.review.action === 'starred' ? 'starred' : s.review.action === 'flagged' ? 'flagged' : s.review.action === 'approved' ? 'approved' : 'pending'}`}>
                            {s.review.action === 'starred' ? '⭐' : s.review.action === 'flagged' ? '🔴' : s.review.action === 'approved' ? '✅' : '📝'}
                            {' '}{s.review.action}
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

      {/* ════════════ TASKS TAB ════════════ */}
      {activeTab === 'tasks' && (
        <div>
          {!activeSession ? (
            <div className="empty-state glass-card-static">
              <div className="empty-icon">⏱️</div>
              <h3>No active session</h3>
              <p>Clock in from the Today tab to log your tasks.</p>
              <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setActiveTab('today')}>
                Go to Today →
              </button>
            </div>
          ) : (
            <div className="glass-card-static" style={{ maxWidth: '680px' }}>
              {/* Session info row */}
              <div style={{
                display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px',
                padding: '12px 16px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)',
              }}>
                <div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Clocked In</div>
                  <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{shortTime(activeSession.clockInTime)}</div>
                </div>
                {activeSession.clockOutTime && (
                  <div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Clocked Out</div>
                    <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{shortTime(activeSession.clockOutTime)}</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Duration</div>
                  <div style={{ fontWeight: 600, color: deptColor }}>{formatDuration(SESSION_DURATION_MS - remainingMs - activeSession.breakDurationMs)}</div>
                </div>
                {/* Live timer pill if still working */}
                {isWorking && (
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Remaining</div>
                    <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-lg)', color: remainingMs < 600000 ? 'var(--status-flagged)' : deptColor }}>
                      {formatTime(remainingMs)}
                    </div>
                  </div>
                )}
              </div>

              <div className="worklog-form">
                {/* Tasks */}
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
                          placeholder="Task title (e.g., Fixed login bug)"
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
                            {TASK_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          <input
                            className="form-input"
                            placeholder="Brief description (optional)"
                            value={task.description}
                            onChange={(e) => handleUpdateTask(task.id, 'description', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={handleAddTask}>+ Add Task</button>
                </div>

                {/* Remark / Summary */}
                <div className="form-group">
                  <label className="form-label">Remark for the day</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Brief summary of your session..."
                    value={draftSummary}
                    onChange={(e) => setDraftSummary(e.target.value)}
                  />
                </div>

                {/* Mood */}
                <div className="form-group">
                  <label className="form-label">How was your session?</label>
                  <div className="mood-selector">
                    {MOODS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        className={`mood-option ${draftMood === m.value ? 'selected' : ''}`}
                        onClick={() => setDraftMood(draftMood === m.value ? null : m.value)}
                      >
                        <span className="mood-emoji">{m.emoji}</span>
                        <span className="mood-label">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Blockers */}
                <div className="form-group">
                  <label className="form-label">Blockers (optional)</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Any issues or blockers you faced..."
                    value={draftBlockers}
                    onChange={(e) => setDraftBlockers(e.target.value)}
                    style={{ minHeight: '70px' }}
                  />
                </div>

                {/* Achievements */}
                <div className="form-group">
                  <label className="form-label">Key Achievements (optional)</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Anything you're proud of from this session..."
                    value={draftAchievements}
                    onChange={(e) => setDraftAchievements(e.target.value)}
                    style={{ minHeight: '70px' }}
                  />
                </div>

                {submitError && (
                  <div className="auth-error" style={{ marginBottom: '8px' }}>{submitError}</div>
                )}

                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleSubmitWorkLog}
                  disabled={submitting || isWorking}
                  style={{ width: '100%' }}
                >
                  {submitting
                    ? <span className="spinner spinner-sm" style={{ borderTopColor: 'white' }} />
                    : isWorking
                    ? '⏹️ Clock out first to submit'
                    : '✅ Submit Work Log & End Session'}
                </button>
                {isWorking && (
                  <button className="btn btn-danger" onClick={handleClockOut} style={{ width: '100%', marginTop: '8px' }}>
                    ⏹️ Clock Out Now
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
