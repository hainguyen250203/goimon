import { Flex } from "@chakra-ui/react";

/**
 * Thanh filter/toolbar nằm ngay trên bảng — không dùng sidebar/panel riêng
 * vì số lượng cột filter còn ít (theo yêu cầu). Chỉ là 1 flex row chứa các
 * control filter cụ thể của từng trang (Select, Input...), không tự định
 * nghĩa config filter tổng quát vì mỗi trang có nhu cầu filter khác nhau.
 * `end` là slot phải (nút hành động như "Thêm...") để toolbar không bị
 * trống một bên khi chỉ có filter.
 */
export function ListViewToolbar({
  children,
  end,
}: {
  children: React.ReactNode;
  end?: React.ReactNode;
}) {
  return (
    <Flex align="center" justify="space-between" gap={2} wrap="wrap">
      <Flex align="center" gap={2} wrap="wrap">
        {children}
      </Flex>
      {end ? (
        <Flex align="center" gap={2}>
          {end}
        </Flex>
      ) : null}
    </Flex>
  );
}
