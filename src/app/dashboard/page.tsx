'use client';

import { useEffect, useState } from 'react';
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

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function DashboardPage() {
  const { mimoUser } = useAuthStore();
  const {
    activeSession,
    isWorking,
    isOnBreak,
    remainingMs,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    submitWorkLog,
    loadActiveSession,
    draftTasks,
    draftSummary,
    draftMood,
    draftBlockers,
    draftAchievements,
    setDraftTasks,
    setDraftSummary,
    setDraftMood,
    setDraftBlockers,
    setDraftAchievements,
  } = useSessionStore();

  const [recentSessions, setRecentSessions] = useState<WorkSession[]>([]);
  const [showWorkLog, setShowWorkLog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load active session on mount
  useEffect(() => {
    if (mimoUser) {
      loadActiveSession(mimoUser.uid);
      getUserSessions(mimoUser.uid).then((sessions) => {
        setRecentSessions(sessions.slice(0, 5));
      });
    }
  }, [mimoUser, loadActiveSession]);

  // Show work log when session is auto-stopped or user clocks out
  useEffect(() => {
    if (activeSession && !isWorking && !showWorkLog) {
      setShowWorkLog(true);
    }
  }, [activeSession, isWorking, showWorkLog]);

  const handleClockIn = async () => {
    if (!mimoUser) return;
    await clockIn(mimoUser.uid, mimoUser.displayName, mimoUser.department);
  };

  const handleClockOut = () => {
    clockOut();
    setShowWorkLog(true);
  };

  const handleBreakToggle = () => {
    if (isOnBreak) {
      endBreak();
    } else {
      startBreak();
    }
  };

  const handleAddTask = () => {
    const newTask: TaskEntry = {
      id: generateId(),
      title: '',
      description: '',
      category: 'Development',
    };
    setDraftTasks([...draftTasks, newTask]);
  };

  const handleUpdateTask = (id: string, field: keyof TaskEntry, value: string) => {
    setDraftTasks(
      draftTasks.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleRemoveTask = (id: string) => {
    setDraftTasks(draftTasks.filter((t) => t.id !== id));
  };

  const handleSubmitWorkLog = async () => {
    if (draftTasks.length === 0 || !draftTasks.some((t) => t.title.trim())) {
      alert('Please add at least one task with a title.');
      return;
    }

    setSubmitting(true);
    await submitWorkLog();
    setShowWorkLog(false);
    setSubmitting(false);

    // Refresh recent sessions
    if (mimoUser) {
      const sessions = await getUserSessions(mimoUser.uid);
      setRecentSessions(sessions.slice(0, 5));
    }
  };

  // Calculate timer progress (0 to 1)
  const progress = 1 - remainingMs / SESSION_DURATION_MS;
  const circumference = 2 * Math.PI * 130;
  const strokeDashoffset = circumference * (1 - progress);

  // ─── Work Log Form (shown after clock out or auto-stop) ──────
  if (showWorkLog && activeSession) {
    return (
      <div className="animate-in">
        <div className="page-header">
          <h1>📝 Submit Work Log</h1>
          <p>
            Session {activeSession.status === 'auto-stopped' ? 'auto-stopped after 3 hours' : 'ended'}.
            Tell us what you accomplished!
          </p>
        </div>

        <div className="glass-card-static" style={{ maxWidth: '700px' }}>
          <div className="worklog-form">
            {/* Session Info */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap',
                padding: '12px 16px',
                background: 'var(--bg-glass)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                  Clocked In
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                  {new Date(activeSession.clockInTime).toLocaleTimeString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                  Duration
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--mimo-accent)' }}>
                  {formatDuration(SESSION_DURATION_MS - remainingMs - activeSession.breakDurationMs)}
                </div>
              </div>
              {activeSession.breakDurationMs > 0 && (
                <div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                    Break Time
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--status-break)' }}>
                    {formatDuration(activeSession.breakDurationMs)}
                  </div>
                </div>
              )}
            </div>

            {/* Tasks */}
            <div className="form-group">
              <label className="form-label">What did you work on? *</label>
              <div className="task-list">
                {draftTasks.map((task, idx) => (
                  <div key={task.id} className="task-entry">
                    <div className="task-entry-header">
                      <span className="task-entry-number">Task #{idx + 1}</span>
                      <button
                        className="task-remove"
                        onClick={() => handleRemoveTask(task.id)}
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      className="form-input"
                      placeholder="Task title (e.g., Fixed login bug)"
                      value={task.title}
                      onChange={(e) =>
                        handleUpdateTask(task.id, 'title', e.target.value)
                      }
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        className="form-select"
                        value={task.category}
                        onChange={(e) =>
                          handleUpdateTask(task.id, 'category', e.target.value)
                        }
                        style={{ flex: '0 0 160px' }}
                      >
                        {TASK_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <input
                        className="form-input"
                        placeholder="Brief description (optional)"
                        value={task.description}
                        onChange={(e) =>
                          handleUpdateTask(task.id, 'description', e.target.value)
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleAddTask}>
                + Add Task
              </button>
            </div>

            {/* Summary */}
            <div className="form-group">
              <label className="form-label">Work Summary</label>
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
                    className={`mood-option ${draftMood === m.value ? 'selected' : ''}`}
                    onClick={() => setDraftMood(draftMood === m.value ? null : m.value)}
                    type="button"
                  >
                    <span className="mood-emoji">{m.emoji}</span>
                    <span className="mood-label">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Blockers */}
            <div className="form-group">
              <label className="form-label">Blockers / Challenges (optional)</label>
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

            {/* Submit */}
            <button
              className="btn btn-primary btn-lg"
              onClick={handleSubmitWorkLog}
              disabled={submitting}
              style={{ width: '100%' }}
            >
              {submitting ? (
                <span className="spinner spinner-sm" style={{ borderTopColor: 'white' }} />
              ) : (
                '✅ Submit Work Log & End Session'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Active Session (Timer View) ─────────────────────────────
  if (isWorking && activeSession) {
    return (
      <div className="animate-in">
        <div className="page-header" style={{ textAlign: 'center' }}>
          <h1>
            {isOnBreak ? '☕ On Break' : '🔥 Session Active'}
          </h1>
          <p>
            {isOnBreak
              ? 'Timer paused. Take your time!'
              : 'Timer is running. Stay focused!'}
          </p>
        </div>

        <div className="timer-display">
          <div className="timer-ring">
            <svg viewBox="0 0 280 280">

              <circle className="track" cx="140" cy="140" r="130" />
              <circle
                className="progress"
                cx="140"
                cy="140"
                r="130"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="time-text">
              <div
                className="time-value"
                style={{
                  color: isOnBreak
                    ? 'var(--status-break)'
                    : remainingMs < 600000
                    ? 'var(--status-flagged)'
                    : 'var(--text-primary)',
                }}
              >
                {formatTime(remainingMs)}
              </div>
              <div className="time-label">
                {isOnBreak ? 'PAUSED' : 'remaining'}
              </div>
            </div>
          </div>

          <div className="timer-actions">
            <button
              className={`btn ${isOnBreak ? 'btn-accent' : 'btn-ghost'}`}
              onClick={handleBreakToggle}
            >
              {isOnBreak ? '▶️ Resume Work' : '☕ Take Break'}
            </button>
            <button className="btn btn-danger" onClick={handleClockOut}>
              ⏹️ Clock Out
            </button>
          </div>

          {/* Session Stats */}
          <div
            className="grid-stats"
            style={{ maxWidth: '600px', margin: '32px auto 0' }}
          >
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <div className="stat-label">Clocked In</div>
              <div className="stat-value" style={{ fontSize: 'var(--font-size-xl)' }}>
                {new Date(activeSession.clockInTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <div className="stat-label">Breaks Taken</div>
              <div className="stat-value" style={{ fontSize: 'var(--font-size-xl)' }}>
                {activeSession.breaks.length}
              </div>
            </div>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <div className="stat-label">Break Time</div>
              <div className="stat-value" style={{ fontSize: 'var(--font-size-xl)' }}>
                {formatDuration(activeSession.breakDurationMs)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Idle State (Clock In) ───────────────────────────────────
  return (
    <div className="animate-in">
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1>
          Good{' '}
          {new Date().getHours() < 12
            ? 'Morning'
            : new Date().getHours() < 17
            ? 'Afternoon'
            : 'Evening'}
          , {mimoUser?.displayName?.split(' ')[0]}! 👋
        </h1>
        <p>Ready to start your work session?</p>
      </div>

      <div className="clock-btn-container">
        <button className="clock-btn" onClick={handleClockIn}>
          <span className="clock-icon">▶️</span>
          <span>Clock In</span>
        </button>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
          3-hour session • Auto-stops when timer reaches 0
        </p>
      </div>

      {/* Today's Stats */}
      <div style={{ marginTop: '48px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: 'var(--font-size-lg)' }}>
          Recent Sessions
        </h3>
        {recentSessions.length === 0 ? (
          <div className="empty-state glass-card-static">
            <div className="empty-icon">📋</div>
            <h3>No sessions yet</h3>
            <p>Clock in to start your first work session!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentSessions.map((session) => (
              <div key={session.id} className="glass-card" style={{ padding: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                      {new Date(session.clockInTime).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--text-muted)',
                        marginTop: '2px',
                      }}
                    >
                      {new Date(session.clockInTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {session.clockOutTime &&
                        ` — ${new Date(session.clockOutTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 600,
                        color: 'var(--mimo-accent)',
                      }}
                    >
                      {formatDuration(session.totalDurationMs)}
                    </span>
                    <span
                      className={`badge ${
                        session.status === 'completed'
                          ? 'badge-approved'
                          : session.status === 'flagged'
                          ? 'badge-flagged'
                          : session.status === 'auto-stopped'
                          ? 'badge-break'
                          : 'badge-active'
                      }`}
                    >
                      {session.status}
                    </span>
                    {session.review && (
                      <span
                        className={`badge ${
                          session.review.action === 'approved'
                            ? 'badge-approved'
                            : session.review.action === 'starred'
                            ? 'badge-starred'
                            : session.review.action === 'flagged'
                            ? 'badge-flagged'
                            : 'badge-break'
                        }`}
                      >
                        {session.review.action === 'approved' && '✅'}
                        {session.review.action === 'starred' && '⭐'}
                        {session.review.action === 'flagged' && '🔴'}
                        {session.review.action === 'noted' && '🟡'}
                        {' '}{session.review.action}
                      </span>
                    )}
                  </div>
                </div>
                {session.tasks.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    {session.tasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        style={{
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '4px',
                        }}
                      >
                        <span
                          style={{
                            width: '4px',
                            height: '4px',
                            borderRadius: '50%',
                            background: 'var(--mimo-primary)',
                            flexShrink: 0,
                          }}
                        />
                        {task.title}
                      </div>
                    ))}
                    {session.tasks.length > 3 && (
                      <div
                        style={{
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--text-muted)',
                          marginTop: '4px',
                        }}
                      >
                        +{session.tasks.length - 3} more tasks
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
