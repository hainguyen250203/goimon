import type {
  AssistantRepository,
  ListSessionsParams,
  ListSessionsResult,
} from "../domain/assistant.repository";

export async function listSessions(
  repository: AssistantRepository,
  params: ListSessionsParams,
): Promise<ListSessionsResult> {
  return repository.listSessions(params);
}
