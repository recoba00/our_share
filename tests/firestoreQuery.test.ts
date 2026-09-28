import { describe, expect, it } from "vitest";
import {
  chunkFirestoreInValues,
  FIRESTORE_IN_QUERY_LIMIT,
} from "../src/lib/firebase/firestoreQuery";

describe("chunkFirestoreInValues", () => {
  it("keeps every in-query within the Firestore value limit", () => {
    const values = Array.from(
      { length: FIRESTORE_IN_QUERY_LIMIT * 2 + 1 },
      (_, index) => `poll-${index}`
    );
    const chunks = chunkFirestoreInValues(values);

    expect(chunks.map((chunk) => chunk.length)).toEqual([
      FIRESTORE_IN_QUERY_LIMIT,
      FIRESTORE_IN_QUERY_LIMIT,
      1,
    ]);
    expect(chunks.flat()).toEqual(values);
  });

  it("removes duplicate query values before chunking", () => {
    expect(chunkFirestoreInValues(["a", "b", "a", "c"])).toEqual([["a", "b", "c"]]);
  });

  it("returns no queries for an empty value list", () => {
    expect(chunkFirestoreInValues([])).toEqual([]);
  });
});
