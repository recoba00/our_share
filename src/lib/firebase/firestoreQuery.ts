export const FIRESTORE_IN_QUERY_LIMIT = 30;

export function chunkFirestoreInValues<T>(values: T[]) {
  const uniqueValues = [...new Set(values)];
  const chunks: T[][] = [];

  for (let offset = 0; offset < uniqueValues.length; offset += FIRESTORE_IN_QUERY_LIMIT) {
    chunks.push(uniqueValues.slice(offset, offset + FIRESTORE_IN_QUERY_LIMIT));
  }

  return chunks;
}
