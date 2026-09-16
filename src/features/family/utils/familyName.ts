export function truncateFamilyName(name: string, maxLength = 8) {
  const normalizedName = name.trim();
  const characters = Array.from(normalizedName);

  return characters.length > maxLength
    ? `${characters.slice(0, maxLength).join("")}...`
    : normalizedName;
}
