"use client";

import { useState } from "react";
import NextLink from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { Box, Button, Flex, IconButton, Input, Stack, Text, Textarea } from "@chakra-ui/react";
import { ArrowLeft } from "lucide-react";

import { Field } from "~/components/ui/field";
import { toaster } from "~/components/ui/toaster";
import { api } from "~/trpc/react";
import { isPermissionKey, type PermissionKey } from "~/modules/role/domain/permission-definitions";
import type { Role } from "~/modules/role/domain/role.entity";
import { PermissionTree } from "./permission-tree";

/** Trang riêng cho tạo/sửa vai trò (không phải dialog) — theo đúng UX của
 * alix-bo-frontend-v2's RoleFormPage, dùng chung 1 component cho cả 2 chế độ. */
export function RoleForm({ item }: { item?: Role }) {
  const router = useRouter();
  const isEdit = !!item;
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  // Lọc bỏ key rác — role tạo trước khi catalog permission tách nhỏ (vd
  // "mon-an.action" cũ) có thể còn lưu key không còn tồn tại trong
  // `permissionDefinitions` hiện tại. Giữ nguyên trong `selected` sẽ khiến
  // Zod validate fail lúc Lưu dù người dùng không đổi gì; lọc ở đây tự chữa
  // luôn khi mở trang sửa, không cần chạy tay `db:sync-roles` mới lưu được.
  const [permissions, setPermissions] = useState<Set<PermissionKey>>(
    () => new Set((item?.permissions ?? []).filter(isPermissionKey)),
  );
  const [nameError, setNameError] = useState<string>();

  const utils = api.useUtils();
  const back = () => router.push("/quan-ly/vai-tro");
  const create = api.role.create.useMutation();
  const update = api.role.update.useMutation();
  const isPending = create.isPending || update.isPending;

  const handleSave = () => {
    if (!name.trim()) {
      setNameError("Tên vai trò không được để trống");
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      permissions: Array.from(permissions),
    };

    const mutation = isEdit
      ? update.mutateAsync({ id: item.id, ...payload })
      : create.mutateAsync(payload);

    mutation
      .then(() => {
        toaster.create({ title: isEdit ? "Đã cập nhật vai trò" : "Đã thêm vai trò", type: "success" });
        void utils.role.list.invalidate();
        // Sửa vai trò: ở lại trang này sau khi lưu (hay sửa tiếp nhiều lần
        // liên tục, không muốn bị đá về danh sách mỗi lần bấm Lưu). Thêm mới
        // thì vẫn quay lại danh sách — vai trò mới tạo cần thấy nó xuất hiện.
        if (!isEdit) back();
      })
      .catch((error: unknown) => {
        toaster.create({
          title: "Có lỗi xảy ra",
          description: error instanceof Error ? error.message : undefined,
          type: "error",
        });
      });
  };

  return (
    <Box>
      <Flex align="center" gap={2} mb={4}>
        <IconButton asChild size="sm" variant="ghost" aria-label="Quay lại">
          <NextLink href="/quan-ly/vai-tro">
            <ArrowLeft size={16} />
          </NextLink>
        </IconButton>
        <Text fontWeight="semibold" fontSize={{ base: "md", md: "lg" }} flex={1}>
          {isEdit ? `Sửa vai trò — ${item.name}` : "Thêm vai trò"}
        </Text>
        <Button onClick={handleSave} loading={isPending}>
          {isEdit ? "Lưu" : "Thêm vai trò"}
        </Button>
      </Flex>

      <Stack gap={4} borderWidth="1px" rounded="l3" p={{ base: 4, md: 5 }} bg="bg">
        <Flex gap={4} direction={{ base: "column", md: "row" }}>
          <Box flex={1}>
            <Field label="Tên vai trò" invalid={!!nameError} errorText={nameError}>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(undefined);
                }}
                placeholder="vd: Thu ngân"
              />
            </Field>
          </Box>
          <Box flex={1}>
            <Field label="Mô tả (không bắt buộc)">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={1}
              />
            </Field>
          </Box>
        </Flex>

        <Box>
          {/* KHÔNG dùng Field ở đây — Field.Root render ra 1 thẻ <label> HTML
           * thật, bọc quanh CẢ CÂY hàng chục Switch bên trong sẽ khiến trình
           * duyệt coi Switch ĐẦU TIÊN ("Tổng quan") là control "được gắn nhãn"
           * của label đó: bấm bất kỳ Switch nào khác cũng bị bắn thêm 1 click
           * vào Switch đầu tiên (đúng bug đã gặp — xem accessibility tree lúc
           * debug, mọi Switch đều bị đặt tên "Quyền hạn"). Field chỉ nên bọc
           * đúng 1 control, dùng Text thường làm heading cho cả nhóm. */}
          <Text fontSize="sm" fontWeight="medium" mb={1.5}>
            Quyền hạn
          </Text>
          <PermissionTree selected={permissions} onChange={setPermissions} />
        </Box>
      </Stack>
    </Box>
  );
}
