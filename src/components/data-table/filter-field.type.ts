export type FilterOption = { value: string; label: string };

/**
 * Khai báo 1 field filter — tham khảo trực tiếp `FilterField` của
 * alix-bo-frontend-v2 (`types/list-view.type.ts`), chỉ giữ 2 loại thực sự
 * cần dùng trong dự án này (`select`, `daterange`); thêm loại khác (`text`,
 * `number`...) khi có nhu cầu thật, theo đúng union này.
 */
export type FilterField =
  | {
      name: string;
      label: string;
      type: "select";
      options: FilterOption[];
      /** "combobox" cho danh sách dài cần tìm kiếm (vd người dùng) — mặc định dropdown thường (FilterSelect). */
      variant?: "combobox";
      placeholder?: string;
      /** Thêm 1 option ảo value="" ở đầu danh sách, đại diện "không lọc". */
      allLabel?: string;
      /** Chiếm 1/2 (mặc định) hay trọn dòng trong lưới 2 cột của FilterDrawer. */
      size?: 1 | 2;
    }
  | {
      name: string;
      label: string;
      type: "daterange";
      size?: 1 | 2;
    };

/** URL key(s) 1 field chiếm — daterange chiếm cả `${name}From` và `${name}To`. */
export function filterKeys(field: FilterField): string[] {
  return field.type === "daterange" ? [`${field.name}From`, `${field.name}To`] : [field.name];
}

export function allFilterKeys(fields: FilterField[]): string[] {
  return fields.flatMap(filterKeys);
}

/**
 * Có field nào khác giá trị mặc định không — dùng để hiện dot báo hiệu trên
 * nút "Bộ lọc". Field trùng `defaults` (vd "Khoảng ngày" đang ở mặc định
 * "trong tháng") KHÔNG tính là đang lọc, giống `activeFilters()` bên
 * alix-bo-frontend-v2.
 */
export function hasActiveFilterValues(
  fields: FilterField[],
  values: Record<string, string>,
  defaults: Record<string, string> = {},
): boolean {
  return fields.some((field) =>
    filterKeys(field).some((key) => (values[key] ?? "") !== (defaults[key] ?? "")),
  );
}
