'use client';

import { useEffect, useState, useMemo } from 'react';
import { onActiveSessions, getAllUsers, getPendingUsers, getUnreviewedSessions, getTodaysSessions, getAllSessions } from '@/lib/firestore';
import type { WorkSession, MimoUser } from '@/types';
import { DEPARTMENTS } from '@/types';

const DEPT_COLORS: Record<string, string> = {
  'Marketing': 'var(--dept-marketing)',
  'Technical Team': 'var(--dept-technical)',
  'Hardware Team': 'var(--dept-hardware)',
  'Finance': 'var(--dept-finance)',
  'Design': 'var(--dept-design)',
};

const DEPT_BG: Record<string, string> = {
  'Marketing': 'rgba(220,38,38,0.08)',
  'Technical Team': 'rgba(79,70,229,0.08)',
  'Hardware Team': 'rgba(13,148,136,0.08)',
  'Finance': 'rgba(217,119,6,0.08)',
  'Design': 'rgba(219,39,119,0.08)',
};

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
  const [recentSessions, setRecentSessions] = useState<WorkSession[]>([]);
  const [now, setNow] = useState(Date.now());
  const [activeTab, setActiveTab] = useState<'live' | 'departments'>('live');

  useEffect(() => {
    const unsub = onActiveSessions(setActiveSessions);
    getAllUsers().then(setAllUsers);
    getPendingUsers().then((p) => setPendingCount(p.length));
    getUnreviewedSessions().then((s) => setUnreviewedCount(s.length));
    getTodaysSessions().then(setTodaysSessions);
    getAllSessions().then((s) => setRecentSessions(s.filter((x) => x.status !== 'active')));
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => { unsub(); clearInterval(interval); };
  }, []);

  const approvedUsers = allUsers.filter((u) => u.status === 'approved');
  const todayTotalHours = todaysSessions.reduce((acc, s) => acc + s.totalDurationMs, 0);
  const avgSessionMs = todaysSessions.length > 0 ? todayTotalHours / todaysSessions.length : 0;

  // Department breakdown from todays sessions
  const deptBreakdown = useMemo(() => {
    const map: Record<string, { sessions: number; hoursMs: number; members: Set<string>; active: number }> = {};
    for (const dept of DEPARTMENTS) {
      map[dept] = { sessions: 0, hoursMs: 0, members: new Set(), active: 0 };
    }
    for (const s of todaysSessions) {
      if (!map[s.userDepartment]) map[s.userDepartment] = { sessions: 0, hoursMs: 0, members: new Set(), active: 0 };
      map[s.userDepartment].sessions++;
      map[s.userDepartment].hoursMs += s.totalDurationMs;
      map[s.userDepartment].members.add(s.userId);
    }
    for (const s of activeSessions) {
      if (!map[s.userDepartment]) map[s.userDepartment] = { sessions: 0, hoursMs: 0, members: new Set(), active: 0 };
      map[s.userDepartment].active++;
    }
    return map;
  }, [todaysSessions, activeSessions]);

  const maxDeptHours = Math.max(...Object.values(deptBreakdown).map((d) => d.hoursMs), 1);

  // Group active sessions by department
  const activeByDept = useMemo(() => {
    const map: Record<string, WorkSession[]> = {};
    for (const s of activeSessions) {
      if (!map[s.userDepartment]) map[s.userDepartment] = [];
      map[s.userDepartment].push(s);
    }
    return map;
  }, [activeSessions]);

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1>📊 Admin Overview</h1>
        <p>Real-time team monitoring &amp; management</p>
      </div>

      {/* KPI Cards */}
      <div className="grid-stats" style={{ marginBottom: '32px' }}>
        <div className="stat-card">
          <div className="stat-label">Active Now</div>
          <div className="stat-value" style={{ color: 'var(--status-active)' }}>{activeSessions.length}</div>
          <div className="stat-trend up">{activeSessions.length > 0 ? '🟢 Live' : '⚫ Quiet'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Team Members</div>
          <div className="stat-value">{approvedUsers.length}</div>
          <div className="stat-trend" style={{ color: 'var(--text-muted)' }}>Approved</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Today's Sessions</div>
          <div className="stat-value">{todaysSessions.length}</div>
          <div className="stat-trend" style={{ color: 'var(--text-muted)' }}>Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Today's Hours</div>
          <div className="stat-value">{formatDuration(todayTotalHours)}</div>
          <div className="stat-trend" style={{ color: 'var(--text-muted)' }}>Avg {formatDuration(avgSessionMs)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Approvals</div>
          <div className="stat-value" style={{ color: pendingCount > 0 ? 'var(--status-pending)' : undefined }}>{pendingCount}</div>
          <div className="stat-trend" style={{ color: pendingCount > 0 ? 'var(--status-pending)' : 'var(--text-muted)' }}>
            {pendingCount > 0 ? '⚠️ Needs action' : '✅ All clear'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Unreviewed Sessions</div>
          <div className="stat-value" style={{ color: unreviewedCount > 0 ? 'var(--status-break)' : undefined }}>{unreviewedCount}</div>
          <div className="stat-trend" style={{ color: unreviewedCount > 0 ? 'var(--status-break)' : 'var(--text-muted)' }}>
            {unreviewedCount > 0 ? '📋 Action needed' : '✅ All reviewed'}
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '1px' }}>
        {(['live', 'departments'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '10px 20px',
              fontWeight: 600,
              fontSize: 'var(--font-size-sm)',
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--text-primary)' : '2px solid transparent',
              marginBottom: '-1px',
              transition: 'all var(--transition-fast)',
            }}
          >
            {tab === 'live' ? '🟢 Live Team Board' : '🏢 By Department'}
          </button>
        ))}
      </div>

      {/* Live Tab */}
      {activeTab === 'live' && (
        <>
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
                const initials = session.userName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

                return (
                  <div key={session.id} className={`team-member-card ${onBreak ? 'on-break' : 'working'}`}>
                    <div className="team-member-header">
                      <div className="avatar" style={{ background: avatarColor }}>{initials}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{session.userName}</div>
                        <span className={`badge ${onBreak ? 'badge-break' : 'badge-active'}`} style={{ marginTop: '4px' }}>
                          {onBreak ? '☕ Break' : '🔥 Working'}
                        </span>
                      </div>
                    </div>
                    <div className="team-member-timer">{formatTime(remaining)}</div>
                    <div className="team-member-task">
                      <span className={`badge badge-dept-${session.userDepartment.toLowerCase().replace(/\s+/g, '-')}`}>
                        {session.userDepartment}
                      </span>
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '8px' }}>
                      Clocked in at {new Date(session.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {session.breaks.length > 0 && ` • ${session.breaks.length} break(s)`}
                    </div>
                    {session.tasks.length > 0 && (
                      <div style={{ marginTop: '10px', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                        📝 {session.tasks[session.tasks.length - 1].title}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Department Tab */}
      {activeTab === 'departments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Department Progress Overview */}
          <div className="glass-card-static">
            <h4 style={{ marginBottom: '20px' }}>Today's Hours by Department</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {DEPARTMENTS.map((dept) => {
                const data = deptBreakdown[dept];
                const pct = (data.hoursMs / maxDeptHours) * 100;
                return (
                  <div key={dept}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: DEPT_COLORS[dept], flexShrink: 0 }} />
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{dept}</span>
                        {data.active > 0 && (
                          <span style={{ fontSize: '10px', background: 'rgba(5,150,105,0.15)', color: 'var(--status-active)', padding: '2px 7px', borderRadius: '99px', fontWeight: 700 }}>
                            {data.active} active
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                        <span>{data.sessions} sessions</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatDuration(data.hoursMs)}</span>
                      </div>
                    </div>
                    <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: DEPT_COLORS[dept],
                        borderRadius: '4px', transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per-department active session cards */}
          {DEPARTMENTS.filter((dept) => (activeByDept[dept]?.length ?? 0) > 0).map((dept) => (
            <div key={dept}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: DEPT_COLORS[dept] }} />
                <h4 style={{ fontSize: 'var(--font-size-lg)' }}>{dept}</h4>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>({activeByDept[dept].length} active)</span>
              </div>
              <div className="team-grid">
                {activeByDept[dept].map((session) => {
                  const elapsed = now - new Date(session.clockInTime).getTime() - session.breakDurationMs;
                  const lastBreak = session.breaks[session.breaks.length - 1];
                  const onBreak = lastBreak ? !lastBreak.endedAt : false;
                  let adjustedElapsed = elapsed;
                  if (onBreak && lastBreak) adjustedElapsed = elapsed - (now - new Date(lastBreak.startedAt).getTime());
                  const remaining = Math.max(0, 3 * 60 * 60 * 1000 - adjustedElapsed);
                  const initials = session.userName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';
                  return (
                    <div key={session.id} className={`team-member-card ${onBreak ? 'on-break' : 'working'}`} style={{ background: DEPT_BG[dept] }}>
                      <div className="team-member-header">
                        <div className="avatar" style={{ background: DEPT_COLORS[dept] }}>{initials}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{session.userName}</div>
                          <span className={`badge ${onBreak ? 'badge-break' : 'badge-active'}`} style={{ marginTop: '4px' }}>
                            {onBreak ? '☕ Break' : '🔥 Working'}
                          </span>
                        </div>
                      </div>
                      <div className="team-member-timer">{formatTime(remaining)}</div>
                      {session.tasks.length > 0 && (
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                          📝 {session.tasks[session.tasks.length - 1].title}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {activeSessions.length === 0 && (
            <div className="empty-state glass-card-static">
              <div className="empty-icon">😴</div>
              <h3>No active sessions</h3>
              <p>When interns clock in, they'll appear here grouped by department.</p>
            </div>
          )}
        </div>
      )}

      {/* Quick Action Buttons */}
      <div style={{ marginTop: '32px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
