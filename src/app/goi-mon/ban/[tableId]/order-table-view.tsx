"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Box, Flex, IconButton, Text } from "@chakra-ui/react";
import {
  ArrowLeft,
  ChefHat,
  ClipboardCheck,
  History,
  LayoutGrid,
  Move,
  Printer,
  Split,
  UtensilsCrossed,
} from "lucide-react";

import { toaster } from "~/components/ui/toaster";
import { OrderHistoryDialog } from "~/components/order-timeline/order-history-dialog";
import { api } from "~/trpc/react";
import { EMPTY_DRAFT_ITEMS, getCartTotalItems, useOrderCartStore } from "../../order-cart.store";
import { MenuBrowserPanel } from "./menu-browser";
import { DraftCartPanel } from "./draft-cart-panel";
import { SubmittedOrderPanel } from "./submitted-order-panel";
import { TableSwitcherDialog } from "./table-switcher-dialog";
import { MoveOrderTableDialog } from "./move-order-table-dialog";
import { TransferItemsDialog } from "./transfer-items-dialog";

type Tab = "menu" | "draft" | "submitted";

function TabButton({
  active,
  disabled,
  icon,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <Flex
      flex={1}
      direction="column"
      align="center"
      justify="center"
      py={{ base: 2, lg: 3 }}
      gap={1}
      cursor={disabled ? "not-allowed" : "pointer"}
      opacity={disabled ? 0.5 : 1}
      borderBottomWidth="2px"
      borderBottomColor={active ? "blue.solid" : "transparent"}
      onClick={disabled ? undefined : onClick}
    >
      <Flex align="center" gap={{ base: 1, lg: 2 }}>
        <Box color={active ? "blue.fg" : "fg.muted"} display="flex">
          {icon}
        </Box>
        <Text
          fontSize={{ base: "xs", lg: "sm" }}
          fontWeight={active ? "semibold" : "medium"}
          color={active ? "blue.fg" : "fg.muted"}
        >
          {label}
        </Text>
        {badge != null && badge > 0 && (
          <Badge colorPalette="blue" variant="solid" rounded="full" size="sm">
            {badge}
          </Badge>
        )}
      </Flex>
    </Flex>
  );
}

/**
 * Trang gộp toàn bộ luồng "1 bàn" — Chọn món, Đang gọi, Đã gọi cùng 1 trang
 * (đổi tab thay vì chuyển page), + đổi bàn/xem lịch sử/in bill ngay tại chỗ
 * qua dialog — thay cho luồng cũ 3-4 cấp trang lồng nhau, đỡ phải bấm back
 * nhiều lần khi đổi bàn hoặc xem việc đã làm.
 */
