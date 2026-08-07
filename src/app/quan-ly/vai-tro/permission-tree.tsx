"use client";

import { Badge, Box, Button, Flex, Stack, Text, Wrap } from "@chakra-ui/react";

import { Switch } from "~/components/ui/switch";
import {
  PERMISSION_TREE,
  pagePermissionKeys,
  type PermissionKey,
  type PermissionPage,
} from "~/modules/role/domain/permission-definitions";

/**
 * Cây "Nhóm → Trang (switch Xem) → hành động (chip bấm)" — tham khảo trực
 * tiếp `RolePermissionTree` của alix-bo-frontend-v2: mỗi hành động là 1 nút
 * chip bấm bật/tắt riêng (không phải Switch lồng cạnh nhau trong cùng hàng
 * như bản trước — đó là nguyên nhân các switch hành động không bấm ăn được:
 * 2 `Switch` (Ark UI) làm 2 control tương tác chồng sát nhau trong 1 hàng hẹp,
 * chip Button đơn giản và chắc chắn hơn nhiều cho danh sách hành động dài).
 */
export function PermissionTree({
  selected,
  onChange,
}: {
  selected: Set<PermissionKey>;
  onChange: (next: Set<PermissionKey>) => void;
}) {
  const togglePage = (page: PermissionPage, checked: boolean) => {
    if (!page.getKey) return;
    const next = new Set(selected);
    if (checked) {
      next.add(page.getKey);
    } else {
      pagePermissionKeys(page).forEach((k) => next.delete(k));
    }
    onChange(next);
  };

  const toggleAction = (key: PermissionKey, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(key);
    else next.delete(key);
    onChange(next);
  };

  return (
    <Stack gap={4} w="full">
      {PERMISSION_TREE.map((sec) => {
        const enabled = sec.pages.filter((p) =>
          p.getKey ? selected.has(p.getKey) : p.actions.some((a) => selected.has(a.key)),
        ).length;
        return (
          <Box key={sec.section} borderWidth="1px" rounded="l2" overflow="hidden">
            <Flex
              align="center"
              justify="space-between"
              px={3}
              py={2}
              bg="bg.subtle"
              borderBottomWidth="1px"
            >
              <Text fontSize="xs" fontWeight="semibold" color="fg.muted" textTransform="uppercase">
                {sec.section}
              </Text>
              <Badge size="sm" variant="surface">
                {enabled}/{sec.pages.length}
              </Badge>
            </Flex>

            <Stack gap={0}>
              {sec.pages.map((page, i) => {
                // Dòng không có getKey (thuần hành động, vd "Xử lý đơn hàng ở
                // Gọi món") không có khái niệm "Xem" — luôn coi như bật, hiện
                // sẵn chip hành động, không render Switch.
                const pageOn = page.getKey ? selected.has(page.getKey) : true;
                return (
                  <Box
                    key={page.pageKey}
                    px={3}
                    py={2.5}
                    borderTopWidth={i === 0 ? 0 : "1px"}
                    bg={pageOn ? "bg.muted" : undefined}
                  >
                    <Stack gap={2}>
                      <Flex align="center" gap={2.5}>
                        {page.getKey ? (
                          <Switch
                            size="sm"
                            checked={pageOn}
                            onCheckedChange={(d) => togglePage(page, d.checked)}
                          />
                        ) : null}
                        <Text fontSize="sm" fontWeight={pageOn ? "medium" : "normal"}>
                          {page.label}
                        </Text>
                      </Flex>

                      {pageOn && page.actions.length > 0 && (
                        <Wrap gap={1.5} pl={"2.75rem"}>
                          {page.actions.map((action) => {
                            const on = selected.has(action.key);
                            return (
                              <Button
                                key={action.key}
                                type="button"
                                size="xs"
                                rounded="full"
                                variant={on ? "solid" : "outline"}
                                colorPalette="gray"
                                onClick={() => toggleAction(action.key, !on)}
                              >
                                {action.label}
                              </Button>
                            );
                          })}
                        </Wrap>
                      )}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}
