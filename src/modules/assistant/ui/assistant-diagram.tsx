"use client";

import { Box, Text } from "@chakra-ui/react";

import type { DiagramSpec } from "../infrastructure/tools/render-diagram.tool";

const NODE_W = 140;
const NODE_H = 44;
const COL_GAP = 60;
const ROW_GAP = 24;

/** Sắp lớp node bằng BFS từ các node không có cạnh vào (longest-path layering đơn giản). */
function computeLayers(spec: DiagramSpec): Map<string, number> {
  const nodeIds = new Set(spec.nodes.map((n) => n.id));
  const incoming = new Map<string, number>();
  for (const id of nodeIds) incoming.set(id, 0);
  for (const e of spec.edges) {
    if (nodeIds.has(e.to)) incoming.set(e.to, (incoming.get(e.to) ?? 0) + 1);
  }

  const layer = new Map<string, number>();
  const queue: string[] = [];
  for (const id of nodeIds) {
    if ((incoming.get(id) ?? 0) === 0) {
      layer.set(id, 0);
      queue.push(id);
    }
  }
  // Node không có "gốc" rõ ràng (đồ thị có chu trình) — vẫn xếp layer 0 để không bị bỏ sót.
  for (const id of nodeIds) {
    if (!layer.has(id)) {
      layer.set(id, 0);
      queue.push(id);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLayer = layer.get(current) ?? 0;
    for (const e of spec.edges) {
      if (e.from === current && nodeIds.has(e.to)) {
        const nextLayer = Math.max(layer.get(e.to) ?? 0, currentLayer + 1);
        if (nextLayer !== layer.get(e.to)) {
          layer.set(e.to, nextLayer);
          queue.push(e.to);
        }
      }
    }
  }

  return layer;
}

export function AssistantDiagram({ spec }: { spec: DiagramSpec }) {
  const layers = computeLayers(spec);
  const byLayer = new Map<number, string[]>();
  for (const node of spec.nodes) {
    const l = layers.get(node.id) ?? 0;
    byLayer.set(l, [...(byLayer.get(l) ?? []), node.id]);
  }

  const positions = new Map<string, { x: number; y: number }>();
  const maxRows = Math.max(...Array.from(byLayer.values()).map((ids) => ids.length), 1);
  for (const [colIndex, ids] of Array.from(byLayer.entries()).sort((a, b) => a[0] - b[0])) {
    ids.forEach((id, rowIndex) => {
      const rowOffset = (maxRows - ids.length) / 2;
      positions.set(id, {
        x: colIndex * (NODE_W + COL_GAP),
        y: (rowIndex + rowOffset) * (NODE_H + ROW_GAP),
      });
    });
  }

  const width = (byLayer.size || 1) * (NODE_W + COL_GAP) - COL_GAP + 4;
  const height = maxRows * (NODE_H + ROW_GAP) - ROW_GAP + 4;

  const nodeById = new Map(spec.nodes.map((n) => [n.id, n]));

  return (
    <Box rounded="l3" borderWidth="1px" p={4} overflowX="auto">
      <Text fontSize="sm" fontWeight="medium" mb={3}>
        {spec.title}
      </Text>
      <Box position="relative" w={`${width}px`} h={`${height}px`} minW="full">
        <svg
          width={width}
          height={height}
          style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}
        >
          <defs>
            <marker
              id="assistant-diagram-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--chakra-colors-fg-muted)" />
            </marker>
          </defs>
          {spec.edges.map((edge, i) => {
            const from = positions.get(edge.from);
            const to = positions.get(edge.to);
            if (!from || !to) return null;
            const x1 = from.x + NODE_W;
            const y1 = from.y + NODE_H / 2;
            const x2 = to.x;
            const y2 = to.y + NODE_H / 2;
            const midX = (x1 + x2) / 2;
            return (
              <g key={i}>
                <path
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="var(--chakra-colors-border)"
                  strokeWidth={1.5}
                  markerEnd="url(#assistant-diagram-arrow)"
                />
                {edge.label && (
                  <text
                    x={midX}
                    y={(y1 + y2) / 2 - 6}
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--chakra-colors-fg-muted)"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {spec.nodes.map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;
          return (
            <Box
              key={node.id}
              position="absolute"
              left={`${pos.x}px`}
              top={`${pos.y}px`}
              w={`${NODE_W}px`}
              h={`${NODE_H}px`}
              rounded="l2"
              borderWidth="1px"
              bg="bg.panel"
              display="flex"
              alignItems="center"
              justifyContent="center"
              px={2}
              textAlign="center"
            >
              <Text fontSize="xs" fontWeight="medium" lineClamp={2}>
                {nodeById.get(node.id)?.label ?? node.id}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
