import type { AssistantSession } from "./assistant-session.entity";
import type {
  AssistantMessage,
  AssistantMessageRole,
  AssistantMessageUsage,
} from "./assistant-message.entity";

export type CreateSessionParams = {
  userId: string;
  title?: string | null;
};

export type ListSessionsParams = {
  userId: string;
  page: number;
  pageSize: number;
};

export type ListSessionsResult = {
  items: AssistantSession[];
  total: number;
};

export type AppendMessageParams = {
  sessionId: number;
  role: AssistantMessageRole;
  parts: unknown[];
  usage?: AssistantMessageUsage | null;
  model?: string | null;
};

export type UsageSummaryRow = {
  sessionId: number;
  title: string | null;
  messageCount: number;
  inputTokens: number;
  outputTokens: number;
  deletedAt: Date | null;
};

export type UsageTotals = { inputTokens: number; outputTokens: number };

export interface AssistantRepository {
  createSession(params: CreateSessionParams): Promise<AssistantSession>;
  listSessions(params: ListSessionsParams): Promise<ListSessionsResult>;
  /** userId dùng để tự kiểm tra quyền sở hữu — trả về null nếu không tìm thấy hoặc không thuộc user này. */
  findSessionById(id: number, userId: string): Promise<AssistantSession | null>;
  renameSession(id: number, userId: string, title: string): Promise<AssistantSession>;
  softDeleteSession(id: number, userId: string): Promise<void>;
  listMessages(sessionId: number): Promise<AssistantMessage[]>;
  appendMessage(params: AppendMessageParams): Promise<AssistantMessage>;
  touchSessionUpdatedAt(sessionId: number): Promise<void>;
  /**
   * Tổng token đã dùng theo từng phiên — nguồn dữ liệu cho trang thống kê.
   * Gồm cả phiên đã xoá mềm (deletedAt != null): chi phí đã phát sinh thật với
   * OpenAI dù phiên đã bị ẩn khỏi sidebar, nên vẫn phải tính vào báo cáo chi phí.
   */
  getUsageSummary(userId: string): Promise<UsageSummaryRow[]>;
  /** Tổng token của TOÀN BỘ user trong khoảng thời gian — cho KPI "Chi phí AI"
   * ở trang Báo cáo (khác getUsageSummary: theo user, theo phiên). Gồm cả tin
   * nhắn của phiên đã xoá mềm — chi phí đã phát sinh thật với OpenAI. */
  getUsageTotalsInRange(range: { start: Date; end: Date }): Promise<UsageTotals>;
}
