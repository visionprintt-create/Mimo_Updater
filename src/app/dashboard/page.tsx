'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useSessionStore } from '@/store/sessionStore';
import { useUIStore } from '@/store/uiStore';
import { getUserSessions, reviewSession, getUsersByDepartment, getWeeklyTasks, addWeeklyTask, updateWeeklyTask, deleteWeeklyTask, updateUser } from '@/lib/firestore';
import { signOutUser } from '@/lib/auth';
import { SESSION_DURATION_MS, DEPARTMENTS, ADMIN_ROLES } from '@/types';
import type { WorkSession, TaskEntry, Department, ReviewAction } from '@/types';
import { TASK_CATEGORIES, MOODS } from '@/types';

import { fmt, fmtDur, shortDate, shortTime, genId } from '@/lib/utils';

type Tab = 'Today' | 'History' | 'Tasks';

const handleAutoResize = (e: React.ChangeEvent<HTMLTextAreaElement> | React.FormEvent<HTMLTextAreaElement>) => {
  const target = e.target as HTMLTextAreaElement;
  target.style.height = 'auto';
  target.style.height = `${target.scrollHeight}px`;
};

import { getTheme } from '@/lib/theme';

export default function DashboardPage() {
  const router = useRouter();
  const { mimoUser } = useAuthStore();
  const isAdmin = mimoUser ? ADMIN_ROLES.includes(mimoUser.role) : false;

  const {
    activeSession, isWorking, isOnBreak, remainingMs,
    clockIn, clockOut, submitWorkLog, startBreak, endBreak,
    loadActiveSession,
    draftTasks, draftSummary, draftMood, draftBlockers, draftAchievements,
    setDraftTasks, setDraftSummary, setDraftMood, setDraftBlockers, setDraftAchievements,
  } = useSessionStore();

  const [allSessions, setAllSessions]       = useState<WorkSession[]>([]);
  const [deptUsers, setDeptUsers]           = useState<import('@/types').MimoUser[]>([]);
  const [viewingUserIdx, setViewingUserIdx] = useState(0);
  const [weeklyTasks, setWeeklyTasks]       = useState<import('@/types').WeeklyTask[]>([]);
  const [newWeeklyTask, setNewWeeklyTask]   = useState('');
  const [newWeeklyTaskDeadline, setNewWeeklyTaskDeadline] = useState('');
  const [editingWeeklyTaskId, setEditingWeeklyTaskId] = useState<string | null>(null);
  const [editingWeeklyTaskTitle, setEditingWeeklyTaskTitle] = useState('');
  const [editingWeeklyTaskDeadline, setEditingWeeklyTaskDeadline] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { dashboardTab: tab, setDashboardTab: setTab, deptFilter, setDeptFilter } = useUIStore();
  const [submitting, setSubmitting]          = useState(false);
  const [submitError, setSubmitError]        = useState('');

  /* Internship Dates Edit State */
  const [isEditingDates, setIsEditingDates]  = useState(false);
  const [editStartDate, setEditStartDate]    = useState('');
  const [editEndDate, setEditEndDate]        = useState('');
  const [savingDates, setSavingDates]        = useState(false);

  /* Admin remark state */
  const [remarkingOn, setRemarkingOn]        = useState<string | null>(null);
  const [remarkAction, setRemarkAction]      = useState<ReviewAction>('approved');
  const [remarkComment, setRemarkComment]    = useState('');
  const [openDropdownId, setOpenDropdownId]  = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [savingRemark, setSavingRemark]      = useState(false);

  const loadSessions = (uid: string) =>
    getUserSessions(uid)
      .then(setAllSessions)
      .catch((e) => console.warn('Could not load user sessions:', e.message));

  useEffect(() => {
    if (!mimoUser?.uid) return;
    loadActiveSession(mimoUser.uid);
  }, [mimoUser, loadActiveSession]);

  // When deptFilter changes, load users in that dept
  useEffect(() => {
    if (deptFilter) {
      getUsersByDepartment(deptFilter).then(users => {
        setDeptUsers(users);
        setViewingUserIdx(0);
      });
    } else {
      setDeptUsers([]);
      setViewingUserIdx(0);
    }
  }, [deptFilter]);

  const viewingUser = deptFilter 
    ? (deptUsers.length > 0 ? deptUsers[viewingUserIdx] : null) 
    : mimoUser;

  useEffect(() => {
    if (viewingUser?.uid) {
      loadSessions(viewingUser.uid);
    } else {
      setAllSessions([]);
    }
  }, [viewingUser?.uid]);

  const viewingUserDepts = viewingUser?.departments || (viewingUser?.department ? [viewingUser.department] : []);
  const C = getTheme(deptFilter || viewingUserDepts[0]);

  // Load weekly tasks for the viewingUser
  useEffect(() => {
    if (viewingUser?.uid) {
      getWeeklyTasks(viewingUser.uid).then(setWeeklyTasks);
    }
  }, [viewingUser?.uid]);

  useEffect(() => {
    // We no longer auto-switch to 'Tasks' since the form is on 'Today' now
    if (activeSession && !isWorking) setTab('Today');
  }, [activeSession, isWorking]);

  /* Handlers */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleClockIn  = async () => { 
    if (!mimoUser) return; 
    const uDepts = mimoUser.departments || (mimoUser.department ? [mimoUser.department] : []);
    await clockIn(mimoUser.uid, mimoUser.displayName, uDepts); 
    setTab('Today'); 
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleClockOut = () => { clockOut(); };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleBreak    = () => isOnBreak ? endBreak() : startBreak(); // Keep for store compatibility but remove from UI
  const addTask        = () => setDraftTasks([...draftTasks, { id: genId(), title: '', description: '', category: 'Development' }]);
  const updateTask     = (id: string, f: keyof TaskEntry, v: string) => setDraftTasks(draftTasks.map(t => t.id===id ? {...t,[f]:v} : t));
  const removeTask     = (id: string) => setDraftTasks(draftTasks.filter(t => t.id!==id));

  const handleSubmit = async () => {
    if (!draftTasks.some(t => t.title.trim())) { setSubmitError('Add at least one task.'); return; }
    setSubmitError(''); setSubmitting(true);
    await submitWorkLog(); setSubmitting(false);
    await handleSignOut(); // Automatically logout after submitting work log
  };

  const handleRemark = async () => {
    if (!remarkingOn || !mimoUser) return;
    setSavingRemark(true);
    await reviewSession(remarkingOn, {
      reviewedBy: mimoUser.uid,
      reviewerName: mimoUser.displayName,
      action: remarkAction,
      comment: remarkComment.trim() || undefined,
      reviewedAt: new Date().toISOString(),
    });
    setSavingRemark(false); setRemarkingOn(null); setRemarkComment('');
    if (viewingUser) loadSessions(viewingUser.uid);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSignOut = async () => { await signOutUser(); router.push('/login'); };

  const handleAddWeeklyTask = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newWeeklyTask.trim() && viewingUser) {
        const title = newWeeklyTask.trim();
        setNewWeeklyTask('');
        const tempId = genId();
        
        let dueDate: string;
        if (newWeeklyTaskDeadline) {
          const d = new Date(newWeeklyTaskDeadline);
          d.setHours(23, 59, 59, 999);
          dueDate = d.toISOString();
        } else {
          const d = new Date();
          const day = d.getDay();
          d.setDate(d.getDate() + (6 - day));
          d.setHours(23, 59, 59, 999);
          dueDate = d.toISOString();
        }
        
        setWeeklyTasks(prev => [{ id: tempId, title, completed: false, createdAt: new Date().toISOString(), dueDate, userId: viewingUser.uid }, ...prev]);
        const newId = await addWeeklyTask(viewingUser.uid, title, dueDate);
        setNewWeeklyTaskDeadline('');
        setWeeklyTasks(prev => prev.map(t => t.id === tempId ? { ...t, id: newId } : t));
      }
    }
  };

  const handleToggleWeeklyTask = async (task: import('@/types').WeeklyTask) => {
    const updated = !task.completed;
    const completedAt = updated ? new Date().toISOString() : undefined;
    setWeeklyTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: updated, completedAt } : t));
    await updateWeeklyTask(task.id, { completed: updated, completedAt });
  };

  const handleDeleteWeeklyTask = async (taskId: string) => {
    setWeeklyTasks(prev => prev.filter(t => t.id !== taskId));
    await deleteWeeklyTask(taskId);
  };

  const handleSaveEditWeeklyTask = async (taskId: string) => {
    if (!editingWeeklyTaskTitle.trim()) return;
    
    let newDueDate: string | undefined;
    if (editingWeeklyTaskDeadline) {
      const d = new Date(editingWeeklyTaskDeadline);
      d.setHours(23, 59, 59, 999);
      newDueDate = d.toISOString();
    }

    setWeeklyTasks(prev => prev.map(t => t.id === taskId ? { 
      ...t, 
      title: editingWeeklyTaskTitle.trim(),
      ...(newDueDate ? { dueDate: newDueDate } : {})
    } : t));
    
    setEditingWeeklyTaskId(null);
    
    await updateWeeklyTask(taskId, { 
      title: editingWeeklyTaskTitle.trim(),
      ...(newDueDate ? { dueDate: newDueDate } : {})
    });
  };

  const handleSaveDates = async () => {
    if (!mimoUser || !isMe) return;
    setSavingDates(true);
    try {
      await updateUser(mimoUser.uid, {
        internshipStartDate: editStartDate,
        internshipEndDate: editEndDate,
      });
      // Optionally update the local state for the user here if possible, 
      // since the store might not immediately reflect it.
      useAuthStore.setState({ mimoUser: { ...mimoUser, internshipStartDate: editStartDate, internshipEndDate: editEndDate } });
      setIsEditingDates(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingDates(false);
    }
  };

  function getSalaryMonth(isoDate: string): string {
    const d = new Date(isoDate);
    let year = d.getFullYear();
    let month = d.getMonth();
    if (d.getDate() >= 15) {
      month = month + 1;
      if (month > 11) { month = 0; year = year + 1; }
    }
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const prevMonth = month === 0 ? 11 : month - 1;
    return `${monthNames[month]} ${year} (15 ${monthNames[prevMonth]} - 14 ${monthNames[month]})`;
  }

  /* Group sessions by salary month -> date for viewingUser */
  const groupedHistory = useMemo(() => {
    if (!viewingUser) return [];
    let src = allSessions.filter(s => s.status !== 'active');
    src = src.sort((a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime());
    
    const map: Record<string, Record<string, WorkSession[]>> = {};
    for (const s of src) { 
      const sm = getSalaryMonth(s.clockInTime);
      const dt = shortDate(s.clockInTime);
      if (!map[sm]) map[sm] = {};
      if (!map[sm][dt]) map[sm][dt] = [];
      map[sm][dt].push(s);
    }
    return Object.entries(map).map(([month, datesMap]) => ({
      month,
      dates: Object.entries(datesMap)
    }));
  }, [allSessions, viewingUser]);

  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const toggleDate = (date: string) => setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));

  /* Filter sessions completed today by viewingUser */
  const todaySessions = useMemo(() => {
    if (!viewingUser) return [];
    const todayStr = shortDate(new Date().toISOString());
    const src = allSessions.filter(s => s.status !== 'active' && shortDate(s.clockInTime) === todayStr);
    return src.sort((a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime());
  }, [allSessions, viewingUser]);

  /* Reusable Session Card Component */
  const renderSessionCard = (s: WorkSession) => (
    <div key={s.id} className="session-card" style={{ position: 'relative', zIndex: openDropdownId === s.id ? 50 : 1, background: 'var(--bg-glass)', border:'1px solid var(--border-color)', borderRadius:'16px', padding:'24px', display:'flex', flexDirection:'column', gap:'16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: s.status==='active' ? 'var(--status-active)' : 'var(--text-secondary)' }} />
          <div style={{ fontSize:'14px', color: 'var(--text-primary)', fontWeight:600 }}>{shortTime(s.clockInTime)} - {s.clockOutTime ? shortTime(s.clockOutTime) : 'Active'}</div>
        </div>
        <div style={{ fontSize:'14px', fontWeight:700, fontFamily:'monospace', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', padding:'4px 10px', borderRadius:'6px', color: 'var(--text-primary)' }}>{fmtDur(s.totalDurationMs)}</div>
      </div>
      
      {/* Work Summary & Tasks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {s.workSummary && (
          <div style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {s.workSummary}
          </div>
        )}

        {s.tasks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Tasks Completed</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {s.tasks.map((task) => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--mimo-primary)', marginTop: '8px', flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{task.title}</div>
                    {task.description && (
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {task.description}
                      </div>
                    )}
                    <div>
                      <span style={{ background: '#ffffff', color: 'var(--mimo-primary)', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, border: '1px solid var(--border-color)' }}>
                        {task.category.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Extra Metadata (Mood, Breaks, Blockers) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px' }}>
          {s.mood && (
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Mood:</span> 
              <span>{s.mood === 'frustrated' ? '😤' : s.mood === 'neutral' ? '😐' : s.mood === 'good' ? '😊' : '🔥'}</span>
            </div>
          )}
          {s.breaks.length > 0 && (
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Breaks:</span> 
              <span style={{ color: 'var(--text-primary)' }}>{s.breaks.length} ({fmtDur(s.breakDurationMs)})</span>
            </div>
          )}
          
          {s.blockers && (
            <div style={{ flex: '1 1 100%', display: 'flex', gap: '8px', padding: '12px', background: 'rgba(225, 112, 85, 0.05)', borderRadius: '8px', border: '1px solid rgba(225, 112, 85, 0.2)' }}>
              <span style={{ color: 'var(--status-flagged)', fontSize: '16px' }}>⚠️</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong style={{ color: 'var(--status-flagged)', fontSize: '12px', textTransform: 'uppercase' }}>Blockers</strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5 }}>{s.blockers}</span>
              </div>
            </div>
          )}

          {s.achievements && (
            <div style={{ flex: '1 1 100%', display: 'flex', gap: '8px', padding: '12px', background: 'rgba(0, 184, 148, 0.05)', borderRadius: '8px', border: '1px solid rgba(0, 184, 148, 0.2)' }}>
              <span style={{ color: 'var(--status-active)', fontSize: '16px' }}>⭐</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong style={{ color: 'var(--status-active)', fontSize: '12px', textTransform: 'uppercase' }}>Achievements</strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5 }}>{s.achievements}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /* ── Style helpers ── */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const tabStyle = (t: Tab): React.CSSProperties => ({
    background: tab===t ? 'var(--mimo-primary)' : 'transparent',
    border: `1px solid ${tab===t ? 'var(--mimo-primary)' : 'transparent'}`, borderRadius: '8px', cursor: 'pointer',
    padding: '7px 20px', fontWeight: tab===t ? 700 : 400,
    fontSize: '14px', color: tab===t ? '#ffffff' : 'var(--text-secondary)',
    transition: 'all 0.3s ease', letterSpacing: '0.01em',
    boxShadow: tab===t ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const deptStyle = (d: Department): React.CSSProperties => ({
    background: deptFilter===d ? 'var(--mimo-primary)' : 'transparent',
    color: deptFilter===d ? '#ffffff' : 'var(--text-secondary)',
    border: `1px solid ${deptFilter===d ? 'var(--mimo-primary)' : 'var(--border-color)'}`,
    borderRadius: '12px', padding: '9px 14px', cursor: 'pointer',
    fontWeight: deptFilter===d ? 700 : 500, fontSize: '13px',
    textAlign: 'left', width: '100%', transition: 'all 0.3s ease',
    boxShadow: deptFilter===d ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
  });

  const INPUT: React.CSSProperties = {
    width:'100%', background: 'var(--bg-input)', border:'1px solid var(--border-color)',
    borderRadius:'8px', padding:'11px 13px', color: 'var(--text-primary)',
    fontSize:'14px', outline:'none', boxSizing:'border-box',
  };
  const TEXTAREA: React.CSSProperties = { ...INPUT, resize:'vertical', minHeight:'80px', fontFamily:'inherit' };

  /* Touch swiping logic */
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (Math.abs(diff) > 50 && deptUsers.length > 1) {
      if (diff > 0) setViewingUserIdx((i) => (i + 1) % deptUsers.length); // Swipe left -> next user
      else setViewingUserIdx((i) => (i - 1 + deptUsers.length) % deptUsers.length); // Swipe right -> prev user
    }
    setTouchStart(null);
  };

  const nextUser = () => setViewingUserIdx((i) => (i + 1) % deptUsers.length);
  const prevUser = () => setViewingUserIdx((i) => (i - 1 + deptUsers.length) % deptUsers.length);

  const isMe = viewingUser?.uid === mimoUser?.uid;

  /* ════════════════════════════════════ RENDER ════════════════════════════════════ */
  return (
    <div 
      onTouchStart={handleTouchStart} 
      onTouchEnd={handleTouchEnd}
      style={{ flex:1, overflow:'auto', background: 'transparent', color: C.textPrimary, padding: '0 8px 32px 8px', display:'flex', flexDirection:'column' }}
    >
      {/* ══ USER HEADER & SWIPE ARROWS ══ */}
      {deptFilter && deptUsers.length > 0 && (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '32px', background: 'var(--bg-glass)', padding:'16px 24px', borderRadius:'16px', border: '1px solid var(--border-color)' }}>
          <button onClick={prevUser} style={{ background:'transparent', border:'none', color: 'var(--text-primary)', fontSize:'24px', cursor:'pointer', padding:'0 16px', visibility: deptUsers.length > 1 ? 'visible' : 'hidden' }}>{'<'}</button>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'22px', fontWeight:800, letterSpacing:'-0.02em', color: 'var(--text-primary)' }}>{viewingUser?.displayName}</div>
            <div style={{ fontSize:'13px', fontWeight:600, color: 'var(--text-secondary)', marginTop:'4px' }}>{viewingUserDepts.join(', ')} • <span style={{color: 'var(--text-muted)'}}>{viewingUser?.role}</span></div>
            
            {(viewingUser?.internshipStartDate || isEditingDates) && (
              <div style={{ marginTop: '12px' }}>
                {isEditingDates ? (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
                    <input 
                      type="date" 
                      value={editStartDate} 
                      onChange={(e) => setEditStartDate(e.target.value)} 
                      style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                    />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>to</span>
                    <input 
                      type="date" 
                      value={editEndDate} 
                      onChange={(e) => setEditEndDate(e.target.value)} 
                      style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                    />
                    <button 
                      onClick={handleSaveDates} 
                      disabled={savingDates}
                      style={{ padding: '6px 12px', background: 'var(--mimo-primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s' }}
                    >
                      {savingDates ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      onClick={() => setIsEditingDates(false)} 
                      style={{ padding: '6px 12px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, transition: 'all 0.2s' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, background: 'var(--bg-primary)', padding: '4px 12px', borderRadius: '99px', border: '1px solid var(--border-color)' }}>
                      🗓️ {viewingUser?.internshipStartDate ? new Date(viewingUser.internshipStartDate).toLocaleDateString() : 'N/A'} – {viewingUser?.internshipEndDate ? new Date(viewingUser.internshipEndDate).toLocaleDateString() : 'N/A'}
                    </div>
                    {isMe && (
                      <button 
                        onClick={() => {
                          setEditStartDate(viewingUser?.internshipStartDate || '');
                          setEditEndDate(viewingUser?.internshipEndDate || '');
                          setIsEditingDates(true);
                        }}
                        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '11px' }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {!viewingUser?.internshipStartDate && isMe && !isEditingDates && (
              <button 
                onClick={() => setIsEditingDates(true)}
                style={{ marginTop: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}
              >
                + Add Internship Dates
              </button>
            )}
          </div>
          <button onClick={nextUser} style={{ background:'transparent', border:'none', color:'#ffffff', fontSize:'24px', cursor:'pointer', padding:'0 16px', visibility: deptUsers.length > 1 ? 'visible' : 'hidden' }}>{'>'}</button>
        </div>
      )}

      {/* ══ EMPTY STATE FOR DEPARTMENTS WITH NO USERS ══ */}
      {deptFilter && deptUsers.length === 0 && (
        <div style={{ textAlign:'center', padding:'48px 24px', background: C.accent, borderRadius:'16px', border:'none', marginBottom:'32px', boxShadow: `0 4px 20px ${C.accent}40` }}>
          <div style={{ fontSize:'24px', fontWeight:700, color:'#ffffff', letterSpacing:'-0.02em' }}>No Users Found</div>
          <div style={{ fontSize:'15px', color:'rgba(255,255,255,0.8)', marginTop:'8px', fontWeight:500 }}>There are currently no users assigned to the {deptFilter}.</div>
        </div>
      )}

      {/* ══ HISTORY TAB ══ */}
      {tab === 'History' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'20px', maxWidth:'1200px', margin:'0 auto', width:'100%' }}>
          {groupedHistory.length === 0 ? (
             <div style={{ textAlign:'center', padding:'100px 32px', color: 'var(--text-secondary)' }}>
               <div style={{ fontSize:'40px', marginBottom:'12px', opacity:.5 }}>📋</div>
               <div style={{ fontWeight:600 }}>No history for this user.</div>
             </div>
          ) : (
            groupedHistory.map(({ month, dates }) => (
              <div key={month} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                <div style={{ position: 'sticky', top: '0', zIndex: 10, background: 'var(--bg-glass)', padding:'14px 20px', borderRadius:'12px', fontSize:'13px', fontWeight:700, color: 'var(--text-primary)', textTransform:'uppercase', letterSpacing:'1.5px', border:'1px solid var(--border-color)', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
                  {month}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'12px', paddingLeft:'12px' }}>
                  {dates.map(([date, daySessions]) => (
                    <div key={date} style={{ background: 'var(--bg-glass)', borderRadius:'12px', border:'1px solid var(--border-color)', overflow:'hidden', transition:'all 0.2s' }}>
                      <div 
                        onClick={() => toggleDate(date)}
                        style={{ padding:'18px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', background: expandedDates[date] ? 'var(--bg-card)' : 'transparent' }}
                      >
                        <div style={{ display:'flex', gap:'16px', alignItems:'center' }}>
                          <span style={{ fontSize:'16px', fontWeight:600, color: 'var(--text-primary)' }}>{date}</span>
                          <span style={{ fontSize:'12px', color: 'var(--text-secondary)', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', padding:'6px 10px', borderRadius:'8px', fontWeight:600 }}>{daySessions.length} session{daySessions.length>1?'s':''}</span>
                        </div>
                        <span style={{ transform: expandedDates[date] ? 'rotate(180deg)' : 'none', transition:'transform 0.3s ease', fontSize:'12px', color: 'var(--text-secondary)' }}>▼</span>
                      </div>
                      
                      {expandedDates[date] && (
                        <div style={{ padding:'0 24px 24px 24px', display:'flex', flexDirection:'column', gap:'16px' }}>
                          <div style={{ height:'1px', background:C.borderLight, width:'100%', marginBottom:'8px' }} />
                          {daySessions.map(s => renderSessionCard(s))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ══ TASKS TAB (Weekly Tasks) ══ */}
      {tab === 'Tasks' && (
        <div style={{ maxWidth:'1200px', margin:'0 auto', width:'100%', padding:'36px 32px' }}>
          <div style={{ fontSize:'20px', fontWeight:700, marginBottom:'24px' }}>Weekly Tasks</div>
          
          {(mimoUser?.role === 'founder' || mimoUser?.role === 'hr') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <textarea 
                placeholder="Add a new weekly task and press Enter (Shift+Enter for new line)..." 
                value={newWeeklyTask}
                onChange={e=>setNewWeeklyTask(e.target.value)}
                onKeyDown={handleAddWeeklyTask}
                onInput={handleAutoResize}
                style={{ ...TEXTAREA, minHeight: '60px', padding:'14px 16px', fontSize:'15px', overflow: 'hidden', margin: 0 }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Deadline (Optional):</span>
                <input 
                  type="date" 
                  value={newWeeklyTaskDeadline} 
                  onChange={e => setNewWeeklyTaskDeadline(e.target.value)} 
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '6px 12px', fontSize: '14px' }}
                />
              </div>
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            {weeklyTasks.length === 0 ? (
              <div style={{ color:'var(--text-secondary)', textAlign:'center', padding:'40px' }}>No weekly tasks found.</div>
            ) : (
              weeklyTasks.map(t => {
                const dueDate = t.dueDate ? new Date(t.dueDate) : new Date(new Date(t.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000);
                const isLate = t.completed
                  ? t.completedAt && new Date(t.completedAt) > dueDate
                  : new Date() > dueDate;
                const canToggle = isMe || mimoUser?.role === 'founder' || mimoUser?.role === 'hr';

                return (
                  <div key={t.id} style={{ display:'flex', alignItems:'center', gap:'12px', background:'var(--bg-glass)', padding:'16px', borderRadius:'12px', border:'1px solid var(--border-color)' }}>
                    <input 
                      type="checkbox" 
                      checked={t.completed} 
                      onChange={() => canToggle && handleToggleWeeklyTask(t)}
                      disabled={!canToggle}
                      style={{ width:'20px', height:'20px', cursor: canToggle ? 'pointer' : 'default' }}
                    />
                    {editingWeeklyTaskId === t.id ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <textarea
                            value={editingWeeklyTaskTitle}
                            onChange={e => setEditingWeeklyTaskTitle(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEditWeeklyTask(t.id); }
                              if (e.key === 'Escape') setEditingWeeklyTaskId(null);
                            }}
                            onInput={handleAutoResize}
                            style={{ ...TEXTAREA, flex: 1, minHeight: '40px', padding: '8px', overflow: 'hidden' }}
                            autoFocus
                          />
                          <button onClick={() => handleSaveEditWeeklyTask(t.id)} style={{ background: 'var(--mimo-primary)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0 16px', cursor: 'pointer', fontWeight: 600, alignSelf: 'flex-start', height: '40px' }}>Save</button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Deadline:</span>
                          <input 
                            type="date" 
                            value={editingWeeklyTaskDeadline} 
                            onChange={e => setEditingWeeklyTaskDeadline(e.target.value)} 
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', padding: '4px 8px', fontSize: '13px' }}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ flex: 1, fontSize:'15px', color: t.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: t.completed ? 'line-through' : 'none', whiteSpace: 'pre-wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{t.title}</span>
                            {isLate && <span title="Late Submission" style={{ color: 'var(--mimo-primary-dark)', fontSize: '11px', fontWeight: 700, padding: '2px 8px', background: 'rgba(239,68,68,0.1)', borderRadius: '4px', whiteSpace: 'nowrap' }}>Task delayed</span>}
                          </div>
                          {t.dueDate && (
                            <div style={{ fontSize: '12px', color: isLate && !t.completed ? 'var(--mimo-primary-dark)' : 'var(--text-secondary)', marginTop: '4px', textDecoration: 'none' }}>
                              Deadline: {new Date(t.dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          )}
                        </div>
                        {(mimoUser?.role === 'founder' || mimoUser?.role === 'hr') && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => { 
                              setEditingWeeklyTaskId(t.id); 
                              setEditingWeeklyTaskTitle(t.title); 
                              setEditingWeeklyTaskDeadline(t.dueDate ? t.dueDate.substring(0, 10) : '');
                            }} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>Edit</button>
                            <button onClick={() => handleDeleteWeeklyTask(t.id)} style={{ background: 'transparent', border: 'none', color: 'var(--mimo-primary-dark)', cursor: 'pointer', fontSize: '13px' }}>Delete</button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ══ TODAY TAB ══ */}
      {tab === 'Today' && (
        <div style={{ padding:'36px 32px', maxWidth:'1200px', margin: '0 auto', width:'100%', display:'flex', flexDirection:'column', gap:'40px' }}>
          {activeSession ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'28px' }}>
              <div style={{ fontSize:'18px', fontWeight:700 }}>
                Your Live Session
              </div>
              
              {/* Work Log Form */}
              <div style={{ display:'flex', flexDirection:'column', gap:'28px' }}>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:600, color: 'var(--text-secondary)', marginBottom:'12px', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                    What did you work on? <span style={{ color: 'var(--mimo-primary-dark)' }}>*</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                    {draftTasks.map((task, idx) => (
                      <div key={task.id} style={{ background: 'var(--bg-glass)', border:'1px solid var(--border-color)', borderRadius:'12px', padding:'18px 20px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
                          <span style={{ fontSize:'11px', fontWeight:600, color: 'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Task {idx+1}</span>
                          <button onClick={()=>removeTask(task.id)} style={{ background:'none', border:'1px solid var(--border-color)', borderRadius:'50%', width:'26px', height:'26px', color: 'var(--text-secondary)', cursor:'pointer', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                        </div>
                        <textarea style={{ ...TEXTAREA, marginBottom:'0px', minHeight: '60px', overflow: 'hidden' }} placeholder="Task title (Shift+Enter for new line)" value={task.title} onChange={e=>updateTask(task.id,'title',e.target.value)} onInput={handleAutoResize} />
                      </div>
                    ))}
                  </div>
                  <button onClick={addTask} style={{ width:'100%', background:'none', border:'1px dashed var(--border-color)', borderRadius:'10px', color: 'var(--text-secondary)', cursor:'pointer', padding:'13px', fontSize:'13px', fontWeight:500, marginTop:'10px' }}>
                    + Add Task
                  </button>
                </div>

                <div>
                  <div style={{ fontSize:'13px', fontWeight:600, color: 'var(--text-secondary)', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Remark for the day</div>
                  <textarea style={{ ...TEXTAREA, overflow: 'hidden' }} placeholder="Brief summary of your session..." value={draftSummary} onChange={e=>setDraftSummary(e.target.value)} onInput={handleAutoResize} />
                </div>


                {submitError && (
                  <div style={{ background:'rgba(239,68,68,0.08)', border:`1px solid rgba(239,68,68,0.2)`, borderRadius:'8px', padding:'12px 16px', color:'#fca5a5', fontSize:'13px' }}>
                    ⚠ {submitError}
                  </div>
                )}

                <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginTop:'8px' }}>
                  {isWorking && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', marginBottom: '8px' }}>
                      Clock out of your session from the top right button to submit the work log
                    </div>
                  )}
                  <button onClick={handleSubmit} disabled={submitting||isWorking} style={{ width:'100%', padding:'15px', borderRadius:'10px', border:'none', background: isWorking ? 'var(--border-color)' : 'var(--mimo-primary)', color: isWorking ? 'var(--text-muted)' : '#ffffff', cursor: isWorking?'not-allowed':'pointer', fontWeight:700, fontSize:'15px', transition: 'all 0.3s ease' }}>
                    {submitting ? 'Submitting...' : isWorking ? 'Clock out first' : '✓ Submit Work Log'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign:'center', paddingTop:'20px', paddingBottom:'20px' }}>
              <div style={{ fontWeight:800, fontSize:'22px', marginBottom:'8px' }}>
                No active session
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize:'14px' }}>
                Check in from the top right to start logging work.
              </div>
            </div>
          )}

          {/* Today's Completed Sessions Summary */}
          {todaySessions.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:'16px', marginTop:'20px', borderTop:'1px solid var(--border-color)', paddingTop:'40px' }}>
              <div style={{ fontSize:'18px', fontWeight:700 }}>Today&apos;s Completed Work</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                {todaySessions.map(s => renderSessionCard(s))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
