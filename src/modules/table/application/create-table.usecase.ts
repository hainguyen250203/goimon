import type {
  CreateTableParams,
  RestaurantTableRepository,
} from "../domain/restaurant-table.repository";
import type { RestaurantTable } from "../domain/restaurant-table.entity";

export async function createTable(
  repository: RestaurantTableRepository,
  params: CreateTableParams,
): Promise<RestaurantTable> {
  return repository.create(params);
}
