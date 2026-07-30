import type { AssistantSession } from "../domain/assistant-session.entity";
import type { AssistantRepository } from "../domain/assistant.repository";

export type RenameSessionParams = {
  id: number;
  userId: string;
  title: string;
};

export async function renameSession(
  repository: AssistantRepository,
  { id, userId, title }: RenameSessionParams,
): Promise<AssistantSession> {
  return repository.renameSession(id, userId, title);
}
