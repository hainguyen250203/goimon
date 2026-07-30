import type { Shift, ShiftStatus } from "./shift.entity";

export type ListShiftsParams = {
  page: number;
  pageSize: number;
  status?: ShiftStatus;
};

/** Read model cho trang lịch sử ca (admin) — kèm tên người mở/đóng để hiển thị. */
export type ShiftListItem = {
  id: number;
  openedByName: string;
  closedByName: string | null;
  status: ShiftStatus;
  startTime: Date;
  endTime: Date | null;
};

export type ListShiftsResult = {
  items: ShiftListItem[];
  total: number;
};

/** 1 ca trong khoảng ngày — cho trang Báo cáo. */
export type ShiftRangeItem = {
  id: number;
  status: ShiftStatus;
  startTime: Date;
  endTime: Date | null;
};

export interface ShiftRepository {
  /** Ca đang mở (nếu có) — tối đa 1 trên toàn nhà hàng. */
  findOpen(): Promise<Shift | null>;
  /** Ca gần nhất (bất kể đang mở hay đã đóng) — cho trang Tổng quan, để
   * ca vừa đóng vẫn xem lại được số liệu thay vì mất trắng ngay khi đóng ca. */
  findLatest(): Promise<Shift | null>;
  findById(id: number): Promise<Shift | null>;
  save(shift: Shift): Promise<Shift>;
  list(params: ListShiftsParams): Promise<ListShiftsResult>;
  /** Mọi ca có startTime trong [start, end) — cho trang Báo cáo, sắp theo
   * startTime tăng dần. Ngày tháng lọc luôn tính theo lúc MỞ CA, không phải
   * theo đơn hàng. */
  listInRange(range: { start: Date; end: Date }): Promise<ShiftRangeItem[]>;
}
