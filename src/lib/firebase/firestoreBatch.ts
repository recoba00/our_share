export const FIRESTORE_SAFE_BATCH_SIZE = 450;

export function chunkFirestoreWrites<T>(items: T[], size = FIRESTORE_SAFE_BATCH_SIZE) {
  if (size <= 0) {
    throw new Error("배치 크기는 1 이상이어야 해요.");
  }

  const chunks: T[][] = [];

  for (let offset = 0; offset < items.length; offset += size) {
    chunks.push(items.slice(offset, offset + size));
  }

  return chunks;
}
