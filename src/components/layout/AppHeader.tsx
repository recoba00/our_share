import { GearSix, UsersThree } from "@phosphor-icons/react";
import { IconButton } from "../common/IconButton";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-background)_88%,transparent)] px-4 py-3 backdrop-blur sm:px-6 lg:static lg:px-0">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-brand">
            <UsersThree size={22} weight="fill" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
              우리 가족
            </p>
            <h1 className="text-lg font-bold leading-6">스마트 홈</h1>
          </div>
        </div>
        <IconButton label="설정">
          <GearSix size={22} />
        </IconButton>
      </div>
    </header>
  );
}
