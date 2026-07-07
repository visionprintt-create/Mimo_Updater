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

const DEPT_COLORS: Record<string, string> = {
  'Marketing': 'var(--dept-marketing)',
  'Technical Team': 'var(--dept-technical)',
  'Hardware Team': 'var(--dept-hardware)',
  'Finance': 'var(--dept-finance)',
  'Design': 'var(--dept-design)',
};

export default function ProfilePage() {
  const { mimoUser } = useAuthStore();
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mimoUser) return;
    getUserSessions(mimoUser.uid).then((s) => {
      setSessions(s);
      setLoading(false);
    });
  }, [mimoUser]);

  if (loading || !mimoUser) {
    return (
      <div className="loading-screen" style={{ minHeight: '50vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const totalHours = sessions.reduce((acc, s) => acc + s.totalDurationMs, 0);
  const starCount = sessions.filter((s) => s.review?.action === 'starred').length;
  const flagCount = sessions.filter((s) => s.review?.action === 'flagged').length;
  const approvedCount = sessions.filter((s) => s.review?.action === 'approved').length;

  // Calculate streak
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sortedDates = [...new Set(
    sessions
      .filter((s) => s.status !== 'active')
      .map((s) => {
        const d = new Date(s.clockInTime);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
  )].sort((a, b) => b - a);

  if (sortedDates.length > 0) {
    let checkDate = today.getTime();
    for (const dateMs of sortedDates) {
      if (dateMs === checkDate || dateMs === checkDate - 86400000) {
        streak++;
        checkDate = dateMs - 86400000;
      } else {
        break;
      }
    }
  }

  const initials = mimoUser.displayName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const avatarColor = DEPT_COLORS[mimoUser.department] || 'var(--mimo-primary)';

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1>👤 Profile</h1>
      </div>

      {/* Profile Card */}
      <div className="glass-card-static" style={{ maxWidth: '600px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="avatar avatar-xl" style={{ background: avatarColor }}>
            {initials}
          </div>
          <div>
            <h2 style={{ fontSize: 'var(--font-size-2xl)' }}>{mimoUser.displayName}</h2>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              <span className={`badge badge-dept-${mimoUser.department.toLowerCase().replace(/\s+/g, '-')}`}>
                {mimoUser.department}
              </span>
              <span className="badge" style={{ background: 'var(--bg-glass)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                {mimoUser.role}
              </span>
            </div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginTop: '8px' }}>
              {mimoUser.email}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
              Joined {new Date(mimoUser.joinedAt).toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <h3 style={{ marginBottom: '16px', fontSize: 'var(--font-size-lg)' }}>Performance</h3>
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
          <div className="stat-label">Current Streak</div>
          <div className="stat-value">{streak} 🔥</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Stars Earned</div>
          <div className="stat-value" style={{ color: 'var(--status-starred)' }}>
            {starCount} ⭐
          </div>
        </div>
      </div>

      {/* Review Stats */}
      <h3 style={{ marginBottom: '16px', fontSize: 'var(--font-size-lg)' }}>Review History</h3>
      <div className="grid-stats">
        <div className="stat-card">
          <div className="stat-label">Approved</div>
          <div className="stat-value" style={{ color: 'var(--status-active)' }}>
            {approvedCount}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Starred</div>
          <div className="stat-value" style={{ color: 'var(--status-starred)' }}>
            {starCount}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Flagged</div>
          <div className="stat-value" style={{ color: 'var(--status-flagged)' }}>
            {flagCount}
          </div>
        </div>
      </div>
    </div>
  );
}
