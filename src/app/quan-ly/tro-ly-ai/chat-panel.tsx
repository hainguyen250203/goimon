"use client";

import { useEffect, useState } from "react";
import { Box, Flex, IconButton, Image, Spinner, Stack, Text, Textarea } from "@chakra-ui/react";
import { ArrowUp } from "lucide-react";

import { api } from "~/trpc/react";
import { toaster } from "~/components/ui/toaster";
import { MessagePart } from "./message-part";
import { FloatingAssistantAvatar } from "~/modules/assistant/ui/floating-avatar";
import type { StoredMessagePart } from "~/modules/assistant/infrastructure/build-message-parts";

const SUGGESTIONS = [
  "Doanh thu ca gần nhất hôm nay là bao nhiêu?",
  "Tổng doanh thu theo từng ca trong tuần này?",
  "Có bao nhiêu đơn hàng đang mở?",
  "Món ăn nào bán chạy nhất tuần này?",
];

type LocalMessage = {
  id: string;
  role: "user" | "assistant";
  parts: StoredMessagePart[];
};

// Không streaming (xem send-message.usecase.ts) nên không biết model đang làm
// gì thật sự — xoay vòng vài câu để phần chờ đỡ "trơ", đỡ cảm giác giật cục
// khi câu trả lời hiện ra 1 lần. Không phải tiến trình thật.
const THINKING_LINES = [
  "Đang tra cứu dữ liệu...",
  "Đang tổng hợp thông tin...",
  "Sắp xong rồi ạ...",
];

function ThinkingIndicator() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % THINKING_LINES.length), 1600);
    return () => clearInterval(timer);
  }, []);
  return (
    <Flex align="center" gap={2}>
      <Box boxSize="6" rounded="l1" overflow="hidden" className="assistant-avatar-glow">
        <Image src="/assistant-avatar.svg" alt="" boxSize="full" />
      </Box>
      <Text fontSize="sm" color="fg.muted">
        {THINKING_LINES[index]}
      </Text>
    </Flex>
  );
}

export function ChatPanel({
  sessionId,
  onSessionCreated,
}: {
  sessionId?: number;
  onSessionCreated: (id: number) => void;
}) {
  const { data, isLoading } = api.assistant.getSession.useQuery(
    { id: sessionId! },
    { enabled: sessionId !== undefined },
  );

  // `ChatPanelInner` chỉ đọc `initialMessages` MỘT LẦN lúc mount (useState) —
  // nếu mount trong lúc query còn đang tải (sessionId có nhưng data chưa về),
  // nó sẽ "chốt" nhầm mảng rỗng mãi mãi dù data đến sau đó, gây 2 lỗi cùng lúc:
  // (1) phải bấm F5 mới thấy lại lịch sử, (2) màn hình chào bị "chớp" qua rồi
  // mới tới lịch sử thật. Chặn render ChatPanelInner tới khi biết chắc chắn
  // nội dung — sessionId undefined (chat mới) thì biết ngay là rỗng, không cần chờ.
  if (sessionId !== undefined && isLoading) {
    return (
      <Flex flex={1} align="center" justify="center" h="full">
        <Spinner />
      </Flex>
    );
  }

  const initialMessages: LocalMessage[] =
    data?.messages.map((m) => ({
      id: String(m.id),
      role: m.role,
      parts: m.parts as StoredMessagePart[],
    })) ?? [];

  return (
    <ChatPanelInner sessionId={sessionId} onSessionCreated={onSessionCreated} initialMessages={initialMessages} />
  );
}

