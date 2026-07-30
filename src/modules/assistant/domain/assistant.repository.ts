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
};

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
  /** Tổng token đã dùng theo từng phiên — nguồn dữ liệu cho trang thống kê. */
  getUsageSummary(userId: string): Promise<UsageSummaryRow[]>;
}
