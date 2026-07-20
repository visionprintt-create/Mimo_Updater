'use client';

import React, { useEffect, useState } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { useAuthStore } from '@/store/authStore';
import { getWeeklyTasks, addWeeklyTask, updateWeeklyTask, deleteWeeklyTask, createAuditLog } from '@/lib/firestore';
import type { WeeklyTask } from '@/types';
import styles from '../dashboard/Dashboard.module.css';

export default function TasksPage() {
  const { mimoUser } = useAuthStore();
  const { draftTasks, setDraftTasks, isWorking } = useSessionStore();
  
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newWeeklyTitle, setNewWeeklyTitle] = useState('');

  useEffect(() => {
    if (mimoUser) {
      loadWeeklyTasks();
    }
  }, [mimoUser]);

  const loadWeeklyTasks = async () => {
    if (!mimoUser) return;
    setLoadingTasks(true);
    try {
      const tasks = await getWeeklyTasks(mimoUser.uid);
      setWeeklyTasks(tasks);
    } catch (e) {
      console.error('Failed to load weekly tasks', e);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleAddSessionTask = () => {
    if (!newTaskTitle.trim()) {
      alert('Please enter what you are working on before adding a task.');
      return;
    }
    const id = Math.random().toString(36).substr(2, 9);
    setDraftTasks([...draftTasks, { id, title: newTaskTitle, description: '', category: 'Development' }]);
    setNewTaskTitle('');
  };

  const handleRemoveSessionTask = (id: string) => {
    setDraftTasks(draftTasks.filter(t => t.id !== id));
  };

  const handleAddWeeklyTask = async () => {
    if (!mimoUser) return;
    if (!newWeeklyTitle.trim()) {
      alert('Please enter a weekly task description before adding.');
      return;
    }
    try {
      const taskId = await addWeeklyTask(mimoUser.uid, newWeeklyTitle);
      await createAuditLog({
        actorId: mimoUser.uid,
        actorName: mimoUser.displayName,
        action: 'TASK_CREATED',
        targetId: taskId,
        details: `Created a new weekly task: "${newWeeklyTitle}"`,
        createdAt: new Date().toISOString()
      });
      setNewWeeklyTitle('');
      loadWeeklyTasks();
    } catch (e) {
      console.error(e);
      alert('Failed to add weekly task.');
    }
  };

  const toggleWeeklyTask = async (task: WeeklyTask) => {
    try {
      await updateWeeklyTask(task.id, { completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : undefined });
      loadWeeklyTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const removeWeeklyTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteWeeklyTask(id);
      loadWeeklyTasks();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <div className={styles.topHeader}>
        <div className={styles.greeting}>
          <h1>Tasks 📋</h1>
          <p>Manage your current session tasks and view weekly assignments.</p>
        </div>
      </div>

      <div className={styles.dashboardGrid}>
        <div className={styles.card} style={{ gridColumn: 'span 2' }}>
          <div className={styles.cardTitle}>Current Session Tasks</div>
          
          {!isWorking ? (
            <p style={{ color: '#64748b' }}>Start a session to add and track active tasks.</p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <input 
                  type="text" 
                  value={newTaskTitle} 
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="What are you working on right now?" 
                  className={styles.inputField} 
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSessionTask()}
                />
                <button className={styles.btnPrimary} onClick={handleAddSessionTask}>Add Task</button>
              </div>

              {draftTasks.length === 0 ? (
                <p style={{ color: '#64748b' }}>No tasks added yet.</p>
              ) : (
                <div className={styles.completedList}>
                  {draftTasks.map(t => (
                    <div className={styles.completedItem} key={t.id} style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0', display: 'flex', justifyItems: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1 }}>
                        <div className={styles.completedIcon}>⏳</div>
                        <div className={styles.completedInfo}>
                          <div className={styles.completedTitle} style={{ fontSize: '1rem' }}>{t.title || 'Untitled Task'}</div>
                          <div className={styles.completedTime}>In Progress</div>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveSessionTask(t.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.25rem' }}>🗑️</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Weekly Tasks</div>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input 
                type="text" 
                value={newWeeklyTitle} 
                onChange={(e) => setNewWeeklyTitle(e.target.value)}
                placeholder="Add weekly task..." 
                className={styles.inputField} 
                style={{ padding: '0.5rem' }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddWeeklyTask()}
              />
              <button className={styles.btnPrimary} onClick={handleAddWeeklyTask} style={{ padding: '0.5rem 1rem' }}>+</button>
            </div>

            {loadingTasks ? (
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading...</p>
            ) : weeklyTasks.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No weekly tasks yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {weeklyTasks.map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.75rem', backgroundColor: t.completed ? '#f1f5f9' : '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <input 
                        type="checkbox" 
                        checked={t.completed} 
                        onChange={() => toggleWeeklyTask(t)} 
                        style={{ marginTop: '0.25rem', cursor: 'pointer' }}
                      />
                      <div style={{ textDecoration: t.completed ? 'line-through' : 'none', color: t.completed ? '#94a3b8' : '#0f172a', fontSize: '0.875rem' }}>
                        {t.title}
                        {t.dueDate && (
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
                            Due: {new Date(t.dueDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <button onClick={() => removeWeeklyTask(t.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '1.25rem', padding: 0 }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
