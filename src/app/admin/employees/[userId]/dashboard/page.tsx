'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSettingsStore } from '@/store/settingsStore';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { getUser, getUserSessions } from '@/lib/firestore';
import type { WorkSession, MimoUser } from '@/types';
import { SESSION_DURATION_MS } from '@/types';
import styles from '@/app/employee/dashboard/Dashboard.module.css';

export default function AdminEmployeeDashboardOverview() {
  const params = useParams();
  const userId = params.userId as string;

  const { timeFormat } = useSettingsStore();

  const [employee, setEmployee] = useState<MimoUser | null>(null);
  const [allSessions, setAllSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      Promise.all([
        getUser(userId),
        getUserSessions(userId)
      ]).then(([userDoc, sessions]) => {
        setEmployee(userDoc);
        setAllSessions(sessions);
        setLoading(false);
      }).catch(err => {
        console.error('Error fetching employee data:', err);
        setLoading(false);
      });
    }
  }, [userId]);

  const activeSession = allSessions.find(s => s.status === 'active');
  const isWorking = !!activeSession;
  const lastBreak = activeSession?.breaks[activeSession.breaks.length - 1];
  const isOnBreak = !!lastBreak && !lastBreak.endedAt;

  const [currentElapsedMs, setCurrentElapsedMs] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession && isWorking && !isOnBreak) {
      interval = setInterval(() => {
        const now = Date.now();
        const start = new Date(activeSession.clockInTime).getTime();
        const breakTime = activeSession.breakDurationMs || 0;
        setCurrentElapsedMs(now - start - breakTime);
      }, 1000);
    } else if (activeSession) {
      let endCalcMs = Date.now();
      if (isOnBreak && activeSession.breaks.length > 0) {
        endCalcMs = new Date(activeSession.breaks[activeSession.breaks.length - 1].startedAt).getTime();
      }
      const start = new Date(activeSession.clockInTime).getTime();
      const breakTime = activeSession.breakDurationMs || 0;
      setCurrentElapsedMs(endCalcMs - start - breakTime);
    } else {
      setCurrentElapsedMs(0);
    }
    return () => clearInterval(interval);
  }, [activeSession, isWorking, isOnBreak]);

  const formatDuration = (ms: number) => {
    if (ms < 0) return '0h 0m';
    const totalM = Math.floor(ms / 60000);
    const h = Math.floor(totalM / 60);
    const m = totalM % 60;
    return `${h}h ${m}m`;
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: timeFormat === '12h'
    });
  };

  const totalWorkedMs = allSessions.reduce((acc, s) => acc + (s.totalDurationMs || 0), 0);
  const totalTasksCompleted = allSessions.reduce((acc, s) => acc + (s.tasks?.length || 0), 0);

  const barData = (() => {
    const data = [];
    const today = new Date();
    today.setHours(0,0,0,0);
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
      
      const daySessions = allSessions.filter(s => {
        const sDate = new Date(s.clockInTime);
        sDate.setHours(0,0,0,0);
        return sDate.getTime() === d.getTime();
      });
      
      const totalMs = daySessions.reduce((acc, s) => acc + (s.totalDurationMs || 0), 0);
      const hours = totalMs / (1000 * 60 * 60);
      
      data.push({
        day: dayStr,
        value: Number(hours.toFixed(2)),
        active: i === 0,
      });
    }
    return data;
  })();

  const areaData = (() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const todaySessions = allSessions.filter(s => {
      const sDate = new Date(s.clockInTime);
      sDate.setHours(0,0,0,0);
      return sDate.getTime() === today.getTime();
    });

    const buckets = {
      '12 AM': 0, '4 AM': 0, '8 AM': 0, '12 PM': 0, '4 PM': 0, '8 PM': 0, '11 PM': 0
    };

    todaySessions.forEach(s => {
      const startHour = new Date(s.clockInTime).getHours();
      if (startHour < 4) buckets['12 AM'] += s.totalDurationMs;
      else if (startHour < 8) buckets['4 AM'] += s.totalDurationMs;
      else if (startHour < 12) buckets['8 AM'] += s.totalDurationMs;
      else if (startHour < 16) buckets['12 PM'] += s.totalDurationMs;
      else if (startHour < 20) buckets['4 PM'] += s.totalDurationMs;
      else if (startHour < 23) buckets['8 PM'] += s.totalDurationMs;
      else buckets['11 PM'] += s.totalDurationMs;
    });

    return Object.entries(buckets).map(([time, ms]) => ({
      time,
      value: ms / (1000 * 60 * 60)
    }));
  })();

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Employee Dashboard...</div>;
  if (!employee) return <div style={{ padding: '2rem', textAlign: 'center' }}>Employee not found.</div>;

  return (
    <div className={styles.dashboardContainer}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.greeting} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/admin/employees" className="btn btn-sm btn-ghost" style={{ padding: '4px 8px' }}>
              ← Back
            </Link>
            {employee.displayName}'s Dashboard
          </h1>
          <p className={styles.subtitle}>Viewing as Admin</p>
        </div>
      </header>

      <div className={styles.grid}>
        {/* Left Column */}
        <div className={styles.leftColumn}>
          {/* Session Card */}
          <div className={`${styles.card} ${styles.sessionCard} ${isWorking ? (isOnBreak ? styles.sessionBreak : styles.sessionActive) : ''}`}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Current Session</h2>
              <div className={styles.sessionStatus}>
                {isWorking ? (isOnBreak ? 'On Break' : 'Active') : 'Inactive'}
              </div>
            </div>
            <div className={styles.timeDisplay}>
              {formatDuration(currentElapsedMs)}
            </div>
            <div className={styles.timeBreakdown}>
              <div>
                <span className={styles.breakdownLabel}>Clocked In</span>
                <span className={styles.breakdownValue}>
                  {activeSession ? formatTime(activeSession.clockInTime) : '--:--'}
                </span>
              </div>
              <div>
                <span className={styles.breakdownLabel}>Break Time</span>
                <span className={styles.breakdownValue}>
                  {activeSession ? formatDuration(activeSession.breakDurationMs) : '0h 0m'}
                </span>
              </div>
              <div>
                <span className={styles.breakdownLabel}>Remaining</span>
                <span className={styles.breakdownValue}>
                  {activeSession ? formatDuration(Math.max(0, SESSION_DURATION_MS - currentElapsedMs)) : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* Activity Chart */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Today's Activity</h2>
            </div>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--mimo-primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--mimo-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} dy={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                    formatter={(val: number) => [`${val.toFixed(1)} hrs`, 'Work']}
                  />
                  <Area type="monotone" dataKey="value" stroke="var(--mimo-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className={styles.rightColumn}>
          {/* Stats Grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
                ⏱️
              </div>
              <div className={styles.statValue}>{formatDuration(totalWorkedMs)}</div>
              <div className={styles.statLabel}>Total Hours</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34d399' }}>
                ✅
              </div>
              <div className={styles.statValue}>{totalTasksCompleted}</div>
              <div className={styles.statLabel}>Tasks Done</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa' }}>
                🔥
              </div>
              <div className={styles.statValue}>{allSessions.length}</div>
              <div className={styles.statLabel}>Total Sessions</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' }}>
                ⭐
              </div>
              <div className={styles.statValue}>--</div>
              <div className={styles.statLabel}>Avg Rating</div>
            </div>
          </div>

          {/* Weekly Summary */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Weekly Summary</h2>
            </div>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} dy={10} />
                  <Tooltip 
                    cursor={{ fill: 'var(--bg-secondary)', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                    formatter={(val: number) => [`${val} hrs`, 'Work']}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.active ? 'var(--mimo-primary)' : 'var(--border-color)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
