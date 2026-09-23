import type { Timestamp } from "firebase/firestore";

export type ServiceNoticeStatus = "DRAFT" | "PUBLISHED";

export type ServiceNotice = {
  body: string;
  createdAt: Timestamp | null;
  createdBy: string;
  id: string;
  publishedAt: Timestamp | null;
  status: ServiceNoticeStatus;
  title: string;
  updatedAt: Timestamp | null;
};

export type ServiceNoticeDraft = Pick<ServiceNotice, "body" | "status" | "title">;
