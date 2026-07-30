export type AssistantSession = {
  id: number;
  userId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};
