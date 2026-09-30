export type RealtimeMemberIdentity = {
  familyId: string;
  userId: string;
};

export function getUserSessionRealtimePaths(familyId: string, userId: string) {
  return [
    `liveLocations/${familyId}/${userId}`,
    `onlinePresence/${familyId}/${userId}`,
    `deviceStatus/${familyId}/${userId}`,
  ];
}

export function getMemberRealtimeRemovalUpdates(
  members: RealtimeMemberIdentity[]
) {
  const updates: Record<string, null> = {};

  members.forEach(({ familyId, userId }) => {
    updates[`familyMembers/${familyId}/${userId}`] = null;
    getUserSessionRealtimePaths(familyId, userId).forEach((path) => {
      updates[path] = null;
    });
  });

  return updates;
}

export function getUserSessionRealtimeRemovalUpdates(
  familyId: string,
  userId: string
) {
  return Object.fromEntries(
    getUserSessionRealtimePaths(familyId, userId).map((path) => [path, null])
  ) as Record<string, null>;
}
