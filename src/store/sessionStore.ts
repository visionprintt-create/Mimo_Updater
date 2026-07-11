'use client';

import { create } from 'zustand';
import type { WorkSession, BreakEntry, TaskEntry, Mood } from '@/types';
import { SESSION_DURATION_MS } from '@/types';
import {
  createSession,
  updateSession,
  getActiveSession,
  createNotification,
} from '@/lib/firestore';

interface SessionState {
  // Active session
  activeSession: WorkSession | null;
  isWorking: boolean;
  isOnBreak: boolean;
  isClockingIn: boolean;

  // Timer
  remainingMs: number;
  timerInterval: NodeJS.Timeout | null;

  // Draft work log
  draftTasks: TaskEntry[];
  draftSummary: string;
  draftMood: Mood | null;
  draftBlockers: string;
  draftAchievements: string;

  // Actions
  clockIn: (userId: string, userName: string, department: string) => Promise<void>;
  clockOut: () => Promise<void>;
  startBreak: (reason?: string) => Promise<void>;
  endBreak: () => Promise<void>;
  submitWorkLog: () => Promise<void>;
  autoStop: () => Promise<void>;
  startTimer: () => void;
  stopTimer: () => void;
  tick: () => void;
  loadActiveSession: (userId: string) => Promise<void>;

  // Draft setters
  setDraftTasks: (tasks: TaskEntry[]) => void;
  setDraftSummary: (summary: string) => void;
  setDraftMood: (mood: Mood | null) => void;
  setDraftBlockers: (blockers: string) => void;
  setDraftAchievements: (achievements: string) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  activeSession: null,
  isWorking: false,
  isOnBreak: false,
  remainingMs: SESSION_DURATION_MS,
  timerInterval: null,
  draftTasks: [],
  draftSummary: '',
  draftMood: null,
  draftBlockers: '',
  draftAchievements: '',

  isClockingIn: false,

  clockIn: async (userId, userName, department) => {
    if (get().isClockingIn || get().activeSession || get().isWorking) return;
    set({ isClockingIn: true });

    try {
      const session: Omit<WorkSession, 'id'> = {
        userId,
        userName,
        userDepartment: department as WorkSession['userDepartment'],
        clockInTime: new Date().toISOString(),
        totalDurationMs: 0,
        breakDurationMs: 0,
        breaks: [],
        status: 'active',
        tasks: [],
      };

      const sessionId = await createSession(session);

      set({
        activeSession: { ...session, id: sessionId },
        isWorking: true,
        isOnBreak: false,
        remainingMs: SESSION_DURATION_MS,
      });

      get().startTimer();
    } finally {
      set({ isClockingIn: false });
    }
  },

  clockOut: async () => {
    get().stopTimer();
    // Don't close session yet — user needs to submit work log first
    set({ isWorking: false });
  },

  startBreak: async (reason) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const breakEntry: BreakEntry = {
      startedAt: new Date().toISOString(),
      ...(reason ? { reason } : {}),
    };

    const updatedBreaks = [...activeSession.breaks, breakEntry];
    await updateSession(activeSession.id, { breaks: updatedBreaks });

