"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Box, Flex, IconButton, Text } from "@chakra-ui/react";
import { ArrowLeft, ChefHat, ClipboardCheck, Printer } from "lucide-react";

import { toaster } from "~/components/ui/toaster";
import { api } from "~/trpc/react";
import { useOrderCartStore } from "../../../order-cart.store";
import { DraftCartPanel } from "./draft-cart-panel";
import { SubmittedOrderPanel } from "./submitted-order-panel";

type Tab = "draft" | "submitted";

export function OrderCartView({ tableId }: { tableId: number }) {
  const router = useRouter();
  const utils = api.useUtils();
  const [order] = api.order.getTableOrder.useSuspenseQuery({ tableId });
  const [tables] = api.order.listTablesForOrdering.useSuspenseQuery();
  const table = tables.find((t) => t.id === tableId);
  const draftCount = useOrderCartStore((s) => s.draftCarts[tableId]?.length ?? 0);

  const [tab, setTab] = useState<Tab>(draftCount > 0 || !order ? "draft" : "submitted");

  const hasSubmittedItems = !!order && order.items.length > 0;

  const printBill = api.order.printBill.useMutation({
    onSuccess: () => {
      toaster.create({
        title: "Đã in hoá đơn",
        description: "Chưa kết nối máy in thật — chỉ cập nhật trạng thái đơn.",
        type: "success",
      });
      void utils.order.getTableOrder.invalidate({ tableId });
    },
    onError: (error) => {
      toaster.create({ title: "Không in được bill", description: error.message, type: "error" });
    },
  });

  return (
    <Flex direction="column" flex={1} minH={0}>
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
          onClick={() => router.push(`/goi-mon/ban/${tableId}`)}
        >
          <ArrowLeft />
        </IconButton>
        <Text fontSize={{ base: "sm", lg: "md" }} fontWeight="semibold" flex={1}>
          {table?.name ?? `Bàn ${tableId}`}
        </Text>
        {order && (
          <IconButton
            aria-label="In hoá đơn"
            size={{ base: "xs", lg: "sm" }}
            variant="outline"
            loading={printBill.isPending}
            onClick={() => printBill.mutate({ orderId: order.id })}
          >
            <Printer />
          </IconButton>
        )}
      </Flex>

      <Flex flexShrink={0} bg="bg" borderBottomWidth="1px" borderColor="border">
        <Flex
          flex={1}
          direction="column"
          align="center"
          justify="center"
          py={{ base: 2, lg: 3 }}
          gap={1}
          cursor="pointer"
          borderBottomWidth="2px"
          borderBottomColor={tab === "draft" ? "blue.solid" : "transparent"}
          onClick={() => setTab("draft")}
        >
          <Flex align="center" gap={{ base: 1, lg: 2 }}>
            <ChefHat size={14} color={tab === "draft" ? "var(--chakra-colors-blue-fg)" : "var(--chakra-colors-fg-muted)"} />
            <Text
              fontSize={{ base: "xs", lg: "sm" }}
              fontWeight={tab === "draft" ? "semibold" : "medium"}
              color={tab === "draft" ? "blue.fg" : "fg.muted"}
            >
              Món đang gọi
            </Text>
            {draftCount > 0 && (
              <Badge colorPalette="blue" variant="solid" rounded="full" size="sm">
                {draftCount}
              </Badge>
            )}
          </Flex>
        </Flex>

        <Flex
          flex={1}
          direction="column"
          align="center"
          justify="center"
          py={{ base: 2, lg: 3 }}
          gap={1}
          cursor={order ? "pointer" : "not-allowed"}
          opacity={order ? 1 : 0.5}
          borderBottomWidth="2px"
          borderBottomColor={tab === "submitted" ? "blue.solid" : "transparent"}
          onClick={() => order && setTab("submitted")}
        >
          <Flex align="center" gap={{ base: 1, lg: 2 }}>
            <ClipboardCheck size={14} color={tab === "submitted" ? "var(--chakra-colors-blue-fg)" : "var(--chakra-colors-fg-muted)"} />
            <Text
              fontSize={{ base: "xs", lg: "sm" }}
              fontWeight={tab === "submitted" ? "semibold" : "medium"}
              color={tab === "submitted" ? "blue.fg" : "fg.muted"}
            >
              Món đã gọi
            </Text>
            {hasSubmittedItems && (
              <Badge colorPalette="blue" variant="solid" rounded="full" size="sm">
                {order!.items.length}
              </Badge>
            )}
          </Flex>
        </Flex>
      </Flex>

      <Box flex={1} minH={0} display="flex" flexDirection="column" overflow="hidden">
        {tab === "draft" ? (
          <DraftCartPanel tableId={tableId} onSubmitted={() => setTab("submitted")} />
        ) : order ? (
          <SubmittedOrderPanel tableId={tableId} order={order} />
        ) : null}
      </Box>
    </Flex>
  );
}
