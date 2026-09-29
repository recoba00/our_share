export function getUserSessionRealtimePaths(familyId: string, userId: string) {
  return [
    `liveLocations/${familyId}/${userId}`,
    `onlinePresence/${familyId}/${userId}`,
    `deviceStatus/${familyId}/${userId}`,
  ];
}
