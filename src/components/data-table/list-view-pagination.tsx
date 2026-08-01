"use client";

import { useRouter } from "nextjs-toploader/app";
import { Box, Flex, HStack, Text } from "@chakra-ui/react";

import {
  PaginationEllipsis,
  PaginationItem,
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "~/components/ui/pagination";
import { FilterSelect } from "./filter-select";
import { PAGE_SIZE_OPTIONS } from "~/lib/pagination";

/**
 * 1 hàng — text + (select + cụm nút) gộp thành 1 khối bên phải. `wrap="wrap"`
 * chỉ áp cho khối lớn (text | khối phải) nên nếu có lúc không đủ chỗ, nó chỉ
 * xuống dòng ở ĐÚNG 1 điểm an toàn này (cả khối phải trôi xuống dòng dưới),
 * không bao giờ vỡ dòng NGAY GIỮA cụm nút phân trang (từng thử và rất xấu).
 * `siblingCount={0}` để cụm nút luôn gọn (vd "1 2 ... 10" thay vì
 * "1 2 3 4 5 ... 10"), hiếm khi cần tới `overflowX="auto"` (chỉ còn là lưới
 * an toàn cho trường hợp cực đoan: rất nhiều trang trên màn hình cực hẹp).
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
  buildHref: (params: { page: number; pageSize?: number }) => string;
}) {
  const router = useRouter();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Flex align="center" justify="space-between" gap={2} wrap="wrap">
      <Text fontSize="sm" color="fg.muted" whiteSpace="nowrap">
        {page}/{totalPages} - {total}
      </Text>

      <Flex align="center" gap={2}>
        <FilterSelect
          size="sm"
          width="3.5rem"
          value={String(pageSize)}
          onValueChange={(value) => router.push(buildHref({ page: 1, pageSize: Number(value) }))}
          options={PAGE_SIZE_OPTIONS.map((size) => ({ value: String(size), label: String(size) }))}
        />

        {totalPages > 1 && (
          <Box overflowX="auto">
            <PaginationRoot
              page={page}
              pageSize={pageSize}
              count={total}
              siblingCount={0}
              onPageChange={(details) => router.push(buildHref({ page: details.page }))}
            >
              {/* Không bọc border quanh cụm nút — chỉ còn khoảng cách nhỏ
                  giữa các nút. Mobile cố định "1 2 ... trang cuối" (không
                  đổi theo trang hiện tại đang đứng — Prev/Next lo phần bước
                  qua các trang giữa), sm+ vẫn dùng PaginationItems (danh
                  sách theo boundary+sibling của zag, đã đủ gọn). */}
              <HStack gap="2px">
                <PaginationPrevTrigger />
                <HStack gap="2px" display={{ base: "flex", sm: "none" }}>
                  {totalPages <= 3 ? (
                    Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <PaginationItem key={p} type="page" value={p} />
                    ))
                  ) : (
                    <>
                      <PaginationItem type="page" value={1} />
                      <PaginationItem type="page" value={2} />
                      <PaginationEllipsis index={0} />
                      <PaginationItem type="page" value={totalPages} />
                    </>
                  )}
                </HStack>
                <HStack gap="2px" display={{ base: "none", sm: "flex" }}>
                  <PaginationItems />
                </HStack>
                <PaginationNextTrigger />
              </HStack>
            </PaginationRoot>
          </Box>
        )}
      </Flex>
    </Flex>
  );
}
