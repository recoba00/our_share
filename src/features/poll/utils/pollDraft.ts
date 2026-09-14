export function getNormalizedPollOptions(options: string[]) {
  return options.map((option) => option.trim()).filter(Boolean);
}

export function hasDuplicatePollOptions(options: string[]) {
  const normalizedOptions = getNormalizedPollOptions(options);

  return new Set(normalizedOptions).size !== normalizedOptions.length;
}
