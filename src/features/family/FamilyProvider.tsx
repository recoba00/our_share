import { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { FamilyContext } from "./FamilyContext";
import { getFamiliesForUser } from "./services/familyService";
import type { Family } from "./types/familyTypes";

const ACTIVE_FAMILY_STORAGE_KEY = "our-share-active-group-id";

export function FamilyProvider({ children }: PropsWithChildren) {
  const { status, user } = useAuth();
  const [families, setFamilies] = useState<Family[]>([]);
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshFamilies = useCallback(
    async (preferredFamilyId?: string) => {
      if (!user) {
        setFamilies([]);
        setActiveFamilyId(null);
        return [];
      }

      setIsLoading(true);

      try {
        const nextFamilies = await getFamiliesForUser(user.uid);
        const savedFamilyId = window.localStorage.getItem(ACTIVE_FAMILY_STORAGE_KEY);
        const nextActiveFamilyId =
          nextFamilies.find((family) => family.id === preferredFamilyId)?.id ??
          nextFamilies.find((family) => family.id === savedFamilyId)?.id ??
          nextFamilies[0]?.id ??
          null;

        setFamilies(nextFamilies);
        setActiveFamilyId(nextActiveFamilyId);

        if (nextActiveFamilyId) {
          window.localStorage.setItem(ACTIVE_FAMILY_STORAGE_KEY, nextActiveFamilyId);
        } else {
          window.localStorage.removeItem(ACTIVE_FAMILY_STORAGE_KEY);
        }

        return nextFamilies;
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      queueMicrotask(() => {
        setFamilies([]);
        setActiveFamilyId(null);
        setIsLoading(false);
      });
      return;
    }

    queueMicrotask(() => {
      void refreshFamilies().catch(() => {
        // 각 화면에서 그룹이 없는 상태를 안내할 수 있도록 빈 목록으로 유지한다.
        setFamilies([]);
        setActiveFamilyId(null);
      });
    });
  }, [refreshFamilies, status, user]);

  const selectFamily = useCallback(
    (familyId: string) => {
      if (!families.some((family) => family.id === familyId)) {
        return;
      }

      setActiveFamilyId(familyId);
      window.localStorage.setItem(ACTIVE_FAMILY_STORAGE_KEY, familyId);
    },
    [families]
  );

  const value = useMemo(
    () => ({
      activeFamily: families.find((family) => family.id === activeFamilyId) ?? null,
      families,
      isLoading,
      refreshFamilies,
      selectFamily,
    }),
    [activeFamilyId, families, isLoading, refreshFamilies, selectFamily]
  );

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}
