const WINDOW_MS = 5 * 60_000;
const MAX_TURNS_PER_WINDOW = 20;

/**
 * Sliding window trong bộ nhớ (Map). CHỈ hoạt động đúng khi chạy 1 instance
 * Node duy nhất — reset khi restart, không chia sẻ giữa nhiều instance. Nếu
 * sau này deploy nhiều instance thì cần chuyển sang Redis hoặc tương tự.
 */
const hits = new Map<string, number[]>();

export function checkRateLimit(userId: string): { allowed: boolean } {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(userId, recent);
  return { allowed: recent.length <= MAX_TURNS_PER_WINDOW };
}
