import bcrypt from "bcrypt";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, phoneNumber } from "better-auth/plugins";

import { db } from "~/server/db";
import { account, session, user, verification } from "./schema";
import {
  ac,
  admin as adminRole,
  manager as managerRole,
  superadmin as superadminRole,
  user as userRole,
  viewer as viewerRole,
} from "./permissions";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // or "pg" or "mysql"
    // BetterAuth tra bảng qua modelName (string) chứ không qua tên SQL của
    // pgTable, nên phải map tường minh modelName -> table object ở đây.
    schema: {
      users: user,
      sessions: session,
      accounts: account,
      verifications: verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    // Dùng bcrypt thay vì scrypt mặc định của BetterAuth — đồng nhất thuật
    // toán hash với pos-be (repo tham khảo).
    password: {
      hash: (password) => bcrypt.hash(password, 10),
      verify: ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },
  // Toàn bộ bảng nghiệp vụ trong app đặt tên số nhiều (orders, tables,
  // categories...) cho nhất quán — bảng do BetterAuth sinh ra cũng theo
  // đúng quy tắc này, không dùng tiền tố riêng. Xem CLAUDE.md.
  user: { modelName: "users" },
  session: { modelName: "sessions" },
  account: { modelName: "accounts" },
  verification: { modelName: "verifications" },
  // Đổi prefix cookie khỏi mặc định "better-auth.*" — cookie session giờ là
  // "goimon.session_token". proxy.ts phải truyền cùng cookiePrefix cho
  // getSessionCookie() vì hàm đó không tự đọc config này từ instance `auth`.
  advanced: {
    cookiePrefix: "goimon",
  },
  plugins: [
    admin({
      ac,
      roles: {
        admin: adminRole,
        manager: managerRole,
        user: userRole,
        superadmin: superadminRole,
        viewer: viewerRole,
      },
    }),
    phoneNumber({
      // Nhân viên đăng nhập bằng số điện thoại + mật khẩu, tài khoản do
      // admin tạo sẵn (auth.api.createUser) — không có flow OTP/SMS nào
      // trong app, nên endpoint gửi OTP không bao giờ thực sự được gọi.
      sendOTP: () => {
        throw new Error("OTP sign-in is not used in this app.");
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
