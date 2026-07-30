"use client";

import { ListViewTable, type ListViewColumn } from "~/components/data-table/list-view-table";
import { formatVnd } from "~/lib/format-order";
import type { ReportPromotionUsageRow } from "~/modules/report/domain/report.entity";

const columns: ListViewColumn<ReportPromotionUsageRow>[] = [
  { key: "name", header: "Khuyến mãi", cell: (row) => row.promotionName },
  { key: "orders", header: "Số đơn dùng", cell: (row) => String(row.orderCount), textAlign: "right" },
  { key: "discount", header: "Đã giảm", cell: (row) => formatVnd(row.totalDiscount), textAlign: "right" },
];

export function PromotionUsageTable({ data }: { data: ReportPromotionUsageRow[] }) {
  return (
    <ListViewTable
      columns={columns}
      data={data}
      rowKey={(row) => row.promotionId}
      emptyMessage="Không có khuyến mãi nào được dùng trong khoảng đã chọn."
    />
  );
}
