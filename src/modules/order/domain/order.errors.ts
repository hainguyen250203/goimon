export class InvalidOrderStatusTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidOrderStatusTransitionError";
  }
}

export class OrderItemNotFoundError extends Error {
  constructor(itemId: number) {
    super(`Không tìm thấy món với id ${itemId} trong đơn.`);
    this.name = "OrderItemNotFoundError";
  }
}

export class PromotionNotAvailableError extends Error {
  constructor() {
    super("Khuyến mãi không tồn tại hoặc đã ngừng hoạt động.");
    this.name = "PromotionNotAvailableError";
  }
}

export class InvalidTableTransferError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTableTransferError";
  }
}
