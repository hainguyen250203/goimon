import type { RestaurantTableRepository } from "../domain/restaurant-table.repository";

export async function deleteTable(
  repository: RestaurantTableRepository,
  id: number,
): Promise<void> {
  return repository.remove(id);
}
