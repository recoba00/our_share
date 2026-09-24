import { ShieldCheck, UserPlus } from "@phosphor-icons/react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ActionLayer } from "../common/ActionLayer";
import { Avatar } from "../common/Avatar";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { useConfirmDialog } from "../common/confirmDialogContext";
import { useToast } from "../common/toastContext";
import {
  loadAdminProfilesPage,
  loadPublicProfilesByIds,
} from "../../features/admin/services/adminDashboardService";
import {
  loadPlatformAdminAssignments,
  removePlatformAdminRole,
  savePlatformAdminRole,
} from "../../features/admin/services/platformAdminService";
import type { AdminPublicProfile } from "../../features/admin/types/adminDashboardTypes";
import {
  platformAdminRoleDescriptions,
  platformAdminRoleLabels,
  type PlatformAdminAssignment,
  type PlatformAdminRole,
} from "../../features/admin/types/platformAdminTypes";
import { bootstrapPlatformAdminUid } from "../../features/admin/platformAdmin";
import { useAdminAccess } from "../../features/admin/useAdminAccess";
import { useAuth } from "../../features/auth/useAuth";
import { getFirebaseErrorMessage } from "../../lib/firebase/firebaseErrorMessage";

const roles: PlatformAdminRole[] = ["SUPER_ADMIN", "MODERATOR", "CONTENT_MANAGER", "VIEWER"];

