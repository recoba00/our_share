export const bootstrapPlatformAdminUid = "fOMEpAePtlXUvUukUDClM4lUZC82";

const platformAdminUids = new Set([bootstrapPlatformAdminUid]);

export function isPlatformAdmin(userId?: string | null) {
  return Boolean(userId && platformAdminUids.has(userId));
}

export const isBootstrapPlatformAdmin = isPlatformAdmin;
