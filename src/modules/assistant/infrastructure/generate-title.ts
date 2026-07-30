import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

/**
 * Gọi model rẻ (gpt-4.1-mini) để đặt tên ngắn cho phiên chat dựa trên câu hỏi
 * đầu tiên — giống cách Lensy tự đặt tên phiên (bản tham khảo). Lỗi ở đây
 * không được làm hỏng lượt chat chính, chỉ log và bỏ qua.
 */
export async function generateTitle(firstUserMessage: string): Promise<string | null> {
  const trimmed = firstUserMessage.trim();
  if (!trimmed) return null;

  try {
    const { text } = await generateText({
      model: openai("gpt-4.1-mini"),
      prompt: `Đặt tên ngắn gọn (tối đa 6 từ, không dùng dấu ngoặc kép) cho 1 cuộc trò chuyện bắt đầu bằng câu hỏi sau:

"""${trimmed}"""

Chỉ trả về đúng tên, không giải thích thêm.`,
    });
    const title = text.trim().replace(/^"|"$/g, "");
    return title.slice(0, 200) || null;
  } catch {
    return null;
  }
}
