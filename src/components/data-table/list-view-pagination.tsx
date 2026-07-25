"use client";

import type { MouseEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "~/components/ui/pagination";

type PageEntry = number | "ellipsis";

/** Cửa sổ trang hiển thị: luôn có trang đầu/cuối, 1 trang lân cận mỗi bên
 * trang hiện tại, chèn "..." khi có khoảng trống — dạng "1 2 ... 5". */
function buildPageEntries(page: number, totalPages: number): PageEntry[] {
  const neighbors = 1;
  const middle: number[] = [];
  for (
    let i = Math.max(2, page - neighbors);
    i <= Math.min(totalPages - 1, page + neighbors);
    i++
  ) {
    middle.push(i);
  }

  const entries: PageEntry[] = [1];
  if (middle[0] !== undefined && middle[0] > 2) entries.push("ellipsis");
  entries.push(...middle);
  const last = middle[middle.length - 1];
  if (last !== undefined && last < totalPages - 1) entries.push("ellipsis");
  if (totalPages > 1) entries.push(totalPages);
  return entries;
}

/**
 * Pagination dạng link (href="?page=..."), giữ nguyên tinh thần server-driven
 * + URL-shareable của alix-bo-frontend-v2 — chỉ khác là data phía sau được
 * nạp qua tRPC + TanStack Query (server prefetch + client useQuery) thay vì
 * RSC fetch thuần, theo đúng CLAUDE.md.
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

  const entries = buildPageEntries(page, totalPages);

  // Điều hướng client-side (router.push) thay vì để trình duyệt tải lại
  // toàn trang qua thẻ <a href> thô — tránh nháy trắng màn hình khi đổi
  // trang. Vẫn giữ href thật trên <a> để hỗ trợ mở tab mới/giữa chuột.
  const navigate = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    router.push(href);
  };

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Trang {page}/{totalPages} — {total} kết quả
      </p>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationLink
              href={buildHref(1)}
              onClick={navigate(buildHref(1))}
              aria-label="Về trang đầu"
              aria-disabled={page <= 1}
              className={page <= 1 ? "pointer-events-none opacity-50" : ""}
            >
              <ChevronsLeft />
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink
              href={buildHref(Math.max(1, page - 1))}
              onClick={navigate(buildHref(Math.max(1, page - 1)))}
              aria-label="Trang trước"
              aria-disabled={page <= 1}
              className={page <= 1 ? "pointer-events-none opacity-50" : ""}
            >
              <ChevronLeft />
            </PaginationLink>
          </PaginationItem>

          {entries.map((entry, i) =>
            entry === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={entry}>
                <PaginationLink
                  href={buildHref(entry)}
                  onClick={navigate(buildHref(entry))}
                  isActive={entry === page}
                >
                  {entry}
                </PaginationLink>
              </PaginationItem>
            ),
          )}

          <PaginationItem>
            <PaginationLink
              href={buildHref(Math.min(totalPages, page + 1))}
              onClick={navigate(buildHref(Math.min(totalPages, page + 1)))}
              aria-label="Trang sau"
              aria-disabled={page >= totalPages}
              className={
                page >= totalPages ? "pointer-events-none opacity-50" : ""
              }
            >
              <ChevronRight />
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink
              href={buildHref(totalPages)}
              onClick={navigate(buildHref(totalPages))}
              aria-label="Về trang cuối"
              aria-disabled={page >= totalPages}
              className={
                page >= totalPages ? "pointer-events-none opacity-50" : ""
              }
            >
              <ChevronsRight />
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
