export type UserRole = "user" | "manager" | "admin" | "superadmin";

export type UserAccount = {
  id: string;
  name: string;
  phoneNumber: string | null;
  role: UserRole;
  banned: boolean;
  banReason: string | null;
  createdAt: Date;
};
