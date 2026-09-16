import type { PropsWithChildren, ReactNode } from "react";

type DesktopWorkspaceProps = PropsWithChildren<{
  sidebar: ReactNode;
  sidebarClassName?: string;
  contentClassName?: string;
}>;

export function DesktopWorkspace({
  children,
  contentClassName = "",
  sidebar,
  sidebarClassName = "",
}: DesktopWorkspaceProps) {
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start lg:gap-5">
      <aside
        className={`min-w-0 self-start overscroll-contain lg:max-h-[calc(100dvh-112px)] lg:overflow-y-auto ${sidebarClassName}`}
      >
        {sidebar}
      </aside>
      <div className={`min-w-0 ${contentClassName}`}>{children}</div>
    </div>
  );
}
