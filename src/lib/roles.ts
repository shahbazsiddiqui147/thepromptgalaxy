export const ROLES = ['admin', 'editor', 'moderator', 'member'] as const
export type Role = (typeof ROLES)[number]

/** Roles allowed to open /admin at all. Individual screens narrow this further. */
export const ADMIN_AREA_ROLES: readonly Role[] = ['admin', 'editor', 'moderator']
