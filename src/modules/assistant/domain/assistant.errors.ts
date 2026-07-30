export class AssistantSessionNotFoundError extends Error {
  constructor() {
    super("Không tìm thấy phiên trò chuyện.");
    this.name = "AssistantSessionNotFoundError";
  }
}
