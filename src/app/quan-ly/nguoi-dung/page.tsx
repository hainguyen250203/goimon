import { Suspense } from "react";
import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { Skeleton } from "~/components/ui/skeleton";

import { api, HydrateClient } from "~/trpc/server";
import { getMyPermissions, hasPermission } from "~/modules/role/get-my-permissions";
import { parsePageSize } from "~/lib/pagination";
import { UserList } from "./user-list";

function parseBanned(value: string | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export default async function NguoiDungPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; role?: string; banned?: string }>;
}) {
  // Trang này cần riêng "nguoi-dung.get" — /quan-ly/layout.tsx chỉ chặn khi
  // KHÔNG có quyền quan-ly nào, nên phải tự chặn thêm ở đây.
  const permissions = await getMyPermissions();
  if (!hasPermission(permissions, "nguoi-dung.get")) {
    redirect("/quan-ly");
  }

  const {
    page: pageParam,
    pageSize: pageSizeParam,
    role,
    banned: bannedParam,
  } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const pageSize = parsePageSize(pageSizeParam);
  const banned = parseBanned(bannedParam);

  // Prefetch trên server — tránh waterfall khi client hydrate. Dùng
  // role.listOptions (không đòi "vai-tro.get") thay vì role.list — trang này
  // chỉ cần tên vai trò để đổ vào dropdown, không cần permissions chi tiết.
  void api.user.list.prefetch({ page, pageSize, role, banned });
  void api.role.listOptions.prefetch();

  return (
    <Box p={{ base: 4, md: 6 }}>
      <HydrateClient>
      <Suspense fallback={<Skeleton h={96} rounded="l3" />}>
        <UserList
          page={page}
          pageSize={pageSize}
          role={role}
          banned={banned}
          canCreate={hasPermission(permissions, "nguoi-dung.tao")}
          canSetRole={hasPermission(permissions, "nguoi-dung.gan-vai-tro")}
          canBanUnban={hasPermission(permissions, "nguoi-dung.khoa-mo-khoa")}
          canResetPassword={hasPermission(permissions, "nguoi-dung.doi-mat-khau")}
        />
      </Suspense>
      </HydrateClient>
    </Box>
  );
}
