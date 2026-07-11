'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getPendingUsers, getAllUsers, getUserSessions, updateUserStatus, createNotification } from '@/lib/firestore';
import { ADMIN_ROLES } from '@/types';
import type { MimoUser, WorkSession } from '@/types';

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

import { getTheme } from '@/lib/theme';

export default function TeamAndApprovalsPage() {
  const { mimoUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'approvals' | 'team'>('approvals');
  
  // Approvals State
  const [pendingUsers, setPendingUsers] = useState<MimoUser[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null);

  // Team State
  const [teamUsers, setTeamUsers] = useState<MimoUser[]>([]);
  const [userSessions, setUserSessions] = useState<Record<string, WorkSession[]>>({});
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [teamFilter, setTeamFilter] = useState<string>('approved');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    loadPending();
    loadTeam();
  }, []);

  const loadPending = async () => {
    const users = await getPendingUsers();
    setPendingUsers(users);
    setLoadingApprovals(false);
  };

  const loadTeam = async () => {
    const allUsers = await getAllUsers();
    setTeamUsers(allUsers);

    // Load sessions for all approved users
    const sessionsMap: Record<string, WorkSession[]> = {};
    for (const user of allUsers.filter((u) => u.status === 'approved')) {
      const sessions = await getUserSessions(user.uid);
      sessionsMap[user.uid] = sessions;
    }
    setUserSessions(sessionsMap);
    setLoadingTeam(false);
  };

  const handleApprove = async (user: MimoUser) => {
    if (!mimoUser) return;
    setActionLoading(user.uid);

    await updateUserStatus(user.uid, 'approved', mimoUser.uid);

    await createNotification({
      userId: user.uid,
      type: 'account_approved',
      title: 'Account Approved! 🎉',
      message: `Your account has been approved by ${mimoUser.displayName}. You can now log in and start working!`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    setPendingUsers((prev) => prev.filter((u) => u.uid !== user.uid));
    // Also add them to the team list
    setTeamUsers((prev) => [...prev, { ...user, status: 'approved' }]);
    setActionLoading(null);
  };

  const handleReject = async (user: MimoUser) => {
    if (!mimoUser) return;
    setActionLoading(user.uid);

    const reason = rejectReason[user.uid] || 'No reason provided';
    await updateUserStatus(user.uid, 'rejected', mimoUser.uid, reason);

    await createNotification({
      userId: user.uid,
      type: 'account_rejected',
      title: 'Account Rejected',
      message: `Your account registration was not approved. Reason: ${reason}`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    setPendingUsers((prev) => prev.filter((u) => u.uid !== user.uid));
    setActionLoading(null);
    setShowRejectForm(null);
  };

  const handleSuspend = async (user: MimoUser) => {
    if (!mimoUser) return;
    const newStatus = user.status === 'suspended' ? 'approved' : 'suspended';
    await updateUserStatus(user.uid, newStatus, mimoUser.uid);
    setTeamUsers((prev) =>
      prev.map((u) => (u.uid === user.uid ? { ...u, status: newStatus } : u))
    );
  };

  const filteredTeamUsers = teamUsers.filter((u) => {
    if (teamFilter === 'all') return true;
    return u.status === teamFilter;
  });

  if (loadingApprovals || loadingTeam) {
    return (
      <div className="loading-screen" style={{ minHeight: '50vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="animate-in">
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          👥 Team & Approvals
          {pendingUsers.length > 0 && (
            <span style={{ 
              background: 'var(--status-flagged)', 
              color: '#fff', 
              fontSize: '14px', 
              padding: '2px 8px', 
              borderRadius: '12px', 
              fontWeight: 'bold' 
            }}>
              {pendingUsers.length} Pending
            </span>
          )}
        </h1>
        <p>Manage all team members and account requests</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <button
          className={`btn ${activeTab === 'approvals' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('approvals')}
          style={{ position: 'relative' }}
        >
          Pending Approvals
          {pendingUsers.length > 0 && (
            <span style={{ 
              position: 'absolute', 
              top: '-6px', 
              right: '-6px', 
              background: 'var(--status-flagged)', 
              color: '#fff', 
              fontSize: '10px', 
              width: '18px', 
              height: '18px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 'bold'
            }}>
              {pendingUsers.length}
            </span>
          )}
        </button>
        <button
          className={`btn ${activeTab === 'team' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('team')}
        >
          Team Directory
        </button>
      </div>

      {/* Tab Content: Approvals */}
      {activeTab === 'approvals' && (
        <>
          {pendingUsers.length === 0 ? (
            <div className="empty-state glass-card-static">
              <div className="empty-icon">✅</div>
              <h3>All caught up!</h3>
              <p>No pending account approvals at this time.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingUsers.map((user) => {
                const initials = user.displayName
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || '?';

                const theme = getTheme(user.department);
                const avatarColor = theme.accent;

                return (
                  <div key={user.uid} className="glass-card-static">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <div className="avatar avatar-lg" style={{ background: avatarColor, color: '#ffffff' }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>
                          {user.displayName}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                          {user.email}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <span className={`badge badge-dept-${user.department.toLowerCase().replace(/\s+/g, '-')}`}>
                            {user.department}
                          </span>
                          <span className="badge" style={{ background: 'var(--bg-glass)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                            {user.role}
                          </span>
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '6px' }}>
                          Registered {new Date(user.joinedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-accent"
                          onClick={() => handleApprove(user)}
                          disabled={actionLoading === user.uid}
                        >
                          {actionLoading === user.uid ? (
                            <span className="spinner spinner-sm" />
                          ) : (
                            '✅ Approve'
                          )}
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() =>
                            showRejectForm === user.uid
                              ? handleReject(user)
                              : setShowRejectForm(user.uid)
                          }
                          disabled={actionLoading === user.uid}
                        >
                          {showRejectForm === user.uid ? 'Confirm Reject' : '❌ Reject'}
                        </button>
                      </div>
                    </div>

                    {showRejectForm === user.uid && (
                      <div style={{ marginTop: '16px' }}>
                        <input
                          className="form-input"
                          placeholder="Reason for rejection (optional)"
                          value={rejectReason[user.uid] || ''}
                          onChange={(e) =>
                            setRejectReason({ ...rejectReason, [user.uid]: e.target.value })
                          }
                        />
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setShowRejectForm(null)}
                          style={{ marginTop: '8px' }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab Content: Team Directory */}
      {activeTab === 'team' && (
        <>
          {/* Department breakdown */}
          <div className="grid-stats" style={{ marginBottom: '24px' }}>
            {Object.entries(
              teamUsers
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
                className={`btn btn-sm ${teamFilter === f ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setTeamFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Team List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredTeamUsers.map((user) => {
              const initials = user.displayName
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || '?';

              const theme = getTheme(user.department);
              const avatarColor = theme.accent;
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
                    <div className="avatar avatar-lg" style={{ background: avatarColor, color: '#ffffff' }}>
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
        </>
      )}
    </div>
  );
}
