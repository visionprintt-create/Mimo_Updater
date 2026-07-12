'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useSessionStore } from '@/store/sessionStore';
import { useUIStore } from '@/store/uiStore';
import { getUserSessions, reviewSession, getUsersByDepartment, getWeeklyTasks, addWeeklyTask, updateWeeklyTask } from '@/lib/firestore';
import { signOutUser } from '@/lib/auth';
import { SESSION_DURATION_MS, DEPARTMENTS, ADMIN_ROLES } from '@/types';
import type { WorkSession, TaskEntry, Department, ReviewAction } from '@/types';
import { TASK_CATEGORIES, MOODS } from '@/types';

import { fmt, fmtDur, shortDate, shortTime, genId } from '@/lib/utils';

type Tab = 'Today' | 'History' | 'Tasks';

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { dashboardTab: tab, setDashboardTab: setTab, deptFilter, setDeptFilter } = useUIStore();
  const [submitting, setSubmitting]          = useState(false);
  const [submitError, setSubmitError]        = useState('');

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
    if (!mimoUser) return;
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDeptUsers([]);
      setViewingUserIdx(0);
    }
  }, [deptFilter]);

  const viewingUser = deptFilter 
    ? (deptUsers.length > 0 ? deptUsers[viewingUserIdx] : null) 
    : mimoUser;

  useEffect(() => {
    if (viewingUser) {
      loadSessions(viewingUser.uid);
    } else {
      setAllSessions([]);
    }
  }, [viewingUser]);

  const C = getTheme(deptFilter || viewingUser?.department);

  // Load weekly tasks for the viewingUser
  useEffect(() => {
    if (viewingUser) {
      getWeeklyTasks(viewingUser.uid).then(setWeeklyTasks);
    }
  }, [viewingUser]);

  useEffect(() => {
    // We no longer auto-switch to 'Tasks' since the form is on 'Today' now
    if (activeSession && !isWorking) setTab('Today');
  }, [activeSession, isWorking]);

  /* Handlers */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleClockIn  = async () => { if (!mimoUser) return; await clockIn(mimoUser.uid, mimoUser.displayName, mimoUser.department); setTab('Today'); };
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
    if (viewingUser) loadSessions(viewingUser.uid);
    setTab('History');
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

  const handleAddWeeklyTask = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newWeeklyTask.trim() && viewingUser) {
      const title = newWeeklyTask.trim();
      setNewWeeklyTask('');
      const tempId = genId();
      setWeeklyTasks(prev => [{ id: tempId, title, completed: false, createdAt: new Date().toISOString(), userId: viewingUser.uid }, ...prev]);
      const newId = await addWeeklyTask(viewingUser.uid, title);
      setWeeklyTasks(prev => prev.map(t => t.id === tempId ? { ...t, id: newId } : t));
    }
  };

  const handleToggleWeeklyTask = async (task: import('@/types').WeeklyTask) => {
    const updated = !task.completed;
    setWeeklyTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: updated } : t));
    await updateWeeklyTask(task.id, { completed: updated });
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
    <div key={s.id} className="session-card" style={{ position: 'relative', zIndex: openDropdownId === s.id ? 50 : 1, background: C.surface, border:`1px solid ${C.border}`, borderRadius:'16px', padding:'24px', display:'flex', flexDirection:'column', gap:'16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom: `1px solid ${C.borderLight}`, paddingBottom: '16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: s.status==='active' ? C.green : C.textSecondary }} />
          <div style={{ fontSize:'14px', color:C.textPrimary, fontWeight:600 }}>{shortTime(s.clockInTime)} - {s.clockOutTime ? shortTime(s.clockOutTime) : 'Active'}</div>
        </div>
        <div style={{ fontSize:'14px', fontWeight:700, fontFamily:'monospace', background: 'rgba(0,0,0,0.04)', padding:'4px 10px', borderRadius:'6px', color: C.textPrimary }}>{fmtDur(s.totalDurationMs)}</div>
      </div>
      
      {s.tasks.length > 0 && (
        <div>
          <div style={{ fontSize:'12px', color:C.textSecondary, textTransform:'uppercase', marginBottom:'8px', letterSpacing:'1.2px', fontWeight:700 }}>Tasks Completed</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {s.tasks.map(t => (
              <div key={t.id} className="session-task-item" style={{ fontSize:'14px', color:C.textPrimary, display:'flex', gap:'8px', alignItems:'center', background: 'rgba(0,0,0,0.02)', padding:'10px 14px', borderRadius:'8px', border: `1px solid ${C.borderLight}` }}>
                <span style={{ color:C.accent }}>✓</span>
                <span style={{ flex:1 }}>{t.title}</span>
                <span style={{ fontSize:'12px', color:C.textSecondary, background: C.bg, padding:'2px 8px', borderRadius:'4px' }}>{t.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {s.workSummary && (
        <div style={{ background: C.bg, padding:'16px', borderRadius:'12px', borderLeft: `3px solid ${C.accent}` }}>
          <div style={{ fontSize:'12px', color:C.textSecondary, textTransform:'uppercase', marginBottom:'6px', letterSpacing:'1.2px', fontWeight:700 }}>Summary</div>
          <div style={{ fontSize:'14px', color:C.textPrimary, lineHeight:'1.5' }}>{s.workSummary}</div>
        </div>
      )}

      <div className="session-review-box" style={{ background: 'rgba(0,0,0,0.02)', padding:'16px', borderRadius:'12px', border:`1px solid ${C.borderLight}` }}>
        <div style={{ fontSize:'12px', color:C.textSecondary, textTransform:'uppercase', marginBottom:'12px', letterSpacing:'1.2px', fontWeight:700 }}>Evaluation & Remark</div>
        {s.review ? (
           <div style={{ display:'flex', gap:'12px', alignItems:'flex-start' }}>
             <span style={{ fontSize:'12px', fontWeight:700, padding:'4px 10px', borderRadius:'6px', background: s.review.action==='starred' ? 'rgba(234,179,8,0.12)' : s.review.action==='flagged' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.1)', color: s.review.action==='starred' ? C.yellow : s.review.action==='flagged' ? C.red : C.green }}>
               {s.review.action.toUpperCase()}
             </span>
             {s.review.comment && <div style={{ fontSize:'14px', color: C.textPrimary, lineHeight:'1.5' }}>{s.review.comment}</div>}
           </div>
        ) : (
           <div style={{ fontSize:'13px', color:C.textMuted }}>No remarks yet.</div>
        )}
        {isAdmin && !s.review && (
          <div className="session-review-actions" style={{ marginTop:'16px', display:'flex', gap:'12px', alignItems:'center', borderTop:`1px solid ${C.borderLight}`, paddingTop:'16px' }}>
            <div style={{ position: 'relative' }}>
              <div 
                onClick={() => setOpenDropdownId(openDropdownId === s.id ? null : s.id)}
                style={{
                  padding:'10px 14px', width:'130px', cursor:'pointer',
                  background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px',
                  color: C.textPrimary, fontWeight: 600, fontSize: '13px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}
              >
                {remarkAction.charAt(0).toUpperCase() + remarkAction.slice(1)}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
              
              {openDropdownId === s.id && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: '6px',
                  background: C.bg, border: `1px solid ${C.border}`,
                  borderRadius: '10px', width: '100%', zIndex: 50,
                  boxShadow: '0 4px 15px rgba(0,0,0,0.08)', overflow: 'hidden'
                }}>
                  {(['approved', 'starred', 'flagged', 'noted'] as ReviewAction[]).map(opt => (
                    <div 
                      key={opt}
                      onClick={() => {
                        setRemarkAction(opt);
                        setOpenDropdownId(null);
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = C.accent; e.currentTarget.style.color = '#FFF'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textPrimary; }}
                      style={{
                        padding: '10px 14px', cursor: 'pointer',
                        fontSize: '13px', fontWeight: 500, color: C.textPrimary,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <input value={remarkComment} onChange={e=>setRemarkComment(e.target.value)} placeholder="Add a remark..." style={{ ...INPUT, padding:'10px 14px', flex:1, borderRadius:'10px', border:`1px solid ${C.border}`, background: C.surface, fontSize:'13px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }} />
            <button onClick={() => { setRemarkingOn(s.id); handleRemark(); }} style={{ background:C.accent, color:'#000', padding:'10px 20px', borderRadius:'10px', border:'none', cursor:'pointer', fontWeight:700, fontSize:'13px', boxShadow: `0 2px 4px ${C.accent}40`, transition: 'all 0.2s' }}>Save</button>
          </div>
        )}
      </div>
    </div>
  );

  /* ── Style helpers ── */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const tabStyle = (t: Tab): React.CSSProperties => ({
    background: tab===t ? C.accent : 'transparent',
    border: `1px solid ${tab===t ? C.accent : 'transparent'}`, borderRadius: '8px', cursor: 'pointer',
    padding: '7px 20px', fontWeight: tab===t ? 700 : 400,
    fontSize: '14px', color: tab===t ? C.bg : C.textSecondary,
    transition: 'all 0.3s ease', letterSpacing: '0.01em',
    boxShadow: tab===t ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const deptStyle = (d: Department): React.CSSProperties => ({
    background: deptFilter===d ? C.accent : 'transparent',
    color: deptFilter===d ? C.bg : C.textSecondary,
    border: `1px solid ${deptFilter===d ? C.accent : C.border}`,
    borderRadius: '12px', padding: '9px 14px', cursor: 'pointer',
    fontWeight: deptFilter===d ? 700 : 500, fontSize: '13px',
    textAlign: 'left', width: '100%', transition: 'all 0.3s ease',
    boxShadow: deptFilter===d ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
  });

  const INPUT: React.CSSProperties = {
    width:'100%', background: C.surface, border:`1px solid ${C.border}`,
    borderRadius:'8px', padding:'11px 13px', color: C.textPrimary,
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
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '32px', background: C.accent, padding:'16px 24px', borderRadius:'16px', border: 'none', boxShadow: `0 4px 20px ${C.accent}40` }}>
          <button onClick={prevUser} style={{ background:'transparent', border:'none', color:'#ffffff', fontSize:'24px', cursor:'pointer', padding:'0 16px' }}>{'<'}</button>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'22px', fontWeight:800, letterSpacing:'-0.02em', color: '#ffffff' }}>{viewingUser?.displayName}</div>
            <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.8)', marginTop:'4px' }}>{viewingUser?.department} • <span style={{color:'#ffffff'}}>{viewingUser?.role}</span></div>
          </div>
          <button onClick={nextUser} style={{ background:'transparent', border:'none', color:'#ffffff', fontSize:'24px', cursor:'pointer', padding:'0 16px' }}>{'>'}</button>
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
             <div style={{ textAlign:'center', padding:'100px 32px', color: C.textSecondary }}>
               <div style={{ fontSize:'40px', marginBottom:'12px', opacity:.5 }}>📋</div>
               <div style={{ fontWeight:600 }}>No history for this user.</div>
             </div>
          ) : (
            groupedHistory.map(({ month, dates }) => (
              <div key={month} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                <div style={{ position: 'sticky', top: '0', zIndex: 10, background: C.surface, padding:'14px 20px', borderRadius:'12px', fontSize:'13px', fontWeight:700, color:C.textPrimary, textTransform:'uppercase', letterSpacing:'1.5px', border:`1px solid ${C.borderLight}`, boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
                  {month}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'12px', paddingLeft:'12px' }}>
                  {dates.map(([date, daySessions]) => (
                    <div key={date} style={{ background: C.surface, borderRadius:'12px', border:`1px solid ${C.border}`, overflow:'hidden', transition:'all 0.2s' }}>
                      <div 
                        onClick={() => toggleDate(date)}
                        style={{ padding:'18px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', background: expandedDates[date] ? 'rgba(255,255,255,0.03)' : 'transparent' }}
                      >
                        <div style={{ display:'flex', gap:'16px', alignItems:'center' }}>
                          <span style={{ fontSize:'16px', fontWeight:600, color: C.textPrimary }}>{date}</span>
                          <span style={{ fontSize:'12px', color:C.textSecondary, background:C.bg, padding:'6px 10px', borderRadius:'8px', fontWeight:600 }}>{daySessions.length} session{daySessions.length>1?'s':''}</span>
                        </div>
                        <span style={{ transform: expandedDates[date] ? 'rotate(180deg)' : 'none', transition:'transform 0.3s ease', fontSize:'12px', color:C.textSecondary }}>▼</span>
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
          
          {isMe && (
            <input 
              type="text" 
              placeholder="Add a new weekly task and press Enter..." 
              value={newWeeklyTask}
              onChange={e=>setNewWeeklyTask(e.target.value)}
              onKeyDown={handleAddWeeklyTask}
              style={{ ...INPUT, padding:'14px 16px', fontSize:'15px', marginBottom:'24px' }}
            />
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            {weeklyTasks.length === 0 ? (
              <div style={{ color:C.textSecondary, textAlign:'center', padding:'40px' }}>No weekly tasks found.</div>
            ) : (
              weeklyTasks.map(t => (
                <div key={t.id} style={{ display:'flex', alignItems:'center', gap:'12px', background:C.surface, padding:'16px', borderRadius:'12px', border:`1px solid ${C.border}` }}>
                  <input 
                    type="checkbox" 
                    checked={t.completed} 
                    onChange={() => isMe && handleToggleWeeklyTask(t)}
                    disabled={!isMe}
                    style={{ width:'20px', height:'20px', cursor: isMe ? 'pointer' : 'default' }}
                  />
                  <div style={{ fontSize:'15px', color: t.completed ? C.textMuted : C.textPrimary, textDecoration: t.completed ? 'line-through' : 'none' }}>
                    {t.title}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ══ TODAY TAB ══ */}
      {tab === 'Today' && (
        <div style={{ padding:'36px 32px', maxWidth:'1200px', margin: '0 auto', width:'100%', display:'flex', flexDirection:'column', gap:'40px' }}>
          {isMe && activeSession || (!isMe && allSessions.some(s => s.userId === viewingUser?.uid && s.status === 'active')) ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'28px' }}>
              <div style={{ fontSize:'18px', fontWeight:700 }}>
                {isMe ? 'Your Live Session' : `${viewingUser?.displayName}'s Live Session`}
              </div>
              
              {/* Work Log Form */}
              <div style={{ display:'flex', flexDirection:'column', gap:'28px' }}>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:600, color: C.textSecondary, marginBottom:'12px', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                    What did you work on? {isMe && <span style={{ color: C.red }}>*</span>}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                    {draftTasks.map((task, idx) => (
                      <div key={task.id} style={{ background: C.surface, border:`1px solid ${C.border}`, borderRadius:'12px', padding:'18px 20px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
                          <span style={{ fontSize:'11px', fontWeight:600, color: C.textMuted, textTransform:'uppercase', letterSpacing:'0.08em' }}>Task {idx+1}</span>
                          {isMe && <button onClick={()=>removeTask(task.id)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:'50%', width:'26px', height:'26px', color: C.textSecondary, cursor:'pointer', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>}
                        </div>
                        <input style={{ ...INPUT, marginBottom:'10px' }} placeholder="Task title..." value={task.title} onChange={e=>updateTask(task.id,'title',e.target.value)} disabled={!isMe} />
                        <div style={{ display:'flex', gap:'10px' }}>
                          <select style={{ ...INPUT, flex:'0 0 160px' }} value={task.category} onChange={e=>updateTask(task.id,'category',e.target.value)} disabled={!isMe}>
                            {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <input style={INPUT} placeholder="Description (optional)" value={task.description} onChange={e=>updateTask(task.id,'description',e.target.value)} disabled={!isMe} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {isMe && (
                    <button onClick={addTask} style={{ width:'100%', background:'none', border:`1px dashed ${C.border}`, borderRadius:'10px', color: C.textSecondary, cursor:'pointer', padding:'13px', fontSize:'13px', fontWeight:500, marginTop:'10px' }}>
                      + Add Task
                    </button>
                  )}
                </div>

                <div>
                  <div style={{ fontSize:'13px', fontWeight:600, color: C.textSecondary, marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Remark for the day</div>
                  <textarea style={TEXTAREA} placeholder="Brief summary of your session..." value={draftSummary} onChange={e=>setDraftSummary(e.target.value)} disabled={!isMe} />
                </div>


                {submitError && (
                  <div style={{ background:'rgba(239,68,68,0.08)', border:`1px solid rgba(239,68,68,0.2)`, borderRadius:'8px', padding:'12px 16px', color:'#fca5a5', fontSize:'13px' }}>
                    ⚠ {submitError}
                  </div>
                )}

                {isMe && (
                  <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginTop:'8px' }}>
                    {isWorking && (
                      <div style={{ color: C.textSecondary, fontSize: '13px', textAlign: 'center', marginBottom: '8px' }}>
                        Clock out of your session from the top right button to submit the work log
                      </div>
                    )}
                    <button onClick={handleSubmit} disabled={submitting||isWorking} style={{ width:'100%', padding:'15px', borderRadius:'10px', border:'none', background: isWorking ? C.borderLight : C.accent, color: isWorking ? C.textMuted : '#ffffff', cursor: isWorking?'not-allowed':'pointer', fontWeight:700, fontSize:'15px', transition: 'all 0.3s ease' }}>
                      {submitting ? 'Submitting...' : isWorking ? 'Clock out first' : '✓ Submit Work Log'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign:'center', paddingTop:'20px', paddingBottom:'20px' }}>
              <div style={{ fontWeight:800, fontSize:'22px', marginBottom:'8px' }}>
                {isMe ? 'No active session' : `${viewingUser?.displayName} has no active session`}
              </div>
              <div style={{ color: C.textSecondary, fontSize:'14px' }}>
                {isMe ? 'Check in from the top right to start logging work.' : 'Check their History for past sessions.'}
              </div>
            </div>
          )}

          {/* Today's Completed Sessions Summary */}
          {todaySessions.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:'16px', marginTop:'20px', borderTop:`1px solid ${C.border}`, paddingTop:'40px' }}>
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
