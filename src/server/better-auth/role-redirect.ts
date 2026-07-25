/** role "user" (hoặc rỗng/không xác định) chỉ vào được /goi-mon; manager/admin vào /quan-ly. */
export function getRoleHomePath(role: string | null | undefined): string {
  return role === "manager" || role === "admin" ? "/quan-ly" : "/goi-mon";
}