export function OrderTableView({ tableId }: { tableId: number }) {
  const router = useRouter();
  const utils = api.useUtils();
  const [order] = api.order.getTableOrder.useSuspenseQuery({ tableId });
  const [tables] = api.order.listTablesForOrdering.useSuspenseQuery();
  const table = tables.find((t) => t.id === tableId);
  const draftItems = useOrderCartStore((s) => s.draftCarts[tableId] ?? EMPTY_DRAFT_ITEMS);
  const draftCount = getCartTotalItems(draftItems);

  const [tab, setTab] = useState<Tab>(() => (draftCount > 0 ? "draft" : order ? "submitted" : "menu"));
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [moveTableOpen, setMoveTableOpen] = useState(false);
  const [transferItemsOpen, setTransferItemsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Xoá hết món ở tab "Món đã gọi" thì đơn bị huỷ — order trả về null sau khi
  // invalidate, tự chuyển về tab "Chọn món" để tránh nội dung trống trơn.
  useEffect(() => {
    if (!order && tab === "submitted") setTab("menu");
  }, [order, tab]);

  const printBill = api.order.printBill.useMutation({
    // Giữ lại toast NÀY (khác các mutation khác trong luồng gọi món đã bỏ
    // toast success) — in bill không có phản hồi UI nào khác (không chuyển
    // trang/đổi tab/hiện thêm gì), và cần truyền đạt caveat "chưa có máy in
    // thật" mà không chỗ nào khác trong UI nói tới.
    onSuccess: () => {
      toaster.create({
        title: "Đã in hoá đơn",
        description: "Chưa kết nối máy in thật",
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
          onClick={() => router.push("/goi-mon")}
        >
          <ArrowLeft size={16} />
        </IconButton>
        <Text fontSize={{ base: "sm", lg: "md" }} fontWeight="semibold" flex={1} lineClamp={1}>
          {table?.name ?? `Bàn ${tableId}`}
        </Text>
        <IconButton
          aria-label="Xem bàn khác"
          size={{ base: "xs", lg: "sm" }}
          variant="outline"
          onClick={() => setSwitcherOpen(true)}
        >
          <LayoutGrid size={16} />
        </IconButton>
        {order && (
          <IconButton
            aria-label="Chuyển bàn"
            size={{ base: "xs", lg: "sm" }}
            variant="outline"
            onClick={() => setMoveTableOpen(true)}
          >
            <Move size={16} />
          </IconButton>
        )}
        {order && (
          <IconButton
            aria-label="Chuyển món sang bàn khác"
            size={{ base: "xs", lg: "sm" }}
            variant="outline"
            onClick={() => setTransferItemsOpen(true)}
          >
            <Split size={16} />
          </IconButton>
        )}
        {order && (
          <IconButton
            aria-label="Lịch sử đơn hàng"
            size={{ base: "xs", lg: "sm" }}
            variant="outline"
            onClick={() => setHistoryOpen(true)}
          >
            <History size={16} />
          </IconButton>
        )}
        {order && (
          <IconButton
            aria-label="In hoá đơn"
            size={{ base: "xs", lg: "sm" }}
            variant="outline"
            loading={printBill.isPending}
            onClick={() => printBill.mutate({ orderId: order.id })}
          >
            <Printer size={16} />
          </IconButton>
        )}
      </Flex>

      <Flex flexShrink={0} bg="bg" borderBottomWidth="1px" borderColor="border">
        <TabButton
          active={tab === "menu"}
          icon={<UtensilsCrossed size={14} />}
          label="Chọn món"
          onClick={() => setTab("menu")}
        />
        <TabButton
          active={tab === "draft"}
          icon={<ChefHat size={14} />}
          label="Đang gọi"
          badge={draftCount}
          onClick={() => setTab("draft")}
        />
        <TabButton
          active={tab === "submitted"}
          disabled={!order}
          icon={<ClipboardCheck size={14} />}
          label="Đã gọi"
          badge={order?.items.length}
          onClick={() => setTab("submitted")}
        />
      </Flex>

      {/* Giữ cả 3 panel trong DOM, chỉ ẩn/hiện bằng display — tránh mất vị
          trí cuộn mỗi lần đổi tab. */}
      <Box flex={1} minH={0} display="flex" flexDirection="column" overflow="hidden">
        <Box display={tab === "menu" ? "flex" : "none"} flexDirection="column" flex={1} minH={0}>
          <MenuBrowserPanel tableId={tableId} />
        </Box>
        <Box display={tab === "draft" ? "flex" : "none"} flexDirection="column" flex={1} minH={0}>
          <DraftCartPanel tableId={tableId} onSubmitted={() => setTab("submitted")} />
        </Box>
        {order && (
          <Box display={tab === "submitted" ? "flex" : "none"} flexDirection="column" flex={1} minH={0}>
            <SubmittedOrderPanel tableId={tableId} order={order} />
          </Box>
        )}
      </Box>

      <TableSwitcherDialog open={switcherOpen} onOpenChange={setSwitcherOpen} currentTableId={tableId} />
      {order && (
        <>
          <MoveOrderTableDialog
            open={moveTableOpen}
            onOpenChange={setMoveTableOpen}
            currentTableId={tableId}
            orderId={order.id}
          />
          <TransferItemsDialog open={transferItemsOpen} onOpenChange={setTransferItemsOpen} order={order} />
          <OrderHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} orderId={order.id} />
        </>
      )}
    </Flex>
  );
}
