"use client";

import { useRouter } from "nextjs-toploader/app";
import { Flex, IconButton, Text } from "@chakra-ui/react";
import { ArrowLeft } from "lucide-react";

/** Header dùng chung cho mọi trang con (back + tiêu đề) trong luồng /goi-mon. */
export function PageHeader({ title, backHref }: { title: string; backHref: string }) {
  const router = useRouter();

  return (
    <Flex
      flexShrink={0}
      align="center"
      gap={2}
      p={{ base: 2, lg: 3 }}
      bg="bg"
      borderBottomWidth="1px"
      borderColor="border"
    >
      <IconButton
        aria-label="Quay lại"
        size={{ base: "xs", lg: "sm" }}
        variant="ghost"
        onClick={() => router.push(backHref)}
      >
        <ArrowLeft size={16} />
      </IconButton>
      <Text fontSize={{ base: "sm", lg: "md" }} fontWeight="semibold">
        {title}
      </Text>
    </Flex>
  );
}
