"use client";

import { useRouter } from "nextjs-toploader/app";
import { Flex, HStack, Text } from "@chakra-ui/react";

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
    <Flex direction={{ base: "column", sm: "row" }} align="center" justify="space-between" gap={3}>
      <Text fontSize="sm" color="fg.muted" textAlign="center">
        Trang {page}/{totalPages} — {total} kết quả
      </Text>
      <PaginationRoot
        page={page}
        pageSize={pageSize}
        count={total}
        siblingCount={1}
        onPageChange={(details) => router.push(buildHref(details.page))}
      >
        {/* Gộp cả cụm vào 1 pill có viền — tránh cảm giác các nút rời rạc
            trôi nổi. Danh sách số trang + về đầu/cuối dễ tràn dòng trên màn
            hình hẹp nên chỉ hiện từ sm trở lên; mobile thay bằng 1 ô "X / Y"
            gọn ở giữa Trước/Sau thay vì để 2 icon trơ trọi cách xa nhau. */}
        <HStack gap="2px" borderWidth="1px" rounded="l2" p="2px">
          <PaginationFirstTrigger display={{ base: "none", sm: "inline-flex" }} />
          <PaginationPrevTrigger />
          <HStack gap="2px" display={{ base: "none", sm: "flex" }}>
            <PaginationItems />
          </HStack>
          <Text
            display={{ base: "block", sm: "none" }}
            fontSize="sm"
            fontWeight="medium"
            minW="3.5rem"
            textAlign="center"
          >
            {page} / {totalPages}
          </Text>
          <PaginationNextTrigger />
          <PaginationLastTrigger display={{ base: "none", sm: "inline-flex" }} />
        </HStack>
      </PaginationRoot>
    </Flex>
  );
}
