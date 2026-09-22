import { createContext } from "react";
import type { LocationShareController } from "../location/hooks/useMyLocationShare";
import type { Family } from "./types/familyTypes";

export type FamilyContextValue = {
  activeFamily: Family | null;
  families: Family[];
  isLoading: boolean;
  locationShare: LocationShareController;
  removeFamily: (familyId: string) => void;
  refreshFamilies: (preferredFamilyId?: string) => Promise<Family[]>;
  selectFamily: (familyId: string) => void;
};

export const FamilyContext = createContext<FamilyContextValue | null>(null);
