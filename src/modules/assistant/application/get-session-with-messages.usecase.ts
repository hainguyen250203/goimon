import { AssistantSessionNotFoundError } from "../domain/assistant.errors";
import type { AssistantRepository } from "../domain/assistant.repository";
import type { AssistantSession } from "../domain/assistant-session.entity";
import type { AssistantMessage } from "../domain/assistant-message.entity";

export type GetSessionWithMessagesParams = {
  id: number;
  userId: string;
};

export type GetSessionWithMessagesResult = {
  session: AssistantSession;
  messages: AssistantMessage[];
};

export async function getSessionWithMessages(
  repository: AssistantRepository,
  { id, userId }: GetSessionWithMessagesParams,
): Promise<GetSessionWithMessagesResult> {
  const session = await repository.findSessionById(id, userId);
  if (!session) throw new AssistantSessionNotFoundError();
  const messages = await repository.listMessages(id);
  return { session, messages };
}
