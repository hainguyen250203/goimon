"use client";

import { Box, Flex, Separator, Stack, Text } from "@chakra-ui/react";

import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "~/components/ui/dialog";
import { StatusDot } from "~/components/ui/status-dot";
import { ListViewTable, type ListViewColumn } from "~/components/data-table/list-view-table";
import type { OrderListItem, OrderListItemLine } from "~/modules/order/domain/order-list-item.entity";
import { formatDateTime, formatVnd, PAYMENT_METHOD_LABEL, STATUS_DOT_COLOR, STATUS_LABEL } from "~/lib/format-order";

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

const itemColumns: ListViewColumn<OrderListItemLine>[] = [
  { key: "itemName", header: "Tên món", cell: (row) => row.itemName },
  {
    key: "quantity",
    header: "SL",
    cell: (row) => row.quantity,
    textAlign: "right",
    width: "4rem",
  },
  {
    key: "unitPrice",
    header: "Đơn giá",
    cell: (row) => formatVnd(row.unitPrice),
    textAlign: "right",
    width: "7rem",
  },
  {
    key: "subtotal",
    header: "Thành tiền",
    cell: (row) => formatVnd(row.unitPrice * row.quantity),
    textAlign: "right",
    width: "8rem",
  },
];

export function OrderDetailDialog({
  open,
  onOpenChange,
  order,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderListItem;
}) {
  const subtotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return (
    <DialogRoot open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <DialogContent maxW={{ base: "calc(100vw - 24px)", md: "600px", lg: "700px" }} mx="auto">
        <DialogHeader>
          <DialogTitle>Chi tiết đơn #{order.id}</DialogTitle>
        </DialogHeader>
        <DialogCloseTrigger />
        <DialogBody>
          <Stack gap={3}>
            <Stack gap={2}>
              <InfoRow label="Bàn" value={`${order.tableName} · ${order.areaName}`} />
              <InfoRow
                label="Trạng thái"
                value={
                  <StatusDot color={STATUS_DOT_COLOR[order.status]}>{STATUS_LABEL[order.status]}</StatusDot>
                }
              />
              <InfoRow label="Ca" value={order.shiftId ? `Ca #${order.shiftId}` : "—"} />
              <InfoRow label="Người tạo" value={order.createdByName} />
              <InfoRow label="Tạo lúc" value={formatDateTime(order.createdAt)} />
            </Stack>

            <Separator />

            <ListViewTable
              columns={itemColumns}
              data={order.items}
              rowKey={(row) => row.id}
              emptyMessage="Không có món nào."
              rounded={false}
            />

            <Box borderWidth="1px" rounded="l3" p={4} bg="bg.panel">
              <Stack gap={2}>
                <InfoRow label="Tạm tính" value={formatVnd(subtotal)} />
                {order.promotionName && <InfoRow label="Khuyến mãi" value={order.promotionName} />}
                {order.paymentMethod && (
                  <InfoRow label="Phương thức TT" value={PAYMENT_METHOD_LABEL[order.paymentMethod]} />
                )}
                {order.paidConfirmedAt && (
                  <InfoRow label="Thanh toán lúc" value={formatDateTime(order.paidConfirmedAt)} />
                )}

                <Separator />

                <Flex justify="space-between" align="center">
                  <Text fontSize="sm" fontWeight="semibold">
                    Tổng tiền
                  </Text>
                  <Text fontSize="lg" fontWeight="bold">
                    {order.totalAmount != null ? (
                      formatVnd(order.totalAmount)
                    ) : (
                      <>
                        {formatVnd(subtotal)}{" "}
                        <Text as="span" fontSize="xs" fontWeight="normal" color="fg.muted">
                          (chưa thanh toán)
                        </Text>
                      </>
                    )}
                  </Text>
                </Flex>
              </Stack>
            </Box>
          </Stack>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}
