'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { 
  onUserNotifications, 
  markNotificationRead, 
  markAllNotificationsRead 
} from '@/lib/firestore';
import type { MimoNotification } from '@/types';
import { getTheme } from '@/lib/theme';
import { useUIStore } from '@/store/uiStore';

export default function Notifications() {
  const { mimoUser } = useAuthStore();
  const { deptFilter } = useUIStore();
  const [notifications, setNotifications] = useState<MimoNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const depts = mimoUser?.departments || (mimoUser?.department ? [mimoUser.department] : []);
  const activeDept = deptFilter || depts[0];
  const C = getTheme(activeDept);

  useEffect(() => {
    if (!mimoUser) return;
    const unsub = onUserNotifications(mimoUser.uid, (notifs) => {
      setNotifications(notifs);
    });
    return () => unsub();
  }, [mimoUser]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!mimoUser) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAll = async () => {
    await markAllNotificationsRead(mimoUser.uid);
  };

  const handleNotifClick = async (n: MimoNotification) => {
    if (!n.read) await markNotificationRead(n.id);
    if (n.actionUrl) {
      window.location.href = n.actionUrl;
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="notif-btn"
        style={{
          background: isOpen ? C.accent : 'transparent',
          color: isOpen ? '#fff' : C.textSecondary,
          borderRadius: '50%',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span 
            className="notif-count"
            style={{
              background: C.red,
              color: '#fff',
              fontSize: '10px',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: '10px',
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              border: `2px solid ${C.surface}`
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '12px',
          width: '320px',
          maxHeight: '400px',
          overflowY: 'auto',
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>Notifications</span>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAll}
                style={{ background: 'transparent', border: 'none', color: C.accent, fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
              >
                Mark all read
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: C.textSecondary, fontSize: '14px' }}>
                No notifications yet.
              </div>
            ) : (
              notifications.map(n => (
                <div 
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  style={{
                    padding: '16px',
                    borderBottom: `1px solid ${C.border}`,
                    background: n.read ? 'transparent' : C.bg,
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: n.read ? 500 : 700, fontSize: '14px', color: C.textPrimary }}>
                      {n.title}
                    </span>
                    {!n.read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.accent, flexShrink: 0, marginTop: '4px' }} />}
                  </div>
                  <span style={{ fontSize: '13px', color: C.textSecondary, lineHeight: 1.4 }}>
                    {n.message}
                  </span>
                  <span style={{ fontSize: '11px', color: C.textMuted, marginTop: '4px' }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
