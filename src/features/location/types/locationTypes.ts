export type LiveLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  updatedAt: number;
  battery: number | null;
  charging: boolean | null;
};
