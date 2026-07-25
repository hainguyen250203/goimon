import type {
  ListOrdersParams,
  ListOrdersResult,
  OrderRepository,
} from "../domain/order.repository";

export async function listOrders(
  repository: OrderRepository,
  params: ListOrdersParams,
): Promise<ListOrdersResult> {
  return repository.list(params);
}
