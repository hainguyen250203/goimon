"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box, Flex, IconButton, Image, Spinner, Stack, Text, Textarea } from "@chakra-ui/react";
import { ArrowUp, Square } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, type UIMessage } from "ai";

import { api } from "~/trpc/react";
import { toaster } from "~/components/ui/toaster";
import { MessagePart } from "./message-part";
import { FloatingAssistantAvatar } from "~/modules/assistant/ui/floating-avatar";

const SUGGESTIONS = [
  "Doanh thu ca gần nhất hôm nay là bao nhiêu?",
  "Tổng doanh thu theo từng ca trong tuần này?",
  "Có bao nhiêu đơn hàng đang mở?",
  "Món ăn nào bán chạy nhất tuần này?",
];

// Chỉ hiện ở khoảng lặng THẬT (chưa có chữ/tool chip nào nói lên việc đang
// làm) — xoay vòng vài câu cho đỡ "trơ", không phải tiến trình thật.
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
  userName,
}: {
  sessionId?: number;
  onSessionCreated: (id: number) => void;
  userName: string;
}) {
  // CHỈ chốt sessionId lúc MOUNT — nếu dùng thẳng prop `sessionId` sống, lúc
  // phiên được tạo NGẦM khi gửi tin đầu (xem submit() ở ChatPanelInner), query
  // này sẽ tự chuyển enabled=true/isLoading=true NGAY GIỮA LÚC đang stream, ép
  // nhánh dưới trả về Spinner → unmount ChatPanelInner → mất luôn câu trả lời
  // đang chảy dở (bug thật: phải bấm 2 lần mới thấy trả lời). Phiên tự tạo
  // trong chính component này thì chắc chắn rỗng, không cần fetch lại làm gì.
  const [initialSessionId] = useState(sessionId);
  const { data, isLoading } = api.assistant.getSession.useQuery(
    { id: initialSessionId! },
    { enabled: initialSessionId !== undefined },
  );

  // Chặn render ChatPanelInner (và mount useChat) tới khi biết chắc nội dung —
  // nếu không, useChat sẽ "chốt" initialMessages=[] trong lúc query còn tải,
  // gây chớp màn hình chào rồi mới tới lịch sử thật (sessionId undefined =
  // chat mới thì biết ngay là rỗng, không cần chờ).
  if (initialSessionId !== undefined && isLoading) {
    return (
      <Flex flex={1} align="center" justify="center" h="full">
        <Spinner />
      </Flex>
    );
  }

  const initialMessages: UIMessage[] =
    data?.messages.map((m) => ({ id: String(m.id), role: m.role, parts: m.parts }) as UIMessage) ?? [];

  return (
    <ChatPanelInner
      sessionId={sessionId}
      onSessionCreated={onSessionCreated}
      initialMessages={initialMessages}
      userName={userName}
    />
  );
}

