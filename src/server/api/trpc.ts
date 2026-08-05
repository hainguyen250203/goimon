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
  })
  // Role "viewer" chỉ được xem, KHÔNG được thao tác — chặn ở tầng gốc này
  // (mọi role-gated procedure bên dưới đều kế thừa `protectedProcedure`) để
  // áp dụng cho MỌI mutation hiện có lẫn tương lai, không phải tự nhớ sửa
  // từng router. Không thể chỉ chèn "viewer" vào ROLE_RANK vì hầu hết router
  // dùng CHUNG 1 procedure cho cả query lẫn mutation trên cùng tài nguyên
  // (vd managerProcedure chặn cả menu.list lẫn menu.create) — rank không
  // phân biệt được "được xem" với "được sửa", phải chặn theo `type` riêng.
  .use(({ ctx, next, type }) => {
    if (type === "mutation" && ctx.session.user.role === "viewer") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Tài khoản chỉ xem, không thể thao tác.",
      });
    }
    return next({ ctx });
  });

/**
 * Role-gated procedures
 *
 * Phân cấp `admin > manager > user` (mỗi role kế thừa quyền của role thấp hơn).
 * Mỗi tRPC procedure trong các module khai báo đúng procedure tối thiểu theo role
 * nghiệp vụ cần — không tự kiểm tra role rải rác trong usecase.
 *
 * @see https://trpc.io/docs/procedures
 */
// "viewer" xếp ngang "manager" — tự động qua được mọi managerProcedure (xem
// các trang Vận hành/Cấu hình), KHÔNG qua được adminProcedure/superadminProcedure
// (Người dùng, AI, Nhật ký hoạt động tự động ẩn, không cần thêm gì). Mutation
// đã bị chặn cứng ở protectedProcedure phía trên bất kể rank này.
const ROLE_RANK = { user: 0, manager: 1, viewer: 1, admin: 2, superadmin: 3 } as const;
type Role = keyof typeof ROLE_RANK;

const minRoleProcedure = (minRole: Role) =>
  protectedProcedure.use(({ ctx, next }) => {
    const role = (ctx.session.user.role ?? "user") as Role;
    if ((ROLE_RANK[role] ?? 0) < ROLE_RANK[minRole]) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next({ ctx });
  });

/** Bất kỳ nhân viên đã đăng nhập nào (user/manager/admin). */
export const userProcedure = minRoleProcedure("user");
/** manager hoặc admin (viewer cũng qua — xem CLAUDE.md, xếp ngang manager). */
export const managerProcedure = minRoleProcedure("manager");
/** Chỉ admin (superadmin cũng qua được, rank cao hơn). */
export const adminProcedure = minRoleProcedure("admin");
/** Chỉ superadmin — vai trò giám sát toàn hệ thống (xem CLAUDE.md). */
export const superadminProcedure = minRoleProcedure("superadmin");

/**
 * Ngoại lệ riêng cho "Báo cáo" — admin trở lên, HOẶC viewer. Không thể dùng
 * `adminProcedure` (viewer rank ngang manager, thấp hơn admin) mà cũng không
 * thể xếp viewer ngang admin (sẽ lộ luôn Người dùng/AI, cùng gate admin).
 * Đặt tên chung để tái dùng nếu có ngoại lệ tương tự sau này, hiện chỉ
 * `report.router.ts` dùng.
 */
export const adminOrViewerProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = (ctx.session.user.role ?? "user") as Role;
  if ((ROLE_RANK[role] ?? 0) < ROLE_RANK.admin && role !== "viewer") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});
