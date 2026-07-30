import type { StepResult, ToolSet } from "ai";

/**
 * Dựng lại mảng "UI message parts" từ `result.steps` (có sau khi
 * `streamText`'s stream đã tiêu thụ xong) để LƯU DB — client nhận parts trực
 * tiếp qua UI message stream lúc đang chạy (xem send-message.usecase.ts),
 * hàm này chỉ phục vụ việc load lại lịch sử đúng thứ tự đã diễn ra.
 */
export type StoredMessagePart =
  | { type: "text"; text: string }
  | {
      type: `tool-${string}`;
      state: "output-available";
      toolCallId: string;
      input: unknown;
      output: unknown;
    };

export function buildMessageParts(steps: StepResult<ToolSet>[]): StoredMessagePart[] {
  const parts: StoredMessagePart[] = [];

  for (const step of steps) {
    for (const call of step.toolCalls) {
      const result = step.toolResults.find((r) => r.toolCallId === call.toolCallId);
      parts.push({
        type: `tool-${call.toolName}`,
        state: "output-available",
        toolCallId: call.toolCallId,
        input: call.input,
        output: result?.output,
      });
    }
    if (step.text) {
      parts.push({ type: "text", text: step.text });
    }
  }

  return parts;
}