function ChatPanelInner({
  sessionId,
  onSessionCreated,
  initialMessages,
  userName,
}: {
  sessionId?: number;
  onSessionCreated: (id: number) => void;
  initialMessages: UIMessage[];
  userName: string;
}) {
  const utils = api.useUtils();
  const [input, setInput] = useState("");
  const [followups, setFollowups] = useState<string[]>([]);

  // Phiên có thể được tạo NGẦM lúc gửi tin đầu (xem submit()) — dùng ref thay
  // vì `prepareSendMessagesRequest` cần đọc giá trị MỚI NHẤT tại thời điểm gửi
  // request, không phải giá trị lúc transport được tạo (chỉ tạo 1 lần).
  const sessionIdRef = useRef(sessionId);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const createSession = api.assistant.createSession.useMutation();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/assistant/chat",
        prepareSendMessagesRequest: ({ messages }) => {
          const last = messages[messages.length - 1];
          const text =
            last?.role === "user"
              ? last.parts
                  .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
                  .map((p) => p.text)
                  .join("\n")
              : "";
          return { body: { sessionId: sessionIdRef.current, text } };
        },
      }),
    [],
  );

  const { messages, sendMessage, status, error, stop, regenerate, clearError } = useChat({
    messages: initialMessages,
    transport,
    onData: (part) => {
      if (part.type === "data-followups" && Array.isArray(part.data)) {
        setFollowups(part.data.filter((q): q is string => typeof q === "string"));
      }
    },
    onFinish: () => {
      // Cập nhật sidebar: phiên mới + tên tự đặt sau lượt đầu.
      void utils.assistant.listSessions.invalidate();
    },
  });

  const busy = status === "submitted" || status === "streaming";

  // Neo cuối danh sách tin nhắn — mở phiên có sẵn lịch sử phải thấy NGAY tin
  // nhắn mới nhất, không bắt tự cuộn tay. useLayoutEffect (chạy trước khi
  // browser paint) để tránh nháy thấy đầu danh sách rồi mới nhảy xuống cuối.
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tự cuộn mượt theo khi có tin nhắn mới/đang stream, để luôn thấy nội dung
  // mới nhất mà không cần tự cuộn tay giữa chừng.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const submit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    setFollowups([]);

    if (!sessionIdRef.current) {
      try {
        const created = await createSession.mutateAsync({});
        sessionIdRef.current = created.id;
        onSessionCreated(created.id);
        void utils.assistant.listSessions.invalidate();
      } catch (err) {
        toaster.create({
          title: "Không thể bắt đầu trò chuyện",
          description: err instanceof Error ? err.message : undefined,
          type: "error",
        });
        return;
      }
    }

    void sendMessage({ text: trimmed });
  };

  const isEmpty = messages.length === 0;

  // "Đang nghĩ" chỉ hiện ở khoảng lặng THẬT — không hiện khi chữ đang chảy
  // hoặc tool đang chạy (tool chip đã có spinner riêng của nó), tránh cảm
  // giác lặp/đứng yên như bản cũ hiện suốt cả lúc đợi.
  const lastMessage = messages[messages.length - 1];
  const lastPart =
    busy && lastMessage?.role === "assistant" ? lastMessage.parts[lastMessage.parts.length - 1] : undefined;
  const textFlowing = lastPart?.type === "text" && lastPart.state !== "done";
  const toolInProgress =
    !!lastPart &&
    isToolUIPart(lastPart) &&
    (lastPart.state === "input-streaming" || lastPart.state === "input-available");
  const showThinking = busy && !textFlowing && !toolInProgress;

  return (
    <Flex direction="column" flex={1} minW={0} h="full">
      {isEmpty ? (
        <Flex flex={1} direction="column" align="center" justify="center" gap={6} px={4}>
          <FloatingAssistantAvatar />
          <Stack gap={1} textAlign="center">
            <Text fontSize="lg" fontWeight="semibold">
              Dạ, chào anh {userName}! Anh cần em giúp gì ạ?
            </Text>
            <Text fontSize="sm" color="fg.muted">
              Đơn hàng, doanh thu, món ăn, khuyến mãi... anh cứ hỏi em thoải mái nha!
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
                    <MessagePart key={i} part={part} role={message.role} />
                  ))}
                </Stack>
              </Box>
            </Flex>
          ))}
          {showThinking && <ThinkingIndicator />}
          {error && (
            <Flex align="center" gap={3} borderWidth="1px" borderColor="red.muted" bg="red.subtle" rounded="l2" px={3} py={2}>
              <Text flex={1} fontSize="sm" color="fg.error">
                {error.message || "Có lỗi xảy ra."}
              </Text>
              <Box
                as="button"
                fontSize="xs"
                fontWeight="medium"
                px={3}
                py={1.5}
                rounded="l2"
                borderWidth="1px"
                _hover={{ bg: "bg.muted" }}
                onClick={() => {
                  clearError();
                  void regenerate();
                }}
              >
                Thử lại
              </Box>
            </Flex>
          )}
          <div ref={messagesEndRef} />
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
          {busy ? (
            <IconButton aria-label="Dừng" rounded="full" size="sm" variant="outline" onClick={() => void stop()}>
              <Square size={14} />
            </IconButton>
          ) : (
            <IconButton aria-label="Gửi" rounded="full" size="sm" onClick={() => void submit(input)} disabled={!input.trim()}>
              <ArrowUp size={16} />
            </IconButton>
          )}
        </Flex>
      </Flex>
    </Flex>
  );
}
