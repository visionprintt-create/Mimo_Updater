'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { onUserNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/firestore';
import type { MimoNotification } from '@/types';
import { FiMenu } from 'react-icons/fi';

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

export default function Header() {
  const { mimoUser } = useAuthStore();
  const { toggleSidebar } = useUIStore();
  const [notifications, setNotifications] = useState<MimoNotification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!mimoUser) return;
    const unsub = onUserNotifications(mimoUser.uid, setNotifications);
    return () => unsub();
  }, [mimoUser]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    if (mimoUser) {
      await markAllNotificationsRead(mimoUser.uid);
    }
  };

  const handleNotifClick = async (notif: MimoNotification) => {
    if (!notif.read) {
      await markNotificationRead(notif.id);
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <button 
          className="mobile-menu-btn" 
          onClick={toggleSidebar}
          aria-label="Toggle Sidebar"
        >
          <FiMenu size={24} />
        </button>
        <h4 style={{ fontSize: 'var(--font-size-md)', fontWeight: 500, color: 'var(--text-secondary)' }} className="header-dept">
          {mimoUser?.department || ''}
        </h4>
      </div>

      <div className="header-right" ref={dropdownRef}>
        <div style={{ position: 'relative' }}>
          <button
            className="notif-btn"
            onClick={() => setShowNotifs(!showNotifs)}
            aria-label="Notifications"
          >
            🔔
            {unreadCount > 0 && <span className="notif-count">{unreadCount}</span>}
          </button>

          {showNotifs && (
            <div className="notif-dropdown animate-in">
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--mimo-primary-light)',
                      cursor: 'pointer',
                      fontSize: 'var(--font-size-xs)',
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="empty-state" style={{ padding: '32px' }}>
                  <div className="empty-icon">🔕</div>
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.slice(0, 10).map((notif) => (
                  <div
                    key={notif.id}
                    className={`notif-item ${!notif.read ? 'unread' : ''}`}
                    onClick={() => handleNotifClick(notif)}
                  >
                    <div className="notif-item-title">{notif.title}</div>
                    <div className="notif-item-message">{notif.message}</div>
                    <div className="notif-item-time">{timeAgo(notif.createdAt)}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
