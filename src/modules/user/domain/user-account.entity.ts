// Role giờ là dữ liệu (bảng `role`, quản lý qua trang Vai trò), không còn 1
// union cố định trong code — bất kỳ tên role nào admin tạo thêm đều hợp lệ.
export type UserRole = string;

export type UserAccount = {
  id: string;
  name: string;
  phoneNumber: string | null;
  role: UserRole;
  banned: boolean;
  banReason: string | null;
  createdAt: Date;
};
