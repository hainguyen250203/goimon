import { ShiftAlreadyOpenError } from "../domain/shift.errors";
import { Shift } from "../domain/shift.entity";
import type { ShiftRepository } from "../domain/shift.repository";

export async function openShift(repository: ShiftRepository, openedBy: string): Promise<Shift> {
  const existing = await repository.findOpen();
  if (existing) throw new ShiftAlreadyOpenError();

  const shift = Shift.open(openedBy);
  return repository.save(shift);
}
