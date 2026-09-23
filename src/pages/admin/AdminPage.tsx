import {
  Buildings,
  ChartPieSlice,
  CheckCircle,
  MagnifyingGlass,
  Megaphone,
  NotePencil,
  Plus,
  Trash,
  UserCircle,
  UsersThree,
} from "@phosphor-icons/react";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { ActionLayer } from "../../components/common/ActionLayer";
import { Avatar } from "../../components/common/Avatar";
import { Button } from "../../components/common/Button";
import { IconButton } from "../../components/common/IconButton";
import { Input } from "../../components/common/Input";
import { SegmentedControl } from "../../components/common/SegmentedControl";
import { useConfirmDialog } from "../../components/common/confirmDialogContext";
import { useToast } from "../../components/common/toastContext";
import { subscribeAdminDashboard } from "../../features/admin/services/adminDashboardService";
import {
  createServiceNotice,
  deleteServiceNotice,
  subscribeAdminServiceNotices,
  updateServiceNotice,
} from "../../features/admin/services/serviceNoticeService";
import type {
  AdminCrew,
  AdminDashboardData,
  AdminPublicProfile,
} from "../../features/admin/types/adminDashboardTypes";
import type {
  ServiceNotice,
  ServiceNoticeDraft,
  ServiceNoticeStatus,
} from "../../features/admin/types/serviceNoticeTypes";
import { useAuth } from "../../features/auth/useAuth";

type AdminSection = "dashboard" | "notices" | "users" | "crews";

const emptyDraft: ServiceNoticeDraft = {
  body: "",
  status: "DRAFT",
  title: "",
};

const emptyDashboard: AdminDashboardData = {
  crews: [],
  members: [],
  profiles: [],
};

const navigationItems: Array<{
  icon: ReactNode;
  id: AdminSection;
  label: string;
}> = [
  { icon: <ChartPieSlice size={20} weight="regular" />, id: "dashboard", label: "대시보드" },
  { icon: <Megaphone size={20} weight="regular" />, id: "notices", label: "공지 관리" },
  { icon: <UserCircle size={20} weight="regular" />, id: "users", label: "사용자" },
  { icon: <UsersThree size={20} weight="regular" />, id: "crews", label: "크루" },
];

