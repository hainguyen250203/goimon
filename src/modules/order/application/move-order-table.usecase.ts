import type { RestaurantTableRepository } from "~/modules/table/domain/restaurant-table.repository";
import { InvalidTableTransferError } from "../domain/order.errors";
import type { Order } from "../domain/order.entity";
import type { OrderRepository } from "../domain/order.repository";

export type MoveOrderTableParams = {
  orderId: number;
  targetTableId: number;
  actorId: string;
};

export async function moveOrderTable(
  orderRepository: OrderRepository,
  tableRepository: RestaurantTableRepository,
  params: MoveOrderTableParams,
): Promise<Order> {
  const orderEntity = await orderRepository.findById(params.orderId);
  if (!orderEntity) throw new Error("Không tìm thấy đơn hàng.");

  const fromTableId = orderEntity.tableId;
  if (fromTableId === params.targetTableId) {
    throw new InvalidTableTransferError("Đơn đang ở ngay bàn này.");
  }

  const [tables, targetActiveOrder] = await Promise.all([
    tableRepository.listAll(),
    orderRepository.findActiveByTableId(params.targetTableId),
  ]);
  if (targetActiveOrder) {
    throw new InvalidTableTransferError("Bàn đích đang phục vụ đơn khác.");
  }
  const toTable = tables.find((t) => t.id === params.targetTableId);
  if (!toTable) throw new InvalidTableTransferError("Không tìm thấy bàn đích.");
  const fromTable = tables.find((t) => t.id === fromTableId);

  orderEntity.moveToTable(params.targetTableId);
  const saved = await orderRepository.save(orderEntity);

  await Promise.all([
    tableRepository.setStatus(params.targetTableId, "occupied"),
    tableRepository.setStatus(fromTableId, "available"),
  ]);

  await orderRepository.recordEvent({
    orderId: saved.id!,
    actorId: params.actorId,
    eventType: "table_changed",
    payload: {
      fromTableId,
      fromTableName: fromTable?.name ?? "",
      toTableId: params.targetTableId,
      toTableName: toTable.name,
    },
  });

  return saved;
}
