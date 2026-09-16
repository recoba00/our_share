export const MAX_FAMILY_NAME_LENGTH = 8;

export function limitFamilyNameInput(name: string) {
  return Array.from(name).slice(0, MAX_FAMILY_NAME_LENGTH).join("");
}

export function truncateFamilyName(name: string, maxLength = MAX_FAMILY_NAME_LENGTH) {
  const normalizedName = name.trim();
  const characters = Array.from(normalizedName);

  return characters.length > maxLength
    ? `${characters.slice(0, maxLength).join("")}...`
    : normalizedName;
}
