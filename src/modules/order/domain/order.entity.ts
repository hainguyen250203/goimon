import {
  EmptyOrderError,
  InvalidOrderStatusTransitionError,
  OrderItemNotFoundError,
} from "./order.errors";
import type { OrderStatus, PaymentMethod } from "./order-status";

/**
 * `id: null` nghĩa là dòng món chưa được persist (mới thêm trong memory,
 * infrastructure sẽ INSERT khi save()). Có id thật thì infrastructure sẽ
 * UPDATE/DELETE tương ứng khi diff với DB.
 */
export type OrderLineItem = {
  id: number | null;
  menuItemId: number;
  itemName: string;
  unitPrice: number;
  quantity: number;
  note: string | null;
};

export type DiscountType = "percent" | "fixed";

/** Snapshot khuyến mãi tại thời điểm áp dụng — không đổi khi promotion gốc bị sửa/xoá sau đó. */
export type OrderPromotion = {
  id: number;
  name: string;
  discountType: DiscountType;
  discountValue: number;
};

export type OrderProps = {
  id: number | null;
  tableId: number;
  shiftId: number | null;
  status: OrderStatus;
  createdBy: string;
  note: string | null;
  totalAmount: number | null;
  promotion: OrderPromotion | null;
  printedAt: Date | null;
  paymentMethod: PaymentMethod | null;
  paidConfirmedBy: string | null;
  paidConfirmedAt: Date | null;
  createdAt: Date;
  items: OrderLineItem[];
};

/** DTO thuần cho client — không lộ instance/method của entity qua tRPC. */
export type OrderDetail = {
  id: number;
  tableId: number;
  status: OrderStatus;
  note: string | null;
  subtotal: number;
  promotion: OrderPromotion | null;
  discountAmount: number;
  payableAmount: number;
  totalAmount: number | null;
  printedAt: Date | null;
  paymentMethod: PaymentMethod | null;
  paidConfirmedAt: Date | null;
  createdAt: Date;
  items: OrderLineItem[];
};

/**
 * Entity nghiệp vụ đầy đủ của order — khác `OrderListItem` (read model chỉ
 * phục vụ trang danh sách hiển thị). Mọi thay đổi trạng thái diễn ra trên
 * entity trong memory, application layer gọi repository.save() để persist
 * — đúng flow chuẩn trong CLAUDE.md.
 */
export class Order {
  readonly id: number | null;
  tableId: number;
  readonly shiftId: number | null;
  status: OrderStatus;
  readonly createdBy: string;
  note: string | null;
  totalAmount: number | null;
  promotion: OrderPromotion | null;
  printedAt: Date | null;
  paymentMethod: PaymentMethod | null;
  paidConfirmedBy: string | null;
  paidConfirmedAt: Date | null;
  readonly createdAt: Date;
  items: OrderLineItem[];

  constructor(props: OrderProps) {
    this.id = props.id;
    this.tableId = props.tableId;
    this.shiftId = props.shiftId;
    this.status = props.status;
    this.createdBy = props.createdBy;
    this.note = props.note;
    this.totalAmount = props.totalAmount;
    this.promotion = props.promotion;
    this.printedAt = props.printedAt;
    this.paymentMethod = props.paymentMethod;
    this.paidConfirmedBy = props.paidConfirmedBy;
    this.paidConfirmedAt = props.paidConfirmedAt;
    this.createdAt = props.createdAt;
    this.items = props.items;
  }

  static open(tableId: number, createdBy: string, shiftId: number | null): Order {
    return new Order({
      id: null,
      tableId,
      shiftId,
      status: "open",
      createdBy,
      note: null,
      totalAmount: null,
      promotion: null,
      printedAt: null,
      paymentMethod: null,
      paidConfirmedBy: null,
      paidConfirmedAt: null,
      createdAt: new Date(),
      items: [],
    });
  }

  get subtotal(): number {
    return this.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }

  /** Số tiền được giảm — không bao giờ vượt quá subtotal, dù % hay số tiền cố định. */
  get discountAmount(): number {
    if (!this.promotion) return 0;
    const subtotal = this.subtotal;
    if (this.promotion.discountType === "percent") {
      return Math.min(Math.round((subtotal * this.promotion.discountValue) / 100), subtotal);
    }
    return Math.min(this.promotion.discountValue, subtotal);
  }

  /** Số tiền khách thực trả sau khuyến mãi — không bao giờ âm. */
  get payableAmount(): number {
    return Math.max(this.subtotal - this.discountAmount, 0);
  }

  private assertMutable() {
    if (this.status !== "open") {
      throw new InvalidOrderStatusTransitionError(
        `Không thể sửa món khi đơn đã ở trạng thái "${this.status}".`,
      );
    }
  }

  /** Sửa món/khuyến mãi sau khi đã in bill thì phải in lại mới thanh toán được — xoá mốc in cũ (không đụng status, status luôn "open" tới khi thanh toán/huỷ). */
  private invalidatePrint() {
    if (this.printedAt !== null) this.printedAt = null;
  }

