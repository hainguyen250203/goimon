"use client";

import NextLink from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { keepPreviousData } from "@tanstack/react-query";
import { Badge, Flex, IconButton, Stack, Text } from "@chakra-ui/react";
import { Eye } from "lucide-react";

import { ListViewTable, type ListViewColumn } from "~/components/data-table/list-view-table";
import { ListViewPagination } from "~/components/data-table/list-view-pagination";
import { ListViewToolbar } from "~/components/data-table/list-view-toolbar";
import { api } from "~/trpc/react";
import { formatDateTime } from "~/lib/format-order";
import type { SessionHistoryItem } from "~/modules/assistant/application/list-all-sessions.usecase";
import { UserFilterCombobox } from "./user-filter-combobox";

const columns: ListViewColumn<SessionHistoryItem>[] = [
  { key: "id", header: "ID", cell: (row) => row.id, width: "4rem" },
  { key: "ownerName", header: "Chủ sở hữu", cell: (row) => row.ownerName },
  {
    key: "title",
    header: "Tiêu đề",
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
  {
    key: "messageCount",
    header: "Số tin nhắn",
    cell: (row) => row.messageCount,
    textAlign: "right",
    width: "8rem",
  },
  {
    key: "inputTokens",
    header: "Input tokens",
    cell: (row) => row.inputTokens.toLocaleString("vi-VN"),
    textAlign: "right",
  },
  {
    key: "outputTokens",
    header: "Output tokens",
    cell: (row) => row.outputTokens.toLocaleString("vi-VN"),
    textAlign: "right",
  },
  {
    key: "estimatedCostUsd",
    header: "Chi phí ước tính",
    cell: (row) => `$${row.estimatedCostUsd.toFixed(4)}`,
    textAlign: "right",
  },
  {
    key: "updatedAt",
    header: "Cập nhật lúc",
    cell: (row) => formatDateTime(row.updatedAt),
  },
  {
    key: "actions",
    header: "",
    width: "3rem",
    cell: (row) => (
      <IconButton asChild variant="ghost" size="sm" aria-label="Xem chi tiết">
        <NextLink href={`/quan-ly/tro-ly-ai/lich-su/${row.id}`}>
          <Eye size={16} />
        </NextLink>
      </IconButton>
    ),
  },
];

/** Lịch sử phiên chat AI của MỌI user — trang giám sát superadmin, khác
 * /quan-ly/tro-ly-ai (chỉ chat của chính người đang đăng nhập). */
export function SessionHistoryList({
  page,
  pageSize,
  userId,
}: {
  page: number;
  pageSize: number;
  userId?: string;
}) {
  const router = useRouter();
  const { data, isFetching } = api.assistant.listAllSessions.useQuery(
    { page, pageSize, userId },
    { placeholderData: keepPreviousData },
  );
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const buildHref = (params: { page?: number; pageSize?: number; userId?: string }) => {
    const search = new URLSearchParams();
    const nextUserId = "userId" in params ? params.userId : userId;
    if (nextUserId) search.set("userId", nextUserId);
    search.set("pageSize", String(params.pageSize ?? pageSize));
    search.set("page", String(params.page ?? page));
    return `/quan-ly/tro-ly-ai/lich-su?${search.toString()}`;
  };

  return (
    <Stack gap={4}>
      <ListViewToolbar>
        <UserFilterCombobox
          value={userId ?? ""}
          onValueChange={(nextUserId) =>
            router.push(buildHref({ page: 1, userId: nextUserId || undefined }))
          }
        />
      </ListViewToolbar>

      <ListViewTable
        columns={columns}
        data={items}
        rowKey={(row) => row.id}
        isLoading={isFetching}
        emptyMessage="Chưa có phiên trò chuyện nào."
      />
      <ListViewPagination page={page} pageSize={pageSize} total={total} buildHref={buildHref} />
    </Stack>
  );
}
