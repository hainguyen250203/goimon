"use client";

import { useState } from "react";
import { IconButton } from "@chakra-ui/react";
import { ClipboardList, MoreHorizontal } from "lucide-react";

import {
  MenuContent,
  MenuItem,
  MenuItemGroup,
  MenuRoot,
  MenuTrigger,
} from "~/components/ui/menu";
import type { ShiftListItemWithRevenue } from "~/modules/shift/application/list-shifts.usecase";
import { ShiftSummaryDialog } from "./shift-summary-dialog";

export function ShiftRowActions({ row }: { row: ShiftListItemWithRevenue }) {
  const [summaryOpen, setSummaryOpen] = useState(false);

  return (
    <>
      <MenuRoot positioning={{ placement: "bottom-end" }}>
        <MenuTrigger asChild>
          <IconButton variant="ghost" size="sm" aria-label="Thao tác">
            <MoreHorizontal size={16} />
          </IconButton>
        </MenuTrigger>
        <MenuContent minW="10rem">
          <MenuItemGroup>
            <MenuItem value="summary" onClick={() => setSummaryOpen(true)}>
              <ClipboardList size={16} />
              Tổng kết ca làm
            </MenuItem>
          </MenuItemGroup>
        </MenuContent>
      </MenuRoot>

      <ShiftSummaryDialog open={summaryOpen} onOpenChange={setSummaryOpen} shiftId={row.id} />
    </>
  );
}
