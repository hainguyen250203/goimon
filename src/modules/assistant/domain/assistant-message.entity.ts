export type AssistantMessageRole = "user" | "assistant";

export type AssistantMessageUsage = {
  inputTokens: number;
  outputTokens: number;
};

/**
 * `parts` lưu nguyên mảng "UI message parts" (text / tool-call / tool-result)
 * theo hình dạng của Vercel AI SDK — để nạp lại lịch sử vào `useChat` mà
 * không cần lớp chuyển đổi nào khác giữa "lưu" và "hiển thị".
 */
export type AssistantMessage = {
  id: number;
  sessionId: number;
  role: AssistantMessageRole;
  parts: unknown[];
  usage: AssistantMessageUsage | null;
  model: string | null;
  createdAt: Date;
};
