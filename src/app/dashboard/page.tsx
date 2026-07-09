'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useSessionStore } from '@/store/sessionStore';
import { useUIStore } from '@/store/uiStore';
import { getAllSessions, reviewSession } from '@/lib/firestore';
import { signOutUser } from '@/lib/auth';
import { SESSION_DURATION_MS, DEPARTMENTS, ADMIN_ROLES } from '@/types';
import type { WorkSession, TaskEntry, Department, ReviewAction } from '@/types';
import { TASK_CATEGORIES, MOODS } from '@/types';

/* ─── Helpers ─── */
function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}
function fmtDur(ms: number): string {
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth()+1}/${String(d.getFullYear()).slice(2)}`;
}
function shortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
}
function genId(): string { return Date.now().toString(36)+Math.random().toString(36).slice(2); }

type Tab = 'Today' | 'History' | 'Tasks';

/* ─── Design Tokens ─── */
const C = {
  bg: '#0f0f10',
  surface: '#1a1a1c',
  border: '#2a2a2e',
  borderLight: '#232326',
  textPrimary: '#f0f0f0',
  textSecondary: '#71717a',
  textMuted: '#3f3f46',
  accent: '#ffffff',
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#eab308',
  indigo: '#818cf8',
};

export default function DashboardPage() {
  const router = useRouter();
  const { mimoUser } = useAuthStore();
  const isAdmin = mimoUser ? ADMIN_ROLES.includes(mimoUser.role) : false;

  const {
    activeSession, isWorking, isOnBreak, remainingMs,
    clockIn, clockOut, startBreak, endBreak, submitWorkLog,
    loadActiveSession,
    draftTasks, draftSummary, draftMood, draftBlockers, draftAchievements,
    setDraftTasks, setDraftSummary, setDraftMood, setDraftBlockers, setDraftAchievements,
  } = useSessionStore();

  const [allSessions, setAllSessions]       = useState<WorkSession[]>([]);
  const { dashboardTab: tab, setDashboardTab: setTab, deptFilter, setDeptFilter } = useUIStore();
  const [submitting, setSubmitting]          = useState(false);
  const [submitError, setSubmitError]        = useState('');

  /* Admin remark state */
  const [remarkingOn, setRemarkingOn]        = useState<string | null>(null);
  const [remarkAction, setRemarkAction]      = useState<ReviewAction>('approved');
  const [remarkComment, setRemarkComment]    = useState('');
  const [savingRemark, setSavingRemark]      = useState(false);

  const loadSessions = () =>
    getAllSessions()
      .then(setAllSessions)
      .catch((e) => console.warn('Could not load team sessions:', e.message));

  useEffect(() => {
    if (!mimoUser) return;
    loadActiveSession(mimoUser.uid);
    loadSessions();
  }, [mimoUser, loadActiveSession]);

  useEffect(() => {
    // We no longer auto-switch to 'Tasks' since the form is on 'Today' now
    if (activeSession && !isWorking) setTab('Today');
  }, [activeSession, isWorking]);

  /* Handlers */
  const handleClockIn  = async () => { if (!mimoUser) return; await clockIn(mimoUser.uid, mimoUser.displayName, mimoUser.department); setTab('Today'); };
  const handleClockOut = () => { clockOut(); };
  const handleBreak    = () => isOnBreak ? endBreak() : startBreak();
  const addTask        = () => setDraftTasks([...draftTasks, { id: genId(), title: '', description: '', category: 'Development' }]);
  const updateTask     = (id: string, f: keyof TaskEntry, v: string) => setDraftTasks(draftTasks.map(t => t.id===id ? {...t,[f]:v} : t));
  const removeTask     = (id: string) => setDraftTasks(draftTasks.filter(t => t.id!==id));

  const handleSubmit = async () => {
    if (!draftTasks.some(t => t.title.trim())) { setSubmitError('Add at least one task.'); return; }
    setSubmitError(''); setSubmitting(true);
    await submitWorkLog(); setSubmitting(false);
    loadSessions(); setTab('Tasks');
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
    loadSessions();
  };

  const handleSignOut = async () => { await signOutUser(); router.push('/login'); };

  /* Group sessions by date, filtered by dept and tab */
  const grouped = useMemo(() => {
    let src = (deptFilter ? allSessions.filter(s => s.userDepartment === deptFilter) : allSessions)
      .filter(s => s.status !== 'active');
      
    if (tab === 'Tasks') {
      src = src.filter(s => s.userId === mimoUser?.uid);
    }
      
    src = src.sort((a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime());
    const map: Record<string, WorkSession[]> = {};
    for (const s of src) { const k = shortDate(s.clockInTime); (map[k]=map[k]||[]).push(s); }
    return Object.entries(map);
  }, [allSessions, deptFilter, tab, mimoUser]);

  /* ── Style helpers ── */
  const tabStyle = (t: Tab): React.CSSProperties => ({
    background: tab===t ? 'rgba(255,255,255,0.1)' : 'transparent',
    border: 'none', borderRadius: '8px', cursor: 'pointer',
    padding: '7px 20px', fontWeight: tab===t ? 700 : 400,
    fontSize: '14px', color: tab===t ? C.textPrimary : C.textSecondary,
    transition: 'all 0.15s', letterSpacing: '0.01em',
  });

  const deptStyle = (d: Department): React.CSSProperties => ({
    background: deptFilter===d ? C.accent : 'transparent',
    color: deptFilter===d ? '#000' : C.textSecondary,
    border: `1px solid ${deptFilter===d ? C.accent : C.border}`,
    borderRadius: '8px', padding: '9px 14px', cursor: 'pointer',
    fontWeight: deptFilter===d ? 700 : 400, fontSize: '13px',
    textAlign: 'left', width: '100%', transition: 'all 0.15s',
  });

  const INPUT: React.CSSProperties = {
    width:'100%', background: C.surface, border:`1px solid ${C.border}`,
    borderRadius:'8px', padding:'11px 13px', color: C.textPrimary,
    fontSize:'14px', outline:'none', boxSizing:'border-box',
  };
  const TEXTAREA: React.CSSProperties = { ...INPUT, resize:'vertical', minHeight:'80px', fontFamily:'inherit' };

  /* ════════════════════════════════════ RENDER ════════════════════════════════════ */
  return (
    <div style={{ flex:1, overflow:'auto', background: C.bg, color: C.textPrimary, padding: '24px' }}>

      {/* ══ HISTORY & TASKS TABS ══ */}
          {(tab === 'History' || tab === 'Tasks') && (
            grouped.length===0 ? (
              <div style={{ textAlign:'center', padding:'100px 32px', color: C.textSecondary }}>
                <div style={{ fontSize:'40px', marginBottom:'12px', opacity:.5 }}>📋</div>
                <div style={{ fontWeight:600, marginBottom:'8px' }}>
                  {tab === 'Tasks' ? "You haven't completed any tasks yet." : `No sessions ${deptFilter ? `in ${deptFilter}` : 'yet'}`}
                </div>
                <div style={{ fontSize:'13px' }}>
                  {tab === 'History' && deptFilter ? <button onClick={()=>setDeptFilter(null)} style={{ background:'none', border:'none', color:C.indigo, cursor:'pointer', fontWeight:600 }}>Show all departments</button>
                    : <button onClick={()=>setTab('Today')} style={{ background:'none', border:'none', color:C.indigo, cursor:'pointer', fontWeight:600 }}>→ Go Clock In</button>}
                </div>
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed' }}>
                <colgroup>
                  <col style={{ width:'110px' }} />
                  <col style={{ width:'80px' }} />
                  <col style={{ width:'170px' }} />
                  <col />
                  <col style={{ width:'110px' }} />
                  <col style={{ width:'220px' }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${C.border}`, position:'sticky', top:0, background:C.bg, zIndex:10 }}>
                    {['Date','Loggin','Name','Task completed','Logout time','Remark for the day'].map((h, i) => (
                      <th key={h} style={{ padding:'12px 16px', textAlign:'left', color: C.textMuted, fontSize:'10px', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', borderRight: i<5 ? `1px solid ${C.borderLight}` : 'none' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grouped.map(([date, daySessions]) =>
                    daySessions.map((s, idx) => (
                      <tr key={s.id} style={{ borderBottom:`1px solid ${C.borderLight}` }}>

                        {/* Date */}
                        <td style={{ padding:'14px 16px', verticalAlign:'top', borderRight:`1px solid ${C.borderLight}` }}>
                          {idx===0 && (
                            <span style={{ background:'rgba(34,197,94,0.15)', color: C.green, border:`1px solid rgba(34,197,94,0.3)`, borderRadius:'99px', padding:'3px 10px', fontSize:'11px', fontWeight:700, fontFamily:'monospace', whiteSpace:'nowrap' }}>
                              {date}
                            </span>
                          )}
                        </td>

                        {/* Loggin # */}
                        <td style={{ padding:'14px 16px', verticalAlign:'top', borderRight:`1px solid ${C.borderLight}` }}>
                          <span style={{ background: C.surface, border:`1px solid ${C.border}`, borderRadius:'6px', padding:'3px 10px', fontWeight:700, fontSize:'13px', color: C.textPrimary }}>
                            {idx+1}
                          </span>
                        </td>

                        {/* User name + dept */}
                        <td style={{ padding:'14px 16px', verticalAlign:'top', borderRight:`1px solid ${C.borderLight}` }}>
                          <div style={{ fontWeight:600, fontSize:'13px', color: C.textPrimary }}>{s.userName}</div>
                          <div style={{ fontSize:'11px', color: C.textSecondary, marginTop:'2px' }}>{s.userDepartment}</div>
                        </td>

                        {/* Tasks */}
                        <td style={{ padding:'14px 16px', verticalAlign:'top', borderRight:`1px solid ${C.borderLight}` }}>
                          {s.tasks.length>0 ? (
                            <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                              {s.tasks.slice(0,3).map(t => (
                                <div key={t.id} style={{ fontSize:'12px', color:'#c4c4c8', display:'flex', gap:'6px', alignItems:'flex-start' }}>
                                  <span style={{ color: C.textMuted, marginTop:'3px', flexShrink:0 }}>–</span>
                                  {t.title}
                                </div>
                              ))}
                              {s.tasks.length>3 && <div style={{ fontSize:'11px', color: C.textMuted }}>+{s.tasks.length-3} more</div>}
                            </div>
                          ) : <span style={{ color: C.textMuted }}>—</span>}
                          <div style={{ fontSize:'10px', color: C.textMuted, marginTop:'6px', fontFamily:'monospace' }}>{fmtDur(s.totalDurationMs)}</div>
                        </td>

                        {/* Logout */}
                        <td style={{ padding:'14px 16px', verticalAlign:'top', fontFamily:'monospace', fontSize:'13px', color: C.textSecondary, borderRight:`1px solid ${C.borderLight}` }}>
                          {s.clockOutTime ? shortTime(s.clockOutTime) : <span style={{ color: C.textMuted }}>—</span>}
                        </td>

                        {/* Remark */}
                        <td style={{ padding:'14px 16px', verticalAlign:'top' }}>
                          {s.review ? (
                            <div>
                              <span style={{ fontSize:'11px', fontWeight:700, padding:'3px 8px', borderRadius:'4px',
                                background: s.review.action==='starred' ? 'rgba(234,179,8,0.12)' : s.review.action==='flagged' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.1)',
                                color: s.review.action==='starred' ? C.yellow : s.review.action==='flagged' ? C.red : C.green,
                              }}>
                                {s.review.action==='starred' ? '⭐ Starred' : s.review.action==='flagged' ? '🔴 Flagged' : s.review.action==='approved' ? '✓ Approved' : '📝 Noted'}
                              </span>
                              {s.review.comment && <div style={{ fontSize:'11px', color: C.textSecondary, marginTop:'4px', lineHeight:1.4 }}>{s.review.comment}</div>}
                              {isAdmin && (
                                <button onClick={() => { setRemarkingOn(s.id); setRemarkAction(s.review!.action); setRemarkComment(s.review!.comment||''); }} style={{ background:'none', border:'none', color: C.textMuted, cursor:'pointer', fontSize:'11px', marginTop:'4px', padding:0, textDecoration:'underline' }}>
                                  Edit
                                </button>
                              )}
                            </div>
                          ) : (
                            isAdmin ? (
                              remarkingOn===s.id ? (
                                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                                  <select value={remarkAction} onChange={e=>setRemarkAction(e.target.value as ReviewAction)} style={{ background: C.surface, border:`1px solid ${C.border}`, borderRadius:'6px', color: C.textPrimary, padding:'6px 8px', fontSize:'12px', outline:'none', cursor:'pointer' }}>
                                    <option value="approved">✓ Approved</option>
                                    <option value="starred">⭐ Starred</option>
                                    <option value="flagged">🔴 Flagged</option>
                                    <option value="noted">📝 Noted</option>
                                  </select>
                                  <input value={remarkComment} onChange={e=>setRemarkComment(e.target.value)} placeholder="Comment (optional)" style={{ background: C.surface, border:`1px solid ${C.border}`, borderRadius:'6px', color: C.textPrimary, padding:'6px 8px', fontSize:'12px', outline:'none' }} />
                                  <div style={{ display:'flex', gap:'6px' }}>
                                    <button onClick={handleRemark} disabled={savingRemark} style={{ flex:1, background: C.accent, color:'#000', border:'none', borderRadius:'6px', padding:'6px', fontWeight:700, fontSize:'12px', cursor:'pointer' }}>
                                      {savingRemark ? '...' : 'Save'}
                                    </button>
                                    <button onClick={()=>setRemarkingOn(null)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:'6px', padding:'6px 10px', color: C.textSecondary, cursor:'pointer', fontSize:'12px' }}>✕</button>
                                  </div>
                                </div>
                              ) : (
                                <button onClick={()=>{ setRemarkingOn(s.id); setRemarkAction('approved'); setRemarkComment(''); }} style={{ background:'none', border:`1px dashed ${C.border}`, borderRadius:'6px', color: C.textSecondary, cursor:'pointer', padding:'5px 12px', fontSize:'12px', whiteSpace:'nowrap' }}>
                                  + Remark
                                </button>
                              )
                            ) : (
                              <span style={{ color: C.textMuted, fontSize:'12px' }}>—</span>
                            )
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )
          )}

          {/* ══ TODAY TAB ══ */}
          {tab==='Today' && (
            <div style={{ padding:'36px 32px', maxWidth:'680px', margin: '0 auto' }}>
              {activeSession ? (
                <div style={{ display:'flex', flexDirection:'column', gap:'28px' }}>
                  {/* Timer UI (Only show if still working) */}
                  {isWorking && (
                    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
                      <div style={{ background: C.surface, border:`1px solid ${C.border}`, borderRadius:'16px', padding:'40px 32px', textAlign:'center' }}>
                        <div style={{ fontSize:'11px', color: C.textSecondary, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:'12px' }}>
                          {isOnBreak ? '☕ On Break' : '● Session Active'}
                        </div>
                        <div style={{ fontFamily:'monospace', fontWeight:900, fontSize:'52px', letterSpacing:'0.04em', color: isOnBreak ? C.yellow : remainingMs<600000 ? C.red : C.textPrimary }}>
                          {fmt(remainingMs)}
                        </div>
                        <div style={{ fontSize:'12px', color: C.textMuted, marginTop:'8px' }}>time remaining</div>
                      </div>
                      <div style={{ display:'flex', gap:'12px' }}>
                        {[
                          { label:'Login', value: shortTime(activeSession.clockInTime) },
                          { label:'Breaks', value: String(activeSession.breaks.length) },
                          { label:'Break time', value: fmtDur(activeSession.breakDurationMs) },
                        ].map(item => (
                          <div key={item.label} style={{ flex:1, background: C.surface, border:`1px solid ${C.border}`, borderRadius:'10px', padding:'14px', textAlign:'center' }}>
                            <div style={{ fontSize:'10px', color: C.textSecondary, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'6px' }}>{item.label}</div>
                            <div style={{ fontFamily:'monospace', fontWeight:700, fontSize:'15px' }}>{item.value}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display:'flex', gap:'12px' }}>
                        <button onClick={handleBreak} style={{ flex:1, padding:'14px', borderRadius:'10px', border:`1px solid ${C.border}`, background: C.surface, color: C.textPrimary, cursor:'pointer', fontWeight:600, fontSize:'14px' }}>
                          {isOnBreak ? '▶ Resume' : '☕ Break'}
                        </button>
                        <button onClick={handleClockOut} style={{ flex:1, padding:'14px', borderRadius:'10px', border:'none', background: C.red, color:'#fff', cursor:'pointer', fontWeight:700, fontSize:'14px' }}>
                          ■ Clock Out
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Work Log Form */}
                  <div style={{ display:'flex', flexDirection:'column', gap:'28px', marginTop: isWorking ? '16px' : '0' }}>
                    <div style={{ background: C.surface, border:`1px solid ${C.border}`, borderRadius:'12px', padding:'18px 22px', display:'flex', gap:'32px', flexWrap:'wrap', alignItems:'center' }}>
                      {[
                        { label:'Login', value: shortTime(activeSession.clockInTime) },
                        ...(activeSession.clockOutTime ? [{ label:'Logout', value: shortTime(activeSession.clockOutTime) }] : []),
                        { label:'Worked', value: fmtDur(SESSION_DURATION_MS - remainingMs - activeSession.breakDurationMs) },
                      ].map(item => (
                        <div key={item.label}>
                          <div style={{ fontSize:'10px', color: C.textSecondary, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'3px' }}>{item.label}</div>
                          <div style={{ fontFamily:'monospace', fontWeight:700, fontSize:'15px' }}>{item.value}</div>
                        </div>
                      ))}
                    </div>

                    <div>
                      <div style={{ fontSize:'13px', fontWeight:600, color: C.textSecondary, marginBottom:'12px', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                        What did you work on? <span style={{ color: C.red }}>*</span>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                        {draftTasks.map((task, idx) => (
                          <div key={task.id} style={{ background: C.surface, border:`1px solid ${C.border}`, borderRadius:'12px', padding:'18px 20px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
                              <span style={{ fontSize:'11px', fontWeight:600, color: C.textMuted, textTransform:'uppercase', letterSpacing:'0.08em' }}>Task {idx+1}</span>
                              <button onClick={()=>removeTask(task.id)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:'50%', width:'26px', height:'26px', color: C.textSecondary, cursor:'pointer', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                            </div>
                            <input style={{ ...INPUT, marginBottom:'10px' }} placeholder="Task title..." value={task.title} onChange={e=>updateTask(task.id,'title',e.target.value)} />
                            <div style={{ display:'flex', gap:'10px' }}>
                              <select style={{ ...INPUT, flex:'0 0 160px' }} value={task.category} onChange={e=>updateTask(task.id,'category',e.target.value)}>
                                {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <input style={INPUT} placeholder="Description (optional)" value={task.description} onChange={e=>updateTask(task.id,'description',e.target.value)} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={addTask} style={{ width:'100%', background:'none', border:`1px dashed ${C.border}`, borderRadius:'10px', color: C.textSecondary, cursor:'pointer', padding:'13px', fontSize:'13px', fontWeight:500, marginTop:'10px' }}>
                        + Add Task
                      </button>
                    </div>

                    <div>
                      <div style={{ fontSize:'13px', fontWeight:600, color: C.textSecondary, marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Remark for the day</div>
                      <textarea style={TEXTAREA} placeholder="Brief summary of your session..." value={draftSummary} onChange={e=>setDraftSummary(e.target.value)} />
                    </div>

                    <div>
                      <div style={{ fontSize:'13px', fontWeight:600, color: C.textSecondary, marginBottom:'12px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Session mood</div>
                      <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
                        {MOODS.map(m => {
                          const sel = draftMood===m.value;
                          return (
                            <button key={m.value} onClick={()=>setDraftMood(sel?null:m.value)} style={{ background: sel ? 'rgba(255,255,255,0.08)' : C.surface, border:`1px solid ${sel ? 'rgba(255,255,255,0.2)' : C.border}`, borderRadius:'10px', padding:'12px 18px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', minWidth:'76px', transition:'all 0.15s', transform: sel?'translateY(-2px)':'none' }}>
                              <span style={{ fontSize:'26px', opacity: sel?1:.6 }}>{m.emoji}</span>
                              <span style={{ fontSize:'11px', color: sel ? C.textPrimary : C.textSecondary, fontWeight: sel?600:400 }}>{m.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ display:'flex', gap:'20px' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'13px', fontWeight:600, color: C.textSecondary, marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Blockers <span style={{ fontWeight:400, textTransform:'none', letterSpacing:'normal' }}>(optional)</span></div>
                        <textarea style={{ ...TEXTAREA, minHeight:'80px' }} placeholder="Any blockers?" value={draftBlockers} onChange={e=>setDraftBlockers(e.target.value)} />
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'13px', fontWeight:600, color: C.textSecondary, marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Achievements <span style={{ fontWeight:400, textTransform:'none', letterSpacing:'normal' }}>(optional)</span></div>
                        <textarea style={{ ...TEXTAREA, minHeight:'80px' }} placeholder="Key wins today?" value={draftAchievements} onChange={e=>setDraftAchievements(e.target.value)} />
                      </div>
                    </div>

                    {submitError && (
                      <div style={{ background:'rgba(239,68,68,0.08)', border:`1px solid rgba(239,68,68,0.2)`, borderRadius:'8px', padding:'12px 16px', color:'#fca5a5', fontSize:'13px' }}>
                        ⚠ {submitError}
                      </div>
                    )}

                    <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginTop:'8px' }}>
                      {isWorking && (
                        <div style={{ color: C.textSecondary, fontSize: '13px', textAlign: 'center', marginBottom: '8px' }}>
                          Clock out of your session to submit the work log
                        </div>
                      )}
                      <button onClick={handleSubmit} disabled={submitting||isWorking} style={{ width:'100%', padding:'15px', borderRadius:'10px', border:'none', background: isWorking ? C.surface : C.accent, color: isWorking ? C.textMuted : '#000', cursor: isWorking?'not-allowed':'pointer', fontWeight:700, fontSize:'15px', boxShadow: isWorking ? 'none' : '0 4px 20px rgba(255,255,255,0.1)' }}>
                        {submitting ? 'Submitting...' : isWorking ? 'Clock out first' : '✓ Submit Work Log'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign:'center', paddingTop:'100px' }}>
                  <div style={{ fontWeight:800, fontSize:'22px', marginBottom:'8px' }}>
                    Good {new Date().getHours()<12?'Morning':new Date().getHours()<17?'Afternoon':'Evening'}, {mimoUser?.displayName?.split(' ')[0]}
                  </div>
                  <div style={{ color: C.textSecondary, fontSize:'14px', marginBottom:'48px' }}>Ready to start your 3-hour session?</div>
                  <button onClick={handleClockIn} style={{ width:'160px', height:'160px', borderRadius:'50%', background: C.accent, color:'#000', border:'none', cursor:'pointer', fontWeight:700, fontSize:'16px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'10px', margin:'0 auto', boxShadow:'0 0 48px rgba(255,255,255,0.06)', transition:'transform 0.15s' }}>
                    <span style={{ fontSize:'32px' }}>▶</span>
                    <span>Clock In</span>
                  </button>
                  <div style={{ color: C.textMuted, fontSize:'12px', marginTop:'20px' }}>Auto-stops after 3 hours</div>
                </div>
              )}
            </div>
          )}

        </div>
  );
}
