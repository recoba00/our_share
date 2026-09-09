export type MemoType = "PUBLIC" | "SENSITIVE";

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
  createdAt: unknown;
  updatedAt: unknown;
};
