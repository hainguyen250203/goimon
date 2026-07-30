"use client";

import { useState } from "react";
import { Flex } from "@chakra-ui/react";

import { SessionSidebar } from "./session-sidebar";
import { ChatPanel } from "./chat-panel";

/**
 * Quản lý state ở đây thay vì điều hướng URL cho mỗi thao tác — chuyển phiên/
 * bắt đầu mới chỉ cập nhật URL qua `history.replaceState` (không phải
 * `router.push`), để không bao giờ làm gián đoạn 1 câu trả lời đang stream
 * dở (giống cách Lensy — bản tham khảo — xử lý).
 */
export function AssistantShell({
  activeSessionId,
  userName,
}: {
  activeSessionId?: number;
  userName: string;
}) {
  const [sessionId, setSessionId] = useState<number | undefined>(activeSessionId);
  // key ép ChatPanel remount — CHỈ đổi khi người dùng chủ động chọn phiên
  // khác/bấm "Trò chuyện mới", KHÔNG đổi khi phiên được tạo ngầm lúc gửi tin
  // nhắn đầu tiên (nếu không sẽ mất nội dung đang stream giữa chừng).
  const [instanceKey, setInstanceKey] = useState<string | number>(activeSessionId ?? "new");

  const handleSelectSession = (id: number) => {
    setSessionId(id);
    setInstanceKey(id);
    window.history.replaceState(null, "", `/quan-ly/tro-ly-ai?session=${id}`);
  };

  const handleNewChat = () => {
    setSessionId(undefined);
    setInstanceKey(crypto.randomUUID());
    window.history.replaceState(null, "", "/quan-ly/tro-ly-ai");
  };

  const handleSessionCreated = (id: number) => {
    setSessionId(id);
    window.history.replaceState(null, "", `/quan-ly/tro-ly-ai?session=${id}`);
  };

  return (
    <Flex h="full" minH={0} gap={0}>
      <SessionSidebar
        activeSessionId={sessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
      />
      <ChatPanel key={instanceKey} sessionId={sessionId} onSessionCreated={handleSessionCreated} userName={userName} />
    </Flex>
  );
}
