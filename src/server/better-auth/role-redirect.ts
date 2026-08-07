/** Mọi role đều mặc định vào /goi-mon sau khi đăng nhập — /quan-ly là "hậu
 * trường", chủ động điều hướng tới qua nav (nút "Quản lý nhà hàng" ở
 * store-view.tsx), không còn phải là trang chủ mặc định của riêng role nào. */
export function getRoleHomePath(_role: string | null | undefined): string {
  return "/goi-mon";
}
