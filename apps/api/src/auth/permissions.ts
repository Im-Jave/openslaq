import type { Role } from "@openslaq/shared";
import { ROLES } from "@openslaq/shared";

const ROLE_LEVEL: Record<Role, number> = {
  [ROLES.OWNER]: 3,
  [ROLES.ADMIN]: 2,
  [ROLES.MEMBER]: 1,
};

export function hasMinimumRole(role: Role, minimumRole: Role): boolean {
  return ROLE_LEVEL[role] >= ROLE_LEVEL[minimumRole];
}
