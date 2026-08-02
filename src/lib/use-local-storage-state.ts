"use client";

import { useEffect, useState } from "react";

/**
 * State đồng bộ với localStorage — lần render đầu (cả SSR lẫn client) LUÔN
 * ra `defaultValue` giống nhau (tránh hydration mismatch, vì `localStorage`
 * không tồn tại lúc SSR), chỉ đọc giá trị đã lưu SAU khi mount (giống cách
 * `next-themes` tránh flash-of-wrong-theme). Chấp nhận 1 nhịp hiện giá trị
 * mặc định trước khi giá trị đã lưu áp dụng — không tránh được nếu không có
 * cookie đọc được ở server, nhưng ổn vì đây chỉ là tuỳ chỉnh hiển thị UI.
 */
export function useLocalStorageState<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        setValue(JSON.parse(raw) as T);
      } catch {
        // Giá trị lưu trước đó hỏng/không phải JSON hợp lệ — bỏ qua, giữ mặc định.
      }
    }
  }, [key]);

  const set = (next: T) => {
    setValue(next);
    localStorage.setItem(key, JSON.stringify(next));
  };

  return [value, set];
}
