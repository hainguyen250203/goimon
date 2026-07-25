import type {
  AreaOption,
  RestaurantTableRepository,
} from "../domain/restaurant-table.repository";

export async function listAreaOptions(
  repository: RestaurantTableRepository,
): Promise<AreaOption[]> {
  return repository.listAreaOptions();
}
