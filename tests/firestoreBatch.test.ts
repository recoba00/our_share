import { describe, expect, it } from "vitest";
import {
  chunkFirestoreWrites,
  FIRESTORE_SAFE_BATCH_SIZE,
} from "../src/lib/firebase/firestoreBatch";

describe("chunkFirestoreWrites", () => {
  it("keeps every write below the safe Firestore batch size", () => {
    const items = Array.from({ length: FIRESTORE_SAFE_BATCH_SIZE * 2 + 1 }, (_, index) => index);
    const chunks = chunkFirestoreWrites(items);

    expect(chunks.map((chunk) => chunk.length)).toEqual([
      FIRESTORE_SAFE_BATCH_SIZE,
      FIRESTORE_SAFE_BATCH_SIZE,
      1,
    ]);
    expect(chunks.flat()).toEqual(items);
  });

  it("returns no batches for an empty write list", () => {
    expect(chunkFirestoreWrites([])).toEqual([]);
  });

  it("rejects invalid batch sizes", () => {
    expect(() => chunkFirestoreWrites([1], 0)).toThrow("배치 크기는 1 이상이어야 해요.");
  });
});
