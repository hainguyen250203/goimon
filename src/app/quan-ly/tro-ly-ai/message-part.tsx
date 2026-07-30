"use client";

import { Flex, Text } from "@chakra-ui/react";
import { CircleCheck } from "lucide-react";

import { AssistantChart } from "~/modules/assistant/ui/assistant-chart";
import { AssistantDiagram } from "~/modules/assistant/ui/assistant-diagram";
import type { ChartSpec } from "~/modules/assistant/infrastructure/tools/render-chart.tool";
import type { DiagramSpec } from "~/modules/assistant/infrastructure/tools/render-diagram.tool";
import type { StoredMessagePart } from "~/modules/assistant/infrastructure/build-message-parts";

/** 1 dòng tiến trình dạng "✓ + mô tả ngắn", giống cách Lensy hiện các bước đã
 * làm — KHÔNG bao giờ hiện tên bảng/cột/SQL cho người dùng cuối. */
function ToolProgressLine({ label }: { label: string }) {
  return (
    <Flex align="center" gap={2}>
      <CircleCheck size={14} color="var(--chakra-colors-fg-muted)" />
      <Text fontSize="sm" color="fg.muted">
        {label}
      </Text>
    </Flex>
  );
}

export function MessagePart({ part }: { part: StoredMessagePart }) {
  if (part.type === "text") {
    return (
      <Text fontSize="sm" whiteSpace="pre-wrap">
        {part.text}
      </Text>
    );
  }

  if (part.type === "tool-query_data") {
    const input = part.input as { purpose?: string } | undefined;
    return <ToolProgressLine label={input?.purpose || "Đã tra cứu dữ liệu"} />;
  }

  if (part.type === "tool-render_chart") {
    return <AssistantChart spec={part.output as ChartSpec} />;
  }

  if (part.type === "tool-render_diagram") {
    return <AssistantDiagram spec={part.output as DiagramSpec} />;
  }

  return null;
}
