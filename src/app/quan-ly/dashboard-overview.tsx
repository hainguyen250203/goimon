"use client";

import NextLink from "next/link";
import { Armchair, CheckCircle2, Clock, HandCoins, Wallet, XCircle } from "lucide-react";
import { Flex, Grid, Heading, Link as ChakraLink, Box } from "@chakra-ui/react";

import { EmptyState } from "~/components/ui/empty-state";
import { StatusDot } from "~/components/ui/status-dot";
import { api } from "~/trpc/react";
import { formatDateTime, formatVnd } from "~/lib/format-order";
import type { ShiftStatus } from "~/modules/shift/domain/shift.entity";
import { KpiCard } from "./kpi-card";

const SHIFT_STATUS_LABEL: Record<ShiftStatus, string> = {
  open: "Đang mở",
  closed: "Đã đóng",
};

const SHIFT_STATUS_DOT_COLOR: Record<ShiftStatus, string> = {
  open: "green.500",
  closed: "gray.400",
};

export function DashboardOverview() {
  const { data } = api.dashboard.getOverview.useQuery(undefined, { refetchInterval: 30_000 });
  if (!data) return null;

  const { latestShift, tables } = data;

  if (!latestShift) {
    return (
      <Box borderWidth="1px" rounded="l3" p={6} bg="bg.panel">
        <EmptyState
          icon={<Clock size={28} />}
          title="Chưa có ca làm việc nào"
          description="Mở ca ở trang Ca làm việc để bắt đầu theo dõi doanh thu và đơn hàng."
        >
          <ChakraLink asChild fontSize="sm">
            <NextLink href="/quan-ly/ca-lam-viec">Đi tới trang Ca làm việc →</NextLink>
          </ChakraLink>
        </EmptyState>
      </Box>
    );
  }

  return (
    <Flex direction="column" gap={5}>
      <Flex align="center" gap={3} wrap="wrap">
        <Heading size="sm">
          Ca gần nhất — {formatDateTime(latestShift.startTime)}
          {latestShift.endTime ? ` → ${formatDateTime(latestShift.endTime)}` : ""}
        </Heading>
        <StatusDot color={SHIFT_STATUS_DOT_COLOR[latestShift.status]}>
          {SHIFT_STATUS_LABEL[latestShift.status]}
        </StatusDot>
      </Flex>
      <Grid
        templateColumns={{ base: "repeat(2, 1fr)", lg: "repeat(3, 1fr)", xl: "repeat(6, 1fr)" }}
        gap={{ base: 3, md: 4 }}
      >
        <KpiCard
          label="Doanh thu ca này"
          value={formatVnd(latestShift.totalRevenue)}
          icon={<Wallet size={18} />}
          colorPalette="green"
        />
        <KpiCard
          label="Doanh thu chưa thanh toán"
          value={formatVnd(latestShift.openRevenue)}
          icon={<HandCoins size={18} />}
          colorPalette="yellow"
        />
        <KpiCard
          label="Đơn đã thanh toán"
          value={String(latestShift.paidOrderCount)}
          icon={<CheckCircle2 size={18} />}
          colorPalette="blue"
        />
        <KpiCard
          label="Đơn đang mở"
          value={String(latestShift.openOrderCount)}
          icon={<Clock size={18} />}
          colorPalette="orange"
        />
        <KpiCard
          label="Đơn đã huỷ"
          value={String(latestShift.cancelledOrderCount)}
          icon={<XCircle size={18} />}
          colorPalette="red"
        />
        <KpiCard
          label="Bàn đang phục vụ"
          value={`${tables.occupied}/${tables.total}`}
          icon={<Armchair size={18} />}
          colorPalette="purple"
        />
      </Grid>
    </Flex>
  );
}
