// Permission checking utility for the new role system

export type Role = 'founder' | 'governor' | 'steward' | 'member' | 'voting_member' | 'observer';

export type Permission = 
  | 'view'
  | 'comment'
  | 'create_proposals'
  | 'vote_proposals'
  | 'vote_governance'
  | 'approve_proposals'
  | 'create_projects'
  | 'create_tasks'
  | 'take_tasks'
  | 'manage_members'
  | 'manage_settings';

// Permission matrix - defines what each role can do
const ROLE_PERMISSIONS: Record<Role, Set<Permission>> = {
  founder: new Set([
    'view',
    'comment',
    'create_proposals',
    'vote_proposals',
    'vote_governance',
    'approve_proposals',
    'create_projects',
    'create_tasks',
    'take_tasks',
    'manage_members',
    'manage_settings',
  ]),
  governor: new Set([
    'view',
    'comment',
    'create_proposals',
    'vote_proposals',
    'vote_governance',
    'approve_proposals',
    'create_projects',
    'create_tasks',
    'take_tasks',
  ]),
  steward: new Set([
    'view',
    'comment',
    'create_proposals',
    'vote_proposals',
    'approve_proposals',
    'create_projects',
    'create_tasks',
    'take_tasks',
  ]),
  member: new Set([
    'view',
    'comment',
    'create_proposals',
    'vote_proposals',
    'create_projects',
    'create_tasks',
    'take_tasks',
  ]),
  voting_member: new Set([
    'view',
    'comment',
    'vote_proposals',
    'take_tasks',
  ]),
  observer: new Set([
    'view',
  ]),
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.has(permission) : false;
}

/**
 * Check if a role can perform an action (alias for hasPermission)
 */
export function canDo(role: Role, permission: Permission): boolean {
  return hasPermission(role, permission);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? Array.from(permissions) : [];
}

/**
 * Check if a role is at least a certain level
 * Hierarchy: founder > governor > steward > member > voting_member > observer
 */
export function isAtLeast(role: Role, minimumRole: Role): boolean {
  const hierarchy: Role[] = ['founder', 'governor', 'steward', 'member', 'voting_member', 'observer'];
  const roleIndex = hierarchy.indexOf(role);
  const minIndex = hierarchy.indexOf(minimumRole);
  
  return roleIndex !== -1 && minIndex !== -1 && roleIndex <= minIndex;
}

/**
 * Validation: Check if a role string is valid
 */
export function isValidRole(role: string): role is Role {
  return ['founder', 'governor', 'steward', 'member', 'voting_member', 'observer'].includes(role);
}

/**
 * Get human-readable role name
 */
export function getRoleName(role: Role): string {
  const names: Record<Role, string> = {
    founder: 'Founder',
    governor: 'Governor',
    steward: 'Steward',
    member: 'Member',
    voting_member: 'Voting Member',
    observer: 'Observer',
  };
  return names[role] || role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: Role): string {
  const descriptions: Record<Role, string> = {
    founder: 'Full access including member and settings management',
    governor: 'Full governance voting and all operational permissions',
    steward: 'Moderate and approve proposals, create projects and tasks',
    member: 'Create proposals, projects, tasks and vote on proposals',
    voting_member: 'Vote on proposals, take tasks, and comment',
    observer: 'View-only access',
  };
  return descriptions[role] || '';
}