import type {
  ListTablesParams,
  ListTablesResult,
  RestaurantTableRepository,
} from "../domain/restaurant-table.repository";

export async function listTables(
  repository: RestaurantTableRepository,
  params: ListTablesParams,
): Promise<ListTablesResult> {
  return repository.list(params);
}
