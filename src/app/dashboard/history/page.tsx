'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getUserSessions } from '@/lib/firestore';
import type { WorkSession } from '@/types';

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function HistoryPage() {
  const { mimoUser } = useAuthStore();
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!mimoUser) return;
    getUserSessions(mimoUser.uid).then((s) => {
      setSessions(s);
      setLoading(false);
    });
  }, [mimoUser]);

  const filteredSessions = sessions.filter((s) => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  const totalHours = sessions.reduce((acc, s) => acc + s.totalDurationMs, 0);
  const avgSession = sessions.length > 0 ? totalHours / sessions.length : 0;

  if (loading) {
    return (
      <div className="loading-screen" style={{ minHeight: '50vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1>📅 Work History</h1>
        <p>Your complete work session log</p>
      </div>

      {/* Stats */}
      <div className="grid-stats" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-label">Total Sessions</div>
          <div className="stat-value">{sessions.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Hours</div>
          <div className="stat-value">{formatDuration(totalHours)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Session</div>
          <div className="stat-value">{formatDuration(avgSession)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Flagged</div>
          <div className="stat-value" style={{ color: 'var(--status-flagged)' }}>
            {sessions.filter((s) => s.status === 'flagged').length}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {['all', 'completed', 'auto-stopped', 'flagged'].map((f) => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <div className="empty-state glass-card-static">
          <div className="empty-icon">📋</div>
          <h3>No sessions found</h3>
          <p>No work sessions match the selected filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredSessions.map((session) => (
            <div key={session.id} className="session-review-card">
              <div className="session-meta">
                <span style={{ fontWeight: 600 }}>
                  {new Date(session.clockInTime).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                  {new Date(session.clockInTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {session.clockOutTime &&
                    ` — ${new Date(session.clockOutTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`}
                </span>
                <span className="session-duration">{formatDuration(session.totalDurationMs)}</span>
                <span
                  className={`badge ${
                    session.status === 'completed'
                      ? 'badge-approved'
                      : session.status === 'flagged'
                      ? 'badge-flagged'
                      : 'badge-break'
                  }`}
                >
                  {session.status}
                </span>
              </div>

              {session.workSummary && (
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {session.workSummary}
                </p>
              )}

              {session.tasks.length > 0 && (
                <div className="session-tasks">
                  {session.tasks.map((task) => (
                    <div key={task.id} className="session-task-item">
                      <div className="session-task-bullet" />
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>
                          {task.title}
                        </div>
                        {task.description && (
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                            {task.description}
                          </div>
                        )}
                        <span className="badge" style={{ marginTop: '4px', fontSize: '10px', padding: '2px 6px' }}>
                          {task.category}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {session.review && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '12px',
                    background: 'var(--bg-glass)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: `3px solid ${
                      session.review.action === 'approved'
                        ? 'var(--status-active)'
                        : session.review.action === 'starred'
                        ? 'var(--status-starred)'
                        : session.review.action === 'flagged'
                        ? 'var(--status-flagged)'
                        : 'var(--status-break)'
                    }`,
                  }}
                >
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Review by {session.review.reviewerName}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {session.review.action === 'approved' && '✅ Approved'}
                    {session.review.action === 'starred' && '⭐ Starred'}
                    {session.review.action === 'flagged' && '🔴 Flagged — Redo Required'}
                    {session.review.action === 'noted' && '🟡 Note Added'}
                  </div>
                  {session.review.comment && (
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      &ldquo;{session.review.comment}&rdquo;
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
