'use client';

import { useEffect, useState } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAllUsers, getPendingUsers } from '@/lib/firestore';
import type { MimoUser, WorkSession } from '@/types';
import { ADMIN_ROLES } from '@/types';
import Link from 'next/link';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [interns, setInterns] = useState<MimoUser[]>([]);
  const [pendingUsers, setPendingUsers] = useState<MimoUser[]>([]);
  const [activeSessions, setActiveSessions] = useState<WorkSession[]>([]);
  const [thisWeekHours, setThisWeekHours] = useState(0);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [allUsers, pending] = await Promise.all([
          getAllUsers(),
          getPendingUsers()
        ]);
        
        const adminUids = new Set(allUsers.filter(u => ADMIN_ROLES.includes(u.role)).map(u => u.uid));
        const internUsers = allUsers.filter(u => !adminUids.has(u.uid) && u.status === 'approved');
        
        setInterns(internUsers);
        setPendingUsers(pending);

        // Fetch all active sessions
        const activeQ = query(collection(db, 'sessions'), where('status', '==', 'active'));
        const activeSnap = await getDocs(activeQ);
        const active = activeSnap.docs
          .map(d => ({ ...d.data(), id: d.id } as WorkSession))
          .filter(s => !adminUids.has(s.userId));
        setActiveSessions(active);

        // Fetch this week's hours
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekQ = query(collection(db, 'sessions'), where('clockInTime', '>=', weekAgo.toISOString()));
        const weekSnap = await getDocs(weekQ);
        const weekSessions = weekSnap.docs
          .map(d => ({ ...d.data(), id: d.id } as WorkSession))
          .filter(s => !adminUids.has(s.userId));
        
        const totalMs = weekSessions.reduce((acc, s) => acc + (s.totalDurationMs || 0), 0);
        setThisWeekHours(Math.round(totalMs / (1000 * 60 * 60)));

      } catch (err) {
        console.error("Failed to load dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header>
        <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
          Admin Dashboard
        </h1>
        <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)' }}>
          Overview of your team's activity and pending actions.
        </p>
      </header>

      {/* Row 1: Quick Stats (4 cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Total Interns</div>
          <div style={{ fontSize: '36px', fontWeight: 600, color: 'var(--text-primary)' }}>{interns.length}</div>
        </div>
        
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Currently Active</div>
          <div style={{ fontSize: '36px', fontWeight: 600, color: 'var(--text-primary)' }}>{activeSessions.length}</div>
        </div>

        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Hours This Week</div>
          <div style={{ fontSize: '36px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {thisWeekHours}
            <span style={{ fontSize: '18px', color: 'var(--accent-green)', marginLeft: '6px', fontWeight: 500 }}>hrs</span>
          </div>
        </div>
        
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Pending Approvals</div>
          <div style={{ fontSize: '36px', fontWeight: 600, color: 'var(--text-primary)' }}>{pendingUsers.length}</div>
        </div>
      </div>

      {/* Row 2: Two Columns (65% / 35%) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
        {/* Left Column: Currently Working */}
        <section className="glass-card" style={{ flex: '2 1 500px', padding: '32px' }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Currently Working</h2>
          {activeSessions.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>No interns are currently clocked in.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeSessions.map(session => (
                <div key={session.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 8px var(--accent-green)' }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{session.userName || 'Unknown Intern'}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{session.userDepartments?.[0] || 'No Dept'}</div>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Since {new Date(session.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Quick Links */}
        <section className="glass-card" style={{ flex: '1 1 300px', padding: '32px' }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Quick Links</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Link href="/admin/approvals" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-color)', textDecoration: 'none', color: 'inherit', transition: 'background 0.2s' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Manage Team</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Add/remove users, approve pending accounts</div>
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>→</div>
            </Link>
            
            <Link href="/admin/reviews" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-color)', textDecoration: 'none', color: 'inherit', transition: 'background 0.2s' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Review Work</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Review completed sessions and screenshots</div>
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>→</div>
            </Link>
            
            <Link href="/admin/analytics" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-color)', textDecoration: 'none', color: 'inherit', transition: 'background 0.2s' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>View Analytics</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Check leaderboards and team charts</div>
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>→</div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
