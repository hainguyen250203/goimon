"use client";

import { Flex, Separator, Stack, Text } from "@chakra-ui/react";

import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "~/components/ui/dialog";
import { StatusDot } from "~/components/ui/status-dot";
import type { OrderListItem } from "~/modules/order/domain/order-list-item.entity";
import { formatDateTime, formatVnd, PAYMENT_METHOD_LABEL, STATUS_DOT_COLOR, STATUS_LABEL } from "./format";

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chi tiết đơn #{order.id}</DialogTitle>
        </DialogHeader>
        <DialogCloseTrigger />
        <DialogBody>
          <Stack gap={3}>
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

            <Separator />

            <Stack gap={0} maxH="240px" overflowY="auto" borderWidth="1px" borderColor="border" rounded="l2">
              {order.items.length === 0 ? (
                <Text px={3} py={4} fontSize="sm" color="fg.muted" textAlign="center">
                  Không có món nào.
                </Text>
              ) : (
                order.items.map((item, index) => (
                  <Flex
                    key={item.id}
                    justify="space-between"
                    align="center"
                    px={3}
                    py={2}
                    borderTopWidth={index > 0 ? "1px" : 0}
                    borderColor="border"
                  >
                    <Stack gap={0}>
                      <Text fontSize="sm">{item.itemName}</Text>
                      <Text fontSize="xs" color="fg.muted">
                        {formatVnd(item.unitPrice)} × {item.quantity}
                      </Text>
                    </Stack>
                    <Text fontSize="sm" fontWeight="semibold">
                      {formatVnd(item.unitPrice * item.quantity)}
                    </Text>
                  </Flex>
                ))
              )}
            </Stack>

            <Separator />

            <InfoRow label="Tạm tính" value={formatVnd(subtotal)} />
            {order.promotionName && <InfoRow label="Khuyến mãi" value={order.promotionName} />}
            <InfoRow
              label="Tổng tiền"
              value={order.totalAmount != null ? formatVnd(order.totalAmount) : "Chưa in bill"}
            />
            {order.paymentMethod && (
              <InfoRow label="Phương thức TT" value={PAYMENT_METHOD_LABEL[order.paymentMethod]} />
            )}
            {order.printedAt && <InfoRow label="In bill lúc" value={formatDateTime(order.printedAt)} />}
            {order.paidConfirmedAt && (
              <InfoRow label="Thanh toán lúc" value={formatDateTime(order.paidConfirmedAt)} />
            )}
          </Stack>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}
