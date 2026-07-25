"use client";

import { useEffect, useState } from "react";
import { Button, Text } from "@chakra-ui/react";
import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "~/components/ui/dialog";
import { FilterSelect } from "~/components/data-table/filter-select";
import { api } from "~/trpc/react";

function formatDiscount(item: { discountType: "percent" | "fixed"; discountValue: number }) {
  return item.discountType === "percent"
    ? `${item.discountValue}%`
    : `${new Intl.NumberFormat("vi-VN").format(item.discountValue)}đ`;
}

export function PromotionPickerDialog({
  open,
  onOpenChange,
  onApply,
  isApplying,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (promotionId: number) => void;
  isApplying: boolean;
}) {
  const { data: promotions } = api.promotion.listActive.useQuery(undefined, { enabled: open });
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    if (open) setSelectedId("");
  }, [open]);

  const options = (promotions ?? []).map((p) => ({
    value: String(p.id),
    label: `${p.name} — Giảm ${formatDiscount(p)}`,
  }));

  return (
    <DialogRoot open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chọn khuyến mãi</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {options.length === 0 ? (
            <Text fontSize="sm" color="fg.muted">
              Chưa có khuyến mãi nào đang hoạt động.
            </Text>
          ) : (
            <FilterSelect
              width="full"
              placeholder="Chọn khuyến mãi"
              value={selectedId}
              onValueChange={setSelectedId}
              options={options}
            />
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            colorPalette="blue"
            disabled={!selectedId}
            loading={isApplying}
            onClick={() => onApply(Number(selectedId))}
          >
            Áp dụng
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
