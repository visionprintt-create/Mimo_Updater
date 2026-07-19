'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getPendingUsers, getAllUsers, getUserStats, getRecentUserSessions, updateUserStatus, createNotification, deleteUserAccount, updateUserInternshipDates } from '@/lib/firestore';
import { ADMIN_ROLES, DEPARTMENTS } from '@/types';
import type { MimoUser, WorkSession, Department } from '@/types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { fmtDur } from '@/lib/utils';

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
  const [userStats, setUserStats] = useState<Record<string, { sessionCount: number; totalDurationMs: number }>>({});
  const [userRecentSessions, setUserRecentSessions] = useState<Record<string, WorkSession[]>>({});
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

    // Load stats for all approved users
    const statsMap: Record<string, { sessionCount: number; totalDurationMs: number }> = {};
    for (const user of allUsers.filter((u) => u.status === 'approved')) {
      const stats = await getUserStats(user.uid);
      statsMap[user.uid] = stats;
    }
    setUserStats(statsMap);
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

  const handleDelete = async (user: MimoUser) => {
    if (!mimoUser) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${user.displayName} and completely wipe all their logged sessions and tasks? This cannot be undone.`)) return;
    await deleteUserAccount(user.uid);
    setTeamUsers((prev) => prev.filter((u) => u.uid !== user.uid));
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

                const depts = user.departments || (user.department ? [user.department] : []);
                const theme = getTheme(depts[0]);
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
                          {depts.map(d => (
                            <span key={d} className={`badge badge-dept-${d.toLowerCase().replace(/\s+/g, '-')}`}>
                              {d}
                            </span>
                          ))}
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
                          {user.role === 'intern' && (
                            <div style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>
                              🗓️ Internship: {user.internshipStartDate ? new Date(user.internshipStartDate).toLocaleDateString() : 'Not set'} – {user.internshipEndDate ? new Date(user.internshipEndDate).toLocaleDateString() : 'Not set'}
                            </div>
                          )}
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
                  const depts = u.departments || (u.department ? [u.department] : []);
                  depts.forEach(d => acc[d] = (acc[d] || 0) + 1);
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

              const depts = user.departments || (user.department ? [user.department] : []);
              const theme = getTheme(depts[0]);
              const avatarColor = theme.accent;
              const stats = userStats[user.uid] || { sessionCount: 0, totalDurationMs: 0 };
              const isExpanded = expandedUser === user.uid;
              const recentSessions = userRecentSessions[user.uid] || [];

              return (
                <div key={user.uid} className="glass-card-static">
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', flexWrap: 'wrap' }}
                    onClick={async () => {
                      const expanding = !isExpanded;
                      setExpandedUser(expanding ? user.uid : null);
                      if (expanding && !userRecentSessions[user.uid]) {
                        const sessions = await getRecentUserSessions(user.uid, 5);
                        setUserRecentSessions(prev => ({ ...prev, [user.uid]: sessions }));
                      }
                    }}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px', background: 'var(--bg-glass)', borderRadius: '8px', border: '1px solid var(--border-color)' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Departments</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {DEPARTMENTS.map(d => {
                              const hasDept = depts.includes(d);
                              return (
                                <label key={d} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer', opacity: hasDept ? 1 : 0.5 }}>
                                  <input 
                                    type="checkbox" 
                                    checked={hasDept} 
                                    onChange={async (e) => {
                                      const checked = e.target.checked;
                                      let newDepts = [...depts];
                                      if (checked) newDepts.push(d);
                                      else if (newDepts.length > 1) newDepts = newDepts.filter(x => x !== d);
                                      
                                      setTeamUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, departments: newDepts } : u));
                                      await updateDoc(doc(db, 'users', user.uid), { departments: newDepts });
                                    }}
                                  />
                                  {d}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        <span className="badge" style={{ background: 'var(--bg-glass)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                          {user.role}
                        </span>
                        <span className={`badge badge-${user.status}`}>
                          {user.status}
                        </span>
                        {user.role === 'intern' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', marginLeft: '8px' }} onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="date" 
                              value={user.internshipStartDate ? user.internshipStartDate.split('T')[0] : ''}
                              onChange={async (e) => {
                                const newDate = e.target.value;
                                setTeamUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, internshipStartDate: newDate } : u));
                                await updateUserInternshipDates(user.uid, newDate, user.internshipEndDate || '');
                              }}
                              style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 4px', color: 'var(--text-primary)', outline: 'none' }}
                            />
                            <span style={{ color: 'var(--text-muted)' }}>to</span>
                            <input 
                              type="date" 
                              value={user.internshipEndDate ? user.internshipEndDate.split('T')[0] : ''}
                              onChange={async (e) => {
                                const newDate = e.target.value;
                                setTeamUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, internshipEndDate: newDate } : u));
                                await updateUserInternshipDates(user.uid, user.internshipStartDate || '', newDate);
                              }}
                              style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 4px', color: 'var(--text-primary)', outline: 'none' }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick stats */}
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Sessions</div>
                        <div style={{ fontWeight: 600 }}>{stats.sessionCount}</div>
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
                      {isExpanded && recentSessions.length > 0 && (
                        <div>
                          <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '8px' }}>
                            Recent Sessions
                          </div>
                          {recentSessions.map((s) => (
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
                              <span style={{ color: 'var(--mimo-accent)' }}>{fmtDur(s.totalDurationMs)}</span>
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
                        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                          <button
                            className={`btn btn-sm ${user.status === 'suspended' ? 'btn-accent' : 'btn-danger'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSuspend(user);
                            }}
                          >
                            {user.status === 'suspended' ? '✅ Reactivate' : '⛔ Suspend'}
                          </button>
                          
                          <button
                            className="btn btn-sm btn-ghost"
                            style={{ color: 'var(--status-flagged)', border: '1px solid var(--status-flagged)' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(user);
                            }}
                          >
                            🗑️ Delete
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
