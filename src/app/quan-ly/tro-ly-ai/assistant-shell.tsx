"use client";

import { useState } from "react";
import { Box, Flex, IconButton, VisuallyHidden } from "@chakra-ui/react";
import { PanelLeft } from "lucide-react";

import { DrawerBody, DrawerContent, DrawerRoot, DrawerTitle } from "~/components/ui/drawer";
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
  // Sidebar danh sách phiên hiển thị inline trên desktop (md+), nhưng trên
  // mobile 2 cột không đủ chỗ (chữ bị bóp dồn xuống dòng, xem ảnh chụp) —
  // chuyển thành Drawer mở bằng nút riêng, đúng cách AdminShell đã làm với
  // sidebar điều hướng chính.
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // Thu gọn/mở rộng riêng cho sidebar desktop — chỉ ẩn/hiện danh sách phiên,
  // không ảnh hưởng Drawer mobile (đã có cơ chế ẩn/hiện riêng qua Drawer).
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSelectSession = (id: number) => {
    setSessionId(id);
    setInstanceKey(id);
    setMobileSidebarOpen(false);
    window.history.replaceState(null, "", `/quan-ly/tro-ly-ai?session=${id}`);
  };

  const handleNewChat = () => {
    setSessionId(undefined);
    setInstanceKey(crypto.randomUUID());
    setMobileSidebarOpen(false);
    window.history.replaceState(null, "", "/quan-ly/tro-ly-ai");
  };

  const handleSessionCreated = (id: number) => {
    setSessionId(id);
    window.history.replaceState(null, "", `/quan-ly/tro-ly-ai?session=${id}`);
  };

  return (
    <Flex h="full" minH={0} gap={0}>
      <Box display={{ base: "none", md: "block" }} h="full">
        <SessionSidebar
          activeSessionId={sessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        />
      </Box>

      <DrawerRoot
        open={mobileSidebarOpen}
        placement="start"
        onOpenChange={(e) => setMobileSidebarOpen(e.open)}
      >
        <DrawerContent maxW="17rem" p={0}>
          <VisuallyHidden>
            <DrawerTitle>Danh sách trò chuyện</DrawerTitle>
          </VisuallyHidden>
          <DrawerBody p={0}>
            <SessionSidebar
              activeSessionId={sessionId}
              onSelectSession={handleSelectSession}
              onNewChat={handleNewChat}
            />
          </DrawerBody>
        </DrawerContent>
      </DrawerRoot>

      <Flex direction="column" flex={1} minW={0} h="full">
        <Flex
          display={{ base: "flex", md: "none" }}
          align="center"
          px={2}
          py={1}
          flexShrink={0}
          borderBottomWidth="1px"
          borderColor="border"
        >
          <IconButton
            aria-label="Danh sách trò chuyện"
            variant="ghost"
            size="sm"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <PanelLeft size={18} />
          </IconButton>
        </Flex>
        <Box flex={1} minH={0}>
          <ChatPanel
            key={instanceKey}
            sessionId={sessionId}
            onSessionCreated={handleSessionCreated}
            userName={userName}
          />
        </Box>
      </Flex>
    </Flex>
  );
}
