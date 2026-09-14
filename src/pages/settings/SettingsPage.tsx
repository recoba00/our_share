import { Card } from "../../components/common/Card";

export function SettingsPage() {
  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <Card>
        <h2 className="text-2xl font-semibold">설정</h2>
        <div className="mt-5 grid gap-3">
          <SettingRow label="프로필 이미지" value="Google photoURL 또는 직접 입력 URL 사용" />
          <SettingRow label="파일 업로드" value="MVP에서는 Firebase Storage 보류" />
          <SettingRow label="알림" value="브라우저 알림 기반 MVP" />
          <SettingRow label="호스팅" value="Firebase Hosting 자동배포 사용" />
        </div>
      </Card>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
      <strong className="block text-sm">{label}</strong>
      <span className="mt-1 block text-sm text-[var(--color-text-secondary)]">
        {value}
      </span>
    </div>
  );
}
