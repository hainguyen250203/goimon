import type {
  Area,
  RestaurantTableRepository,
  UpdateAreaParams,
} from "../domain/restaurant-table.repository";

export async function updateArea(
  repository: RestaurantTableRepository,
  params: UpdateAreaParams,
): Promise<Area> {
  return repository.updateArea(params);
}
