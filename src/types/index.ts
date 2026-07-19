// ─── User & Auth Types ─────────────────────────────────────────────
export type UserRole = 'founder' | 'hr' | 'intern';
export type UserStatus = 'pending' | 'approved' | 'suspended' | 'rejected' | 'deleted';
export type Department =
  | 'Marketing'
  | 'Frontend'
  | 'Backend'
  | 'Production'
  | 'Hardware Team'
  | 'Finance'
  | 'Design'
  | 'Management'
  | 'HR';

export const DEPARTMENTS: Department[] = [
  'Marketing',
  'Frontend',
  'Backend',
  'Production',
  'Finance',
  'Design',
];

export const ADMIN_ROLES: UserRole[] = ['founder', 'hr'];

export interface MimoUser {
  uid: string;
  email: string;
  phoneNumber?: string;
  displayName: string;
  role: UserRole;
  departments: Department[];
  department?: Department; // deprecated, for backward compatibility
  status: UserStatus;
  avatarUrl?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  internshipStartDate?: string;
  internshipEndDate?: string;
  joinedAt: string;
  lastActiveAt?: string;
}

// ─── Session & Timer Types ─────────────────────────────────────────
export type SessionStatus = 'active' | 'completed' | 'auto-stopped' | 'flagged';

export interface BreakEntry {
  startedAt: string;
  endedAt?: string;
  reason?: string;
}

export interface TaskEntry {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
}

export type TaskCategory =
  | 'Development'
  | 'Design'
  | 'Content Creation'
  | 'Marketing'
  | 'Hardware'
  | 'Meeting'
  | 'Research'
  | 'Finance'
  | 'Other';

export const TASK_CATEGORIES: TaskCategory[] = [
  'Development',
  'Design',
  'Content Creation',
  'Marketing',
  'Hardware',
  'Meeting',
  'Research',
  'Finance',
  'Other',
];

export interface WorkSession {
  id: string;
  userId: string;
  userName: string;
  userDepartments: Department[];
  userDepartment?: Department; // deprecated
  clockInTime: string;
  clockOutTime?: string;
  totalDurationMs: number; // actual worked milliseconds
  breakDurationMs: number; // total break milliseconds
  breaks: BreakEntry[];
  status: SessionStatus;
  workSummary?: string;
  tasks: TaskEntry[];
  mood?: Mood;
  blockers?: string;
  achievements?: string;
  review?: SessionReview;
}

export type Mood = 'frustrated' | 'neutral' | 'good' | 'fire';
export const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: 'frustrated', emoji: '😤', label: 'Frustrated' },
  { value: 'neutral', emoji: '😐', label: 'Neutral' },
  { value: 'good', emoji: '😊', label: 'Good' },
  { value: 'fire', emoji: '🔥', label: 'On Fire' },
];

// ─── UI State & Preferences ────────────────────────────────────────

export interface UIPreferences {
  theme: 'dark' | 'light' | 'system';
  compactMode: boolean;
  accentColor: string;
}

// ─── Weekly Task ────────────────────────────────────────

export interface WeeklyTask {
  id: string;
  userId: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  dueDate: string;
}
export type ReviewAction = 'approved' | 'noted' | 'flagged' | 'starred' | 'paid' | 'unpaid';

export interface SessionReview {
  reviewedBy: string;
  reviewerName: string;
  action: ReviewAction;
  comment?: string;
  reviewedAt: string;
}

// ─── Notification Types ────────────────────────────────────────────
export type NotificationType =
  | 'account_approved'
  | 'account_rejected'
  | 'session_flagged'
  | 'session_starred'
  | 'session_noted'
  | 'session_auto_stopped'
  | 'general';

export interface MimoNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

// ─── Analytics Types ───────────────────────────────────────────────
export interface DailyStats {
  date: string;
  totalHours: number;
  sessionCount: number;
  avgSessionLength: number;
}

export interface UserStats {
  totalSessions: number;
  totalHoursWorked: number;
  avgSessionLength: number;
  currentStreak: number;
  longestStreak: number;
  flagCount: number;
  starCount: number;
  lastSessionDate?: string;
}

// ─── Constants ─────────────────────────────────────────────────────
export const SESSION_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours in ms
export const SESSION_DURATION_SECONDS = 3 * 60 * 60; // 3 hours in seconds
