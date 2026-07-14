'use client';

import { useEffect, useState, useMemo } from 'react';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getGlobalStats, getDepartmentStats, getAllUsers } from '@/lib/firestore';
import type { WorkSession, MimoUser, Department } from '@/types';
import { DEPARTMENTS } from '@/types';

import { fmtDur } from '@/lib/utils';
import { getTheme } from '@/lib/theme';

const getDeptColor = (dept: string) => {
  return getTheme(dept).accent;
};

const DEPT_BG: Record<string, string> = {
  'Marketing': 'rgba(181,131,141,0.07)', // Rose
  'Frontend': 'rgba(118,128,99,0.07)',   // Olive
  'Backend': 'rgba(201,166,107,0.07)',   // Gold
  'Production': 'rgba(181,131,141,0.07)', // Rose
  'Hardware Team': 'rgba(118,128,99,0.07)', // Olive
  'Finance': 'rgba(201,166,107,0.07)',    // Gold
  'Design': 'rgba(181,131,141,0.07)',     // Rose
};

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [users, setUsers] = useState<MimoUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('week');
  const [activeView, setActiveView] = useState<'overview' | 'by-department'>('overview');
  const [selectedDept, setSelectedDept] = useState<Department | 'all'>('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [globalStats, setGlobalStats] = useState({ totalSessions: 0, totalDurationMs: 0 });
  const [deptStatsTotal, setDeptStatsTotal] = useState<Record<string, { totalSessions: number; totalDurationMs: number }>>({});

  const loadData = async () => {
    setLoading(true);
    
    // 1. Fetch global and department aggregations (cheap reads)
    const [gStats, usrs] = await Promise.all([getGlobalStats(), getAllUsers()]);
    setGlobalStats(gStats);
    setUsers(usrs.filter((usr) => usr.status === 'approved'));

    const deptMap: Record<string, { totalSessions: number; totalDurationMs: number }> = {};
    await Promise.all(DEPARTMENTS.map(async (dept) => {
      deptMap[dept] = await getDepartmentStats(dept);
    }));
    setDeptStatsTotal(deptMap);

    // 2. Fetch only the last 7 days of sessions for the charts and leaderboard
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const q = query(
      collection(db, 'sessions'), 
      where('clockInTime', '>=', weekAgo.toISOString())
    );
    const snap = await getDocs(q);
    const recentSessions = snap.docs.map(d => ({ ...d.data(), id: d.id } as WorkSession));
    
    setSessions(recentSessions.filter((ses) => ses.status !== 'active'));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);



  const filteredSessions = useMemo(() => {
    const now = new Date();
    return sessions.filter((s) => {
      const sessionDate = new Date(s.clockInTime);
      if (dateRange === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return sessionDate >= weekAgo;
      }
      if (dateRange === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return sessionDate >= monthAgo;
      }
      return true;
    });
  }, [sessions, dateRange]);

  // ─── Global Stats ─────────────────────────────────────────────────
  const totalSessions = globalStats.totalSessions;
  const totalHoursMs = globalStats.totalDurationMs;
  const avgSessionMs = totalSessions > 0 ? totalHoursMs / totalSessions : 0;

  // ─── Per-department analytics ──────────────────────────────────────
  const deptStats = useMemo(() => {
    const map: Record<string, {
      sessions: WorkSession[];
      totalMs: number;
      avgMs: number;
      starred: number;
      flagged: number;
      approved: number;
      unreviewed: number;
      memberCount: number;
    }> = {};

    for (const dept of DEPARTMENTS) {
      const deptSessions = filteredSessions.filter((s) => s.userDepartment === dept);
      const members = new Set(deptSessions.map((s) => s.userId));
      const totalMs = deptStatsTotal[dept]?.totalDurationMs || 0;
      map[dept] = {
        sessions: deptSessions,
        totalMs,
        avgMs: deptStatsTotal[dept]?.totalSessions > 0 ? totalMs / deptStatsTotal[dept].totalSessions : 0,
        starred: deptSessions.filter((s) => s.review?.action === 'starred').length,
        flagged: deptSessions.filter((s) => s.review?.action === 'flagged').length,
        approved: deptSessions.filter((s) => s.review?.action === 'approved').length,
        unreviewed: deptSessions.filter((s) => !s.review).length,
        memberCount: members.size,
      };
    }
    return map;
  }, [filteredSessions]);

  // ─── Hours by department bar chart ────────────────────────────────
  const maxDeptHours = Math.max(...DEPARTMENTS.map((d) => deptStats[d]?.totalMs ?? 0), 1);

  // ─── Leaderboard (global or per dept) ─────────────────────────────
  const sessionSource = selectedDept === 'all' ? filteredSessions : filteredSessions.filter((s) => s.userDepartment === selectedDept);
  const hoursByUser = useMemo(() => {
    const map: Record<string, { name: string; dept: string; hours: number; sessions: number; stars: number; flags: number }> = {};
    for (const s of sessionSource) {
      if (!map[s.userId]) {
        map[s.userId] = { name: s.userName, dept: s.userDepartment, hours: 0, sessions: 0, stars: 0, flags: 0 };
      }
      map[s.userId].hours += s.totalDurationMs;
      map[s.userId].sessions += 1;
      if (s.review?.action === 'starred') map[s.userId].stars += 1;
      if (s.review?.action === 'flagged') map[s.userId].flags += 1;
    }
    return Object.entries(map).sort((a, b) => b[1].hours - a[1].hours);
  }, [sessionSource]);

  // ─── Task categories ──────────────────────────────────────────────
  const taskCategories = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of filteredSessions) {
      for (const task of s.tasks) {
        map[task.category] = (map[task.category] || 0) + 1;
      }
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredSessions]);
  const totalTasks = taskCategories.reduce((acc, [, count]) => acc + count, 0);

  // ─── Daily activity ───────────────────────────────────────────────
  const dailyActivity = useMemo(() => {
    const days = dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 90;
    const result: { date: string; hours: number; count: number }[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const daySessions = filteredSessions.filter((s) => s.clockInTime.startsWith(dateStr));
      result.push({
        date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        hours: daySessions.reduce((acc, s) => acc + s.totalDurationMs, 0),
        count: daySessions.length,
      });
    }
    return result;
  }, [filteredSessions, dateRange]);
  const maxDailyHours = Math.max(...dailyActivity.map((d) => d.hours), 1);

  if (loading) {
    return (
      <div className="loading-screen" style={{ minHeight: '50vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>📈 Analytics</h1>
          <p>Team performance and productivity insights</p>
        </div>
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginRight: '8px' }}>Charts showing last 7 days</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['overview', 'by-department'] as const).map((view) => (
            <button
              key={view}
              className="btn btn-sm"
              style={{
                background: activeView === view ? 'var(--mimo-primary)' : 'var(--bg-input)',
                color: activeView === view ? '#fff' : 'var(--text-secondary)',
                fontWeight: activeView === view ? 700 : 500,
                border: 'none',
                boxShadow: activeView === view ? '0 4px 12px rgba(108, 92, 231, 0.3)' : 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
              onClick={() => setActiveView(view)}
            >
              {view === 'overview' ? '📊 Overview' : '🏢 By Department'}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid-stats" style={{ marginBottom: '32px' }}>
        <div className="stat-card">
          <div className="stat-label">Total Sessions</div>
          <div className="stat-value">{totalSessions}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Hours</div>
          <div className="stat-value">{fmtDur(totalHoursMs)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Session</div>
          <div className="stat-value">{fmtDur(avgSessionMs)}</div>
        </div>
      </div>

      {/* ── OVERVIEW VIEW ── */}
      {activeView === 'overview' && (
        <>
          <div className="grid-2" style={{ marginBottom: '32px' }}>
            {/* Hours by Department */}
            <div className="glass-card-static">
              <h4 style={{ marginBottom: '20px' }}>Hours by Department</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {DEPARTMENTS.map((dept) => {
                  const hours = deptStats[dept]?.totalMs ?? 0;
                  const pct = (hours / maxDeptHours) * 100;
                  return (
                    <div key={dept}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{dept}</span>
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{fmtDur(hours)}</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: getDeptColor(dept), borderRadius: '4px', transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Task Categories */}
            <div className="glass-card-static">
              <h4 style={{ marginBottom: '20px' }}>Task Categories</h4>
              {taskCategories.length === 0 ? (
                <div className="empty-state"><p>No task data yet</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {taskCategories.map(([category, count]) => {
                    const pct = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
                    return (
                      <div key={category}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: 'var(--font-size-sm)' }}>{category}</span>
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--mimo-primary)', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Daily Activity Chart */}
          <div className="glass-card-static" style={{ marginBottom: '32px' }}>
            <h4 style={{ marginBottom: '20px' }}>Daily Activity</h4>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '160px', paddingBottom: '24px', position: 'relative' }}>
              {dailyActivity.map((day, idx) => {
                const heightPct = (day.hours / maxDailyHours) * 100;
                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }} title={`${day.date}: ${fmtDur(day.hours)} (${day.count} sessions)`}>
                    <div style={{ width: '100%', maxWidth: '24px', height: `${Math.max(heightPct, 2)}%`, background: day.hours > 0 ? 'linear-gradient(180deg, var(--mimo-primary-light), var(--mimo-primary))' : 'var(--border-color)', borderRadius: '3px 3px 0 0', transition: 'height 0.3s ease', minHeight: '2px' }} />
                    {(idx % Math.ceil(dailyActivity.length / 10) === 0 || dailyActivity.length <= 10) && (
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', position: 'absolute', bottom: '-20px', whiteSpace: 'nowrap', transform: 'rotate(-45deg)', transformOrigin: 'top left' }}>
                        {day.date}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Global Leaderboard */}
          <div className="glass-card-static">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h4>🏆 Leaderboard</h4>
              <div style={{ position: 'relative' }}>
                <button
                  className="form-select"
                  style={{ width: '180px', padding: '6px 32px 6px 12px', fontSize: 'var(--font-size-sm)', textAlign: 'left', background: 'var(--bg-input)' }}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  {selectedDept === 'all' ? 'All Departments' : selectedDept}
                </button>
                
                {dropdownOpen && (
                  <div style={{ 
                    position: 'absolute', top: 'calc(100% + 4px)', right: 0, width: '180px', 
                    background: 'var(--bg-surface)', border: '1px solid var(--border-color)', 
                    borderRadius: '8px', overflow: 'hidden', zIndex: 10,
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                  }}>
                    <div 
                      onClick={() => { setSelectedDept('all'); setDropdownOpen(false); }}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 'var(--font-size-sm)', background: selectedDept === 'all' ? 'var(--bg-input-focus)' : 'transparent', color: selectedDept === 'all' ? 'var(--mimo-primary)' : 'var(--text-primary)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-input-focus)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = selectedDept === 'all' ? 'var(--bg-input-focus)' : 'transparent'}
                    >
                      All Departments
                    </div>
                    {DEPARTMENTS.map((d) => (
                      <div 
                        key={d}
                        onClick={() => { setSelectedDept(d); setDropdownOpen(false); }}
                        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 'var(--font-size-sm)', background: selectedDept === d ? 'var(--bg-input-focus)' : 'transparent', color: selectedDept === d ? 'var(--mimo-primary)' : 'var(--text-primary)' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-input-focus)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = selectedDept === d ? 'var(--bg-input-focus)' : 'transparent'}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {hoursByUser.length === 0 ? (
              <div className="empty-state"><p>No data yet</p></div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Intern</th>
                      <th>Department</th>
                      <th>Sessions</th>
                      <th>Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hoursByUser.map(([userId, data], idx) => (
                      <tr key={userId}>
                        <td style={{ fontWeight: 700, color: idx < 3 ? 'var(--status-starred)' : 'var(--text-muted)' }}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                        </td>
                        <td style={{ fontWeight: 500 }}>{data.name}</td>
                        <td><span className={`badge badge-dept-${data.dept.toLowerCase().replace(/\s+/g, '-')}`}>{data.dept}</span></td>
                        <td>{data.sessions}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--mimo-accent)' }}>{fmtDur(data.hours)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── BY DEPARTMENT VIEW ── */}
      {activeView === 'by-department' && (() => {
        const dateHeaders: { dateStr: string; label: string }[] = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          dateHeaders.push({ dateStr, label });
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {DEPARTMENTS.map((dept) => {
              const data = deptStats[dept];
              const deptSessions = data.sessions;
              const deptUsers = users.filter((u) => (u.department as any) === dept);

              return (
                <div key={dept} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  {/* Department Header */}
                  <div style={{
                    background: DEPT_BG[dept],
                    borderBottom: `3px solid ${getDeptColor(dept)}`,
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: getDeptColor(dept) }} />
                      <h4 style={{ fontSize: 'var(--font-size-xl)', margin: 0 }}>{dept}</h4>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>{deptUsers.length}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Members</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>{fmtDur(data.totalMs)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Hours</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--status-starred)' }}>{data.starred}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Stars</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--status-flagged)' }}>{data.flagged}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Flags</div>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Matrix */}
                  {deptUsers.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                      No interns found in {dept}
                    </div>
                  ) : (
                    <div className="table-container" style={{ overflowX: 'auto' }}>
                      <table className="data-table" style={{ minWidth: '800px' }}>
                        <thead>
                          <tr>
                            <th style={{ minWidth: '180px', position: 'sticky', left: 0, background: 'var(--bg-surface)', zIndex: 2 }}>Intern</th>
                            {dateHeaders.map((dh) => (
                              <th key={dh.dateStr} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{dh.label}</th>
                            ))}
                            <th style={{ textAlign: 'center', minWidth: '100px' }}>Total (7d)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deptUsers.sort((a, b) => a.displayName.localeCompare(b.displayName)).map((user) => {
                            const userSessions = deptSessions.filter((s) => s.userId === user.uid);
                            const totalMs = userSessions.reduce((acc, s) => acc + s.totalDurationMs, 0);

                            return (
                              <tr key={user.uid}>
                                <td style={{ fontWeight: 600, position: 'sticky', left: 0, background: 'var(--bg-surface)', zIndex: 1 }}>{user.displayName}</td>
                                {dateHeaders.map((dh) => {
                                  const daySessions = userSessions.filter((s) => s.clockInTime.startsWith(dh.dateStr));
                                  const dayMs = daySessions.reduce((acc, s) => acc + s.totalDurationMs, 0);
                                  return (
                                    <td key={dh.dateStr} style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-sm)', color: dayMs > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                      {dayMs > 0 ? fmtDur(dayMs) : '-'}
                                    </td>
                                  );
                                })}
                                <td style={{ textAlign: 'center', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-sm)', color: 'var(--mimo-accent)' }}>
                                  {fmtDur(totalMs)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
