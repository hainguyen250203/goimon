export class ShiftAlreadyOpenError extends Error {
  constructor() {
    super("Đã có ca đang mở, không thể mở thêm ca mới.");
    this.name = "ShiftAlreadyOpenError";
  }
}

export class NoOpenShiftError extends Error {
  constructor() {
    super("Chưa có ca nào đang mở.");
    this.name = "NoOpenShiftError";
  }
}

export class ShiftHasActiveOrdersError extends Error {
  constructor() {
    super("Còn đơn hàng chưa thanh toán/huỷ trong ca này, không thể đóng ca.");
    this.name = "ShiftHasActiveOrdersError";
  }
}

export class InvalidShiftStatusTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidShiftStatusTransitionError";
  }
}
