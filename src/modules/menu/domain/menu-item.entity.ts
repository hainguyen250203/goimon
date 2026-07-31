export type MenuItem = {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string;
  price: number;
  isAvailable: boolean;
  isPublished: boolean;
  /** Có in ra phiếu bếp khi gọi/huỷ/chuyển món không — vd bia/nước ngọt thường tắt. */
  printToKitchen: boolean;
};
