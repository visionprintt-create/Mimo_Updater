'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getUserNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/firestore';
import type { MimoNotification } from '@/types';

function timeAgo(dateStr: string): string {
  const now = new Date().getTime();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

const NOTIF_ICONS: Record<string, string> = {
  account_approved: '✅',
  account_rejected: '❌',
  session_flagged: '🔴',
  session_starred: '⭐',
  session_noted: '🟡',
  session_auto_stopped: '⏰',
  general: '📢',
};

export default function NotificationsPage() {
  const { mimoUser } = useAuthStore();
  const [notifications, setNotifications] = useState<MimoNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mimoUser) return;
    getUserNotifications(mimoUser.uid).then((n) => {
      setNotifications(n);
      setLoading(false);
    });
  }, [mimoUser]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = async (notif: MimoNotification) => {
    if (!notif.read) {
      await markNotificationRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
    }
  };

  const handleMarkAllRead = async () => {
    if (!mimoUser) return;
    await markAllNotificationsRead(mimoUser.uid);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>🔔 Notifications</h1>
          <p>{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}</p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state glass-card-static">
          <div className="empty-icon">🔕</div>
          <h3>No notifications</h3>
          <p>You&apos;re all caught up! Notifications will appear here when admins review your work.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="glass-card"
              onClick={() => handleMarkRead(notif)}
              style={{
                cursor: 'pointer',
                padding: '16px',
                borderLeft: !notif.read ? '3px solid var(--mimo-primary)' : undefined,
                opacity: notif.read ? 0.7 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '24px', flexShrink: 0 }}>
                  {NOTIF_ICONS[notif.type] || '📢'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                    {notif.title}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {notif.message}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {timeAgo(notif.createdAt)}
                  </div>
                </div>
                {!notif.read && (
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--mimo-primary)',
                      flexShrink: 0,
                      marginTop: '6px',
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
