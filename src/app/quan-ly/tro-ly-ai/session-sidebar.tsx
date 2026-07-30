"use client";

import { useState } from "react";
import { Button, Flex, IconButton, Input, Stack, Text } from "@chakra-ui/react";
import { MoreHorizontal, PanelLeftClose, PanelLeftOpen, Pencil, Plus, Trash2 } from "lucide-react";

import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "~/components/ui/dialog";
import { Field } from "~/components/ui/field";
import {
  MenuContent,
  MenuItem,
  MenuItemGroup,
  MenuRoot,
  MenuTrigger,
} from "~/components/ui/menu";
import { toaster } from "~/components/ui/toaster";
import { Tooltip } from "~/components/ui/tooltip";
import { api } from "~/trpc/react";
import type { AssistantSession } from "~/modules/assistant/domain/assistant-session.entity";

const PAGE_SIZE = 20;

export function SessionSidebar({
  activeSessionId,
  onSelectSession,
  onNewChat,
  collapsed = false,
  onToggleCollapse,
}: {
  activeSessionId?: number;
  onSelectSession: (id: number) => void;
  onNewChat: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const { data } = api.assistant.listSessions.useQuery({ page: 1, pageSize: PAGE_SIZE });
  const sessions = data?.items ?? [];

  // Thu gọn còn dải hẹp — vẫn chọn được phiên qua chữ cái đầu tên phiên
  // (tooltip hiện tên đầy đủ khi hover), không bắt buộc mở rộng lại mới
  // chuyển được chat.
  if (collapsed) {
    return (
      <Stack w="3.5rem" flexShrink={0} h="full" py={4} px={2} gap={2} borderRightWidth="1px" borderColor="border" align="center">
        {onToggleCollapse && (
          <IconButton aria-label="Mở rộng danh sách" variant="ghost" size="sm" onClick={onToggleCollapse}>
            <PanelLeftOpen size={18} />
          </IconButton>
        )}
        <IconButton aria-label="Trò chuyện mới" variant="outline" size="sm" rounded="l2" onClick={onNewChat}>
          <Plus size={16} />
        </IconButton>

        <Stack gap={1} overflowY="auto" flex={1} align="center" pt={1}>
          {sessions.map((session) => {
            const title = session.title || "Trò chuyện chưa đặt tên";
            const active = session.id === activeSessionId;
            return (
              <Tooltip key={session.id} content={title} positioning={{ placement: "right" }}>
                <IconButton
                  aria-label={title}
                  variant={active ? "solid" : "ghost"}
                  size="sm"
                  rounded="l2"
                  onClick={() => onSelectSession(session.id)}
                >
                  {title.charAt(0).toUpperCase()}
                </IconButton>
              </Tooltip>
            );
          })}
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack
      w="17rem"
      flexShrink={0}
      h="full"
      py={4}
      pr={3}
      pl={{ base: 4, md: 6 }}
      gap={4}
      borderRightWidth="1px"
      borderColor="border"
    >
      <Flex align="center" gap={2}>
        <Button onClick={onNewChat} rounded="l2" flex={1}>
          <Plus size={16} />
          Trò chuyện mới
        </Button>
        {onToggleCollapse && (
          <IconButton aria-label="Thu gọn danh sách" variant="ghost" size="sm" onClick={onToggleCollapse}>
            <PanelLeftClose size={18} />
          </IconButton>
        )}
      </Flex>

      <Stack gap="1px" overflowY="auto" flex={1}>
        {sessions.length === 0 && (
          <Text fontSize="sm" color="fg.muted" px={2}>
            Chưa có phiên trò chuyện nào.
          </Text>
        )}
        {sessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            active={session.id === activeSessionId}
            onSelect={() => onSelectSession(session.id)}
            onDeletedActive={onNewChat}
          />
        ))}
      </Stack>
    </Stack>
  );
}

function SessionItem({
  session,
  active,
  onSelect,
  onDeletedActive,
}: {
  session: AssistantSession;
  active: boolean;
  onSelect: () => void;
  onDeletedActive: () => void;
}) {
  const utils = api.useUtils();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState(session.title ?? "");

  const rename = api.assistant.renameSession.useMutation({
    onSuccess: () => {
      void utils.assistant.listSessions.invalidate();
      setRenameOpen(false);
    },
    onError: (error) => {
      toaster.create({ title: "Không thể đổi tên", description: error.message, type: "error" });
    },
  });

  const remove = api.assistant.deleteSession.useMutation({
    onSuccess: () => {
      void utils.assistant.listSessions.invalidate();
      setDeleteOpen(false);
      if (active) onDeletedActive();
    },
    onError: (error) => {
      toaster.create({ title: "Không thể xoá", description: error.message, type: "error" });
    },
  });

  return (
    <>
      <Flex
        align="center"
        gap={1}
        px={3}
        py={2}
        rounded="l2"
        bg={active ? "bg.emphasized" : undefined}
        _hover={{ bg: active ? "bg.emphasized" : "bg.muted" }}
        cursor="pointer"
        onClick={onSelect}
      >
        <Text flex={1} fontSize="sm" lineClamp={1}>
          {session.title || "Trò chuyện chưa đặt tên"}
        </Text>
        <MenuRoot positioning={{ placement: "bottom-end" }}>
          <MenuTrigger asChild>
            <IconButton
              variant="ghost"
              size="xs"
              aria-label="Thao tác"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={14} />
            </IconButton>
          </MenuTrigger>
          <MenuContent minW="10rem">
            <MenuItemGroup>
              <MenuItem
                value="rename"
                onClick={(e) => {
                  e.stopPropagation();
                  setTitleDraft(session.title ?? "");
                  setRenameOpen(true);
                }}
              >
                <Pencil size={16} />
                Đổi tên
              </MenuItem>
              <MenuItem
                value="delete"
                color="fg.error"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteOpen(true);
                }}
              >
                <Trash2 size={16} />
                Xoá
              </MenuItem>
            </MenuItemGroup>
          </MenuContent>
        </MenuRoot>
      </Flex>

      <DialogRoot open={renameOpen} onOpenChange={(e) => setRenameOpen(e.open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi tên phiên trò chuyện</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Field label="Tên">
              <Input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Huỷ
            </Button>
            <Button
              onClick={() => rename.mutate({ id: session.id, title: titleDraft.trim() || "Trò chuyện" })}
              loading={rename.isPending}
            >
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      <DialogRoot role="alertdialog" open={deleteOpen} onOpenChange={(e) => setDeleteOpen(e.open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá phiên trò chuyện này?</DialogTitle>
          </DialogHeader>
          <DialogBody>Bạn có thể khôi phục nếu cần — dữ liệu chỉ bị ẩn khỏi danh sách.</DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Huỷ
            </Button>
            <Button colorPalette="red" onClick={() => remove.mutate({ id: session.id })} loading={remove.isPending}>
              Xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </>
  );
}