  addItem(
    menuItem: { id: number; name: string; price: number },
    quantity: number,
    note?: string | null,
  ) {
    this.assertMutable();
    if (quantity <= 0) return;
    // Gộp vào dòng đã có nếu cùng món + cùng ghi chú, tránh nhiều dòng trùng nhau.
    const existing = this.items.find(
      (item) => item.menuItemId === menuItem.id && (item.note ?? null) === (note ?? null),
    );
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.items.push({
        id: null,
        menuItemId: menuItem.id,
        itemName: menuItem.name,
        unitPrice: menuItem.price,
        quantity,
        note: note ?? null,
      });
    }
    this.invalidatePrint();
  }

  updateItemQuantity(itemId: number, quantity: number) {
    this.assertMutable();
    const item = this.items.find((i) => i.id === itemId);
    if (!item) throw new OrderItemNotFoundError(itemId);
    if (quantity <= 0) {
      this.removeItem(itemId);
      return;
    }
    item.quantity = quantity;
    this.invalidatePrint();
  }

  updateItemNote(itemId: number, note: string | null) {
    this.assertMutable();
    const item = this.items.find((i) => i.id === itemId);
    if (!item) throw new OrderItemNotFoundError(itemId);
    item.note = note;
    this.invalidatePrint();
  }

  /**
   * Xoá món — KHÔNG tự huỷ đơn dù về 0 món (đơn về 0 món coi như "trả hết
   * món", đơn vẫn "open", bàn vẫn đang phục vụ — chỉ bấm "Huỷ đơn" mới thật
   * sự huỷ). Chỉ truyền `emptyStatus` khi việc xoá này là HỆ QUẢ của chuyển/
   * gộp hết món sang bàn khác — lúc đó đơn nguồn thật sự cần đóng lại để trả
   * bàn (xem transfer-order-items.usecase.ts và merge-orders.usecase.ts).
   */
  removeItem(itemId: number, emptyStatus?: Extract<OrderStatus, "transferred">) {
    this.assertMutable();
    const index = this.items.findIndex((i) => i.id === itemId);
    if (index === -1) throw new OrderItemNotFoundError(itemId);
    this.items.splice(index, 1);
    if (this.items.length === 0 && emptyStatus) {
      this.status = emptyStatus;
      return;
    }
    this.invalidatePrint();
  }

  /** Đổi khuyến mãi (thêm mới hoặc thay khuyến mãi đang áp dụng) — như sửa món, đã in bill rồi thì phải in lại. */
  applyPromotion(promotion: OrderPromotion) {
    this.assertMutable();
    this.promotion = promotion;
    this.invalidatePrint();
  }

  removePromotion() {
    this.assertMutable();
    this.promotion = null;
    this.invalidatePrint();
  }

  /** Chuyển đơn đang phục vụ sang bàn khác (khách đổi bàn) — không đổi món/tổng tiền nên không cần in lại bill. */
  moveToTable(tableId: number) {
    this.assertMutable();
    this.tableId = tableId;
  }

  /** In bill là 1 HÀNH ĐỘNG, không đổi status — chỉ tính lại totalAmount (đã trừ khuyến mãi) và set printedAt, in lại bao nhiêu lần cũng được khi đơn còn "open". */
  printBill() {
    if (this.status !== "open") {
      throw new InvalidOrderStatusTransitionError(
        `Không thể in bill khi đơn đã ở trạng thái "${this.status}".`,
      );
    }
    if (this.items.length === 0) throw new EmptyOrderError();
    this.totalAmount = this.payableAmount;
    this.printedAt = new Date();
  }

  /** Chỉ hợp lệ khi đơn đang "open" → "paid". In bill hay không không liên
   * quan tới việc thanh toán — 2 hành động độc lập, xem printBill(). Luôn
   * chốt lại totalAmount ở đây (không chỉ dựa vào printBill()) — trước đây
   * chỉ printBill() mới set totalAmount nên đơn thanh toán mà chưa từng in
   * có totalAmount null vĩnh viễn, làm mọi query tính doanh thu
   * (sum(totalAmount)) âm thầm bỏ qua đơn đó (SQL SUM bỏ qua NULL) thay vì
   * báo lỗi — ra doanh thu 0đ dù đơn đã thanh toán thật. */
  confirmPayment(staffId: string, paymentMethod: PaymentMethod) {
    if (this.status !== "open") {
      throw new InvalidOrderStatusTransitionError(
        `Không thể xác nhận thanh toán khi đơn đã ở trạng thái "${this.status}".`,
      );
    }
    this.status = "paid";
    this.totalAmount = this.payableAmount;
    this.paymentMethod = paymentMethod;
    this.paidConfirmedBy = staffId;
    this.paidConfirmedAt = new Date();
  }

  /** Hợp lệ từ "open" → "cancelled" (kể cả đã in bill, chưa thanh toán). */
  cancel() {
    if (this.status !== "open") {
      throw new InvalidOrderStatusTransitionError(
        `Không thể huỷ đơn đã ở trạng thái "${this.status}".`,
      );
    }
    this.status = "cancelled";
  }

  /** entity id chỉ null trước khi persist lần đầu — sau save() luôn có id thật. */
  toDetail(): OrderDetail {
    if (this.id === null) throw new Error("Order chưa được lưu, không thể tạo DTO.");
    return {
      id: this.id,
      tableId: this.tableId,
      status: this.status,
      note: this.note,
      subtotal: this.subtotal,
      promotion: this.promotion,
      discountAmount: this.discountAmount,
      payableAmount: this.payableAmount,
      totalAmount: this.totalAmount,
      printedAt: this.printedAt,
      paymentMethod: this.paymentMethod,
      paidConfirmedAt: this.paidConfirmedAt,
      createdAt: this.createdAt,
      items: this.items,
    };
  }
}
