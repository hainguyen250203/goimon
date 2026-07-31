"use client";

import { Flex, Spinner, Text } from "@chakra-ui/react";
import { CircleCheck, XCircle } from "lucide-react";
import { getToolName, isToolUIPart, type DynamicToolUIPart, type ToolUIPart, type UIMessage, type UITools } from "ai";

import { AssistantChart } from "~/modules/assistant/ui/assistant-chart";
import { AssistantDiagram } from "~/modules/assistant/ui/assistant-diagram";
import type { ChartSpec } from "~/modules/assistant/infrastructure/tools/render-chart.tool";
import type { DiagramSpec } from "~/modules/assistant/infrastructure/tools/render-diagram.tool";
import { AssistantMarkdown } from "./assistant-markdown";

export type AssistantMessagePart = UIMessage["parts"][number];
export type AssistantMessageRole = UIMessage["role"];

// Tool của app này đều "static" (khai báo cố định trong assistantTools(),
// không dùng dynamicTool()) nên thực tế không bao giờ là DynamicToolUIPart —
// nhưng isToolUIPart() của SDK khai báo trả về cả 2 khả năng, phải nhận đủ
// union để khớp type guard thay vì ép kiểu.
type AnyToolPart = ToolUIPart<UITools> | DynamicToolUIPart;

/** 1 dòng tiến trình dạng "icon + mô tả ngắn", đổi icon theo state THẬT của
 * tool call (spinner đang chạy / check đã xong / X lỗi) — KHÔNG bao giờ hiện
 * tên bảng/cột/SQL cho người dùng cuối. */
function toolChipLabel(part: AnyToolPart): string {
  const input =
    "input" in part && part.input && typeof part.input === "object" && "purpose" in part.input
      ? String((part.input as { purpose?: unknown }).purpose ?? "").trim()
      : "";
  if (input) return input;
  const name = getToolName(part);
  if (name === "render_chart") return "Đang vẽ biểu đồ";
  if (name === "render_diagram") return "Đang vẽ sơ đồ";
  return "Đang truy vấn dữ liệu";
}

function ToolProgressLine({ part }: { part: AnyToolPart }) {
  const running = part.state === "input-streaming" || part.state === "input-available";
  const failed = part.state === "output-error";

  return (
    <Flex align="center" gap={2}>
      {running ? (
        <Spinner size="xs" />
      ) : failed ? (
        <XCircle size={14} color="var(--chakra-colors-fg-error)" />
      ) : (
        <CircleCheck size={14} color="var(--chakra-colors-fg-muted)" />
      )}
      <Text fontSize="sm" color="fg.muted">
        {toolChipLabel(part)}
      </Text>
    </Flex>
  );
}

export function MessagePart({
  part,
  role,
}: {
  part: AssistantMessagePart;
  role: AssistantMessageRole;
}) {
  if (part.type === "text") {
    // Chỉ render markdown cho tin nhắn CỦA TRỢ LÝ — tin nhắn người dùng tự gõ
    // là văn bản thô, không nên tự diễn giải "**"/"#" thành định dạng.
    if (role === "assistant") {
      return <AssistantMarkdown text={part.text} />;
    }
    return (
      <Text fontSize="sm" whiteSpace="pre-wrap">
        {part.text}
      </Text>
    );
  }

  if (isToolUIPart(part)) {
    const name = getToolName(part);
    if (name === "render_chart" && part.state === "output-available") {
      return <AssistantChart spec={part.output as ChartSpec} />;
    }
    if (name === "render_diagram" && part.state === "output-available") {
      return <AssistantDiagram spec={part.output as DiagramSpec} />;
    }
    return <ToolProgressLine part={part} />;
  }

  return null;
}
