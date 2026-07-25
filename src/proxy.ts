import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Chỉ check cookie tồn tại (không query DB) — bounce nhanh cho request rõ ràng
// chưa đăng nhập. Phân quyền theo role vẫn phải check thật ở từng layout.tsx
// (proxy không biết role vì role không nằm trong cookie).
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/quan-ly/:path*", "/goi-mon/:path*"],
};
