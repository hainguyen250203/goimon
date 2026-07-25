"use client";

import { create } from "zustand";

/**
 * Giỏ món đang soạn (CHƯA submit lên server) — đúng ví dụ Zustand-chỉ-cho-
 * UI-state trong CLAUDE.md. Key theo tableId vì nhân viên có thể mở nhiều
 * bàn cùng lúc trên cùng 1 phiên làm việc. Khi "Xác nhận" gửi lên server
 * (api.order.addItems), giỏ nháp của bàn đó bị xoá — món đã gửi chuyển
 * sang hiển thị từ server state (api.order.getTableOrder), không còn nằm
 * trong store này nữa.
 */
export type DraftCartItem = {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  note: string;
};

// Fallback ổn định cho selector `draftCarts[tableId] ?? EMPTY_ITEMS` — nếu
// dùng `?? []` trực tiếp trong selector, mỗi lần gọi tạo array mới (khác
// reference), useSyncExternalStore coi là "state đổi" liên tục → lỗi
// "getSnapshot should be cached" (React infinite loop warning).
export const EMPTY_DRAFT_ITEMS: DraftCartItem[] = [];

type OrderCartState = {
  draftCarts: Record<number, DraftCartItem[]>;
  addItem: (tableId: number, item: { menuItemId: number; name: string; price: number }) => void;
  updateQuantity: (tableId: number, menuItemId: number, quantity: number) => void;
  updateNote: (tableId: number, menuItemId: number, note: string) => void;
  removeItem: (tableId: number, menuItemId: number) => void;
  clearCart: (tableId: number) => void;
};

export const useOrderCartStore = create<OrderCartState>((set) => ({
  draftCarts: {},

  addItem: (tableId, item) =>
    set((state) => {
      const items = state.draftCarts[tableId] ?? [];
      const existing = items.find((i) => i.menuItemId === item.menuItemId);
      const nextItems = existing
        ? items.map((i) =>
            i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + 1 } : i,
          )
        : [...items, { ...item, quantity: 1, note: "" }];
      return { draftCarts: { ...state.draftCarts, [tableId]: nextItems } };
    }),

  updateQuantity: (tableId, menuItemId, quantity) =>
    set((state) => {
      const items = state.draftCarts[tableId];
      if (!items) return state;
      const nextItems =
        quantity <= 0
          ? items.filter((i) => i.menuItemId !== menuItemId)
          : items.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity } : i));
      return { draftCarts: { ...state.draftCarts, [tableId]: nextItems } };
    }),

  updateNote: (tableId, menuItemId, note) =>
    set((state) => {
      const items = state.draftCarts[tableId];
      if (!items) return state;
      return {
        draftCarts: {
          ...state.draftCarts,
          [tableId]: items.map((i) => (i.menuItemId === menuItemId ? { ...i, note } : i)),
        },
      };
    }),

  removeItem: (tableId, menuItemId) =>
    set((state) => {
      const items = state.draftCarts[tableId];
      if (!items) return state;
      return {
        draftCarts: {
          ...state.draftCarts,
          [tableId]: items.filter((i) => i.menuItemId !== menuItemId),
        },
      };
    }),

  clearCart: (tableId) =>
    set((state) => {
      const next = { ...state.draftCarts };
      delete next[tableId];
      return { draftCarts: next };
    }),
}));

export function getCartTotalItems(items: DraftCartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export function getCartTotalAmount(items: DraftCartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}
