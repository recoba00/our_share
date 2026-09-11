export type MemoType = "PUBLIC" | "SENSITIVE";
export type MemoVisibility = "FAMILY" | "PRIVATE";

export type Memo = {
  id: string;
  familyId: string;
  title: string;
  content: string | null;
  encryptedContent: string | null;
  encryptionIv: string | null;
  encryptionSalt: string | null;
  type: MemoType;
  createdBy: string;
  visibleTo: string[];
  visibility: MemoVisibility;
  createdAt: unknown;
  updatedAt: unknown;
};
