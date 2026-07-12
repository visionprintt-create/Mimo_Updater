'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getAllSessions } from '@/lib/firestore';
import type { WorkSession } from '@/types';

import { fmtDur } from '@/lib/utils';
import { getTheme } from '@/lib/theme';

export default function ReviewsPage() {
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = async () => {
    setLoading(true);
    const s = await getAllSessions();
    const completed = s.filter((x) => x.status !== 'active');
    completed.sort((a, b) => {
      const deptA = a.userDepartment || '';
      const deptB = b.userDepartment || '';
      if (deptA < deptB) return -1;
      if (deptA > deptB) return 1;
      return new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime();
    });
    setSessions(completed);
    setLoading(false);
  };

  useEffect(() => {
    loadSessions();
  }, []);

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
        <h1>📋 Work Reviews</h1>
        <p>Review and provide feedback on completed work sessions</p>
      </div>

      {/* No filters needed as it shows all completed sessions */}

      {sessions.length === 0 ? (
        <div className="empty-state glass-card-static">
          <div className="empty-icon">✅</div>
          <h3>No work found</h3>
          <p>There are currently no completed sessions.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {sessions.map((session) => {
            const initials = session.userName
              ?.split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || '?';

            const theme = getTheme(session.userDepartment);
            const avatarColor = theme.accent;

            return (
              <div key={session.id} className="session-review-card">
                {/* Header */}
                <div className="session-meta">
                      <div className="avatar avatar-lg" style={{ background: avatarColor, color: '#ffffff' }}>
                        {initials}
                      </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{session.userName}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                      {new Date(session.clockInTime).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      •{' '}
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
                  <span className="session-duration">{fmtDur(session.totalDurationMs)}</span>
                  <span className={`badge badge-dept-${session.userDepartment.toLowerCase().replace(/\s+/g, '-')}`}>
                    {session.userDepartment}
                  </span>
                  <span
                    className={`badge ${
                      session.review?.action === 'paid'
                        ? 'badge-approved'
                        : session.review?.action === 'unpaid'
                        ? 'badge-flagged'
                        : session.status === 'completed'
                        ? 'badge-noted'
                        : 'badge-break'
                    }`}
                  >
                    {session.review?.action === 'paid' ? 'PAID' : (session.review?.action === 'unpaid' || session.status === 'completed') ? 'NOT PAID' : session.status}
                  </span>
                </div>

                {/* Work Summary */}
                {session.workSummary && (
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: '12px 0' }}>
                    {session.workSummary}
                  </p>
                )}

                {/* Tasks */}
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
                          <span className="badge" style={{ marginTop: '2px', fontSize: '10px', padding: '2px 6px' }}>
                            {task.category}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Mood & extras */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
                  {session.mood && (
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                      Mood: {session.mood === 'frustrated' ? '😤' : session.mood === 'neutral' ? '😐' : session.mood === 'good' ? '😊' : '🔥'}
                    </span>
                  )}
                  {session.breaks.length > 0 && (
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                      Breaks: {session.breaks.length} ({fmtDur(session.breakDurationMs)})
                    </span>
                  )}
                </div>

                {session.blockers && (
                  <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(225, 112, 85, 0.08)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)' }}>
                    <strong style={{ color: 'var(--status-flagged)' }}>Blockers:</strong>{' '}
                    <span style={{ color: 'var(--text-secondary)' }}>{session.blockers}</span>
                  </div>
                )}

                {session.achievements && (
                  <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(0, 184, 148, 0.08)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)' }}>
                    <strong style={{ color: 'var(--status-active)' }}>Achievements:</strong>{' '}
                    <span style={{ color: 'var(--text-secondary)' }}>{session.achievements}</span>
                  </div>
                )}

                {/* Existing review */}
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
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                      Reviewed by {session.review.reviewerName} •{' '}
                      {new Date(session.review.reviewedAt).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>
                      {session.review.action === 'paid' && '✅ Paid'}
                      {session.review.action === 'unpaid' && '🔴 Not Paid'}
                      {session.review.action === 'approved' && '✅ Approved (Legacy)'}
                      {session.review.action === 'starred' && '⭐ Starred — Exceptional'}
                      {session.review.action === 'flagged' && '🔴 Flagged — Needs Redo'}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
