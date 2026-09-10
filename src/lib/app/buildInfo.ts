export const buildInfo = {
  commit: import.meta.env.VITE_BUILD_COMMIT || "local",
  time: import.meta.env.VITE_BUILD_TIME || "local",
};

export function getShortCommit(commit: string) {
  if (commit === "local") {
    return commit;
  }

  return commit.slice(0, 7);
}
