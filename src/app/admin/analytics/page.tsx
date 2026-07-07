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

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [users, setUsers] = useState<MimoUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('week');

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

  // ─── Computed Analytics ──────────────────────────────────────
  const totalSessions = filteredSessions.length;
  const totalHoursMs = filteredSessions.reduce((acc, s) => acc + s.totalDurationMs, 0);
  const avgSessionMs = totalSessions > 0 ? totalHoursMs / totalSessions : 0;
  const flaggedCount = filteredSessions.filter((s) => s.review?.action === 'flagged').length;
  const starredCount = filteredSessions.filter((s) => s.review?.action === 'starred').length;

  // Hours by department
  const hoursByDept = useMemo(() => {
    const map: Record<string, number> = {};
    for (const dept of DEPARTMENTS) map[dept] = 0;
    for (const s of filteredSessions) {
      map[s.userDepartment] = (map[s.userDepartment] || 0) + s.totalDurationMs;
    }
    return map;
  }, [filteredSessions]);

  const maxDeptHours = Math.max(...Object.values(hoursByDept), 1);

  // Hours by user (leaderboard)
  const hoursByUser = useMemo(() => {
    const map: Record<string, { name: string; dept: string; hours: number; sessions: number; stars: number; flags: number }> = {};
    for (const s of filteredSessions) {
      if (!map[s.userId]) {
        map[s.userId] = { name: s.userName, dept: s.userDepartment, hours: 0, sessions: 0, stars: 0, flags: 0 };
      }
      map[s.userId].hours += s.totalDurationMs;
      map[s.userId].sessions += 1;
      if (s.review?.action === 'starred') map[s.userId].stars += 1;
      if (s.review?.action === 'flagged') map[s.userId].flags += 1;
    }
    return Object.entries(map)
      .sort((a, b) => b[1].hours - a[1].hours);
  }, [filteredSessions]);

  // Task category distribution
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

  // Daily activity (last 7 or 30 days)
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

      {/* Date Range Selector */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '8px' }}>
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

      <div className="grid-2" style={{ marginBottom: '32px' }}>
        {/* Hours by Department (Bar Chart) */}
        <div className="glass-card-static">
          <h4 style={{ marginBottom: '20px' }}>Hours by Department</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {DEPARTMENTS.map((dept) => {
              const hours = hoursByDept[dept] || 0;
              const pct = (hours / maxDeptHours) * 100;
              return (
                <div key={dept}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{dept}</span>
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                      {formatDuration(hours)}
                    </span>
                  </div>
                  <div
                    style={{
                      height: '8px',
                      background: 'var(--bg-glass)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: DEPT_COLORS[dept] || 'var(--mimo-primary)',
                        borderRadius: '4px',
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Task Categories (Donut-like) */}
        <div className="glass-card-static">
          <h4 style={{ marginBottom: '20px' }}>Task Categories</h4>
          {taskCategories.length === 0 ? (
            <div className="empty-state">
              <p>No task data yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {taskCategories.map(([category, count]) => {
                const pct = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
                return (
                  <div key={category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: 'var(--font-size-sm)' }}>{category}</span>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                        {count} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: '6px',
                        background: 'var(--bg-glass)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: 'var(--mimo-primary)',
                          borderRadius: '3px',
                          transition: 'width 0.5s ease',
                        }}
                      />
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
              <div
                key={idx}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                  position: 'relative',
                }}
                title={`${day.date}: ${formatDuration(day.hours)} (${day.count} sessions)`}
              >
                <div
                  style={{
                    width: '100%',
                    maxWidth: '24px',
                    height: `${Math.max(heightPct, 2)}%`,
                    background: day.hours > 0
                      ? 'linear-gradient(180deg, var(--mimo-primary-light), var(--mimo-primary))'
                      : 'var(--bg-glass)',
                    borderRadius: '3px 3px 0 0',
                    transition: 'height 0.3s ease',
                    minHeight: '2px',
                  }}
                />
                {(idx % Math.ceil(dailyActivity.length / 10) === 0 || dailyActivity.length <= 10) && (
                  <span
                    style={{
                      fontSize: '9px',
                      color: 'var(--text-muted)',
                      position: 'absolute',
                      bottom: '-20px',
                      whiteSpace: 'nowrap',
                      transform: 'rotate(-45deg)',
                      transformOrigin: 'top left',
                    }}
                  >
                    {day.date}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="glass-card-static">
        <h4 style={{ marginBottom: '20px' }}>🏆 Leaderboard</h4>
        {hoursByUser.length === 0 ? (
          <div className="empty-state">
            <p>No data yet</p>
          </div>
        ) : (
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
                  <td>
                    <span className={`badge badge-dept-${data.dept.toLowerCase().replace(/\s+/g, '-')}`}>
                      {data.dept}
                    </span>
                  </td>
                  <td>{data.sessions}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--mimo-accent)' }}>
                    {formatDuration(data.hours)}
                  </td>
                  <td style={{ color: 'var(--status-starred)' }}>{data.stars}</td>
                  <td style={{ color: 'var(--status-flagged)' }}>{data.flags}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
