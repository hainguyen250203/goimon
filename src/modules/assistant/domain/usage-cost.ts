// USD / 1.000.000 token — giá model đang dùng (gpt-5.5, xem MODEL trong
// send-message.usecase.ts), tra cứu 31/07/2026. Đổi model thì PHẢI cập nhật
// lại giá ở đây — kiểm tra giá thật tại https://openai.com/api/pricing vì
// OpenAI có thể đổi giá bất kỳ lúc nào.
export const PRICING_USD_PER_1M_TOKENS = { input: 5.0, output: 30.0 };

// Cộng thêm 20% vào chi phí ước tính theo giá niêm yết — theo yêu cầu người
// dùng, để con số hiện ra luôn có biên an toàn, tránh ước tính thấp hơn thực
// tế rồi vượt ngân sách dự trù.
const SAFETY_MARGIN = 1.2;

export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  const rawCost =
    (inputTokens / 1_000_000) * PRICING_USD_PER_1M_TOKENS.input +
    (outputTokens / 1_000_000) * PRICING_USD_PER_1M_TOKENS.output;
  return rawCost * SAFETY_MARGIN;
}
