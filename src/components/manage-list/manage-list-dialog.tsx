"use client";

import { useEffect, useState } from "react";
import { Button, Flex, IconButton, Input, Separator, Stack, Text } from "@chakra-ui/react";
import { Plus, Trash2 } from "lucide-react";

import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "~/components/ui/dialog";
import { Switch } from "~/components/ui/switch";

export type ManagedItem = { id: number; name: string; isActive: boolean };

function ManagedItemRow({
  item,
  disabled,
  onUpdate,
  onDelete,
}: {
  item: ManagedItem;
  disabled: boolean;
  onUpdate: (id: number, patch: { name?: string; isActive?: boolean }) => void;
  onDelete: (id: number) => void;
}) {
  const [name, setName] = useState(item.name);

  useEffect(() => {
    setName(item.name);
  }, [item.name]);

  const commitName = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(item.name);
      return;
    }
    if (trimmed !== item.name) onUpdate(item.id, { name: trimmed });
  };

  return (
    <Flex align="center" gap={2} px={3} py={2}>
      <Input
        size="sm"
        flex={1}
        disabled={disabled}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      <Switch
        size="sm"
        disabled={disabled}
        checked={item.isActive}
        onCheckedChange={(details) => onUpdate(item.id, { isActive: details.checked })}
      >
        Hiện
      </Switch>
      <IconButton
        size="sm"
        variant="ghost"
        colorPalette="red"
        aria-label="Xoá"
        disabled={disabled}
        onClick={() => onDelete(item.id)}
      >
        <Trash2 size={14} />
      </IconButton>
    </Flex>
  );
}

/**
 * Dialog quản lý 1 danh sách nhỏ dạng tên + trạng thái hiện/ẩn (khu vực,
 * danh mục...) — dùng chung cho mọi entity phụ trợ có cấu trúc giống nhau,
 * tránh lặp lại y hệt component này cho từng module.
 */
export function ManageListDialog({
  open,
  onOpenChange,
  title,
  items,
  isMutating,
  onCreate,
  onUpdate,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: ManagedItem[];
  isMutating: boolean;
  onCreate: (name: string) => void;
  onUpdate: (id: number, patch: { name?: string; isActive?: boolean }) => void;
  onDelete: (id: number) => void;
}) {
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (open) setNewName("");
  }, [open]);

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setNewName("");
  };

  return (
    <DialogRoot open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Stack gap={3}>
            <Flex gap={2}>
              <Input
                size="sm"
                placeholder="Tên mới"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
              />
              <Button size="sm" disabled={!newName.trim()} loading={isMutating} onClick={handleCreate}>
                <Plus size={16} />
                Thêm
              </Button>
            </Flex>

            <Stack
              gap={0}
              maxH="320px"
              overflowX="hidden"
              overflowY="auto"
              borderWidth="1px"
              borderColor="border"
              rounded="l2"
            >
              {items.length === 0 ? (
                <Text px={3} py={4} fontSize="sm" color="fg.muted" textAlign="center">
                  Chưa có mục nào.
                </Text>
              ) : (
                items.map((item, index) => (
                  <Stack key={item.id} gap={0}>
                    {index > 0 && <Separator />}
                    <ManagedItemRow
                      item={item}
                      disabled={isMutating}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                    />
                  </Stack>
                ))
              )}
            </Stack>
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