export function AdminRolesPanel() {
  const { user } = useAuth();
  const { role: actorRole } = useAdminAccess();
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState<PlatformAdminAssignment[]>([]);
  const [profiles, setProfiles] = useState<AdminPublicProfile[]>([]);
  const [searchResults, setSearchResults] = useState<AdminPublicProfile[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<AdminPublicProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<PlatformAdminRole>("VIEWER");
  const [isSaving, setIsSaving] = useState(false);

  const assignmentByUser = useMemo(
    () => new Map(assignments.map((assignment) => [assignment.userId, assignment])),
    [assignments]
  );
  const profileById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles]
  );

  async function refreshAssignments() {
    setIsLoading(true);
    try {
      const nextAssignments = await loadPlatformAdminAssignments();
      const nextProfiles = await loadPublicProfilesByIds(
        nextAssignments.map((assignment) => assignment.userId)
      );
      setAssignments(nextAssignments);
      setProfiles(nextProfiles);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getFirebaseErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    void loadPlatformAdminAssignments()
      .then(async (nextAssignments) => {
        const nextProfiles = await loadPublicProfilesByIds(
          nextAssignments.map((assignment) => assignment.userId)
        );
        if (!isActive) return;
        setAssignments(nextAssignments);
        setProfiles(nextProfiles);
        setErrorMessage("");
      })
      .catch((error: unknown) => {
        if (isActive) setErrorMessage(getFirebaseErrorMessage(error));
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSearching(true);
    try {
      const page = await loadAdminProfilesPage({ cursor: null, search: search.trim() });
      setSearchResults(
        page.items.filter(
          (profile) =>
            profile.id !== bootstrapPlatformAdminUid && !assignmentByUser.has(profile.id)
        )
      );
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getFirebaseErrorMessage(error));
    } finally {
      setIsSearching(false);
    }
  }

  function openEditor(profile: AdminPublicProfile, assignment?: PlatformAdminAssignment) {
    setSelectedProfile(profile);
    setSelectedRole(assignment?.role ?? "VIEWER");
  }

  async function handleSave() {
    if (!user || !actorRole || !selectedProfile) return;
    setIsSaving(true);
    try {
      await savePlatformAdminRole({
        actor: { id: user.uid, role: actorRole },
        currentAssignment: assignmentByUser.get(selectedProfile.id) ?? null,
        role: selectedRole,
        userId: selectedProfile.id,
      });
      showToast({ message: "관리자 권한을 저장했어요.", variant: "success" });
      setSelectedProfile(null);
      setSearchResults([]);
      await refreshAssignments();
    } catch (error) {
      showToast({ message: getFirebaseErrorMessage(error), variant: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove() {
    if (!user || !actorRole || !selectedProfile) return;
    const assignment = assignmentByUser.get(selectedProfile.id);
    if (!assignment) return;
    const confirmed = await confirm({
      confirmLabel: "권한 해제",
      description: `${selectedProfile.displayName ?? "사용자"}님의 운영자 도구 접근을 해제해요.`,
      title: "관리자 권한을 해제할까요?",
      tone: "danger",
    });
    if (!confirmed) return;

    setIsSaving(true);
    try {
      await removePlatformAdminRole({ actor: { id: user.uid, role: actorRole }, assignment });
      showToast({ message: "관리자 권한을 해제했어요.", variant: "success" });
      setSelectedProfile(null);
      await refreshAssignments();
    } catch (error) {
      showToast({ message: getFirebaseErrorMessage(error), variant: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="mx-auto grid w-full max-w-6xl gap-5 p-4 sm:p-6 lg:p-8">
        <header>
          <p className="text-xs font-semibold uppercase text-brand">Access</p>
          <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">관리자 권한</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            필요한 운영 기능만 사용할 수 있도록 역할을 나눠요.
          </p>
        </header>

        {errorMessage ? (
          <p className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-400/10 dark:text-red-300">{errorMessage}</p>
        ) : null}

        <section className="grid gap-3">
          <AdminRoleCard
            label="최고 관리자"
            name={user?.uid === bootstrapPlatformAdminUid ? user.displayName ?? "최고 관리자" : "부트스트랩 관리자"}
            note="삭제할 수 없는 최초 운영 계정"
            photoURL={user?.uid === bootstrapPlatformAdminUid ? user.photoURL : null}
          />
          {isLoading ? <div className="h-24 animate-pulse rounded-lg bg-[var(--color-surface-muted)]" /> : null}
          {!isLoading
            ? assignments.map((assignment) => {
                const profile = profileById.get(assignment.userId) ?? fallbackProfile(assignment.userId);
                if (assignment.userId === user?.uid) {
                  return (
                    <AdminRoleCard
                      key={assignment.id}
                      label={platformAdminRoleLabels[assignment.role]}
                      name={profile.displayName ?? "사용자"}
                      note="내 권한은 다른 최고 관리자가 변경할 수 있어요."
                      photoURL={profile.photoURL}
                    />
                  );
                }
                return (
                  <button
                    className="text-left"
                    key={assignment.id}
                    onClick={() => openEditor(profile, assignment)}
                    type="button"
                  >
                    <AdminRoleCard
                      label={platformAdminRoleLabels[assignment.role]}
                      name={profile.displayName ?? "사용자"}
                      note={platformAdminRoleDescriptions[assignment.role]}
                      photoURL={profile.photoURL}
                    />
                  </button>
                );
              })
            : null}
        </section>

        <section className="grid gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
          <div>
            <h3 className="text-base font-semibold">관리자 추가</h3>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">이름으로 사용자를 찾아 역할을 지정해요.</p>
          </div>
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleSearch}>
            <Input
              className="flex-1"
              maxLength={80}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="사용자 이름"
              value={search}
            />
            <Button disabled={isSearching} loading={isSearching} type="submit" variant="secondary">검색</Button>
          </form>
          {searchResults.length > 0 ? (
            <div className="grid gap-2">
              {searchResults.map((profile) => (
                <button
                  className="flex min-w-0 items-center gap-3 rounded-lg bg-[var(--color-surface-muted)] p-3 text-left transition-colors hover:bg-brand-soft"
                  key={profile.id}
                  onClick={() => openEditor(profile)}
                  type="button"
                >
                  <Avatar
                    alt={profile.displayName ?? "사용자"}
                    className="size-9 shrink-0"
                    src={profile.photoURL}
                  />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm font-semibold">{profile.displayName ?? "사용자"}</strong>
                    <span className="block truncate text-xs text-[var(--color-text-secondary)]">{profile.id}</span>
                  </span>
                  <UserPlus size={20} weight="regular" />
                </button>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      <ActionLayer desktop isOpen={Boolean(selectedProfile)} onClose={() => setSelectedProfile(null)} title="관리자 권한 설정">
        <div className="mx-auto grid w-full max-w-2xl gap-5">
          <div className="flex items-center gap-3 rounded-lg bg-[var(--color-surface-muted)] p-4">
            <Avatar
              alt={selectedProfile?.displayName ?? "사용자"}
              className="size-11 shrink-0"
              src={selectedProfile?.photoURL}
            />
            <div className="min-w-0">
              <strong className="block truncate text-base font-semibold">{selectedProfile?.displayName ?? "사용자"}</strong>
              <span className="block truncate text-xs text-[var(--color-text-secondary)]">{selectedProfile?.id}</span>
            </div>
          </div>
          <div className="grid gap-2">
            {roles.map((role) => (
              <button
                aria-pressed={selectedRole === role}
                className={`flex items-start gap-3 rounded-lg p-4 text-left transition-colors ${
                  selectedRole === role ? "bg-brand-soft text-brand" : "bg-[var(--color-surface-muted)]"
                }`}
                key={role}
                onClick={() => setSelectedRole(role)}
                type="button"
              >
                <ShieldCheck className="mt-0.5 shrink-0" size={20} weight="regular" />
                <span>
                  <strong className="block text-sm font-semibold">{platformAdminRoleLabels[role]}</strong>
                  <span className="mt-1 block text-sm text-[var(--color-text-secondary)]">{platformAdminRoleDescriptions[role]}</span>
                </span>
              </button>
            ))}
          </div>
          <div
            className={`grid gap-2 ${
              selectedProfile && assignmentByUser.has(selectedProfile.id) ? "sm:grid-cols-2" : ""
            }`}
          >
            {selectedProfile && assignmentByUser.has(selectedProfile.id) ? (
              <Button disabled={isSaving} onClick={() => void handleRemove()} type="button" variant="danger">권한 해제</Button>
            ) : null}
            <Button disabled={isSaving} loading={isSaving} onClick={() => void handleSave()} type="button">저장하기</Button>
          </div>
        </div>
      </ActionLayer>
    </>
  );
}

function AdminRoleCard({ label, name, note, photoURL }: { label: string; name: string; note: string; photoURL: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg bg-[var(--color-surface-muted)] p-4">
      <Avatar alt={name} className="size-11 shrink-0" src={photoURL} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="truncate text-sm font-semibold">{name}</strong>
          <span className="rounded-full bg-[var(--color-surface)] px-2 py-1 text-xs font-semibold text-brand">{label}</span>
        </div>
        <p className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">{note}</p>
      </div>
    </div>
  );
}

function fallbackProfile(userId: string): AdminPublicProfile {
  return { createdAt: null, displayName: "사용자", id: userId, photoURL: null, updatedAt: null };
}
