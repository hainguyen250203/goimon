import { Inbox } from "lucide-react";
import { Table } from "@chakra-ui/react";

import { EmptyState } from "~/components/ui/empty-state";
import { Skeleton } from "~/components/ui/skeleton";

/**
 * Cấu hình 1 cột — tham khảo cấu trúc `ListViewColumn` của
 * alix-bo-frontend-v2 (mảng cột, mỗi cột tự định nghĩa cách render `cell`),
 * không dùng TanStack Table vì không cần sort/phức tạp cho danh sách đơn giản.
 */
export type ListViewColumn<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  width?: string;
  textAlign?: "left" | "right" | "center";
};

export function ListViewTable<T>({
  columns,
  data,
  rowKey,
  isLoading,
  emptyMessage = "Chưa có dữ liệu.",
  rounded = true,
}: {
  columns: ListViewColumn<T>[];
  data: T[] | undefined;
  rowKey: (row: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
  rounded?: boolean;
}) {
  return (
    <Table.ScrollArea rounded={rounded ? "l3" : undefined} borderWidth="1px">
      <Table.Root size="sm" variant="line" interactive>
        <Table.Header>
          <Table.Row bg="bg.subtle">
            {columns.map((column) => (
              <Table.ColumnHeader
                key={column.key}
                width={column.width}
                textAlign={column.textAlign}
                color="fg.muted"
                fontWeight="semibold"
                px={4}
                py={2}
              >
                {column.header}
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Table.Row key={i}>
                {columns.map((column) => (
                  <Table.Cell key={column.key} px={4} py={2}>
                    <Skeleton h={4} w="full" maxW="40" />
                  </Table.Cell>
                ))}
              </Table.Row>
            ))
          ) : !data || data.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={columns.length} px={4} py={10}>
                <EmptyState
                  icon={<Inbox size={28} />}
                  title={emptyMessage}
                />
              </Table.Cell>
            </Table.Row>
          ) : (
            data.map((row) => (
              <Table.Row key={rowKey(row)}>
                {columns.map((column) => (
                  <Table.Cell
                    key={column.key}
                    textAlign={column.textAlign}
                    px={4}
                    py={1.5}
                  >
                    {column.cell(row)}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>
  );
}
