/** role "user" (hoặc rỗng/không xác định) chỉ vào được /goi-mon; manager/admin/superadmin/viewer vào /quan-ly. */
export function getRoleHomePath(role: string | null | undefined): string {
  return role === "manager" || role === "admin" || role === "superadmin" || role === "viewer"
    ? "/quan-ly"
    : "/goi-mon";
}
