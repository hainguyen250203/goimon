"use client";

import { useRouter } from "next/navigation";
import { Flex, Text } from "@chakra-ui/react";

import {
  PaginationFirstTrigger,
  PaginationItems,
  PaginationLastTrigger,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "~/components/ui/pagination";

/**
 * Pagination dạng "<< < 1 2 ... 5 > >>", điều hướng client-side (router.push)
 * thay vì href thô — tránh full page reload/nháy trắng màn hình khi đổi
 * trang. Dùng Chakra Pagination (đã có sẵn windowing + ellipsis logic).
 */
export function ListViewPagination({
  page,
  pageSize,
  total,
  buildHref,
}: {
  page: number;
  pageSize: number;
  total: number;
  buildHref: (page: number) => string;
}) {
  const router = useRouter();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <Flex align="center" justify="space-between">
      <Text fontSize="sm" color="fg.muted">
        Trang {page}/{totalPages} — {total} kết quả
      </Text>
      <PaginationRoot
        page={page}
        pageSize={pageSize}
        count={total}
        siblingCount={1}
        onPageChange={(details) => router.push(buildHref(details.page))}
      >
        <Flex gap={1}>
          <PaginationFirstTrigger />
          <PaginationPrevTrigger />
          <PaginationItems />
          <PaginationNextTrigger />
          <PaginationLastTrigger />
        </Flex>
      </PaginationRoot>
    </Flex>
  );
}
