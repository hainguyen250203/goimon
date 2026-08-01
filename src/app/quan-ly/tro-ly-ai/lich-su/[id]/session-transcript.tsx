"use client";

import NextLink from "next/link";
import { Badge, Box, Button, Flex, Separator, Stack, Text } from "@chakra-ui/react";
import { ArrowLeft, MessageSquare } from "lucide-react";
import type { UIMessage } from "ai";

import { EmptyState } from "~/components/ui/empty-state";
import { api } from "~/trpc/react";
import { formatDateTime } from "~/lib/format-order";
import { MessagePart } from "../../message-part";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Flex justify="space-between" align="center">
      <Text fontSize="sm" color="fg.muted">
        {label}
      </Text>
      <Text fontSize="sm">{value}</Text>
    </Flex>
  );
}

function TranscriptMessage({ message }: { message: UIMessage }) {
  return (
    <Flex justify={message.role === "user" ? "flex-end" : "flex-start"} minW={0}>
      <Box
        maxW="42rem"
        minW={0}
        rounded="l3"
        px={message.role === "user" ? 4 : 0}
        py={message.role === "user" ? 3 : 0}
        bg={message.role === "user" ? "bg.emphasized" : undefined}
      >
        <Stack gap={2} minW={0}>
          {message.parts.map((part, i) => (
            <MessagePart key={i} part={part} role={message.role} />
          ))}
        </Stack>
      </Box>
    </Flex>
  );
}

/** Xem lại (read-only) 1 phiên chat AI của user bất kỳ — trang giám sát
 * superadmin, không có ô nhập/nút gửi, không mount useChat. */
export function SessionTranscript({ id }: { id: number }) {
  const { data } = api.assistant.getSessionDetail.useQuery({ id });

  if (data === null) {
    return (
      <EmptyState
        icon={<MessageSquare size={28} />}
        title="Không tìm thấy phiên trò chuyện."
      />
    );
  }
  if (!data) return null;

  const { session, messages } = data;
  const uiMessages: UIMessage[] = messages.map(
    (m) => ({ id: String(m.id), role: m.role, parts: m.parts }) as UIMessage,
  );

  return (
    <Stack gap={4}>
      <Button asChild variant="ghost" size="sm" alignSelf="flex-start">
        <NextLink href="/quan-ly/tro-ly-ai/lich-su">
          <ArrowLeft size={16} />
          Quay lại danh sách
        </NextLink>
      </Button>

      <Box borderWidth="1px" rounded="l3" p={4} bg="bg.panel">
        <Stack gap={2}>
          <Flex justify="space-between" align="center">
            <Text fontSize="lg" fontWeight="semibold">
              {session.title ?? "Chưa đặt tên"}
            </Text>
            {session.deletedAt ? (
              <Badge colorPalette="red" variant="solid" rounded="full" size="sm" flexShrink={0}>
                Đã xoá
              </Badge>
            ) : null}
          </Flex>
          <InfoRow label="Chủ sở hữu" value={session.ownerName} />
          <InfoRow label="Tạo lúc" value={formatDateTime(session.createdAt)} />
          <InfoRow label="Cập nhật lúc" value={formatDateTime(session.updatedAt)} />
        </Stack>
      </Box>

      <Separator />

      {uiMessages.length === 0 ? (
        <EmptyState icon={<MessageSquare size={28} />} title="Phiên này chưa có tin nhắn nào." />
      ) : (
        <Stack gap={4}>
          {uiMessages.map((message) => (
            <TranscriptMessage key={message.id} message={message} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
