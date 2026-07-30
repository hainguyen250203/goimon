import type { AssistantSession } from "../domain/assistant-session.entity";
import type { AssistantRepository, CreateSessionParams } from "../domain/assistant.repository";

export async function createSession(
  repository: AssistantRepository,
  params: CreateSessionParams,
): Promise<AssistantSession> {
  return repository.createSession(params);
}
