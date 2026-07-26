import type { Shift } from "../domain/shift.entity";
import type { ShiftRepository } from "../domain/shift.repository";

export async function getOpenShift(repository: ShiftRepository): Promise<Shift | null> {
  return repository.findOpen();
}
