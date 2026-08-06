"use client";

import { Badge, Box, Flex, Heading, Text } from "@chakra-ui/react";

import type { ReportShiftRow } from "~/modules/report/domain/report.entity";
import { formatVnd } from "~/lib/format-order";

function formatShiftHeading(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(date)
    .replaceAll("/", "-");
}

function formatShiftSubtitle(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(date);
}

function Divider() {
  return <Box h="1px" bg="border" />;
}

function MetricRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Flex justify="space-between" align="center">
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
      <Text fontSize="xs" fontWeight="semibold" color={color}>
        {value}
      </Text>
    </Flex>
  );
}

function ShiftCard({ row }: { row: ReportShiftRow }) {
  return (
    <Box w="240px" flexShrink={0} borderWidth="1px" rounded="l2" p={3}>
      <Flex justify="space-between" align="start" gap={2} mb={2.5}>
        <Box minW={0}>
          <Text fontWeight="bold" fontSize="sm">
            Ca ngày {formatShiftHeading(row.startTime)}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            {formatShiftSubtitle(row.startTime)}
          </Text>
        </Box>
        <Badge variant="subtle">{row.paidOrderCount}</Badge>
      </Flex>

      <Flex direction="column" gap={1.5} mb={2.5}>
        <Text fontSize="xs" color="fg.muted">
          Doanh thu thực nhận
        </Text>
        <Text fontSize="lg" fontWeight="bold" color="blue.600">
          {formatVnd(row.totalRevenue)}
        </Text>
      </Flex>
      <Divider />

      <Flex direction="column" gap={2} mt={2.5}>
        <MetricRow label="Doanh thu gộp" value={formatVnd(row.grossRevenue)} color="blue.600" />
        <MetricRow label="Tiền mặt" value={formatVnd(row.cashRevenue)} color="green.600" />
        <MetricRow label="Chuyển khoản" value={formatVnd(row.transferRevenue)} color="purple.600" />
        <MetricRow label="Đơn có giảm giá" value={String(row.promoOrderCount)} color="orange.600" />
        <MetricRow label="Tổng giảm giá" value={formatVnd(row.discountAmount)} color="red.600" />
      </Flex>
    </Box>
  );
}

export function ShiftDetailCards({ data }: { data: ReportShiftRow[] }) {
  return (
    <Box rounded="l3" borderWidth="1px" p={3} bg="bg.panel">
      <Heading size="xs" textTransform="uppercase" letterSpacing="0.04em" color="fg.muted" mb={2}>
        Chi tiết theo ca
      </Heading>

      {data.length === 0 ? (
        <Text fontSize="sm" color="fg.muted">
          Không có dữ liệu ca làm việc.
        </Text>
      ) : (
        <Box overflowX="auto" pb={1}>
          <Flex gap={3} minW="max-content">
            {/* Ca mới nhất trước — data gốc tăng dần theo thời gian (dùng cho
                các biểu đồ khác), không đảo thứ tự mảng gốc. */}
            {[...data].reverse().map((row) => (
              <ShiftCard key={row.shiftId} row={row} />
            ))}
          </Flex>
        </Box>
      )}
    </Box>
  );
}
