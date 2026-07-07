'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getUnreviewedSessions, getAllSessions, reviewSession, createNotification } from '@/lib/firestore';
import type { WorkSession, ReviewAction } from '@/types';

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const DEPT_COLORS: Record<string, string> = {
  'Marketing': 'var(--dept-marketing)',
  'Technical Team': 'var(--dept-technical)',
  'Hardware Team': 'var(--dept-hardware)',
  'Finance': 'var(--dept-finance)',
  'Design': 'var(--dept-design)',
};

export default function ReviewsPage() {
  const { mimoUser } = useAuthStore();
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'unreviewed' | 'all'>('unreviewed');
  const [reviewComment, setReviewComment] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, [filter]);

  const loadSessions = async () => {
    setLoading(true);
    if (filter === 'unreviewed') {
      const s = await getUnreviewedSessions();
      setSessions(s);
    } else {
      const s = await getAllSessions();
      setSessions(s.filter((s) => s.status !== 'active'));
    }
    setLoading(false);
  };

  const handleReview = async (session: WorkSession, action: ReviewAction) => {
    if (!mimoUser) return;
    setActionLoading(session.id);

    const review = {
      reviewedBy: mimoUser.uid,
      reviewerName: mimoUser.displayName,
      action,
      comment: reviewComment[session.id] || undefined,
      reviewedAt: new Date().toISOString(),
    };

    await reviewSession(session.id, review);

    // Send notification to employee
    const notifMap: Record<ReviewAction, { type: string; title: string; message: string }> = {
      approved: {
        type: 'session_noted',
        title: 'Session Approved ✅',
        message: `Your work session has been approved by ${mimoUser.displayName}.${review.comment ? ` Comment: "${review.comment}"` : ''}`,
      },
      noted: {
        type: 'session_noted',
        title: 'Feedback on Your Session 🟡',
        message: `${mimoUser.displayName} left a note on your session: "${review.comment || 'No comment'}"`,
      },
      flagged: {
        type: 'session_flagged',
        title: 'Session Flagged — Action Required 🔴',
        message: `Your work session has been flagged by ${mimoUser.displayName}. You may need to redo or improve this work.${review.comment ? ` Reason: "${review.comment}"` : ''}`,
      },
      starred: {
        type: 'session_starred',
        title: 'Exceptional Work! ⭐',
        message: `${mimoUser.displayName} starred your session for exceptional work!${review.comment ? ` Comment: "${review.comment}"` : ''}`,
      },
    };

    const notifData = notifMap[action];
    await createNotification({
      userId: session.userId,
      type: notifData.type as never,
      title: notifData.title,
      message: notifData.message,
      read: false,
      createdAt: new Date().toISOString(),
    });

    // Remove from list if unreviewed filter
    if (filter === 'unreviewed') {
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
    } else {
      setSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, review, status: action === 'flagged' ? 'flagged' : s.status } : s))
      );
    }

    setActionLoading(null);
    setReviewComment((prev) => ({ ...prev, [session.id]: '' }));
  };

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

      {/* Filter */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '8px' }}>
        <button
          className={`btn btn-sm ${filter === 'unreviewed' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setFilter('unreviewed')}
        >
          Unreviewed ({sessions.length})
        </button>
        <button
          className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setFilter('all')}
        >
          All Sessions
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-state glass-card-static">
          <div className="empty-icon">✅</div>
          <h3>All reviewed!</h3>
          <p>No pending sessions to review.</p>
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

            const avatarColor = DEPT_COLORS[session.userDepartment] || 'var(--mimo-primary)';

            return (
              <div key={session.id} className="session-review-card">
                {/* Header */}
                <div className="session-meta">
                  <div className="avatar" style={{ background: avatarColor }}>
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
                  <span className="session-duration">{formatDuration(session.totalDurationMs)}</span>
                  <span className={`badge badge-dept-${session.userDepartment.toLowerCase().replace(/\s+/g, '-')}`}>
                    {session.userDepartment}
                  </span>
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
                      Breaks: {session.breaks.length} ({formatDuration(session.breakDurationMs)})
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
                      {session.review.action === 'approved' && '✅ Approved'}
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

                {/* Review Actions (only if not yet reviewed) */}
                {!session.review && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <input
                      className="form-input"
                      placeholder="Add a comment (optional)..."
                      value={reviewComment[session.id] || ''}
                      onChange={(e) =>
                        setReviewComment({ ...reviewComment, [session.id]: e.target.value })
                      }
                      style={{ marginBottom: '12px' }}
                    />
                    <div className="review-actions">
                      <button
                        className="review-btn approve"
                        onClick={() => handleReview(session, 'approved')}
                        disabled={actionLoading === session.id}
                      >
                        ✅ Approve
                      </button>
                      <button
                        className="review-btn note"
                        onClick={() => handleReview(session, 'noted')}
                        disabled={actionLoading === session.id}
                      >
                        🟡 Note
                      </button>
                      <button
                        className="review-btn flag"
                        onClick={() => handleReview(session, 'flagged')}
                        disabled={actionLoading === session.id}
                      >
                        🔴 Red Flag
                      </button>
                      <button
                        className="review-btn star"
                        onClick={() => handleReview(session, 'starred')}
                        disabled={actionLoading === session.id}
                      >
                        ⭐ Star
                      </button>
                    </div>
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
