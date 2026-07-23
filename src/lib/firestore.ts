import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  setDoc,
  deleteDoc,
  limit,
  getCountFromServer,
  getAggregateFromServer,
  sum,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  MimoUser,
  WorkSession,
  MimoNotification,
  SessionReview,
  UserStatus,
  SessionStatus,
} from '@/types';
import type { LeaveRequest, LeaveStatus } from '@/types';

// ═══════════════════════════════════════════════════════════════════
// USER OPERATIONS
// ═══════════════════════════════════════════════════════════════════

export async function getUser(uid: string): Promise<MimoUser | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as MimoUser) : null;
}

export async function getAllUsers(): Promise<MimoUser[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => d.data() as MimoUser).filter(u => u.status !== 'deleted');
}

export async function getUsersByDepartment(dept: string): Promise<MimoUser[]> {
  const q = query(collection(db, 'users'), where('departments', 'array-contains', dept));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as MimoUser).filter(u => u.status !== 'deleted');
}

export async function getPendingUsers(): Promise<MimoUser[]> {
  const q = query(collection(db, 'users'), where('status', '==', 'pending'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as MimoUser);
}

export async function updateUserStatus(
  uid: string,
  status: UserStatus,
  adminId: string,
  reason?: string
) {
  const updates: Record<string, unknown> = { status };

  if (status === 'approved') {
    updates.approvedAt = new Date().toISOString();
    updates.approvedBy = adminId;
  } else if (status === 'rejected') {
    updates.rejectedAt = new Date().toISOString();
    updates.rejectedBy = adminId;
    if (reason) updates.rejectionReason = reason;
  }

  await updateDoc(doc(db, 'users', uid), updates);

  // If suspended or rejected, purge their sessions/tasks so they don't appear in aggregations or leaderboard
  if (status === 'suspended' || status === 'rejected') {
    await purgeUserData(uid);
  }
}

export async function purgeUserData(uid: string) {
  const sessionsQ = query(collection(db, 'sessions'), where('userId', '==', uid));
  const tasksQ = query(collection(db, 'tasks'), where('assignedTo', '==', uid));
  const notifsQ = query(collection(db, 'notifications'), where('userId', '==', uid));

  const [sessions, tasks, notifs] = await Promise.all([
    getDocs(sessionsQ),
    getDocs(tasksQ),
    getDocs(notifsQ)
  ]);

  const deletePromises: Promise<void>[] = [];
  sessions.forEach(d => deletePromises.push(deleteDoc(d.ref)));
  tasks.forEach(d => deletePromises.push(deleteDoc(d.ref)));
  notifs.forEach(d => deletePromises.push(deleteDoc(d.ref)));
  
  await Promise.all(deletePromises);
}

export async function deleteUserAccount(uid: string) {
  try {
    await purgeUserData(uid);
    await deleteDoc(doc(db, 'users', uid));
  } catch (err) {
    console.warn("Hard delete failed (likely due to rules), falling back to soft delete", err);
    await updateDoc(doc(db, 'users', uid), { status: 'deleted' });
  }
}

export async function updateUserInternshipDates(uid: string, startDate: string, endDate: string) {
  await updateDoc(doc(db, 'users', uid), {
    internshipStartDate: startDate,
    internshipEndDate: endDate,
  });
}


export async function updateUser(uid: string, data: Partial<MimoUser>) {
  const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
  await updateDoc(doc(db, 'users', uid), cleanData);
}

// ═══════════════════════════════════════════════════════════════════
// INVITATIONS
// ═══════════════════════════════════════════════════════════════════

export async function getInvitations(): Promise<import('@/types').Invitation[]> {
  const snap = await getDocs(collection(db, 'invitations'));
  return snap.docs.map(d => d.data() as import('@/types').Invitation);
}

export async function deleteInvitation(email: string) {
  await deleteDoc(doc(db, 'invitations', email.toLowerCase()));
}

// ═══════════════════════════════════════════════════════════════════
// SESSION OPERATIONS
// ═══════════════════════════════════════════════════════════════════

export async function createSession(session: Omit<WorkSession, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'sessions'), session);
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
}

export async function getSession(id: string): Promise<WorkSession | null> {
  const snap = await getDoc(doc(db, 'sessions', id));
  return snap.exists() ? (snap.data() as WorkSession) : null;
}

export async function updateSession(id: string, data: Partial<WorkSession>) {
  await updateDoc(doc(db, 'sessions', id), data);
}

export async function getUserSessions(userId: string): Promise<WorkSession[]> {
  const q = query(
    collection(db, 'sessions'),
    where('userId', '==', userId),
    orderBy('clockInTime', 'desc'),
    limit(100)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as WorkSession));
}

