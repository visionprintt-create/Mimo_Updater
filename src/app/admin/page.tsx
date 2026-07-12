'use client';

import { useEffect, useState, useMemo } from 'react';
import { getAllSessions, getAllUsers } from '@/lib/firestore';
import type { WorkSession, MimoUser, Department } from '@/types';
import { DEPARTMENTS } from '@/types';

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const DEPT_COLORS: Record<string, string> = {
  'Marketing': '#E17055',
  'Technical Team': '#6C5CE7',
  'Hardware Team': '#00CEC9',
  'Finance': '#FDCB6E',
  'Design': '#E84393',
};

const DEPT_BG: Record<string, string> = {
  'Marketing': 'rgba(225,112,85,0.07)',
  'Technical Team': 'rgba(108,92,231,0.07)',
  'Hardware Team': 'rgba(0,206,201,0.07)',
  'Finance': 'rgba(253,203,110,0.07)',
  'Design': 'rgba(232,67,147,0.07)',
};

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [users, setUsers] = useState<MimoUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('week');
  const [activeView, setActiveView] = useState<'overview' | 'by-department'>('overview');
  const [selectedDept, setSelectedDept] = useState<Department | 'all'>('all');

  useEffect(() => {
    Promise.all([getAllSessions(), getAllUsers()]).then(([s, u]) => {
      setSessions(s.filter((ses) => ses.status !== 'active'));
      setUsers(u.filter((usr) => usr.status === 'approved'));
      setLoading(false);
    });
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
  const totalSessions = filteredSessions.length;
  const totalHoursMs = filteredSessions.reduce((acc, s) => acc + s.totalDurationMs, 0);
  const avgSessionMs = totalSessions > 0 ? totalHoursMs / totalSessions : 0;
  const flaggedCount = filteredSessions.filter((s) => s.review?.action === 'flagged').length;
  const starredCount = filteredSessions.filter((s) => s.review?.action === 'starred').length;

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
      const totalMs = deptSessions.reduce((acc, s) => acc + s.totalDurationMs, 0);
      map[dept] = {
        sessions: deptSessions,
        totalMs,
        avgMs: deptSessions.length > 0 ? totalMs / deptSessions.length : 0,
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
      <div className="page-header">
        <h1>📈 Analytics</h1>
        <p>Team performance and productivity insights</p>
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['week', 'month', 'all'] as const).map((range) => (
            <button
              key={range}
              className={`btn btn-sm ${dateRange === range ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setDateRange(range)}
            >
              {range === 'week' ? 'Last 7 Days' : range === 'month' ? 'Last 30 Days' : 'All Time'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['overview', 'by-department'] as const).map((view) => (
            <button
              key={view}
              className={`btn btn-sm ${activeView === view ? 'btn-accent' : 'btn-ghost'}`}
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
          <div className="stat-value">{formatDuration(totalHoursMs)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Session</div>
          <div className="stat-value">{formatDuration(avgSessionMs)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">⭐ Stars</div>
          <div className="stat-value" style={{ color: 'var(--status-starred)' }}>{starredCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">🔴 Flags</div>
          <div className="stat-value" style={{ color: 'var(--status-flagged)' }}>{flaggedCount}</div>
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
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{formatDuration(hours)}</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: DEPT_COLORS[dept] || 'var(--mimo-primary)', borderRadius: '4px', transition: 'width 0.5s ease' }} />
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
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }} title={`${day.date}: ${formatDuration(day.hours)} (${day.count} sessions)`}>
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
              <select
                className="form-select"
                style={{ width: 'auto', padding: '6px 32px 6px 12px', fontSize: 'var(--font-size-sm)' }}
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value as Department | 'all')}
              >
                <option value="all">All Departments</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
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
                      <th>⭐</th>
                      <th>🔴</th>
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
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--mimo-accent)' }}>{formatDuration(data.hours)}</td>
                        <td style={{ color: 'var(--status-starred)' }}>{data.stars}</td>
                        <td style={{ color: 'var(--status-flagged)' }}>{data.flags}</td>
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
      {activeView === 'by-department' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {DEPARTMENTS.map((dept) => {
            const data = deptStats[dept];
            const deptSessions = data.sessions.slice().sort((a, b) =>
              new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime()
            );

            return (
              <div key={dept} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                {/* Department Header */}
                <div style={{
                  background: DEPT_BG[dept],
                  borderBottom: `3px solid ${DEPT_COLORS[dept]}`,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: DEPT_COLORS[dept] }} />
                    <h4 style={{ fontSize: 'var(--font-size-xl)', margin: 0 }}>{dept}</h4>
                  </div>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>{deptSessions.length}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sessions</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>{formatDuration(data.totalMs)}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Hours</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>{formatDuration(data.avgMs)}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Avg Session</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--status-starred)' }}>{data.starred}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Stars</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--status-flagged)' }}>{data.flagged}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Flags</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--status-break)' }}>{data.unreviewed}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Unreviewed</div>
                    </div>
                  </div>
                </div>

                {/* Sessions Table */}
                {deptSessions.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                    No sessions for this period
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Intern</th>
                          <th>Date</th>
                          <th>Duration</th>
                          <th>Tasks</th>
                          <th>Status</th>
                          <th>Review</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deptSessions.map((s) => (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 500 }}>{s.userName}</td>
                            <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                              {new Date(s.clockInTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-sm)' }}>
                              {formatDuration(s.totalDurationMs)}
                            </td>
                            <td>{s.tasks.length}</td>
                            <td>
                              <span className={`badge badge-${s.status === 'completed' ? 'approved' : 'offline'}`}>
                                {s.status}
                              </span>
                            </td>
                            <td>
                              {s.review ? (
                                <span className={`badge badge-${s.review.action === 'starred' ? 'starred' : s.review.action === 'flagged' ? 'flagged' : s.review.action === 'approved' ? 'approved' : 'pending'}`}>
                                  {s.review.action === 'starred' ? '⭐' : s.review.action === 'flagged' ? '🔴' : s.review.action === 'approved' ? '✅' : '📝'} {s.review.action}
                                </span>
                              ) : (
                                <span className="badge badge-offline" style={{ color: 'var(--text-muted)' }}>Pending</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
