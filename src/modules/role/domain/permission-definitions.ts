/**
 * Nguồn chân lý duy nhất cho toàn bộ permission key trong app. Mỗi trang có
 * đúng 1 key `.get` (xem được trang) + N key hành động riêng biệt — MỖI
 * mutation/usecase thật trong router là 1 key hành động của riêng nó (đúng
 * quy tắc "mỗi action là 1 file/hàm riêng" của CLAUDE.md), không gộp chung
 * "làm được gì trên trang này" vào 1 switch duy nhất như bản đầu — để có thể
 * cấp/thu hồi từng thao tác độc lập (vd: cho sửa giá món nhưng không cho xoá
 * món).
 *
 * Nhật ký hoạt động / Lịch sử trò chuyện AI (toàn cục) / xoá đơn hàng KHÔNG
 * có key nào ở đây — 3 chỗ này chỉ mở cho `isSuper`, nằm ngoài hệ thống
 * permission-key hẳn để không role nào (kể cả role có mọi quyền khác) có
 * thể được cấp qua trang Vai trò.
 */
export const permissionDefinitions = {
  "dashboard.get": { label: "Xem Tổng quan" },

  "mon-an.get": { label: "Xem Món ăn" },
  "mon-an.tao": { label: "Thêm món" },
  "mon-an.sua": { label: "Sửa món" },
  "mon-an.xoa": { label: "Xoá món" },
  "mon-an.danh-muc": { label: "Quản lý danh mục (thêm/sửa/xoá)" },

  "ban.get": { label: "Xem Bàn" },
  "ban.tao": { label: "Thêm bàn" },
  "ban.sua": { label: "Sửa bàn" },
  "ban.xoa": { label: "Xoá bàn" },
  "ban.khu-vuc": { label: "Quản lý khu vực (thêm/sửa/xoá)" },

  "don-hang.get": { label: "Xem Đơn hàng" },
  "don-hang.xem-da-xoa": { label: "Xem đơn hàng đã xoá" },
  "don-hang.xoa-don": { label: "Xoá đơn" },
  "don-hang.thanh-toan": { label: "Xác nhận thanh toán" },
  "don-hang.huy": { label: "Huỷ đơn" },
  "don-hang.xoa-mon": { label: "Xoá món khỏi đơn đã gọi" },
  "don-hang.khuyen-mai": { label: "Áp dụng / gỡ khuyến mãi trên đơn" },

  "khuyen-mai.get": { label: "Xem Khuyến mãi" },
  "khuyen-mai.tao": { label: "Thêm khuyến mãi" },
  "khuyen-mai.sua": { label: "Sửa khuyến mãi" },
  "khuyen-mai.xoa": { label: "Xoá khuyến mãi" },

  "ca-lam-viec.get": { label: "Xem Ca làm việc" },
  "ca-lam-viec.mo-dong": { label: "Mở / đóng ca" },

  "may-in.get": { label: "Xem Máy in" },
  "may-in.tao": { label: "Thêm máy in" },
  "may-in.sua": { label: "Sửa máy in" },
  "may-in.xoa": { label: "Xoá máy in" },
  "may-in.quet-mang": { label: "Quét mạng tìm máy in" },

  "thanh-toan.get": { label: "Xem cấu hình Thanh toán" },
  "thanh-toan.sua": { label: "Sửa cấu hình Thanh toán" },

  "bao-cao.get": { label: "Xem Báo cáo" },
  "bao-cao.tong-quan": { label: "Xem phần Tổng quan (KPI)" },
  "bao-cao.chi-tiet-ca": { label: "Xem phần Chi tiết theo ca" },
  "bao-cao.mon-ban-chay": { label: "Xem phần Món bán chạy" },
  "bao-cao.phuong-thuc-thanh-toan": { label: "Xem phần Phương thức thanh toán" },
  "bao-cao.danh-muc": { label: "Xem phần Doanh thu theo danh mục" },
  "bao-cao.khuyen-mai": { label: "Xem phần Khuyến mãi đã dùng" },

  "nguoi-dung.get": { label: "Xem Người dùng" },
  "nguoi-dung.tao": { label: "Thêm người dùng" },
  "nguoi-dung.gan-vai-tro": { label: "Gán vai trò" },
  "nguoi-dung.khoa-mo-khoa": { label: "Khoá / mở khoá tài khoản" },
  "nguoi-dung.doi-mat-khau": { label: "Đổi mật khẩu người dùng" },

  "vai-tro.get": { label: "Xem Vai trò" },
  "vai-tro.tao": { label: "Thêm vai trò" },
  "vai-tro.sua": { label: "Sửa vai trò" },
  "vai-tro.xoa": { label: "Xoá vai trò" },

  "nhat-ky-hoat-dong.get": { label: "Xem Nhật ký hoạt động" },

  "tro-ly-ai.get": { label: "Xem Trợ lý AI" },
  "tro-ly-ai.su-dung": { label: "Dùng trợ lý AI (tạo phiên, chat)" },
  "tro-ly-ai.doi-ten": { label: "Đổi tên phiên chat" },
  "tro-ly-ai.xoa-phien": { label: "Xoá phiên chat" },

  "tro-ly-ai-thong-ke.get": { label: "Xem Thống kê AI" },
} as const;

