"use client";

import { useState } from "react";
import { IconButton } from "@chakra-ui/react";
import { Eye, History, MoreHorizontal } from "lucide-react";

import {
  MenuContent,
  MenuItem,
  MenuItemGroup,
  MenuRoot,
  MenuTrigger,
} from "~/components/ui/menu";
import type { OrderListItem } from "~/modules/order/domain/order-list-item.entity";
import { OrderDetailDialog } from "./order-detail-dialog";
import { OrderHistoryDialog } from "./order-history-dialog";

export function OrderRowActions({ row }: { row: OrderListItem }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <>
      <MenuRoot positioning={{ placement: "bottom-end" }}>
        <MenuTrigger asChild>
          <IconButton variant="ghost" size="sm" aria-label="Thao tác">
            <MoreHorizontal size={16} />
          </IconButton>
        </MenuTrigger>
        <MenuContent minW="10rem">
          <MenuItemGroup>
            <MenuItem value="detail" onClick={() => setDetailOpen(true)}>
              <Eye size={16} />
              Xem chi tiết
            </MenuItem>
            <MenuItem value="history" onClick={() => setHistoryOpen(true)}>
              <History size={16} />
              Xem lịch sử
            </MenuItem>
          </MenuItemGroup>
        </MenuContent>
      </MenuRoot>

      <OrderDetailDialog open={detailOpen} onOpenChange={setDetailOpen} order={row} />
      <OrderHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} orderId={row.id} />
    </>
  );
}
