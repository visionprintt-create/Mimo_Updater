'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useSessionStore } from '@/store/sessionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { signOutUser } from '@/lib/auth';
import styles from '../dashboard/Dashboard.module.css';
import { MOODS } from '@/types';

export default function SessionPage() {
  const router = useRouter();
  const { mimoUser } = useAuthStore();
  const { theme, timeFormat } = useSettingsStore();
  const { 
    activeSession, isWorking, isOnBreak, clockIn, clockOut, startBreak, endBreak,
    draftTasks, setDraftTasks, draftSummary, setDraftSummary,
    draftMood, setDraftMood, submitWorkLog
  } = useSessionStore();

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentElapsedMs, setCurrentElapsedMs] = useState(0);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession && isWorking && !isOnBreak) {
      interval = setInterval(() => {
        const now = Date.now();
        const start = new Date(activeSession.clockInTime).getTime();
        const breakTime = activeSession.breakDurationMs || 0;
        setCurrentElapsedMs(now - start - breakTime);
      }, 1000);
    } else if (activeSession) {
      // Calculate exact static elapsed time if on break or clocked out
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

  const formatLiveTimer = (ms: number) => {
    if (ms < 0) return '00:00:00';
    const totalS = Math.floor(ms / 1000);
    const h = Math.floor(totalS / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalS % 3600) / 60).toString().padStart(2, '0');
    const s = (totalS % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: timeFormat === '12h' 
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 0) return '0h 0m';
    const totalM = Math.floor(ms / 60000);
    const h = Math.floor(totalM / 60);
    const m = totalM % 60;
    return `${h}h ${m}m`;
  };

  const handleStartSession = async () => {
    if (mimoUser) {
      const depts = mimoUser.departments || (mimoUser.department ? [mimoUser.department] : []);
      await clockIn(mimoUser.uid, mimoUser.displayName, depts);
    }
  };

  const handleEndSession = async () => {
    if (isWorking) {
      await clockOut(); // Pauses timer
      setShowSubmitModal(true);
    }
  };

  const toggleBreak = () => {
    if (isOnBreak) {
      endBreak();
    } else {
      startBreak();
    }
  };

  const genId = () => Math.random().toString(36).substr(2, 9);
  const addTask = () => setDraftTasks([...draftTasks, { id: genId(), title: '', description: '', category: 'Development' }]);
  const updateTask = (id: string, f: keyof any, v: string) => setDraftTasks(draftTasks.map(t => t.id === id ? { ...t, [f]: v } : t));
  const removeTask = (id: string) => setDraftTasks(draftTasks.filter(t => t.id !== id));

  const handleSubmit = async () => {
    if (!draftTasks.some(t => t.title.trim())) { alert('Add at least one task.'); return; }
    if (!draftSummary.trim()) { alert('Add a work summary.'); return; }
    
    setSubmitting(true);
    await submitWorkLog();
    setSubmitting(false);
    setShowSubmitModal(false);
    await signOutUser();
    router.push('/login');
  };

  const timelineItems: Array<{ time: string; text: string; status: string; extra?: string }> = [];
  if (activeSession) {
    timelineItems.push({ time: formatTime(activeSession.clockInTime), text: 'Checked In', status: 'success' });
    activeSession.breaks.forEach(b => {
      timelineItems.push({ time: formatTime(b.startedAt), text: 'Break Started', status: 'warning', extra: b.reason });
      if (b.endedAt) {
        timelineItems.push({ time: formatTime(b.endedAt), text: 'Break Ended', status: 'active' });
      }
    });
  }

  const currentTask = draftTasks.length > 0 ? draftTasks[draftTasks.length - 1].title || 'Writing task...' : 'No task added';

  return (
    <>
      <div className={styles.topHeader}>
        <div className={styles.greeting}>
          <h1>Current Session ⏱️</h1>
          <p>Manage your live timer, breaks, and daily tasks.</p>
        </div>
      </div>

      <div className={styles.dashboardGrid}>
        {/* Left Column */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              Active Timer
              <div className={`${styles.sessionStatus} ${isOnBreak ? styles.break : ''}`}>
                <div className={styles.statusDot}></div> {isOnBreak ? 'On Break' : (isWorking ? 'Working' : 'Offline')}
              </div>
            </div>
            
            {activeSession ? (
              <>
                <div className={`${styles.sessionTimeBox} ${isOnBreak ? styles.break : ''}`}>
                  <div className={styles.sessionIcon}>⏱️</div>
                  <div className={styles.sessionTimeInfo}>
                    <div className={styles.sessionTimeLabel}>Elapsed Time</div>
                    <div className={styles.sessionTimeValue}>{formatLiveTimer(currentElapsedMs)}</div>
                    <div className={styles.sessionTimeDate}>Started at {formatTime(activeSession.clockInTime)}</div>
                  </div>
                </div>
                <div className={styles.sessionDetails}>
                  <div className={styles.detailRow}>
                    <div className={styles.detailLabel}>Current Task</div>
                    <div className={styles.detailValue}>{isWorking ? currentTask : '-'}</div>
                  </div>
                  {isOnBreak && (
                    <div className={styles.detailRow}>
                      <div className={styles.detailLabel}>Break Time</div>
                      <div className={styles.detailValue}>{activeSession?.breakDurationMs ? formatDuration(activeSession.breakDurationMs) : '0m'}</div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    className={styles.btnPrimary} 
                    onClick={toggleBreak}
                    style={{ flex: 1, backgroundColor: isOnBreak ? '#10b981' : '#f97316' }}
                  >
                    {isOnBreak ? '▶️ Resume Work' : '⏸ Start Break'}
                  </button>
                  <button 
                    className={styles.btnDanger} 
                    onClick={handleEndSession}
                    style={{ flex: 1 }}
                  >
                    ⏹ End Session
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <p style={{ color: '#64748b', marginBottom: '1rem' }}>You are currently offline.</p>
                <button className={styles.btnPrimary} onClick={handleStartSession} style={{ margin: '0 auto' }}>
                  ▶️ Start Session Now
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Live Timeline</div>
            <div className={styles.timeline}>
              {!activeSession && <div style={{ color: '#64748b', fontSize: '0.875rem' }}>No active session.</div>}
              {timelineItems.map((item, i) => (
                <div className={styles.timelineItem} key={i}>
                  <div className={`${styles.timelineDot} ${styles[item.status]}`}></div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineTime}>{item.time}</div>
                    <div className={styles.timelineText}>{item.text}</div>
                    {item.extra && <div className={styles.timelineExtra}>{item.extra}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Submit Work Log Modal */}
      {showSubmitModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Submit Work Log</h2>
              <button className={styles.closeBtn} onClick={() => setShowSubmitModal(false)}>×</button>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tasks Completed</label>
              <div className={styles.taskList}>
                {draftTasks.map((t) => (
                  <div key={t.id} className={styles.taskItem}>
                    <input 
                      type="text" 
                      className={styles.inputField} 
                      placeholder="Task title..." 
                      value={t.title} 
                      onChange={(e) => updateTask(t.id, 'title', e.target.value)} 
                    />
                    <button className={styles.removeTaskBtn} onClick={() => removeTask(t.id)}>🗑️</button>
                  </div>
                ))}
              </div>
              <button className={styles.addTaskBtn} onClick={addTask}>+ Add another task</button>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Work Summary</label>
              <textarea 
                className={styles.inputField} 
                placeholder="What did you work on today?"
                value={draftSummary}
                onChange={(e) => setDraftSummary(e.target.value)}
              />
            </div>


            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={() => setShowSubmitModal(false)} disabled={submitting}>Cancel</button>
              <button className={styles.btnPrimary} onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit & Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
