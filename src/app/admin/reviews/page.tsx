'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getAllSessions, reviewSession } from '@/lib/firestore';
import type { WorkSession } from '@/types';

import { fmtDur } from '@/lib/utils';
import { getTheme } from '@/lib/theme';

export default function ReviewsPage() {
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [userStats, setUserStats] = useState<Record<string, { currentMonthMs: number, previousMonthMs: number }>>({});
  const [loading, setLoading] = useState(true);
  const mimoUser = useAuthStore((s) => s.mimoUser);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

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
    
    const stats: Record<string, { currentMonthMs: number, previousMonthMs: number }> = {};
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    completed.forEach(session => {
      const d = new Date(session.clockInTime);
      const m = d.getMonth();
      const y = d.getFullYear();
      const ms = session.totalDurationMs || 0;
      
      if (!stats[session.userId]) {
        stats[session.userId] = { currentMonthMs: 0, previousMonthMs: 0 };
      }
      
      if (m === currentMonth && y === currentYear) {
        stats[session.userId].currentMonthMs += ms;
      } else if (m === previousMonth && y === previousMonthYear) {
        stats[session.userId].previousMonthMs += ms;
      }
    });
    
    setUserStats(stats);
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
                    {userStats[session.userId] && (
                      <div style={{ fontSize: '11px', color: 'var(--mimo-primary)', marginTop: '2px', marginBottom: '4px', fontWeight: 500 }}>
                        This Month: {fmtDur(userStats[session.userId].currentMonthMs)} • Last Month: {fmtDur(userStats[session.userId].previousMonthMs)}
                      </div>
                    )}
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
                  <span className={`badge badge-dept-${(session.userDepartments?.[0] || session.userDepartment || 'other').toLowerCase().replace(/\s+/g, '-')}`}>
                    {(session.userDepartments?.[0] || session.userDepartment || 'Unknown')}
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



              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
