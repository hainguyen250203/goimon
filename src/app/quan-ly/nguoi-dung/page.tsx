import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { getSession } from "~/server/better-auth/server";
import type { UserRole } from "~/modules/user/domain/user-account.entity";
import { UserList } from "./user-list";

const PAGE_SIZE = 20;

function parseRole(value: string | undefined): UserRole | undefined {
  return value === "user" || value === "manager" || value === "admin"
    ? value
    : undefined;
}

function parseBanned(value: string | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export default async function NguoiDungPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; role?: string; banned?: string }>;
}) {
  // Trang này admin-only (quản lý tài khoản) — /quan-ly/layout.tsx chỉ chặn
  // role "user", không phân biệt manager/admin, nên phải tự chặn thêm ở đây.
  // Không chặn thì manager vẫn vào được UI nhưng mọi gọi tRPC (adminProcedure)
  // đều FORBIDDEN, kẹt ở trạng thái loading vô thời hạn — trải nghiệm tệ.
  const session = await getSession();
  if (session?.user.role !== "admin") {
    redirect("/quan-ly");
  }

  const { page: pageParam, role: roleParam, banned: bannedParam } =
    await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const role = parseRole(roleParam);
  const banned = parseBanned(bannedParam);

  // Prefetch trên server — tránh waterfall khi client hydrate.
  void api.user.list.prefetch({ page, pageSize: PAGE_SIZE, role, banned });

  return (
    <HydrateClient>
      <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
        <UserList page={page} role={role} banned={banned} />
      </Suspense>
    </HydrateClient>
  );
}
