import type { RestaurantTableRepository } from "../domain/restaurant-table.repository";

export async function deleteArea(
  repository: RestaurantTableRepository,
  id: number,
): Promise<void> {
  return repository.removeArea(id);
}
