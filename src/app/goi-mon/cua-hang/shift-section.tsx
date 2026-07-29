"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Flex, Text } from "@chakra-ui/react";
import { Clock } from "lucide-react";

import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "~/components/ui/dialog";
import { StatusDot } from "~/components/ui/status-dot";
import { toaster } from "~/components/ui/toaster";
import { api } from "~/trpc/react";
import { formatDateTime } from "~/lib/format-order";

/**
 * Dòng "Ca làm việc" trong danh sách cài đặt của tab Cửa hàng — bấm vào mở
 * dialog xem trạng thái + mở/đóng ca (chỉ manager/admin thao tác được).
 */
export function ShiftSection({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const utils = api.useUtils();
  const { data: shift } = api.shift.getOpen.useQuery();
  const [dialogOpen, setDialogOpen] = useState(false);

  // ShiftGate (server component chặn /goi-mon khi chưa mở ca) đọc trạng thái
  // ca qua RSC — invalidate query ở trên chỉ làm mới cache TanStack Query
  // phía client (đúng ngay ở dialog này), KHÔNG đụng tới Router Cache của
  // route /goi-mon (đang cache RSC theo staleTimes.dynamic, xem next.config.js).
  // Không router.refresh() thì quay lại /goi-mon vẫn thấy "chưa mở ca" cho tới
  // khi hết staleTime hoặc F5. router.refresh() buộc Router Cache làm mới.
  const openShift = api.shift.open.useMutation({
    onSuccess: () => {
      toaster.create({ title: "Đã mở ca", type: "success" });
      setDialogOpen(false);
      void utils.shift.getOpen.invalidate();
      router.refresh();
    },
    onError: (error) =>
      toaster.create({ title: "Không mở được ca", description: error.message, type: "error" }),
  });
  const closeShift = api.shift.close.useMutation({
    onSuccess: () => {
      toaster.create({ title: "Đã đóng ca", type: "success" });
      setDialogOpen(false);
      void utils.shift.getOpen.invalidate();
      router.refresh();
    },
    onError: (error) =>
      toaster.create({ title: "Không đóng được ca", description: error.message, type: "error" }),
  });

  return (
    <>
      <Flex
        align="center"
        justify="space-between"
        px={4}
        py={3}
        cursor="pointer"
        _hover={{ bg: "bg.muted" }}
        onClick={() => setDialogOpen(true)}
      >
        <Flex align="center" gap={2}>
          <Clock size={16} />
          <Text fontSize={{ base: "xs", lg: "sm" }}>Ca làm việc</Text>
        </Flex>
        <StatusDot color={shift ? "green.500" : "gray.400"}>
          {shift ? "Đang mở" : "Chưa mở"}
        </StatusDot>
      </Flex>

      <DialogRoot open={dialogOpen} onOpenChange={(e) => setDialogOpen(e.open)}>
        <DialogContent maxW={{ base: "calc(100vw - 24px)", md: "360px", lg: "420px" }} mx="auto">
          <DialogHeader>
            <DialogTitle>Ca làm việc</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {shift ? (
              <Text fontSize="sm" color="fg.muted">
                Đang mở từ {formatDateTime(shift.startTime)}.
                {canManage && " Đóng ca sẽ chặn gọi món/thanh toán cho tới khi có ca mới."}
              </Text>
            ) : (
              <Text fontSize="sm" color="fg.muted">
                Hiện chưa có ca nào đang mở.
                {!canManage && " Vui lòng liên hệ quản lý để mở ca."}
              </Text>
            )}
          </DialogBody>
          <DialogFooter>
            <Button size="md" variant="outline" onClick={() => setDialogOpen(false)}>
              Đóng
            </Button>
            {canManage &&
              (shift ? (
                <Button size="md" colorPalette="red" onClick={() => closeShift.mutate()} loading={closeShift.isPending}>
                  Đóng ca
                </Button>
              ) : (
                <Button size="md" colorPalette="blue" onClick={() => openShift.mutate()} loading={openShift.isPending}>
                  Mở ca
                </Button>
              ))}
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </>
  );
}
