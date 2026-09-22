import { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { useMyLocationShare } from "../location/hooks/useMyLocationShare";
import { FamilyContext } from "./FamilyContext";
import { getFamiliesForUser, joinFamilyByInviteCode } from "./services/familyService";
import {
  clearPendingInviteCode,
  getPendingInviteCode,
} from "./services/pendingInviteService";
import type { Family } from "./types/familyTypes";

const ACTIVE_FAMILY_STORAGE_KEY = "our-share-active-group-id";

export function FamilyProvider({ children }: PropsWithChildren) {
  const { status, user } = useAuth();
  const [families, setFamilies] = useState<Family[]>([]);
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const activeFamily = families.find((family) => family.id === activeFamilyId) ?? null;
  const locationShare = useMyLocationShare({
    familyId: activeFamily?.id ?? null,
    userId: user?.uid ?? null,
  });

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

    if (getPendingInviteCode()) {
      return;
    }

    queueMicrotask(() => {
      void refreshFamilies().catch(() => {
        // 각 화면에서 크루가 없는 상태를 안내할 수 있도록 빈 목록으로 유지한다.
        setFamilies([]);
        setActiveFamilyId(null);
      });
    });
  }, [refreshFamilies, status, user]);

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const pendingInviteCode = getPendingInviteCode();

      if (!pendingInviteCode) {
        return;
      }

      try {
        const result = await joinFamilyByInviteCode({
          inviteCode: pendingInviteCode,
          user,
        });

        if (cancelled) {
          return;
        }

        clearPendingInviteCode();
        await refreshFamilies(result.id);
      } catch {
        // 초대 화면에서 오류와 재시도 버튼을 보여주도록 코드를 유지한다.
      }
    })();

    return () => {
      cancelled = true;
    };
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

  const removeFamily = useCallback(
    (familyId: string) => {
      const nextFamilies = families.filter((family) => family.id !== familyId);
      const nextActiveFamilyId =
        activeFamilyId === familyId ? nextFamilies[0]?.id ?? null : activeFamilyId;

      setFamilies(nextFamilies);
      setActiveFamilyId(nextActiveFamilyId);

      if (nextActiveFamilyId) {
        window.localStorage.setItem(ACTIVE_FAMILY_STORAGE_KEY, nextActiveFamilyId);
      } else {
        window.localStorage.removeItem(ACTIVE_FAMILY_STORAGE_KEY);
      }
    },
    [activeFamilyId, families]
  );

  const value = useMemo(
    () => ({
      activeFamily,
      families,
      isLoading,
      locationShare,
      removeFamily,
      refreshFamilies,
      selectFamily,
    }),
    [activeFamily, families, isLoading, locationShare, removeFamily, refreshFamilies, selectFamily]
  );

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}