export async function getRecentUserSessions(userId: string, limitCount: number = 5): Promise<WorkSession[]> {
  const q = query(
    collection(db, 'sessions'),
    where('userId', '==', userId),
    orderBy('clockInTime', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as WorkSession));
}

export async function getUserStats(userId: string): Promise<{ sessionCount: number; totalDurationMs: number }> {
  const q = query(
    collection(db, 'sessions'),
    where('userId', '==', userId)
  );
  
  const [countSnap, aggSnap] = await Promise.all([
    getCountFromServer(q),
    getAggregateFromServer(q, { totalDurationMs: sum('totalDurationMs') })
  ]);
  
  return {
    sessionCount: countSnap.data().count,
    totalDurationMs: aggSnap.data().totalDurationMs || 0
  };
}

export async function getActiveSession(userId: string): Promise<WorkSession | null> {
  const q = query(
    collection(db, 'sessions'),
    where('userId', '==', userId),
    where('status', '==', 'active')
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { ...d.data(), id: d.id } as WorkSession;

}

export async function getAllSessions(
  statusFilter?: SessionStatus
): Promise<WorkSession[]> {
  let q;
  if (statusFilter) {
    q = query(
      collection(db, 'sessions'),
      where('status', '==', statusFilter),
      orderBy('clockInTime', 'desc'),
      limit(500)
    );
  } else {
    q = query(collection(db, 'sessions'), orderBy('clockInTime', 'desc'), limit(500));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as WorkSession));

}

export async function getGlobalStats(): Promise<{ totalSessions: number; totalDurationMs: number }> {
  const q = collection(db, 'sessions');
  const [countSnap, aggSnap] = await Promise.all([
    getCountFromServer(q),
    getAggregateFromServer(q, { totalDurationMs: sum('totalDurationMs') })
  ]);
  
  return {
    totalSessions: countSnap.data().count,
    totalDurationMs: aggSnap.data().totalDurationMs || 0
  };
}

export async function getDepartmentStats(dept: string) {
  const deptQuery = query(collection(db, 'sessions'), where('userDepartment', '==', dept));
  
  const [countSnap, aggSnap] = await Promise.all([
    getCountFromServer(deptQuery),
    getAggregateFromServer(deptQuery, { totalDurationMs: sum('totalDurationMs') })
  ]);

  return {
    totalSessions: countSnap.data().count,
    totalDurationMs: aggSnap.data().totalDurationMs || 0,
  };
}

export async function getUnreviewedSessions(): Promise<WorkSession[]> {
  const q = query(
    collection(db, 'sessions'),
    where('status', 'in', ['completed', 'auto-stopped']),
    orderBy('clockInTime', 'desc'),
    limit(500)
  );
  const snap = await getDocs(q);
  // Filter out already reviewed
  return snap.docs
    .map((d) => d.data() as WorkSession)
    .filter((s) => !s.review);
}

export async function reviewSession(
  sessionId: string,
  review: SessionReview
) {
  // Strip undefined fields — Firestore rejects them
  const cleanReview: Record<string, unknown> = {
    action: review.action,
    reviewedBy: review.reviewedBy,
    reviewerName: review.reviewerName,
    reviewedAt: review.reviewedAt,
  };
  if (review.comment) cleanReview.comment = review.comment;
  if (review.rating !== undefined) cleanReview.rating = review.rating;

  const updates: Record<string, unknown> = { review: cleanReview };

  await updateDoc(doc(db, 'sessions', sessionId), updates);
}

// ─── Real-time listeners ──────────────────────────────────────────
export function onActiveSessions(
  callback: (sessions: WorkSession[]) => void
) {
  const q = query(
    collection(db, 'sessions'),
    where('status', '==', 'active')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as WorkSession));
  });
}

export function onUserSessions(
  userId: string,
  callback: (sessions: WorkSession[]) => void
) {
  const q = query(
    collection(db, 'sessions'),
    where('userId', '==', userId),
    orderBy('clockInTime', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ ...d.data(), id: d.id } as WorkSession)));
  });
}

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATION OPERATIONS
// ═══════════════════════════════════════════════════════════════════

export async function createNotification(
  notif: Omit<MimoNotification, 'id'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'notifications'), notif);

  return docRef.id;
}

export async function getUserNotifications(
  userId: string
): Promise<MimoNotification[]> {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as MimoNotification));
}

export async function markNotificationRead(id: string) {
  await updateDoc(doc(db, 'notifications', id), { read: true });
}

export async function markAllNotificationsRead(userId: string) {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('read', '==', false)
  );
  const snap = await getDocs(q);
  const promises = snap.docs.map((d) =>
    updateDoc(doc(db, 'notifications', d.id), { read: true })
  );
  await Promise.all(promises);
}

export function onUserNotifications(
  userId: string,
  callback: (notifications: MimoNotification[]) => void
) {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ ...d.data(), id: d.id } as MimoNotification)));
  });
}

