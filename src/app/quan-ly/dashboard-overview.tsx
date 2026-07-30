"use client";

import NextLink from "next/link";
import { Armchair, CalendarClock, CheckCircle2, Clock, Wallet, XCircle } from "lucide-react";
import { Box, Flex, Grid, Heading, Link as ChakraLink } from "@chakra-ui/react";

import { EmptyState } from "~/components/ui/empty-state";
import { api } from "~/trpc/react";
import { formatDateTime, formatVnd } from "~/lib/format-order";
import { KpiCard } from "./kpi-card";

export function DashboardOverview() {
  const { data } = api.dashboard.getOverview.useQuery(undefined, { refetchInterval: 30_000 });
  if (!data) return null;

  const { currentShift, tables } = data;

  if (!currentShift) {
    return (
      <Box borderWidth="1px" rounded="l3" p={6} bg="bg.panel">
        <EmptyState
          icon={<Clock size={28} />}
          title="Chưa có ca làm việc nào đang mở"
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
      <Flex align="center" gap={2} color="fg.muted">
        <CalendarClock size={18} />
        <Heading size="sm" color="fg">
          Ca làm việc hiện tại — mở lúc {formatDateTime(currentShift.startTime)}
        </Heading>
      </Flex>
      <Grid
        templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)", xl: "repeat(5, 1fr)" }}
        gap={4}
      >
        <KpiCard
          label="Doanh thu ca này"
          value={formatVnd(currentShift.totalRevenue)}
          icon={<Wallet size={20} />}
          colorPalette="green"
        />
        <KpiCard
          label="Đơn đã thanh toán"
          value={String(currentShift.paidOrderCount)}
          icon={<CheckCircle2 size={20} />}
          colorPalette="blue"
        />
        <KpiCard
          label="Đơn đang mở"
          value={String(currentShift.openOrderCount)}
          icon={<Clock size={20} />}
          colorPalette="orange"
        />
        <KpiCard
          label="Đơn đã huỷ"
          value={String(currentShift.cancelledOrderCount)}
          icon={<XCircle size={20} />}
          colorPalette="red"
        />
        <KpiCard
          label="Bàn đang phục vụ"
          value={`${tables.occupied}/${tables.total}`}
          icon={<Armchair size={20} />}
          colorPalette="purple"
        />
      </Grid>
    </Flex>
  );
}
