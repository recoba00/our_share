const platformAdminUids = new Set(["fOMEpAePtlXUvUukUDClM4lUZC82"]);

export function isPlatformAdmin(userId?: string | null) {
  return Boolean(userId && platformAdminUids.has(userId));
}
