import { WarningCircle } from "@phosphor-icons/react";
import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from "react";
import { Button } from "./Button";
import { Card } from "./Card";

const appHomePath = import.meta.env.BASE_URL;

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<
  PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App render error", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.assign(appHomePath);
  };

  render(): ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="min-h-dvh bg-[var(--color-background)] px-4 py-10 text-[var(--color-text-primary)]">
        <Card className="mx-auto max-w-xl">
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-red-50 p-3 text-red-600">
              <WarningCircle size={28} weight="bold" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-black">화면을 불러오지 못했습니다</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                일시적인 화면 오류가 발생했습니다. 새로고침 후에도 반복되면
                현재 화면과 로그인/가족 상태를 확인해주세요.
              </p>
            </div>
          </div>

          <pre className="mt-5 max-h-40 overflow-auto rounded-xl bg-[var(--color-surface-muted)] p-3 text-xs font-semibold text-[var(--color-text-secondary)]">
            {this.state.error.message}
          </pre>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button onClick={this.handleReload}>새로고침</Button>
            <Button onClick={this.handleGoHome} variant="secondary">
              홈으로 이동
            </Button>
          </div>
        </Card>
      </main>
    );
  }
}
