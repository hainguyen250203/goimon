import type {
  ListShiftsParams,
  ListShiftsResult,
  ShiftRepository,
} from "../domain/shift.repository";

export async function listShifts(
  repository: ShiftRepository,
  params: ListShiftsParams,
): Promise<ListShiftsResult> {
  return repository.list(params);
}
