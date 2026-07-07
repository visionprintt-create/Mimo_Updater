'use client';

import { useEffect, useState } from 'react';
import { onActiveSessions, getAllUsers, getPendingUsers, getUnreviewedSessions, getTodaysSessions } from '@/lib/firestore';
import type { WorkSession, MimoUser } from '@/types';

const DEPT_COLORS: Record<string, string> = {
  'Marketing': 'var(--dept-marketing)',
  'Technical Team': 'var(--dept-technical)',
  'Hardware Team': 'var(--dept-hardware)',
  'Finance': 'var(--dept-finance)',
  'Design': 'var(--dept-design)',
};

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

export default function AdminOverviewPage() {
  const [activeSessions, setActiveSessions] = useState<WorkSession[]>([]);
  const [allUsers, setAllUsers] = useState<MimoUser[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreviewedCount, setUnreviewedCount] = useState(0);
  const [todaysSessions, setTodaysSessions] = useState<WorkSession[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Real-time active sessions
    const unsub = onActiveSessions(setActiveSessions);

    // Fetch other data
    getAllUsers().then(setAllUsers);
    getPendingUsers().then((p) => setPendingCount(p.length));
    getUnreviewedSessions().then((s) => setUnreviewedCount(s.length));
    getTodaysSessions().then(setTodaysSessions);

    // Tick for timer display
    const interval = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const approvedUsers = allUsers.filter((u) => u.status === 'approved');
  const todayTotalHours = todaysSessions.reduce((acc, s) => acc + s.totalDurationMs, 0);

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1>📊 Admin Overview</h1>
        <p>Real-time team monitoring & management</p>
      </div>

      {/* Quick Stats */}
      <div className="grid-stats" style={{ marginBottom: '32px' }}>
        <div className="stat-card">
          <div className="stat-label">Active Now</div>
          <div className="stat-value" style={{ color: 'var(--status-active)' }}>
            {activeSessions.length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Team Members</div>
          <div className="stat-value">{approvedUsers.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Approvals</div>
          <div className="stat-value" style={{ color: pendingCount > 0 ? 'var(--status-pending)' : undefined }}>
            {pendingCount}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Unreviewed Sessions</div>
          <div className="stat-value" style={{ color: unreviewedCount > 0 ? 'var(--status-break)' : undefined }}>
            {unreviewedCount}
          </div>
        </div>
      </div>

      {/* Today's Summary */}
      <div className="grid-stats" style={{ marginBottom: '32px' }}>
        <div className="stat-card">
          <div className="stat-label">Today&apos;s Sessions</div>
          <div className="stat-value">{todaysSessions.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Today&apos;s Total Hours</div>
          <div className="stat-value">{formatDuration(todayTotalHours)}</div>
        </div>
      </div>

      {/* Live Team Board */}
      <h3 style={{ marginBottom: '16px', fontSize: 'var(--font-size-xl)' }}>
        🟢 Live Team Board
      </h3>

      {activeSessions.length === 0 ? (
        <div className="empty-state glass-card-static">
          <div className="empty-icon">😴</div>
          <h3>No one is working right now</h3>
          <p>Active sessions will appear here in real-time.</p>
        </div>
      ) : (
        <div className="team-grid">
          {activeSessions.map((session) => {
            const elapsed = now - new Date(session.clockInTime).getTime() - session.breakDurationMs;
            const lastBreak = session.breaks[session.breaks.length - 1];
            const onBreak = lastBreak ? !lastBreak.endedAt : false;

            let adjustedElapsed = elapsed;
            if (onBreak && lastBreak) {
              adjustedElapsed = elapsed - (now - new Date(lastBreak.startedAt).getTime());
            }

            const remaining = Math.max(0, 3 * 60 * 60 * 1000 - adjustedElapsed);
            const avatarColor = DEPT_COLORS[session.userDepartment] || 'var(--mimo-primary)';
            const initials = session.userName
              ?.split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || '?';

            return (
              <div
                key={session.id}
                className={`team-member-card ${onBreak ? 'on-break' : 'working'}`}
              >
                <div className="team-member-header">
                  <div className="avatar" style={{ background: avatarColor }}>
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                      {session.userName}
                    </div>
                    <span
                      className={`badge ${onBreak ? 'badge-break' : 'badge-active'}`}
                      style={{ marginTop: '4px' }}
                    >
                      {onBreak ? '☕ Break' : '🔥 Working'}
                    </span>
                  </div>
                </div>
                <div className="team-member-timer">
                  {formatTime(remaining)}
                </div>
                <div className="team-member-task">
                  <span className={`badge badge-dept-${session.userDepartment.toLowerCase().replace(/\s+/g, '-')}`}>
                    {session.userDepartment}
                  </span>
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Clocked in at{' '}
                  {new Date(session.clockInTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {session.breaks.length > 0 && ` • ${session.breaks.length} break(s)`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Actions Hint */}
      <div
        style={{
          marginTop: '32px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        {pendingCount > 0 && (
          <a href="/admin/approvals" className="btn btn-ghost">
            ✅ {pendingCount} Pending Approval{pendingCount > 1 ? 's' : ''}
          </a>
        )}
        {unreviewedCount > 0 && (
          <a href="/admin/reviews" className="btn btn-ghost">
            📋 {unreviewedCount} Session{unreviewedCount > 1 ? 's' : ''} to Review
          </a>
        )}
      </div>
    </div>
  );
}
