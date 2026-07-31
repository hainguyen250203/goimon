"use client";

import { useState, type ReactNode } from "react";
import { Box, Code, Heading, IconButton, Link, List, Separator, Stack, Table, Text } from "@chakra-ui/react";
import { Check, Copy } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/** react-markdown truyền `children` của node code dạng string (hoặc mảng
 * string/element lồng nhau) — gom lại thành text thuần để copy vào clipboard. */
function toPlainText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toPlainText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return toPlainText((node as { props?: { children?: ReactNode } }).props?.children);
  }
  return "";
}

function CodeBlock({ className, children }: { className?: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(toPlainText(children));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API có thể bị chặn (context không secure) — bỏ qua lặng lẽ.
    }
  };

  return (
    <Box position="relative" w="full" minW={0}>
      <IconButton
        aria-label="Sao chép code"
        size="xs"
        variant="subtle"
        position="absolute"
        top={2}
        right={2}
        onClick={handleCopy}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </IconButton>
      <Box
        as="pre"
        w="full"
        maxW="full"
        minW={0}
        fontSize="xs"
        fontFamily="mono"
        bg="bg.muted"
        color="fg"
        p={3}
        pr={10}
        rounded="l2"
        overflowX="auto"
        whiteSpace="pre"
      >
        <Box as="code" className={className}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

// Map thẻ markdown -> component Chakra, giữ cùng size chữ (fontSize="sm")
// với phần còn lại của khung chat (xem message-part.tsx) — model hay trả lời
// kèm heading/bold/list/code block dù system prompt không ép, nhưng UI trước
// đây hiện nguyên văn "**...**"/"# ..." thay vì render thật.
const MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => (
    <Text fontSize="sm" lineHeight="1.6">
      {children}
    </Text>
  ),
  h1: ({ children }) => (
    <Heading size="sm" mt={1}>
      {children}
    </Heading>
  ),
  h2: ({ children }) => (
    <Heading size="sm" mt={1}>
      {children}
    </Heading>
  ),
  h3: ({ children }) => (
    <Heading size="xs" mt={1}>
      {children}
    </Heading>
  ),
  strong: ({ children }) => (
    <Text as="strong" fontWeight="semibold">
      {children}
    </Text>
  ),
  em: ({ children }) => <Text as="em">{children}</Text>,
  a: ({ href, children }) => (
    <Link href={href} target="_blank" rel="noopener noreferrer" colorPalette="blue">
      {children}
    </Link>
  ),
  ul: ({ children }) => (
    <List.Root fontSize="sm" gap={1} ps={4}>
      {children}
    </List.Root>
  ),
  ol: ({ children }) => (
    <List.Root as="ol" fontSize="sm" gap={1} ps={4} listStyleType="decimal">
      {children}
    </List.Root>
  ),
  li: ({ children }) => <List.Item>{children}</List.Item>,
  hr: () => <Separator my={1} />,
  blockquote: ({ children }) => (
    <Box borderLeftWidth="3px" borderColor="border" pl={3} color="fg.muted">
      {children}
    </Box>
  ),
  code: ({ className, children }) => {
    // Code block (```lang) đi kèm className "language-xxx" do remark gắn —
    // code inline (`x`) thì không có className, tách 2 trường hợp ở đây vì
    // react-markdown gọi chung 1 component "code" cho cả 2 dạng.
    if (className) {
      return <CodeBlock className={className}>{children}</CodeBlock>;
    }
    return (
      <Code fontSize="xs" rounded="l1">
        {children}
      </Code>
    );
  },
  table: ({ children }) => (
    <Box overflowX="auto" minW={0} borderWidth="1px" rounded="l2">
      <Table.Root size="sm" variant="outline">
        {children}
      </Table.Root>
    </Box>
  ),
  thead: ({ children }) => <Table.Header>{children}</Table.Header>,
  tbody: ({ children }) => <Table.Body>{children}</Table.Body>,
  tr: ({ children }) => <Table.Row>{children}</Table.Row>,
  th: ({ children }) => <Table.ColumnHeader fontSize="xs">{children}</Table.ColumnHeader>,
  td: ({ children }) => <Table.Cell fontSize="xs">{children}</Table.Cell>,
};

export function AssistantMarkdown({ text }: { text: string }) {
  return (
    <Stack gap={2} minW={0}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
        {text}
      </ReactMarkdown>
    </Stack>
  );
}
