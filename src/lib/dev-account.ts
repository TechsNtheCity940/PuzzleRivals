import type { UserAppRole, UserProfile } from "@/lib/types";

export const OWNER_ACCOUNT_EMAIL = "judgemrogan@gmail.com";

export function normalizeAccountEmail(email?: string | null) {
  return (email ?? "").trim().toLowerCase();
}

export function isOwnerEmail(email?: string | null) {
  return normalizeAccountEmail(email) === OWNER_ACCOUNT_EMAIL;
}

export function isPrivilegedRole(appRole?: UserAppRole | null) {
  return appRole === "owner" || appRole === "admin";
}

export function hasVipAccess(user?: Pick<UserProfile, "vipAccess"> | null) {
  return Boolean(user?.vipAccess);
}

export function isOwnerUser(user?: Pick<UserProfile, "email" | "appRole"> | null) {
  return Boolean(user) && (user.appRole === "owner" || isOwnerEmail(user.email));
}

export function isPrivilegedUser(user?: Pick<UserProfile, "email" | "appRole" | "vipAccess"> | null) {
  return Boolean(user) && (isPrivilegedRole(user.appRole) || isOwnerEmail(user.email) || hasVipAccess(user));
}
