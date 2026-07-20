import type { UserRole } from '@/types';

export type Permission =
  // Admin level
  | 'VIEW_ALL_ANALYTICS'
  | 'MANAGE_ALL_USERS'
  | 'VIEW_ALL_DEPARTMENTS'
  | 'VIEW_REPORTS'
  
  // Lead level
  | 'VIEW_TEAM_DASHBOARD'
  | 'MANAGE_OWN_TEAM'
  | 'VIEW_TEAM_ATTENDANCE'
  | 'VIEW_TEAM_TASKS'
  | 'VIEW_TEAM_REPORTS'
  
  // Employee level
  | 'VIEW_OWN_DASHBOARD'
  | 'MANAGE_OWN_SESSIONS'
  | 'VIEW_OWN_TASKS'
  | 'VIEW_OWN_HISTORY';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Has all permissions essentially, but let's list them explicitly
    'VIEW_ALL_ANALYTICS',
    'MANAGE_ALL_USERS',
    'VIEW_ALL_DEPARTMENTS',
    'VIEW_REPORTS',
    'VIEW_TEAM_DASHBOARD',
    'MANAGE_OWN_TEAM',
    'VIEW_TEAM_ATTENDANCE',
    'VIEW_TEAM_TASKS',
    'VIEW_TEAM_REPORTS',
    'VIEW_OWN_DASHBOARD',
    'MANAGE_OWN_SESSIONS',
    'VIEW_OWN_TASKS',
    'VIEW_OWN_HISTORY',
  ],
  lead: [
    'VIEW_TEAM_DASHBOARD',
    'MANAGE_OWN_TEAM',
    'VIEW_TEAM_ATTENDANCE',
    'VIEW_TEAM_TASKS',
    'VIEW_TEAM_REPORTS',
    'VIEW_OWN_DASHBOARD',
    'MANAGE_OWN_SESSIONS',
    'VIEW_OWN_TASKS',
    'VIEW_OWN_HISTORY',
  ],
  employee: [
    'VIEW_OWN_DASHBOARD',
    'MANAGE_OWN_SESSIONS',
    'VIEW_OWN_TASKS',
    'VIEW_OWN_HISTORY',
  ],
  intern: [
    'VIEW_OWN_DASHBOARD',
    'MANAGE_OWN_SESSIONS',
    'VIEW_OWN_TASKS',
    'VIEW_OWN_HISTORY',
  ],
  hr: [
    'VIEW_ALL_ANALYTICS',
    'MANAGE_ALL_USERS',
    'VIEW_ALL_DEPARTMENTS',
    'VIEW_REPORTS',
    'VIEW_TEAM_DASHBOARD',
    'MANAGE_OWN_TEAM',
    'VIEW_TEAM_ATTENDANCE',
    'VIEW_TEAM_TASKS',
    'VIEW_TEAM_REPORTS',
    'VIEW_OWN_DASHBOARD',
    'MANAGE_OWN_SESSIONS',
    'VIEW_OWN_TASKS',
    'VIEW_OWN_HISTORY',
  ],
  founder: [
    'VIEW_ALL_ANALYTICS',
    'MANAGE_ALL_USERS',
    'VIEW_ALL_DEPARTMENTS',
    'VIEW_REPORTS',
    'VIEW_TEAM_DASHBOARD',
    'MANAGE_OWN_TEAM',
    'VIEW_TEAM_ATTENDANCE',
    'VIEW_TEAM_TASKS',
    'VIEW_TEAM_REPORTS',
    'VIEW_OWN_DASHBOARD',
    'MANAGE_OWN_SESSIONS',
    'VIEW_OWN_TASKS',
    'VIEW_OWN_HISTORY',
  ],
  'co-founder': [
    'VIEW_ALL_ANALYTICS',
    'MANAGE_ALL_USERS',
    'VIEW_ALL_DEPARTMENTS',
    'VIEW_REPORTS',
    'VIEW_TEAM_DASHBOARD',
    'MANAGE_OWN_TEAM',
    'VIEW_TEAM_ATTENDANCE',
    'VIEW_TEAM_TASKS',
    'VIEW_TEAM_REPORTS',
    'VIEW_OWN_DASHBOARD',
    'MANAGE_OWN_SESSIONS',
    'VIEW_OWN_TASKS',
    'VIEW_OWN_HISTORY',
  ],
};

/**
 * Checks if a user role has a specific permission.
 */
export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
