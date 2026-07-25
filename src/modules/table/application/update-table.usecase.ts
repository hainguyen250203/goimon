import type {
  RestaurantTableRepository,
  UpdateTableParams,
} from "../domain/restaurant-table.repository";
import type { RestaurantTable } from "../domain/restaurant-table.entity";

export async function updateTable(
  repository: RestaurantTableRepository,
  params: UpdateTableParams,
): Promise<RestaurantTable> {
  return repository.update(params);
}