function ChatPanelInner({
  sessionId,
  onSessionCreated,
  initialMessages,
}: {
  sessionId?: number;
  onSessionCreated: (id: number) => void;
  initialMessages: LocalMessage[];
}) {
  const utils = api.useUtils();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<LocalMessage[]>(initialMessages);
  const [followups, setFollowups] = useState<string[]>([]);

  const createSession = api.assistant.createSession.useMutation();
  const send = api.assistant.sendMessage.useMutation();

  const isBusy = send.isPending;

  const submit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    setInput("");
    setFollowups([]);

    let currentSessionId = sessionId;
    if (!currentSessionId) {
      try {
        const session = await createSession.mutateAsync({});
        currentSessionId = session.id;
        onSessionCreated(session.id);
        void utils.assistant.listSessions.invalidate();
      } catch (error) {
        toaster.create({
          title: "Không thể bắt đầu trò chuyện",
          description: error instanceof Error ? error.message : undefined,
          type: "error",
        });
        return;
      }
    }

    // Hiện tin nhắn của người dùng ngay — không cần đợi model trả lời xong.
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: "user", parts: [{ type: "text", text: trimmed }] }]);

    try {
      const result = await send.mutateAsync({ sessionId: currentSessionId, text: trimmed });
      setMessages((prev) => [
        ...prev,
        { id: `local-${Date.now()}-a`, role: "assistant", parts: result.assistantParts },
      ]);
      setFollowups(result.followups);
      void utils.assistant.listSessions.invalidate();
    } catch (error) {
      toaster.create({
        title: "Không trả lời được",
        description: error instanceof Error ? error.message : undefined,
        type: "error",
      });
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <Flex direction="column" flex={1} minW={0} h="full">
      {isEmpty ? (
        <Flex flex={1} direction="column" align="center" justify="center" gap={6} px={4}>
          <FloatingAssistantAvatar />
          <Stack gap={1} textAlign="center">
            <Text fontSize="lg" fontWeight="semibold">
              Chào bạn! Tôi có thể giúp gì cho bạn?
            </Text>
            <Text fontSize="sm" color="fg.muted">
              Hỏi về đơn hàng, doanh thu, món ăn, khuyến mãi... Tôi chỉ đọc dữ liệu, không thể sửa/xoá gì.
            </Text>
          </Stack>
          <Stack gap={2} w="full" maxW="32rem">
            {SUGGESTIONS.map((s) => (
              <Box
                key={s}
                as="button"
                textAlign="left"
                px={4}
                py={3}
                rounded="l2"
                bg="bg.subtle"
                fontSize="sm"
                _hover={{ bg: "bg.muted" }}
                onClick={() => submit(s)}
              >
                {s}
              </Box>
            ))}
          </Stack>
        </Flex>
      ) : (
        <Stack flex={1} overflowY="auto" gap={5} px={{ base: 4, md: 8 }} py={6}>
          {messages.map((message) => (
            <Flex key={message.id} justify={message.role === "user" ? "flex-end" : "flex-start"}>
              <Box
                maxW="42rem"
                rounded="l3"
                px={message.role === "user" ? 4 : 0}
                py={message.role === "user" ? 3 : 0}
                bg={message.role === "user" ? "bg.emphasized" : undefined}
              >
                <Stack gap={2}>
                  {message.parts.map((part, i) => (
                    <MessagePart key={i} part={part} />
                  ))}
                </Stack>
              </Box>
            </Flex>
          ))}
          {isBusy && <ThinkingIndicator />}
        </Stack>
      )}

      {followups.length > 0 && (
        <Flex gap={2} wrap="wrap" px={{ base: 4, md: 8 }} pb={2}>
          {followups.map((q) => (
            <Box
              key={q}
              as="button"
              px={3}
              py={1.5}
              rounded="full"
              borderWidth="1px"
              fontSize="xs"
              _hover={{ bg: "bg.muted" }}
              onClick={() => submit(q)}
            >
              {q}
            </Box>
          ))}
        </Flex>
      )}

      <Flex px={{ base: 4, md: 8 }} pb={6} pt={2}>
        <Flex flex={1} align="flex-end" gap={2} rounded="3xl" borderWidth="1px" bg="bg.panel" px={4} py={2}>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập câu hỏi..."
            rows={1}
            resize="none"
            border="none"
            outline="none"
            _focus={{ boxShadow: "none", outline: "none" }}
            _focusVisible={{ boxShadow: "none", outline: "none" }}
            px={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit(input);
              }
            }}
          />
          <IconButton
            aria-label="Gửi"
            rounded="full"
            size="sm"
            onClick={() => submit(input)}
            disabled={isBusy || !input.trim()}
          >
            <ArrowUp size={16} />
          </IconButton>
        </Flex>
      </Flex>
    </Flex>
  );
}
