import type {
  Area,
  CreateAreaParams,
  RestaurantTableRepository,
} from "../domain/restaurant-table.repository";

export async function createArea(
  repository: RestaurantTableRepository,
  params: CreateAreaParams,
): Promise<Area> {
  return repository.createArea(params);
}
