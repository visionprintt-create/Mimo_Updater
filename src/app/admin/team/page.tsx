'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getAllUsers, getUserSessions, updateUserStatus } from '@/lib/firestore';
import type { MimoUser, WorkSession } from '@/types';
import { ADMIN_ROLES } from '@/types';

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

export default function TeamPage() {
  const { mimoUser: currentAdmin } = useAuthStore();
  const [users, setUsers] = useState<MimoUser[]>([]);
  const [userSessions, setUserSessions] = useState<Record<string, WorkSession[]>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('approved');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    const allUsers = await getAllUsers();
    setUsers(allUsers);

    // Load sessions for all approved users
    const sessionsMap: Record<string, WorkSession[]> = {};
    for (const user of allUsers.filter((u) => u.status === 'approved')) {
      const sessions = await getUserSessions(user.uid);
      sessionsMap[user.uid] = sessions;
    }
    setUserSessions(sessionsMap);
    setLoading(false);
  };

  const handleSuspend = async (user: MimoUser) => {
    if (!currentAdmin) return;
    const newStatus = user.status === 'suspended' ? 'approved' : 'suspended';
    await updateUserStatus(user.uid, newStatus, currentAdmin.uid);
    setUsers((prev) =>
      prev.map((u) => (u.uid === user.uid ? { ...u, status: newStatus } : u))
    );
  };

  const filteredUsers = users.filter((u) => {
    if (filter === 'all') return true;
    return u.status === filter;
  });

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
        <h1>👥 Team Management</h1>
        <p>{users.filter((u) => u.status === 'approved').length} active team members</p>
      </div>

      {/* Department breakdown */}
      <div className="grid-stats" style={{ marginBottom: '24px' }}>
        {Object.entries(
          users
            .filter((u) => u.status === 'approved')
            .reduce((acc: Record<string, number>, u) => {
              acc[u.department] = (acc[u.department] || 0) + 1;
              return acc;
            }, {})
        ).map(([dept, count]) => (
          <div className="stat-card" key={dept}>
            <div className="stat-label">{dept}</div>
            <div className="stat-value">{count}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {['approved', 'suspended', 'all'].map((f) => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Team List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredUsers.map((user) => {
          const initials = user.displayName
            ?.split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || '?';

          const avatarColor = DEPT_COLORS[user.department] || 'var(--mimo-primary)';
          const sessions = userSessions[user.uid] || [];
          const totalHours = sessions.reduce((acc, s) => acc + s.totalDurationMs, 0);
          const flagCount = sessions.filter((s) => s.review?.action === 'flagged').length;
          const starCount = sessions.filter((s) => s.review?.action === 'starred').length;
          const isExpanded = expandedUser === user.uid;

          return (
            <div key={user.uid} className="glass-card-static">
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', flexWrap: 'wrap' }}
                onClick={() => setExpandedUser(isExpanded ? null : user.uid)}
              >
                <div className="avatar avatar-lg" style={{ background: avatarColor }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <div style={{ fontWeight: 600 }}>{user.displayName}</div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                    {user.email}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                    <span className={`badge badge-dept-${user.department.toLowerCase().replace(/\s+/g, '-')}`}>
                      {user.department}
                    </span>
                    <span className="badge" style={{ background: 'var(--bg-glass)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                      {user.role}
                    </span>
                    <span className={`badge badge-${user.status}`}>
                      {user.status}
                    </span>
                  </div>
                </div>

                {/* Quick stats */}
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Sessions</div>
                    <div style={{ fontWeight: 600 }}>{sessions.length}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Hours</div>
                    <div style={{ fontWeight: 600 }}>{formatDuration(totalHours)}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>⭐</div>
                    <div style={{ fontWeight: 600, color: 'var(--status-starred)' }}>{starCount}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>🔴</div>
                    <div style={{ fontWeight: 600, color: 'var(--status-flagged)' }}>{flagCount}</div>
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                      Joined: {new Date(user.joinedAt).toLocaleDateString()}
                    </div>
                    {user.approvedAt && (
                      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                        • Approved: {new Date(user.approvedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* Recent sessions */}
                  {sessions.length > 0 && (
                    <div>
                      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '8px' }}>
                        Recent Sessions
                      </div>
                      {sessions.slice(0, 5).map((s) => (
                        <div
                          key={s.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '6px 0',
                            borderBottom: '1px solid var(--border-color)',
                            fontSize: 'var(--font-size-sm)',
                          }}
                        >
                          <span>{new Date(s.clockInTime).toLocaleDateString()}</span>
                          <span style={{ color: 'var(--mimo-accent)' }}>{formatDuration(s.totalDurationMs)}</span>
                          <span>{s.tasks.length} tasks</span>
                          <span
                            className={`badge badge-${
                              s.review?.action === 'flagged'
                                ? 'flagged'
                                : s.review?.action === 'starred'
                                ? 'starred'
                                : s.status === 'completed'
                                ? 'approved'
                                : 'break'
                            }`}
                            style={{ fontSize: '10px' }}
                          >
                            {s.review?.action || s.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  {!ADMIN_ROLES.includes(user.role) && (
                    <div style={{ marginTop: '16px' }}>
                      <button
                        className={`btn btn-sm ${user.status === 'suspended' ? 'btn-accent' : 'btn-danger'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSuspend(user);
                        }}
                      >
                        {user.status === 'suspended' ? '✅ Reactivate' : '⛔ Suspend'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
