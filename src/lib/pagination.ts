export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;
export const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

/** Parse pageSize từ query param — clamp về [1, MAX_PAGE_SIZE], invalid thì về mặc định. */
export function parsePageSize(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(n), MAX_PAGE_SIZE);
}
