import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const followupsSchema = z.object({
  questions: z.array(z.string().max(120)).max(3),
});

/**
 * Gọi thêm 1 lần model rẻ (gpt-4.1-mini) sau khi trả lời xong, để gợi ý tối
 * đa 3 câu hỏi tiếp theo. Kết quả này KHÔNG lưu vào DB — chỉ hiển thị tạm
 * trên UI (xem "data-followups" transient part ở route handler).
 */
export async function generateFollowups(lastAssistantText: string): Promise<string[]> {
  if (!lastAssistantText.trim()) return [];

  try {
    const { object } = await generateObject({
      model: openai("gpt-4.1-mini"),
      schema: followupsSchema,
      prompt: `Dựa trên câu trả lời sau của trợ lý AI quản lý nhà hàng, gợi ý tối đa 3
câu hỏi tiếp theo NGẮN GỌN, liên quan trực tiếp, bằng tiếng Việt:

"""${lastAssistantText}"""`,
    });
    return object.questions;
  } catch {
    // Gợi ý câu hỏi chỉ là tiện ích phụ — lỗi ở đây không được làm hỏng lượt chat chính.
    return [];
  }
}
