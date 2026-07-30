"use client";

import { Badge, Flex, Heading, Stack, Text } from "@chakra-ui/react";

import { ListViewTable, type ListViewColumn } from "~/components/data-table/list-view-table";
import { api } from "~/trpc/react";
import type { UsageSummaryItem } from "~/modules/assistant/application/get-usage-summary.usecase";

export function UsageSummaryTable() {
  const { data, isFetching } = api.assistant.getUsageSummary.useQuery();
  const items = data ?? [];
  const totalCost = items.reduce((sum, item) => sum + item.estimatedCostUsd, 0);

  const columns: ListViewColumn<UsageSummaryItem>[] = [
    {
      key: "title",
      header: "Phiên trò chuyện",
      cell: (row) => (
        <Flex align="center" gap={2}>
          <Text lineClamp={1} color={row.deletedAt ? "fg.muted" : undefined}>
            {row.title || "Chưa đặt tên"}
          </Text>
          {row.deletedAt && (
            <Badge colorPalette="red" variant="solid" rounded="full" size="sm" flexShrink={0}>
              Đã xoá
            </Badge>
          )}
        </Flex>
      ),
    },
    { key: "messageCount", header: "Số lượt trả lời", cell: (row) => row.messageCount, textAlign: "right" },
    { key: "inputTokens", header: "Input tokens", cell: (row) => row.inputTokens.toLocaleString("vi-VN"), textAlign: "right" },
    { key: "outputTokens", header: "Output tokens", cell: (row) => row.outputTokens.toLocaleString("vi-VN"), textAlign: "right" },
    {
      key: "cost",
      header: "Chi phí ước tính",
      cell: (row) => `$${row.estimatedCostUsd.toFixed(4)}`,
      textAlign: "right",
    },
  ];

  return (
    <Stack gap={4}>
      <Stack gap={1}>
        <Heading size="md">Chi phí trợ lý AI</Heading>
        <Text fontSize="sm" color="fg.muted">
          Ước tính theo giá gpt-4.1 — tổng: ${totalCost.toFixed(4)}
        </Text>
      </Stack>
      <ListViewTable
        columns={columns}
        data={items}
        rowKey={(row) => row.sessionId}
        isLoading={isFetching}
        emptyMessage="Chưa có dữ liệu sử dụng."
      />
    </Stack>
  );
}
