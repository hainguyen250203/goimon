"use client";

import { Button, Flex, Stack, Text } from "@chakra-ui/react";

import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "~/components/ui/dialog";
import { ListViewTable, type ListViewColumn } from "~/components/data-table/list-view-table";
import { api } from "~/trpc/react";
import { formatVnd } from "~/lib/format-order";
import type { ShiftItemBreakdownRow } from "~/modules/order/domain/order.repository";

// Cùng pattern InfoRow đã dùng ở order-detail-dialog.tsx (dialog cùng khu
// vực /quan-ly) — giữ đồng nhất, không tự bịa style riêng cho dialog này.
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

const columns: ListViewColumn<ShiftItemBreakdownRow>[] = [
  { key: "menuItemId", header: "Mã SP", cell: (row) => row.menuItemId, width: "5rem" },
  { key: "itemName", header: "Tên sản phẩm", cell: (row) => row.itemName },
  {
    key: "quantity",
    header: "Số lượng",
    cell: (row) => row.quantity,
    textAlign: "right",
    width: "6rem",
  },
  {
    key: "subtotal",
    header: "Thành tiền",
    cell: (row) => formatVnd(row.subtotal),
    textAlign: "right",
    width: "8rem",
  },
];

export function ShiftSummaryDialog({
  open,
  onOpenChange,
  shiftId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shiftId: number;
}) {
  // Chỉ fetch khi dialog thật sự mở — ShiftRowActions render cho MỌI dòng
  // trong danh sách ca, không có enabled thì mỗi dòng gọi API ngay lúc trang
  // tải xong dù chưa ai mở dialog.
  const summaryQuery = api.shift.getSummary.useQuery({ shiftId }, { enabled: open });
  const itemsQuery = api.order.getShiftItemBreakdown.useQuery({ shiftId }, { enabled: open });

  return (
    <DialogRoot open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <DialogContent maxW={{ base: "calc(100vw - 24px)", md: "600px", lg: "700px" }} mx="auto">
        <DialogHeader>
          <DialogTitle>Tổng kết ca làm</DialogTitle>
        </DialogHeader>
        <DialogCloseTrigger />
        <DialogBody>
          <Stack gap={4}>
            <InfoRow
              label="Tổng doanh thu"
              value={summaryQuery.isLoading ? "…" : formatVnd(summaryQuery.data?.totalRevenue ?? 0)}
            />
            <ListViewTable
              columns={columns}
              data={itemsQuery.data}
              rowKey={(row) => row.menuItemId}
              isLoading={itemsQuery.isFetching}
              emptyMessage="Ca này chưa có món nào được bán."
            />
            {/* Thành tiền tính theo giá gốc từng món — nếu ca có đơn dùng
                khuyến mãi, tổng cột này sẽ cao hơn "Tổng doanh thu" (đã trừ
                giảm giá). Không phải lỗi tính toán. */}
            <Text fontSize="xs" color="fg.muted">
              * Thành tiền tính theo giá gốc từng món, chưa trừ khuyến mãi nếu đơn có áp dụng.
            </Text>
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
