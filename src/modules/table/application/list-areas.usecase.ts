import type { Area, RestaurantTableRepository } from "../domain/restaurant-table.repository";

export async function listAreas(repository: RestaurantTableRepository): Promise<Area[]> {
  return repository.listAreasFull();
}
