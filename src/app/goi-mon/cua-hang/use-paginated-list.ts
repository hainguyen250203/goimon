"use client";

import { useEffect, useState } from "react";

// Gõ xong đợi 300ms rồi mới gọi server — tránh bắn query mỗi lần gõ 1 ký tự.
const SEARCH_DEBOUNCE_MS = 300;

/** State phân trang + tìm kiếm dùng chung cho các trang lịch sử (search server-side, debounce 300ms). */
export function usePaginationState() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return { search, page, setPage, searchInput, setSearchInput };
}

/**
 * Gộp dữ liệu phân trang theo offset, khử trùng theo id khi nối trang mới
 * vào — phân trang theo offset nên nếu có bản ghi mới chen vào giữa lúc
 * đang tải thêm, trang sau có thể trả lại row đã có ở trang trước.
 */
export function useDedupedList<T extends { id: number }>(
  data: { items: T[]; total: number } | undefined,
  page: number,
): { items: T[]; hasMore: boolean } {
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    if (!data) return;
    setItems((prev) => {
      if (page === 1) return data.items;
      const existingIds = new Set(prev.map((item) => item.id));
      return [...prev, ...data.items.filter((item) => !existingIds.has(item.id))];
    });
  }, [data, page]);

  const hasMore = data ? items.length < data.total : false;

  return { items, hasMore };
}
