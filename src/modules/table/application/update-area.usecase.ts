import type {
  Area,
  RestaurantTableRepository,
  UpdateAreaParams,
} from "../domain/restaurant-table.repository";

export type UpdateAreaResult = {
  before: Area;
  after: Area;
};

export async function updateArea(
  repository: RestaurantTableRepository,
  params: UpdateAreaParams,
): Promise<UpdateAreaResult> {
  const before = await repository.findAreaById(params.id);
  const after = await repository.updateArea(params);
  return { before, after };
}
