'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSettingsStore } from '@/store/settingsStore';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import styles from '@/app/employee/dashboard/Dashboard.module.css';
import { getUser, getUserSessions } from '@/lib/firestore';
import type { WorkSession, MimoUser } from '@/types';

export default function AdminEmployeeDashboardOverview() {
  const params = useParams();
  const userId = params.userId as string;

  const { timeFormat } = useSettingsStore();

  const [employee, setEmployee] = useState<MimoUser | null>(null);
  const [allSessions, setAllSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);

  const activeSession = allSessions.find(s => s.status === 'active');
  const isWorking = !!activeSession;
  const lastBreak = activeSession?.breaks?.[activeSession.breaks.length - 1];
  const isOnBreak = !!lastBreak && !lastBreak.endedAt;

  const [currentElapsedMs, setCurrentElapsedMs] = useState(0);

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
      const hour = new Date(s.clockInTime).getHours();
      const durationHours = (s.totalDurationMs || 0) / (1000 * 60 * 60);
      if (hour >= 0 && hour < 4) buckets['12 AM'] += durationHours;
      else if (hour >= 4 && hour < 8) buckets['4 AM'] += durationHours;
      else if (hour >= 8 && hour < 12) buckets['8 AM'] += durationHours;
      else if (hour >= 12 && hour < 16) buckets['12 PM'] += durationHours;
      else if (hour >= 16 && hour < 20) buckets['4 PM'] += durationHours;
      else if (hour >= 20 && hour < 24) buckets['8 PM'] += durationHours;
    });

    return [
      { time: '12 AM', value: Number(buckets['12 AM'].toFixed(2)) },
      { time: '4 AM', value: Number(buckets['4 AM'].toFixed(2)) },
      { time: '8 AM', value: Number(buckets['8 AM'].toFixed(2)) },
      { time: '12 PM', value: Number(buckets['12 PM'].toFixed(2)) },
      { time: '4 PM', value: Number(buckets['4 PM'].toFixed(2)) },
      { time: '8 PM', value: Number(buckets['8 PM'].toFixed(2)) },
      { time: '11 PM', value: Number(buckets['11 PM'].toFixed(2)) },
    ];
  })();

  const productivityScore = Math.min(100, Math.round((totalTasksCompleted / Math.max(1, allSessions.length)) * 15 + 75));
  const efficiencyScore = Math.min(100, Math.round(70 + (totalWorkedMs / (1000 * 60 * 60 * 40)) * 30));

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Dashboard...</div>;
  if (!employee) return <div style={{ padding: '2rem', textAlign: 'center' }}>Employee not found.</div>;

  return (
    <>
      <div className={styles.topHeader}>
        <div className={styles.greeting}>
          <h1 style={{ display: 'flex', alignItems: 'center' }}>
            <Link href="/admin/employees" className="btn btn-sm btn-ghost" style={{ padding: '4px 8px', marginRight: '16px' }}>
              ← Back
            </Link> 
            {employee.displayName}'s Dashboard
          </h1>
          <p>Viewing as Admin</p>
        </div>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statInfo}>
            <div className={styles.statLabel}>Total Work Time</div>
            <div className={styles.statValue}>{formatDuration(totalWorkedMs)}</div>
            <div className={`${styles.statTrend} ${styles.up}`}>↑ Updated recently</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statInfo}>
            <div className={styles.statLabel}>Active Session</div>
            <div className={styles.statValue}>{activeSession ? formatDuration(currentElapsedMs) : 'Offline'}</div>
            <div className={`${styles.statTrend} ${styles.neutral}`}>
              {activeSession 
                ? (isOnBreak ? `On Break | Started at ${formatTime(activeSession.clockInTime)}` : `Live | Started at ${formatTime(activeSession.clockInTime)}`)
                : 'Not started'}
            </div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statInfo}>
            <div className={styles.statLabel}>Tasks Completed</div>
            <div className={styles.statValue}>{totalTasksCompleted}</div>
            <div className={`${styles.statTrend} ${styles.up}`}>Across {allSessions.length} sessions</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statInfo}>
            <div className={styles.statLabel}>Productivity Score</div>
            <div className={styles.statValue}>{productivityScore}%</div>
            <div className={`${styles.statTrend} ${styles.up}`}>{productivityScore >= 90 ? 'Excellent' : 'Good'}</div>
          </div>
        </div>
      </div>

      <div className={styles.dashboardGrid}>
        {/* Weekly Overview */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              Weekly Overview
              <select style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                <option>This Week</option>
              </select>
            </div>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
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

        {/* Right Column */}
        <div>
          <div className={styles.headerRow}>
            <h1 className={styles.pageTitle}>{employee.displayName}'s Summary</h1>
          </div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Today's Summary</div>
            <div className={styles.summaryStats}>
              <div className={styles.summaryStat}>
                <div className={styles.summaryStatLabel}>Work Time</div>
                <div className={styles.summaryStatValue}>{formatDuration(currentElapsedMs)}</div>
              </div>
              <div className={styles.summaryStat}>
                <div className={styles.summaryStatLabel}>Efficiency</div>
                <div className={styles.summaryStatValue}>{efficiencyScore}%</div>
              </div>
            </div>
            <div className={styles.chartContainer} style={{ height: '120px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="value" stroke="var(--mimo-primary)" fill="rgba(214, 155, 105, 0.15)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
