import { Inbox } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

/**
 * Cấu hình 1 cột — tham khảo cấu trúc `ListViewColumn` của
 * alix-bo-frontend-v2 (mảng cột, mỗi cột tự định nghĩa cách render `cell`),
 * không dùng TanStack Table vì không cần sort/phức tạp cho danh sách đơn giản.
 */
export type ListViewColumn<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

export function ListViewTable<T>({
  columns,
  data,
  rowKey,
  isLoading,
  emptyMessage = "Chưa có dữ liệu.",
}: {
  columns: ListViewColumn<T>[];
  data: T[] | undefined;
  rowKey: (row: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    <Skeleton className="h-4 w-full max-w-40" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : !data || data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-40 text-center"
              >
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Inbox className="size-8" />
                  <span className="text-sm">{emptyMessage}</span>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={cn(column.className)}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
