import type { AssistantRepository } from "../domain/assistant.repository";

export type DeleteSessionParams = {
  id: number;
  userId: string;
};

export async function deleteSession(
  repository: AssistantRepository,
  { id, userId }: DeleteSessionParams,
): Promise<void> {
  return repository.softDeleteSession(id, userId);
}
