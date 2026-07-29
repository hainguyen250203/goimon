import type {
  ListTableTransferEventsParams,
  ListTableTransferEventsResult,
  OrderRepository,
} from "../domain/order.repository";

/** Lịch sử chuyển bàn/chuyển món toàn nhà hàng — trang Lịch sử, tab Chuyển bàn/món. */
export function listTableTransferEvents(
  repository: OrderRepository,
  params: ListTableTransferEventsParams,
): Promise<ListTableTransferEventsResult> {
  return repository.listTableTransferEvents(params);
}