    set({
      isOnBreak: true,
      activeSession: { ...activeSession, breaks: updatedBreaks },
    });
  },

  endBreak: async () => {
    const { activeSession } = get();
    if (!activeSession) return;

    const breaks = [...activeSession.breaks];
    const currentBreak = breaks[breaks.length - 1];
    if (currentBreak && !currentBreak.endedAt) {
      currentBreak.endedAt = new Date().toISOString();
      const breakDuration =
        new Date(currentBreak.endedAt).getTime() -
        new Date(currentBreak.startedAt).getTime();

      const newBreakDurationMs = activeSession.breakDurationMs + breakDuration;

      await updateSession(activeSession.id, {
        breaks,
        breakDurationMs: newBreakDurationMs,
      });

      set({
        isOnBreak: false,
        activeSession: {
          ...activeSession,
          breaks,
          breakDurationMs: newBreakDurationMs,
        },
      });
    }
  },

  submitWorkLog: async () => {
    const {
      activeSession,
      draftTasks,
      draftSummary,
      draftMood,
      draftBlockers,
      draftAchievements,
    } = get();
    if (!activeSession) return;

    const clockOutTime = new Date().toISOString();
    const totalDurationMs =
      new Date(clockOutTime).getTime() -
      new Date(activeSession.clockInTime).getTime() -
      activeSession.breakDurationMs;

    const updates: Partial<WorkSession> = {
      clockOutTime,
      totalDurationMs,
      status: activeSession.status === 'active' ? 'completed' : activeSession.status,
      tasks: draftTasks,
      workSummary: draftSummary,
    };

    // Only include optional fields if they have actual values
    if (draftMood) updates.mood = draftMood;
    if (draftBlockers.trim()) updates.blockers = draftBlockers;
    if (draftAchievements.trim()) updates.achievements = draftAchievements;

    await updateSession(activeSession.id, updates);

    get().reset();
  },

  autoStop: async () => {
    const { activeSession } = get();
    if (!activeSession) return;

    get().stopTimer();

    // End any active break
    const breaks = [...activeSession.breaks];
    const lastBreak = breaks[breaks.length - 1];
    let extraBreakMs = 0;
    if (lastBreak && !lastBreak.endedAt) {
      lastBreak.endedAt = new Date().toISOString();
      extraBreakMs =
        new Date(lastBreak.endedAt).getTime() -
        new Date(lastBreak.startedAt).getTime();
    }

    await updateSession(activeSession.id, {
      status: 'auto-stopped',
      breaks,
      breakDurationMs: activeSession.breakDurationMs + extraBreakMs,
    });

    // Create notification
    await createNotification({
      userId: activeSession.userId,
      type: 'session_auto_stopped',
      title: 'Session Auto-Stopped',
      message:
        'Your 3-hour session has ended automatically. Please submit your work log.',
      read: false,
      createdAt: new Date().toISOString(),
    });

    set({
      isWorking: false,
      isOnBreak: false,
      activeSession: {
        ...activeSession,
        status: 'auto-stopped',
        breaks,
        breakDurationMs: activeSession.breakDurationMs + extraBreakMs,
      },
    });
  },

  startTimer: () => {
    const interval = setInterval(() => {
      get().tick();
    }, 1000);
    set({ timerInterval: interval });
  },

  stopTimer: () => {
    const { timerInterval } = get();
    if (timerInterval) {
      clearInterval(timerInterval);
      set({ timerInterval: null });
    }
  },

  tick: () => {
    const { activeSession, isOnBreak, remainingMs } = get();
    if (!activeSession || isOnBreak) return;

    const newRemaining = remainingMs - 1000;

    if (newRemaining <= 0) {
      set({ remainingMs: 0 });
      get().autoStop();
      return;
    }

    set({ remainingMs: newRemaining });
  },

  loadActiveSession: async (userId) => {
    const session = await getActiveSession(userId);
    if (session) {
      // Calculate remaining time
      const elapsed =
        new Date().getTime() -
        new Date(session.clockInTime).getTime() -
        session.breakDurationMs;

      // Check if current break is active
      const lastBreak = session.breaks[session.breaks.length - 1];
      const onBreak = lastBreak ? !lastBreak.endedAt : false;

      // If active break, subtract its time from elapsed since it's ongoing
      let adjustedElapsed = elapsed;
      if (onBreak && lastBreak) {
        const activeBreakMs =
          new Date().getTime() - new Date(lastBreak.startedAt).getTime();
        adjustedElapsed = elapsed - activeBreakMs;
      }

      const remaining = Math.max(0, SESSION_DURATION_MS - adjustedElapsed);

      if (remaining <= 0) {
        // Session should have auto-stopped
        set({ activeSession: session });
        get().autoStop();
        return;
      }

      set({
        activeSession: session,
        isWorking: true,
        isOnBreak: onBreak,
        remainingMs: remaining,
      });

      get().startTimer();
    }
  },

  setDraftTasks: (tasks) => set({ draftTasks: tasks }),
  setDraftSummary: (summary) => set({ draftSummary: summary }),
  setDraftMood: (mood) => set({ draftMood: mood }),
  setDraftBlockers: (blockers) => set({ draftBlockers: blockers }),
  setDraftAchievements: (achievements) => set({ draftAchievements: achievements }),

  reset: () => {
    get().stopTimer();
    set({
      activeSession: null,
      isWorking: false,
      isOnBreak: false,
      remainingMs: SESSION_DURATION_MS,
      draftTasks: [],
      draftSummary: '',
      draftMood: null,
      draftBlockers: '',
      draftAchievements: '',
    });
  },
}));
