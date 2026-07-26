import { InvalidShiftStatusTransitionError } from "./shift.errors";

export type ShiftStatus = "open" | "closed";

export type ShiftProps = {
  id: number | null;
  openedBy: string;
  closedBy: string | null;
  status: ShiftStatus;
  startTime: Date;
  endTime: Date | null;
};

/** DTO thuần cho client. */
export type ShiftDetail = {
  id: number;
  openedBy: string;
  closedBy: string | null;
  status: ShiftStatus;
  startTime: Date;
  endTime: Date | null;
};

/**
 * Ca làm việc — mọi order/order_event đều gắn với ca đang mở tại thời điểm
 * tạo (xem order.schema.ts/order_events.shift_id). Chỉ 1 ca được mở tại 1
 * thời điểm trên toàn nhà hàng (DB có unique index đảm bảo).
 */
export class Shift {
  readonly id: number | null;
  readonly openedBy: string;
  closedBy: string | null;
  status: ShiftStatus;
  readonly startTime: Date;
  endTime: Date | null;

  constructor(props: ShiftProps) {
    this.id = props.id;
    this.openedBy = props.openedBy;
    this.closedBy = props.closedBy;
    this.status = props.status;
    this.startTime = props.startTime;
    this.endTime = props.endTime;
  }

  static open(openedBy: string): Shift {
    return new Shift({
      id: null,
      openedBy,
      closedBy: null,
      status: "open",
      startTime: new Date(),
      endTime: null,
    });
  }

  close(closedBy: string) {
    if (this.status !== "open") {
      throw new InvalidShiftStatusTransitionError(
        `Ca đã ở trạng thái "${this.status}", không thể đóng lại.`,
      );
    }
    this.status = "closed";
    this.closedBy = closedBy;
    this.endTime = new Date();
  }

  toDetail(): ShiftDetail {
    if (this.id === null) throw new Error("Ca chưa được lưu, không thể tạo DTO.");
    return {
      id: this.id,
      openedBy: this.openedBy,
      closedBy: this.closedBy,
      status: this.status,
      startTime: this.startTime,
      endTime: this.endTime,
    };
  }
}