export type PermissionKey = keyof typeof permissionDefinitions;

export type PermissionGroup = "Vận hành" | "Gọi món" | "Cấu hình" | "Trợ lý AI" | "Quản trị";

export type PermissionAction = { key: PermissionKey; label: string };

/** 1 dòng "trang" cho cây chọn quyền ở trang Vai trò — bật `getKey` tự động
 * hiện thêm các chip hành động (nếu trang đó có hành động để tick).
 * `getKey` bỏ trống cho các dòng THUẦN HÀNH ĐỘNG không gắn với 1 trang xem cụ
 * thể nào (vd nhóm "Gọi món" — chỉ là danh sách thao tác, không có khái niệm
 * "xem trang" riêng) — dòng đó luôn hiện sẵn chip hành động, không có switch
 * "Xem". */
export type PermissionPage = {
  pageKey: string;
  label: string;
  group: PermissionGroup;
  getKey?: PermissionKey;
  actions: PermissionAction[];
};

export const PERMISSION_PAGES: PermissionPage[] = [
  { pageKey: "dashboard", label: "Tổng quan", group: "Vận hành", getKey: "dashboard.get", actions: [] },
  {
    pageKey: "mon-an",
    label: "Món ăn",
    group: "Vận hành",
    getKey: "mon-an.get",
    actions: [
      { key: "mon-an.tao", label: "Thêm" },
      { key: "mon-an.sua", label: "Sửa" },
      { key: "mon-an.xoa", label: "Xoá" },
      { key: "mon-an.danh-muc", label: "Quản lý danh mục" },
    ],
  },
  {
    pageKey: "ban",
    label: "Bàn",
    group: "Vận hành",
    getKey: "ban.get",
    actions: [
      { key: "ban.tao", label: "Thêm" },
      { key: "ban.sua", label: "Sửa" },
      { key: "ban.xoa", label: "Xoá" },
      { key: "ban.khu-vuc", label: "Quản lý khu vực" },
    ],
  },
  {
    pageKey: "khuyen-mai",
    label: "Khuyến mãi",
    group: "Vận hành",
    getKey: "khuyen-mai.get",
    actions: [
      { key: "khuyen-mai.tao", label: "Thêm" },
      { key: "khuyen-mai.sua", label: "Sửa" },
      { key: "khuyen-mai.xoa", label: "Xoá" },
    ],
  },
  {
    pageKey: "ca-lam-viec",
    label: "Ca làm việc",
    group: "Vận hành",
    getKey: "ca-lam-viec.get",
    actions: [{ key: "ca-lam-viec.mo-dong", label: "Mở/đóng ca" }],
  },
  // Trang /quan-ly/don-hang (xem danh sách/lịch sử đơn) — "don-hang.get" gate
  // đúng trang quản lý này (khớp nav-config.ts, group "Vận hành"), KHÔNG phải
  // hành động ở Gọi món (xem dòng "don-hang-thao-tac" bên dưới, nhóm riêng).
  // "Xem đơn đã xoá"/"Xoá đơn" mặc định vẫn không role nào có (kể cả admin),
  // chỉ isSuper bypass sẵn — cấp thêm qua đây nếu muốn 1 role cụ thể làm được.
  {
    pageKey: "don-hang",
    label: "Đơn hàng",
    group: "Vận hành",
    getKey: "don-hang.get",
    actions: [
      { key: "don-hang.xem-da-xoa", label: "Xem đơn đã xoá" },
      { key: "don-hang.xoa-don", label: "Xoá đơn" },
    ],
  },

  // Nhóm thuần hành động, không phải 1 trang riêng — 4 việc này chỉ làm được
  // ở màn hình Gọi món tại bàn (đã public/staffProcedure cho phần còn lại của
  // luồng gọi món), tách khỏi "Vận hành" (CRUD thuần ở /quan-ly) để không lẫn
  // 2 loại quyền khác bản chất khi cấp vai trò. Không có `getKey` — luôn hiện
  // sẵn chip hành động, không có khái niệm "xem trang" riêng cho nhóm này.
  {
    pageKey: "don-hang-thao-tac",
    label: "Xử lý đơn hàng (ở Gọi món)",
    group: "Gọi món",
    actions: [
      { key: "don-hang.thanh-toan", label: "Xác nhận thanh toán" },
      { key: "don-hang.huy", label: "Huỷ đơn" },
      { key: "don-hang.xoa-mon", label: "Xoá món" },
      { key: "don-hang.khuyen-mai", label: "Áp dụng/gỡ khuyến mãi" },
    ],
  },

  {
    pageKey: "may-in",
    label: "Máy in",
    group: "Cấu hình",
    getKey: "may-in.get",
    actions: [
      { key: "may-in.tao", label: "Thêm" },
      { key: "may-in.sua", label: "Sửa" },
      { key: "may-in.xoa", label: "Xoá" },
      { key: "may-in.quet-mang", label: "Quét mạng" },
    ],
  },
  {
    pageKey: "thanh-toan",
    label: "Thanh toán",
    group: "Cấu hình",
    getKey: "thanh-toan.get",
    actions: [{ key: "thanh-toan.sua", label: "Sửa cấu hình" }],
  },

  {
    pageKey: "tro-ly-ai",
    label: "Trợ lý AI",
    group: "Trợ lý AI",
    getKey: "tro-ly-ai.get",
    actions: [
      { key: "tro-ly-ai.su-dung", label: "Dùng trợ lý" },
      { key: "tro-ly-ai.doi-ten", label: "Đổi tên phiên" },
      { key: "tro-ly-ai.xoa-phien", label: "Xoá phiên" },
    ],
  },
  {
    pageKey: "tro-ly-ai-thong-ke",
    label: "Thống kê AI",
    group: "Trợ lý AI",
    getKey: "tro-ly-ai-thong-ke.get",
    actions: [],
  },

  // Mỗi action ứng với 1 phần (section) trong trang Báo cáo — ẩn/hiện đúng
  // phần đó bất kể người dùng có tự bật lại qua "Tuỳ chỉnh báo cáo" hay
  // không (xem report-view.tsx's isVisible, khác `visibleSections` — đó chỉ
  // là sở thích hiển thị cá nhân lưu localStorage, không phải quyền).
  {
    pageKey: "bao-cao",
    label: "Báo cáo",
    group: "Quản trị",
    getKey: "bao-cao.get",
    actions: [
      { key: "bao-cao.tong-quan", label: "Tổng quan (KPI)" },
      { key: "bao-cao.chi-tiet-ca", label: "Chi tiết theo ca" },
      { key: "bao-cao.mon-ban-chay", label: "Món bán chạy" },
      { key: "bao-cao.phuong-thuc-thanh-toan", label: "Phương thức thanh toán" },
      { key: "bao-cao.danh-muc", label: "Doanh thu theo danh mục" },
      { key: "bao-cao.khuyen-mai", label: "Khuyến mãi đã dùng" },
    ],
  },
  {
    pageKey: "nguoi-dung",
    label: "Người dùng",
    group: "Quản trị",
    getKey: "nguoi-dung.get",
    actions: [
      { key: "nguoi-dung.tao", label: "Thêm" },
      { key: "nguoi-dung.gan-vai-tro", label: "Gán vai trò" },
      { key: "nguoi-dung.khoa-mo-khoa", label: "Khoá/mở khoá" },
      { key: "nguoi-dung.doi-mat-khau", label: "Đổi mật khẩu" },
    ],
  },
  {
    pageKey: "vai-tro",
    label: "Vai trò",
    group: "Quản trị",
    getKey: "vai-tro.get",
    actions: [
      { key: "vai-tro.tao", label: "Thêm" },
      { key: "vai-tro.sua", label: "Sửa" },
      { key: "vai-tro.xoa", label: "Xoá" },
    ],
  },
  // Trước đây isSuper-only tuyệt đối (không key nào) — nay có permission key
  // riêng để cấp được cho role cụ thể; isSuper vẫn bypass như mọi trang khác.
  // Lưu ý: trang này phơi bày hoạt động của MỌI người dùng (kể cả người khác
  // xoá đơn/đổi vai trò/mật khẩu) — cấp key này nghĩa là role đó xem được hết,
  // không chỉ hoạt động của chính mình.
  {
    pageKey: "nhat-ky-hoat-dong",
    label: "Nhật ký hoạt động",
    group: "Quản trị",
    getKey: "nhat-ky-hoat-dong.get",
    actions: [],
  },
];

export type PermissionSection = { section: PermissionGroup; pages: PermissionPage[] };

export const PERMISSION_TREE: PermissionSection[] = (
  ["Gọi món", "Vận hành", "Cấu hình", "Trợ lý AI", "Quản trị"] as const
).map((section) => ({
  section,
  pages: PERMISSION_PAGES.filter((p) => p.group === section),
}));

/** Toàn bộ key thuộc về 1 trang (get + mọi action) — dùng để xoá sạch khi tắt "Xem". */
export function pagePermissionKeys(page: PermissionPage): PermissionKey[] {
  const keys = page.actions.map((a) => a.key);
  return page.getKey ? [page.getKey, ...keys] : keys;
}

export function isPermissionKey(value: string): value is PermissionKey {
  return value in permissionDefinitions;
}
