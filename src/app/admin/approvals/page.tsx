'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getPendingUsers, updateUserStatus, createNotification } from '@/lib/firestore';
import type { MimoUser } from '@/types';

const DEPT_COLORS: Record<string, string> = {
  'Marketing': 'var(--dept-marketing)',
  'Technical Team': 'var(--dept-technical)',
  'Hardware Team': 'var(--dept-hardware)',
  'Finance': 'var(--dept-finance)',
  'Design': 'var(--dept-design)',
};

export default function ApprovalsPage() {
  const { mimoUser } = useAuthStore();
  const [pendingUsers, setPendingUsers] = useState<MimoUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    const users = await getPendingUsers();
    setPendingUsers(users);
    setLoading(false);
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
        <h1>✅ Account Approvals</h1>
        <p>
          {pendingUsers.length > 0
            ? `${pendingUsers.length} account${pendingUsers.length > 1 ? 's' : ''} waiting for approval`
            : 'No pending approvals'}
        </p>
      </div>

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

            const avatarColor = DEPT_COLORS[user.department] || 'var(--mimo-primary)';

            return (
              <div key={user.uid} className="glass-card-static">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div className="avatar avatar-lg" style={{ background: avatarColor }}>
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
    </div>
  );
}
