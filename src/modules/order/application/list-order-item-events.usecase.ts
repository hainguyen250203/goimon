import type {
  ListOrderItemEventsParams,
  ListOrderItemEventsResult,
  OrderRepository,
} from "../domain/order.repository";

export async function listOrderItemEvents(
  repository: OrderRepository,
  params: ListOrderItemEventsParams,
): Promise<ListOrderItemEventsResult> {
  return repository.listOrderItemEvents(params);
}
