import { createContext } from "react";
import type { Family } from "./types/familyTypes";

export type FamilyContextValue = {
  activeFamily: Family | null;
  families: Family[];
  isLoading: boolean;
  refreshFamilies: (preferredFamilyId?: string) => Promise<Family[]>;
  selectFamily: (familyId: string) => void;
};

export const FamilyContext = createContext<FamilyContextValue | null>(null);
