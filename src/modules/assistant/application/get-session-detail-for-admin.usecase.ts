import type {
  AssistantRepository,
  SessionDetailForAdmin,
} from "../domain/assistant.repository";

export function getSessionDetailForAdmin(
  repository: AssistantRepository,
  id: number,
): Promise<SessionDetailForAdmin | null> {
  return repository.getSessionDetailForAdmin(id);
}