export function AdminPage() {
  const { user } = useAuth();
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [dashboard, setDashboard] = useState<AdminDashboardData>(emptyDashboard);
  const [notices, setNotices] = useState<ServiceNotice[]>([]);
  const [visibleStatus, setVisibleStatus] = useState<ServiceNoticeStatus>("PUBLISHED");
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [isNoticesLoading, setIsNoticesLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [noticeError, setNoticeError] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<ServiceNotice | null>(null);
  const [draft, setDraft] = useState<ServiceNoticeDraft>(emptyDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [crewSearch, setCrewSearch] = useState("");

  useEffect(
    () =>
      subscribeAdminServiceNotices({
        onChange: (nextNotices) => {
          setNotices(nextNotices);
          setNoticeError("");
          setIsNoticesLoading(false);
        },
        onError: (message) => {
          setNoticeError(message);
          setIsNoticesLoading(false);
        },
      }),
    []
  );

  useEffect(
    () =>
      subscribeAdminDashboard({
        onChange: (nextDashboard) => {
          setDashboard(nextDashboard);
          setDashboardError("");
          setIsDashboardLoading(false);
        },
        onError: (message) => {
          setDashboardError(message);
          setIsDashboardLoading(false);
        },
      }),
    []
  );

  const publishedCount = notices.filter((notice) => notice.status === "PUBLISHED").length;
  const draftCount = notices.length - publishedCount;
  const filteredNotices = useMemo(
    () => notices.filter((notice) => notice.status === visibleStatus),
    [notices, visibleStatus]
  );
  const profileById = useMemo(
    () => new Map(dashboard.profiles.map((profile) => [profile.id, profile])),
    [dashboard.profiles]
  );
  const memberCountByCrew = useMemo(() => {
    const counts = new Map<string, number>();
    dashboard.members.forEach((member) => {
      counts.set(member.familyId, (counts.get(member.familyId) ?? 0) + 1);
    });
    return counts;
  }, [dashboard.members]);
  const crewCountByUser = useMemo(() => {
    const counts = new Map<string, number>();
    dashboard.members.forEach((member) => {
      counts.set(member.userId, (counts.get(member.userId) ?? 0) + 1);
    });
    return counts;
  }, [dashboard.members]);
  const filteredProfiles = useMemo(() => {
    const keyword = userSearch.trim().toLocaleLowerCase("ko-KR");
    if (!keyword) {
      return dashboard.profiles;
    }
    return dashboard.profiles.filter((profile) =>
      `${profile.displayName ?? ""} ${profile.id}`.toLocaleLowerCase("ko-KR").includes(keyword)
    );
  }, [dashboard.profiles, userSearch]);
  const filteredCrews = useMemo(() => {
    const keyword = crewSearch.trim().toLocaleLowerCase("ko-KR");
    if (!keyword) {
      return dashboard.crews;
    }
    return dashboard.crews.filter((crew) =>
      `${crew.name} ${profileById.get(crew.ownerId)?.displayName ?? ""}`
        .toLocaleLowerCase("ko-KR")
        .includes(keyword)
    );
  }, [crewSearch, dashboard.crews, profileById]);

  function openCreateEditor() {
    setEditingNotice(null);
    setDraft(emptyDraft);
    setIsEditorOpen(true);
  }

  function openEditEditor(notice: ServiceNotice) {
    setEditingNotice(notice);
    setDraft({ body: notice.body, status: notice.status, title: notice.title });
    setIsEditorOpen(true);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setIsSaving(true);

    try {
      if (editingNotice) {
        await updateServiceNotice({ draft, noticeId: editingNotice.id });
        showToast({ message: "공지를 수정했어요.", variant: "success" });
      } else {
        await createServiceNotice({ createdBy: user.uid, draft });
        showToast({
          message: draft.status === "PUBLISHED" ? "공지를 게시했어요." : "공지를 임시 저장했어요.",
          variant: "success",
        });
      }

      setIsEditorOpen(false);
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "공지를 저장하지 못했어요.",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(notice: ServiceNotice) {
    const confirmed = await confirm({
      confirmLabel: "삭제",
      description: `‘${notice.title}’ 공지를 삭제해요. 되돌릴 수 없어요.`,
      title: "공지를 삭제할까요?",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteServiceNotice(notice.id);
      showToast({ message: "공지를 삭제했어요.", variant: "success" });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "공지를 삭제하지 못했어요.",
        variant: "error",
      });
    }
  }

  const editorForm = (
    <form className="mx-auto grid w-full max-w-2xl gap-4" onSubmit={handleSave}>
      <Input
        autoFocus
        label="제목"
        maxLength={80}
        onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
        placeholder="공지 제목을 적어주세요."
        value={draft.title}
      />
      <label className="grid gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
        내용
        <textarea
          className="min-h-64 resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-normal leading-6 text-[var(--color-text-primary)] outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-emerald-100"
          inputMode="text"
          lang="ko"
          maxLength={2000}
          onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
          placeholder="사용자에게 전할 내용을 간결하게 적어주세요."
          value={draft.body}
        />
        <span className="text-right text-xs font-normal text-[var(--color-text-secondary)]">
          {draft.body.length}/2,000
        </span>
      </label>
      <div className="grid gap-2">
        <span className="text-sm font-semibold">게시 상태</span>
        <SegmentedControl
          onChange={(status) => setDraft((current) => ({ ...current, status }))}
          options={[
            { label: "임시 저장", value: "DRAFT" },
            { label: "바로 게시", value: "PUBLISHED" },
          ]}
          value={draft.status}
        />
      </div>
      <Button disabled={isSaving} loading={isSaving} type="submit">
        {editingNotice ? "수정하기" : draft.status === "PUBLISHED" ? "게시하기" : "저장하기"}
      </Button>
    </form>
  );

  return (
    <>
      <div className="min-h-[calc(100dvh-6rem)] overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <AdminNavigation activeSection={activeSection} onChange={setActiveSection} />

        <main className="min-w-0 bg-[var(--color-background)]">
          {activeSection === "dashboard" ? (
            <DashboardOverview
              dashboard={dashboard}
              errorMessage={dashboardError || noticeError}
              isLoading={isDashboardLoading || isNoticesLoading}
              memberCountByCrew={memberCountByCrew}
              notices={notices}
              onCreateNotice={openCreateEditor}
              onNavigate={setActiveSection}
              profileById={profileById}
              publishedCount={publishedCount}
            />
          ) : null}
          {activeSection === "notices" ? (
            <NoticesPanel
              draftCount={draftCount}
              errorMessage={noticeError}
              filteredNotices={filteredNotices}
              isLoading={isNoticesLoading}
              onCreate={openCreateEditor}
              onDelete={handleDelete}
              onEdit={openEditEditor}
              onStatusChange={setVisibleStatus}
              publishedCount={publishedCount}
              visibleStatus={visibleStatus}
            />
          ) : null}
          {activeSection === "users" ? (
            <UsersPanel
              crewCountByUser={crewCountByUser}
              errorMessage={dashboardError}
              isLoading={isDashboardLoading}
              onSearchChange={setUserSearch}
              profiles={filteredProfiles}
              search={userSearch}
              totalCount={dashboard.profiles.length}
            />
          ) : null}
          {activeSection === "crews" ? (
            <CrewsPanel
              crews={filteredCrews}
              errorMessage={dashboardError}
              isLoading={isDashboardLoading}
              memberCountByCrew={memberCountByCrew}
              onSearchChange={setCrewSearch}
              profileById={profileById}
              search={crewSearch}
              totalCount={dashboard.crews.length}
            />
          ) : null}
        </main>
      </div>

      <ActionLayer
        desktop
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={editingNotice ? "공지 수정" : "공지 작성"}
      >
        {editorForm}
      </ActionLayer>
    </>
  );
}

function AdminNavigation({
  activeSection,
  onChange,
}: {
  activeSection: AdminSection;
  onChange: (section: AdminSection) => void;
}) {
  return (
    <>
      <aside className="hidden min-h-[calc(100dvh-6rem)] border-r border-[var(--color-border)] bg-[var(--color-surface)] lg:flex lg:flex-col">
        <div className="px-5 py-6">
          <div className="flex items-center gap-3">
            <img
              alt=""
              className="size-9 rounded-lg object-cover"
              src={`${import.meta.env.BASE_URL}brand-logo.svg`}
            />
            <div>
              <strong className="block text-sm font-semibold">우리끼리</strong>
              <span className="block text-xs text-[var(--color-text-secondary)]">관리자</span>
            </div>
          </div>
        </div>
        <nav aria-label="운영자 메뉴" className="grid gap-1 px-3">
          {navigationItems.map((item) => (
            <button
              aria-current={activeSection === item.id ? "page" : undefined}
              className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition-colors ${
                activeSection === item.id
                  ? "bg-brand-soft text-brand"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
              }`}
              key={item.id}
              onClick={() => onChange(item.id)}
              type="button"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto p-4">
          <div className="rounded-lg bg-[var(--color-surface-muted)] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="size-2 rounded-full bg-emerald-500" />
              Production
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Firebase Hosting</p>
          </div>
        </div>
      </aside>

      <nav
        aria-label="운영자 메뉴"
        className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-surface)] p-2 scrollbar-none lg:hidden"
      >
        {navigationItems.map((item) => (
          <button
            aria-current={activeSection === item.id ? "page" : undefined}
            className={`flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors ${
              activeSection === item.id
                ? "bg-brand-soft text-brand"
                : "text-[var(--color-text-secondary)]"
            }`}
            key={item.id}
            onClick={() => onChange(item.id)}
            type="button"
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
    </>
  );
}

function DashboardOverview({
  dashboard,
  errorMessage,
  isLoading,
  memberCountByCrew,
  notices,
  onCreateNotice,
  onNavigate,
  profileById,
  publishedCount,
}: {
  dashboard: AdminDashboardData;
  errorMessage: string;
  isLoading: boolean;
  memberCountByCrew: Map<string, number>;
  notices: ServiceNotice[];
  onCreateNotice: () => void;
  onNavigate: (section: AdminSection) => void;
  profileById: Map<string, AdminPublicProfile>;
  publishedCount: number;
}) {
  const recentUsers = countRecent(dashboard.profiles.map((profile) => profile.createdAt));
  const recentCrews = countRecent(dashboard.crews.map((crew) => crew.createdAt));

  return (
    <AdminContent
      action={
        <Button className="shrink-0" onClick={onCreateNotice} type="button">
          <Plus size={18} weight="regular" />
          공지 작성
        </Button>
      }
      description="서비스 운영 현황을 한눈에 확인해요."
      eyebrow="Overview"
      title="대시보드"
    >
      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<UserCircle size={22} weight="regular" />}
          label="전체 사용자"
          note={`최근 7일 +${recentUsers}`}
          value={dashboard.profiles.length}
        />
        <MetricCard
          icon={<UsersThree size={22} weight="regular" />}
          label="운영 크루"
          note={`최근 7일 +${recentCrews}`}
          value={dashboard.crews.length}
        />
        <MetricCard
          icon={<Buildings size={22} weight="regular" />}
          label="크루 멤버십"
          note="중복 참여 포함"
          value={dashboard.members.length}
        />
        <MetricCard
          icon={<Megaphone size={22} weight="regular" />}
          label="게시 공지"
          note={`임시 저장 ${notices.length - publishedCount}`}
          value={publishedCount}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
        <DashboardSection actionLabel="공지 전체 보기" onAction={() => onNavigate("notices")} title="최근 공지">
          {isLoading ? <LoadingRows /> : null}
          {!isLoading && notices.length === 0 ? (
            <EmptyPanel description="첫 공지를 작성해보세요." title="등록된 공지가 없어요." />
          ) : null}
          <div className="divide-y divide-[var(--color-border)]">
            {notices.slice(0, 5).map((notice) => (
              <div className="flex min-w-0 items-center gap-3 py-3" key={notice.id}>
                <StatusDot active={notice.status === "PUBLISHED"} />
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-semibold">{notice.title}</strong>
                  <span className="mt-0.5 block text-xs text-[var(--color-text-secondary)]">
                    {formatTimestamp(notice.updatedAt)}
                  </span>
                </div>
                <StatusBadge active={notice.status === "PUBLISHED"} />
              </div>
            ))}
          </div>
        </DashboardSection>

        <DashboardSection title="운영 상태">
          <div className="grid gap-2">
            <SystemRow label="관리자 인증" value="정상" />
            <SystemRow label="Firestore 동기화" value={errorMessage ? "확인 필요" : "정상"} />
            <SystemRow label="Firebase Hosting" value="운영 중" />
            <SystemRow label="Storage" muted value="MVP 미사용" />
          </div>
        </DashboardSection>
      </div>

      <DashboardSection actionLabel="크루 전체 보기" onAction={() => onNavigate("crews")} title="최근 생성된 크루">
        {isLoading ? <LoadingRows /> : null}
        {!isLoading && dashboard.crews.length === 0 ? (
          <EmptyPanel description="사용자가 크루를 만들면 여기에 표시돼요." title="생성된 크루가 없어요." />
        ) : null}
        {!isLoading && dashboard.crews.length > 0 ? (
          <CrewTable
            crews={dashboard.crews.slice(0, 5)}
            memberCountByCrew={memberCountByCrew}
            profileById={profileById}
          />
        ) : null}
      </DashboardSection>
    </AdminContent>
  );
}

function NoticesPanel({
  draftCount,
  errorMessage,
  filteredNotices,
  isLoading,
  onCreate,
  onDelete,
  onEdit,
  onStatusChange,
  publishedCount,
  visibleStatus,
}: {
  draftCount: number;
  errorMessage: string;
  filteredNotices: ServiceNotice[];
  isLoading: boolean;
  onCreate: () => void;
  onDelete: (notice: ServiceNotice) => Promise<void>;
  onEdit: (notice: ServiceNotice) => void;
  onStatusChange: (status: ServiceNoticeStatus) => void;
  publishedCount: number;
  visibleStatus: ServiceNoticeStatus;
}) {
  return (
    <AdminContent
      action={
        <Button onClick={onCreate} type="button">
          <Plus size={18} weight="regular" />
          공지 작성
        </Button>
      }
      description="서비스 변경과 중요한 안내를 작성하고 게시해요."
      eyebrow="Contents"
      title="공지 관리"
    >
      <div className="max-w-md">
        <SegmentedControl
          onChange={onStatusChange}
          options={[
            { label: `게시 중 ${publishedCount}`, value: "PUBLISHED" },
            { label: `임시 저장 ${draftCount}`, value: "DRAFT" },
          ]}
          value={visibleStatus}
        />
      </div>
      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}
      <section className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        {isLoading ? <LoadingRows /> : null}
        {!isLoading && !errorMessage && filteredNotices.length === 0 ? (
          <EmptyPanel
            description="새 공지를 작성해보세요."
            title={visibleStatus === "PUBLISHED" ? "게시 중인 공지가 없어요." : "임시 저장한 공지가 없어요."}
          />
        ) : null}
        <div className="divide-y divide-[var(--color-border)]">
          {filteredNotices.map((notice) => (
            <article className="flex min-w-0 items-start gap-3 p-4" key={notice.id}>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <h3 className="min-w-0 truncate text-base font-semibold">{notice.title}</h3>
                  <StatusBadge active={notice.status === "PUBLISHED"} />
                </div>
                <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm leading-6 text-[var(--color-text-secondary)]">
                  {notice.body}
                </p>
                <span className="mt-2 block text-xs text-[var(--color-text-secondary)]">
                  마지막 수정 {formatTimestamp(notice.updatedAt)}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <IconButton className="size-9" label="공지 수정" onClick={() => onEdit(notice)} variant="ghost">
                  <NotePencil size={18} weight="regular" />
                </IconButton>
                <IconButton
                  className="size-9 text-red-500 hover:text-red-600"
                  label="공지 삭제"
                  onClick={() => void onDelete(notice)}
                  variant="ghost"
                >
                  <Trash size={18} weight="regular" />
                </IconButton>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AdminContent>
  );
}

function UsersPanel({
  crewCountByUser,
  errorMessage,
  isLoading,
  onSearchChange,
  profiles,
  search,
  totalCount,
}: {
  crewCountByUser: Map<string, number>;
  errorMessage: string;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  profiles: AdminPublicProfile[];
  search: string;
  totalCount: number;
}) {
  return (
    <AdminContent
      description="공개 프로필과 크루 참여 현황만 확인해요. 이메일과 동의 정보는 표시하지 않아요."
      eyebrow="Members"
      title={`사용자 ${totalCount}`}
    >
      <SearchField onChange={onSearchChange} placeholder="이름 또는 사용자 ID 검색" value={search} />
      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}
      <section className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        {isLoading ? <LoadingRows /> : null}
        {!isLoading && profiles.length === 0 ? (
          <EmptyPanel description="검색어를 바꾸거나 잠시 후 다시 확인해보세요." title="사용자를 찾지 못했어요." />
        ) : null}
        {!isLoading && profiles.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead className="bg-[var(--color-surface-muted)] text-xs text-[var(--color-text-secondary)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">사용자</th>
                    <th className="px-4 py-3 font-semibold">사용자 ID</th>
                    <th className="px-4 py-3 font-semibold">참여 크루</th>
                    <th className="px-4 py-3 font-semibold">가입일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {profiles.map((profile) => (
                    <tr key={profile.id}>
                      <td className="px-4 py-3"><ProfileIdentity profile={profile} /></td>
                      <td className="max-w-56 truncate px-4 py-3 text-sm text-[var(--color-text-secondary)]">{profile.id}</td>
                      <td className="px-4 py-3 text-sm">{crewCountByUser.get(profile.id) ?? 0}개</td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{formatTimestamp(profile.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-[var(--color-border)] md:hidden">
              {profiles.map((profile) => (
                <div className="p-4" key={profile.id}>
                  <ProfileIdentity profile={profile} />
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--color-text-secondary)]">
                    <span>참여 크루 {crewCountByUser.get(profile.id) ?? 0}개</span>
                    <span className="text-right">{formatTimestamp(profile.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </AdminContent>
  );
}

function CrewsPanel({
  crews,
  errorMessage,
  isLoading,
  memberCountByCrew,
  onSearchChange,
  profileById,
  search,
  totalCount,
}: {
  crews: AdminCrew[];
  errorMessage: string;
  isLoading: boolean;
  memberCountByCrew: Map<string, number>;
  onSearchChange: (value: string) => void;
  profileById: Map<string, AdminPublicProfile>;
  search: string;
  totalCount: number;
}) {
  return (
    <AdminContent
      description="생성된 크루와 크루장, 현재 멤버 수를 확인해요."
      eyebrow="Crews"
      title={`크루 ${totalCount}`}
    >
      <SearchField onChange={onSearchChange} placeholder="크루명 또는 크루장 검색" value={search} />
      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}
      <section className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        {isLoading ? <LoadingRows /> : null}
        {!isLoading && crews.length === 0 ? (
          <EmptyPanel description="검색어를 바꾸거나 잠시 후 다시 확인해보세요." title="크루를 찾지 못했어요." />
        ) : null}
        {!isLoading && crews.length > 0 ? (
          <CrewTable crews={crews} memberCountByCrew={memberCountByCrew} profileById={profileById} />
        ) : null}
      </section>
    </AdminContent>
  );
}

function AdminContent({
  action,
  children,
  description,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-brand">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">{title}</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>
        </div>
        {action}
      </header>
      {children}
    </div>
  );
}

function MetricCard({ icon, label, note, value }: { icon: ReactNode; label: string; note: string; value: number }) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>
        <span className="grid size-9 place-items-center rounded-lg bg-brand-soft text-brand">{icon}</span>
      </div>
      <strong className="mt-4 block text-3xl font-semibold tabular-nums">{value.toLocaleString("ko-KR")}</strong>
      <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">{note}</span>
    </section>
  );
}

function DashboardSection({
  actionLabel,
  children,
  onAction,
  title,
}: {
  actionLabel?: string;
  children: ReactNode;
  onAction?: () => void;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">{title}</h3>
        {onAction && actionLabel ? (
          <button className="text-xs font-semibold text-brand hover:text-brand-hover" onClick={onAction} type="button">
            {actionLabel}
          </button>
        ) : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function CrewTable({
  crews,
  memberCountByCrew,
  profileById,
}: {
  crews: AdminCrew[];
  memberCountByCrew: Map<string, number>;
  profileById: Map<string, AdminPublicProfile>;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[680px] border-collapse text-left">
          <thead className="bg-[var(--color-surface-muted)] text-xs text-[var(--color-text-secondary)]">
            <tr>
              <th className="px-4 py-3 font-semibold">크루명</th>
              <th className="px-4 py-3 font-semibold">크루장</th>
              <th className="px-4 py-3 font-semibold">멤버</th>
              <th className="px-4 py-3 font-semibold">생성일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {crews.map((crew) => {
              const owner = profileById.get(crew.ownerId);
              return (
                <tr key={crew.id}>
                  <td className="max-w-64 truncate px-4 py-3 text-sm font-semibold">{crew.name}</td>
                  <td className="px-4 py-3 text-sm">{owner?.displayName ?? "확인되지 않음"}</td>
                  <td className="px-4 py-3 text-sm">{memberCountByCrew.get(crew.id) ?? 0}명</td>
                  <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{formatTimestamp(crew.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-[var(--color-border)] md:hidden">
        {crews.map((crew) => (
          <div className="p-4" key={crew.id}>
            <strong className="block truncate text-sm font-semibold">{crew.name}</strong>
            <p className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">
              크루장 {profileById.get(crew.ownerId)?.displayName ?? "확인되지 않음"}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[var(--color-text-secondary)]">
              <span>멤버 {memberCountByCrew.get(crew.id) ?? 0}명</span>
              <span>{formatTimestamp(crew.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ProfileIdentity({ profile }: { profile: AdminPublicProfile }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar alt={profile.displayName ?? "사용자"} className="size-9 shrink-0" src={profile.photoURL} />
      <strong className="min-w-0 truncate text-sm font-semibold">
        {profile.displayName || "이름 없음"}
      </strong>
    </div>
  );
}

function SearchField({
  onChange,
  placeholder,
  value,
}: {
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="relative block max-w-md">
      <span className="sr-only">검색</span>
      <MagnifyingGlass
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
        size={18}
        weight="regular"
      />
      <input
        className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] pl-10 pr-4 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-emerald-100"
        inputMode="search"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
    </label>
  );
}

function SystemRow({ label, muted = false, value }: { label: string; muted?: boolean; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-surface-muted)] px-3 py-3">
      <span className="text-sm">{label}</span>
      <span className={`flex items-center gap-1.5 text-xs font-semibold ${muted ? "text-[var(--color-text-secondary)]" : "text-emerald-600 dark:text-emerald-300"}`}>
        {!muted ? <CheckCircle size={15} weight="fill" /> : null}
        {value}
      </span>
    </div>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return <span className={`size-2 shrink-0 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />;
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
      active
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300"
        : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
    }`}>
      {active ? "게시 중" : "임시 저장"}
    </span>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return <p className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-400/10 dark:text-red-300">{message}</p>;
}

function LoadingRows() {
  return (
    <div aria-label="데이터를 불러오는 중" className="grid gap-2 p-1" role="status">
      {[0, 1, 2].map((index) => (
        <div className="h-12 animate-pulse rounded-lg bg-[var(--color-surface-muted)]" key={index} />
      ))}
    </div>
  );
}

function EmptyPanel({ description, title }: { description: string; title: string }) {
  return (
    <div className="grid place-items-center px-4 py-12 text-center">
      <Megaphone className="text-brand" size={28} weight="regular" />
      <strong className="mt-3 text-base">{title}</strong>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>
    </div>
  );
}

function formatTimestamp(timestamp: { toDate: () => Date } | null) {
  if (!timestamp) {
    return "날짜 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(timestamp.toDate());
}

function countRecent(timestamps: Array<{ toMillis: () => number } | null>) {
  const threshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return timestamps.filter((timestamp) => (timestamp?.toMillis() ?? 0) >= threshold).length;
}
