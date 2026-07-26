"use client";

import { useRouter } from "next/navigation";
import { Flex, IconButton, Text } from "@chakra-ui/react";
import { ArrowLeft } from "lucide-react";

export function HistoryHeader({ title }: { title: string }) {
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
        onClick={() => router.push("/goi-mon/cua-hang")}
      >
        <ArrowLeft />
      </IconButton>
      <Text fontSize={{ base: "sm", lg: "md" }} fontWeight="semibold">
        {title}
      </Text>
    </Flex>
  );
}
