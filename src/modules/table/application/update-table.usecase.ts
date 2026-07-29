import type {
  RestaurantTableRepository,
  UpdateTableParams,
} from "../domain/restaurant-table.repository";
import type { RestaurantTable } from "../domain/restaurant-table.entity";

export type UpdateTableResult = {
  before: RestaurantTable;
  after: RestaurantTable;
};

export async function updateTable(
  repository: RestaurantTableRepository,
  params: UpdateTableParams,
): Promise<UpdateTableResult> {
  const before = await repository.findById(params.id);
  const after = await repository.update(params);
  return { before, after };
}
