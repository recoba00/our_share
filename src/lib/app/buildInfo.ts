export const buildInfo = {
  commit: import.meta.env.VITE_BUILD_COMMIT || "local",
  time: import.meta.env.VITE_BUILD_TIME || "local",
  version: import.meta.env.VITE_APP_VERSION || "0.1.0",
};

export function getShortCommit(commit: string) {
  if (commit === "local") {
    return commit;
  }

  return commit.slice(0, 7);
}
