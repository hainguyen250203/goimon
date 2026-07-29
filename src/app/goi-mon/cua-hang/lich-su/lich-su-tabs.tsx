"use client";

import { useState } from "react";
import { Box, Stack } from "@chakra-ui/react";

import { SegmentedControl } from "~/components/ui/segmented-control";
import { OrderHistoryList } from "./order-history-list";
import { OrderItemEventsList } from "./order-item-events-list";
import { TableTransferEventsList } from "./table-transfer-events-list";

type Tab = "don-hang" | "goi-mon" | "chuyen-ban";

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: "don-hang", label: "Đơn hàng" },
  { value: "goi-mon", label: "Gọi món" },
  { value: "chuyen-ban", label: "Chuyển bàn/món" },
];

/**
 * Gộp 3 góc nhìn lịch sử (trước đây là 2 trang riêng "Lịch sử đơn hàng" +
 * "Lịch sử gọi món", dễ nhầm vì tên gần giống nhau) thành 1 trang nhiều tab —
 * chỉ 1 điểm vào từ trang Cửa hàng, có sẵn chỗ cho tab "Chuyển bàn/món" thay
 * vì phải quyết định nhét thêm vào trang nào trong 2 trang cũ.
 */
export function LichSuTabs() {
  const [tab, setTab] = useState<Tab>("don-hang");

  return (
    <Stack gap={3}>
      <SegmentedControl
        size="sm"
        width="full"
        value={tab}
        onValueChange={(details) => {
          if (details.value) setTab(details.value as Tab);
        }}
        items={TAB_OPTIONS}
      />

      {/* Giữ cả 3 tab trong DOM, chỉ ẩn/hiện bằng display — cùng pattern với
          order-table-view.tsx, tránh mất vị trí cuộn/kết quả tìm khi đổi tab. */}
      <Box display={tab === "don-hang" ? "block" : "none"}>
        <OrderHistoryList />
      </Box>
      <Box display={tab === "goi-mon" ? "block" : "none"}>
        <OrderItemEventsList />
      </Box>
      <Box display={tab === "chuyen-ban" ? "block" : "none"}>
        <TableTransferEventsList />
      </Box>
    </Stack>
  );
}