// ═══════════════════════════════════════════════════════════════════
// ANALYTICS HELPERS
// ═══════════════════════════════════════════════════════════════════

export async function getSessionsInRange(
  startDate: string,
  endDate: string
): Promise<WorkSession[]> {
  const q = query(
    collection(db, 'sessions'),
    where('clockInTime', '>=', startDate),
    where('clockInTime', '<=', endDate),
    orderBy('clockInTime', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as WorkSession);
}

export async function getTodaysSessions(): Promise<WorkSession[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return getSessionsInRange(today.toISOString(), tomorrow.toISOString());
}
// ─── Task Management ─────────────────────────────────────────────

function mapTaskFromDB(d: any): import('@/types').MimoTask {
  const data = d.data();
  return {
    id: d.id,
    ...data,
    startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : data.startDate,
    dueDate: data.dueDate?.toDate ? data.dueDate.toDate().toISOString() : data.dueDate,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
    completedAt: data.completedAt?.toDate ? data.completedAt.toDate().toISOString() : data.completedAt,
    deadlineUpdatedAt: data.deadlineUpdatedAt?.toDate ? data.deadlineUpdatedAt.toDate().toISOString() : data.deadlineUpdatedAt,
  } as import('@/types').MimoTask;
}

export async function getTasksByEmployee(userId: string): Promise<import('@/types').MimoTask[]> {
  const q = query(
    collection(db, 'tasks'),
    where('assignedTo', '==', userId)
  );
  const snap = await getDocs(q);
  const tasks = snap.docs.map(mapTaskFromDB);
  return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getAllTasks(): Promise<import('@/types').MimoTask[]> {
  const q = query(collection(db, 'tasks'));
  const snap = await getDocs(q);
  const tasks = snap.docs.map(mapTaskFromDB);
  return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function addTask(taskData: Omit<import('@/types').MimoTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = doc(collection(db, 'tasks'));
  const now = Timestamp.now();
  await setDoc(ref, {
    ...taskData,
    startDate: taskData.startDate ? Timestamp.fromDate(new Date(taskData.startDate)) : null,
    dueDate: taskData.dueDate ? Timestamp.fromDate(new Date(taskData.dueDate)) : null,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateTask(taskId: string, updates: Partial<import('@/types').MimoTask>): Promise<void> {
  const now = Timestamp.now();
  const dbUpdates: any = { ...updates, updatedAt: now };
  if (updates.startDate) dbUpdates.startDate = Timestamp.fromDate(new Date(updates.startDate));
  if (updates.dueDate) dbUpdates.dueDate = Timestamp.fromDate(new Date(updates.dueDate));
  if (updates.completedAt) dbUpdates.completedAt = Timestamp.fromDate(new Date(updates.completedAt));
  else if (updates.completedAt === '') dbUpdates.completedAt = null;
  if (updates.deadlineUpdatedAt) dbUpdates.deadlineUpdatedAt = Timestamp.fromDate(new Date(updates.deadlineUpdatedAt));

  await updateDoc(doc(db, 'tasks', taskId), dbUpdates);
}

export async function deleteTask(taskId: string): Promise<void> {
  await deleteDoc(doc(db, 'tasks', taskId));
}

// ═══════════════════════════════════════════════════════════════════
// LEAVE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

export const createLeaveRequest = async (leaveData: Omit<LeaveRequest, 'id'>) => {
  const leavesRef = collection(db, 'leaves');
  const docRef = await addDoc(leavesRef, leaveData);
  return docRef.id;
};

export const getUserLeaveRequests = async (userId: string): Promise<LeaveRequest[]> => {
  const leavesRef = collection(db, 'leaves');
  const q = query(leavesRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest));
};

export const getAllLeaveRequests = async (): Promise<LeaveRequest[]> => {
  const leavesRef = collection(db, 'leaves');
  const q = query(leavesRef, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest));
};

export const updateLeaveStatus = async (leaveId: string, status: LeaveStatus, approverId: string, rejectionReason?: string) => {
  const leaveRef = doc(db, 'leaves', leaveId);
  const updateData: any = {
    status,
    approvedBy: approverId,
  };
  if (rejectionReason) {
    updateData.rejectionReason = rejectionReason;
  }
  await updateDoc(leaveRef, updateData);
};

// ═══════════════════════════════════════════════════════════════════
// AUDIT LOGS
// ═══════════════════════════════════════════════════════════════════

export async function createAuditLog(log: Omit<import('@/types').AuditLog, 'id'>) {
  const docRef = doc(collection(db, 'audit_logs'));
  await setDoc(docRef, { ...log, id: docRef.id });
}

export async function getAuditLogs(limitCount: number = 100): Promise<import('@/types').AuditLog[]> {
  const q = query(
    collection(db, 'audit_logs'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as import('@/types').AuditLog));
}
