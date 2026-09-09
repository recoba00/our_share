export type PollType = "GENERAL" | "DATE";

export type Poll = {
  id: string;
  familyId: string;
  chatRoomId: string | null;
  title: string;
  description: string;
  type: PollType;
  options: string[];
  multipleChoice: boolean;
  anonymous: boolean;
  closesAt: string | null;
  resultVisibility: "ALWAYS" | "AFTER_VOTE" | "AFTER_CLOSE";
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
};

export type PollVote = {
  pollId: string;
  userId: string;
  selectedOptions: string[];
  createdAt: unknown;
  updatedAt: unknown;
};
