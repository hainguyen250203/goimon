import type { StepResult, ToolSet } from "ai";

/**
 * Vì không dùng streaming (`generateText` thay vì `streamText`), không có sẵn
 * "UIMessage parts" như trước — tự dựng lại từ `result.steps` để lưu DB và
 * render UI theo đúng thứ tự đã diễn ra (tool call nào, rồi tới đoạn text nào).
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
