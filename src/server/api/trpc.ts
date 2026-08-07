/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import type { PermissionKey } from "~/modules/role/domain/permission-definitions";
import { getRolePermissions } from "~/modules/role/infrastructure/role-permission-cache";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth.api.getSession({
    headers: opts.headers,
  });
  return {
    db,
    session,
    ...opts,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware ghi log thời gian chạy mỗi procedure — không còn artificial
 * delay ở dev (đã bỏ theo yêu cầu, ảnh hưởng tới trải nghiệm test).
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });

/**
 * Permission-gated procedures
 *
 * Phân quyền theo permission key riêng từng trang (`<page>.get`/`<page>.action`,
 * xem `~/modules/role/domain/permission-definitions.ts`), lưu trong bảng
 * `role` (data-driven, sửa qua trang Vai trò thay vì sửa code) — thay hẳn
 * thang rank cứng trước đây.
 *
 * @see https://trpc.io/docs/procedures
 */

/**
 * Bất kỳ ai đã đăng nhập, KHÔNG cần permission key nào — dùng cho luồng vận
 * hành cốt lõi ở `/goi-mon` (xem khu/bàn/menu, gọi món, thêm món, chuyển
 * bàn/món, gộp bàn, in hoá đơn...) mà mọi nhân viên đều phải làm được bất kể
 * role/quyền được cấp gì.
 */
export const staffProcedure = protectedProcedure;

/** Yêu cầu có permission key tương ứng trong `role.permissions` — `isSuper` bypass. */
export function permissionProcedure(key: PermissionKey) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    if (ctx.session.user.isSuper) return next({ ctx });
    const permissions = await getRolePermissions(ctx.session.user.role ?? "user");
    if (!permissions.has(key)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next({ ctx });
  });
}

/**
 * Chỉ `isSuper` — vai trò giám sát ẨN, nằm ngoài hệ thống permission-key
 * hẳn (không role nào, kể cả có mọi `.action`/`.get` khác, được cấp qua đây
 * — xem CLAUDE.md). Dùng cho Nhật ký hoạt động, Lịch sử trò chuyện AI (toàn
 * cục), xoá đơn hàng.
 */
export const superOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.session.user.isSuper) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});
