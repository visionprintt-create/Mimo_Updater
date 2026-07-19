'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getAllSessions, reviewSession, getAllUsers } from '@/lib/firestore';
import { ADMIN_ROLES } from '@/types';
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
    const [s, usrs] = await Promise.all([getAllSessions(), getAllUsers()]);
    const adminUids = new Set(usrs.filter(u => ADMIN_ROLES.includes(u.role)).map(u => u.uid));
    const completed = s.filter((x) => x.status !== 'active' && !adminUids.has(x.userId));
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

                             {/* Work Summary & Tasks */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {session.workSummary && (
                    <div style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                      {session.workSummary}
                    </div>
                  )}

                  {session.tasks.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <h4 style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Tasks Completed</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {session.tasks.map((task) => (
                          <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--mimo-primary)', marginTop: '8px', flexShrink: 0 }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{task.title}</div>
                              {task.description && (
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                  {task.description}
                                </div>
                              )}
                              <div>
                                <span style={{ background: '#ffffff', color: 'var(--mimo-primary)', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, border: '1px solid var(--border-color)' }}>
                                  {task.category.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Extra Metadata (Mood, Breaks, Blockers) */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px' }}>
                  {session.mood && (
                    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Mood:</span> 
                      <span>{session.mood === 'frustrated' ? '😤' : session.mood === 'neutral' ? '😐' : session.mood === 'good' ? '😊' : '🔥'}</span>
                    </div>
                  )}
                  {session.breaks.length > 0 && (
                    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Breaks:</span> 
                      <span style={{ color: 'var(--text-primary)' }}>{session.breaks.length} ({fmtDur(session.breakDurationMs)})</span>
                    </div>
                  )}
                  
                  {session.blockers && (
                    <div style={{ flex: '1 1 100%', display: 'flex', gap: '8px', padding: '12px', background: 'rgba(225, 112, 85, 0.05)', borderRadius: '8px', border: '1px solid rgba(225, 112, 85, 0.2)' }}>
                      <span style={{ color: 'var(--status-flagged)', fontSize: '16px' }}>⚠️</span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ color: 'var(--status-flagged)', fontSize: '12px', textTransform: 'uppercase' }}>Blockers</strong>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5 }}>{session.blockers}</span>
                      </div>
                    </div>
                  )}

                  {session.achievements && (
                    <div style={{ flex: '1 1 100%', display: 'flex', gap: '8px', padding: '12px', background: 'rgba(0, 184, 148, 0.05)', borderRadius: '8px', border: '1px solid rgba(0, 184, 148, 0.2)' }}>
                      <span style={{ color: 'var(--status-active)', fontSize: '16px' }}>⭐</span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ color: 'var(--status-active)', fontSize: '12px', textTransform: 'uppercase' }}>Achievements</strong>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5 }}>{session.achievements}</span>
                      </div>
                    </div>
                  )}
                </div>
                </div>


              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
