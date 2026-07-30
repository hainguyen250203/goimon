import type { AssistantSession } from "../domain/assistant-session.entity";
import type { AssistantMessage, AssistantMessageRole } from "../domain/assistant-message.entity";

export function toSessionEntity(row: {
  id: number;
  userId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): AssistantSession {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export function toMessageEntity(row: {
  id: number;
  sessionId: number;
  role: AssistantMessageRole;
  contentJson: unknown;
  usageJson: unknown;
  model: string | null;
  createdAt: Date;
}): AssistantMessage {
  return {
    id: row.id,
    sessionId: row.sessionId,
    role: row.role,
    parts: Array.isArray(row.contentJson) ? row.contentJson : [],
    usage: (row.usageJson ?? null) as AssistantMessage["usage"],
    model: row.model,
    createdAt: row.createdAt,
  };
}
