/**
 * Thanh filter/toolbar nằm ngay trên bảng — không dùng sidebar/panel riêng
 * vì số lượng cột filter còn ít (theo yêu cầu). Chỉ là 1 flex row chứa các
 * control filter cụ thể của từng trang (Select, Input...), không tự định
 * nghĩa config filter tổng quát vì mỗi trang có nhu cầu filter khác nhau.
 * `end` là slot phải (vd: số lượng kết quả, nút hành động) để toolbar không
 * bị trống một bên khi chỉ có filter.
 */
export function ListViewToolbar({
  children,
  end,
}: {
  children: React.ReactNode;
  end?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {end ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {end}
        </div>
      ) : null}
    </div>
  );
}
