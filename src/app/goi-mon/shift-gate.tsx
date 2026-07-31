import { Flex, Stack, Text } from "@chakra-ui/react";

import { getSession } from "~/server/better-auth/server";
import { hasMinRole } from "~/server/better-auth/role-rank";
import { api } from "~/trpc/server";

/**
 * Chặn toàn bộ luồng gọi món (chọn bàn, gọi món) nếu chưa có ca nào đang mở
 * — tham khảo ShiftProtection của pos-fe. Không chặn /goi-mon/cua-hang (nơi
 * quản lý/admin mở ca) để tránh bế tắc "chưa mở ca thì không vào được chỗ
 * mở ca".
 */
export async function ShiftGate({ children }: { children: React.ReactNode }) {
  const [shift, session] = await Promise.all([api.shift.getOpen(), getSession()]);

  if (shift) return <>{children}</>;

  const canManage = hasMinRole(session?.user.role, "manager");

  return (
    <Flex flex={1} align="center" justify="center" p={4}>
      <Stack gap={2} maxW="360px" textAlign="center">
        <Text fontSize="lg" fontWeight="semibold">
          ⚠️ Ca chưa được mở
        </Text>
        <Text fontSize="sm" color="fg.muted">
          {canManage
            ? 'Vào tab "Cửa hàng" bên dưới để mở ca trước khi gọi món.'
            : "Hiện tại ca chưa được mở. Vui lòng liên hệ quản lý để mở ca."}
        </Text>
      </Stack>
    </Flex>
  );
}
