"use client";

import { useState } from "react";
import { Button, IconButton } from "@chakra-ui/react";
import { Eye, History, MoreHorizontal, Trash2 } from "lucide-react";

import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  MenuContent,
  MenuItem,
  MenuItemGroup,
  MenuRoot,
  MenuTrigger,
} from "~/components/ui/menu";
import { toaster } from "~/components/ui/toaster";
import { api } from "~/trpc/react";
import type { OrderListItem } from "~/modules/order/domain/order-list-item.entity";
import { OrderHistoryDialog } from "~/components/order-timeline/order-history-dialog";
import { OrderDetailDialog } from "./order-detail-dialog";

export function OrderRowActions({
  row,
  canDelete,
}: {
  row: OrderListItem;
  /** Chỉ superadmin xoá được (bất kỳ trạng thái order nào) — chặn thật ở
   * order.router.ts, đây chỉ là ẩn/hiện nút cho đúng UX. */
  canDelete: boolean;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const utils = api.useUtils();

  const remove = api.order.delete.useMutation({
    onSuccess: () => {
      toaster.create({ title: "Đã xoá đơn hàng", type: "success" });
      setDeleteConfirmOpen(false);
      void utils.order.list.invalidate();
    },
    onError: (error) => {
      toaster.create({ title: "Không thể xoá", description: error.message, type: "error" });
    },
  });

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
            {/* Đơn đã xoá thì không cần xoá lại — nút chỉ hiện với row chưa xoá. */}
            {canDelete && !row.deletedAt && (
              <MenuItem value="delete" color="fg.error" onClick={() => setDeleteConfirmOpen(true)}>
                <Trash2 size={16} />
                Xoá đơn
              </MenuItem>
            )}
          </MenuItemGroup>
        </MenuContent>
      </MenuRoot>

      <OrderDetailDialog open={detailOpen} onOpenChange={setDetailOpen} order={row} />
      <OrderHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} orderId={row.id} />

      <DialogRoot
        role="alertdialog"
        open={deleteConfirmOpen}
        onOpenChange={(e) => setDeleteConfirmOpen(e.open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá đơn hàng #{row.id}?</DialogTitle>
          </DialogHeader>
          <DialogBody>Đơn hàng này sẽ bị xoá. Hành động này không thể hoàn tác.</DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Huỷ
            </Button>
            <Button
              colorPalette="red"
              onClick={() => remove.mutate({ orderId: row.id })}
              loading={remove.isPending}
            >
              Xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </>
  );
}
