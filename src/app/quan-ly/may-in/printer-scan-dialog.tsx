"use client";

import { useEffect } from "react";
import { Badge, Button, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import { RefreshCw, Wifi } from "lucide-react";

import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "~/components/ui/dialog";
import { toaster } from "~/components/ui/toaster";
import { api } from "~/trpc/react";
import type { PrinterScanResult } from "~/modules/printer/domain/printer-scanner";

/**
 * Quét mạng LAN tìm máy in đang mở cổng 9100 (xem tcp-printer-scanner.ts).
 * Tự quét ngay khi mở dialog — người dùng chỉ cần bấm 1 nút trên toolbar,
 * không cần thêm 1 bước "Bắt đầu quét" thừa.
 */
export function PrinterScanDialog({
  open,
  onOpenChange,
  existingIpAddresses,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingIpAddresses: string[];
  onPick: (result: PrinterScanResult) => void;
}) {
  const scan = api.printer.scanNetwork.useMutation({
    onError: (error) => {
      toaster.create({ title: "Quét mạng thất bại", description: error.message, type: "error" });
    },
  });

  useEffect(() => {
    if (open) scan.mutate({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const results = scan.data ?? [];
  const existingSet = new Set(existingIpAddresses);

  return (
    <DialogRoot open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quét tìm máy in trong mạng</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <Stack gap={4}>
            <Text fontSize="sm" color="fg.muted">
              Dò tất cả card mạng (Wi-Fi lẫn dây LAN) của máy chủ, tìm thiết bị đang mở cổng in 9100.
            </Text>

            {scan.isPending && (
              <Flex align="center" justify="center" gap={2} py={8}>
                <Spinner size="sm" />
                <Text fontSize="sm" color="fg.muted">
                  Đang quét mạng, vui lòng đợi...
                </Text>
              </Flex>
            )}

            {!scan.isPending && scan.isSuccess && results.length === 0 && (
              <Text fontSize="sm" color="fg.muted" py={4} textAlign="center">
                Không tìm thấy máy in nào. Kiểm tra lại dây LAN/nguồn máy in rồi quét lại.
              </Text>
            )}

            {!scan.isPending && results.length > 0 && (
              <Stack gap={1}>
                {results.map((result) => {
                  const alreadyAdded = existingSet.has(result.ipAddress);
                  return (
                    <Flex
                      key={result.ipAddress}
                      align="center"
                      gap={3}
                      px={3}
                      py={2}
                      rounded="l2"
                      borderWidth="1px"
                      borderColor="border"
                    >
                      <Wifi size={16} />
                      <Stack gap={0} flex={1}>
                        <Text fontSize="sm" fontWeight="medium">
                          {result.ipAddress}
                        </Text>
                        <Text fontSize="xs" color="fg.muted">
                          Cổng {result.port}
                        </Text>
                      </Stack>
                      {alreadyAdded ? (
                        <Badge colorPalette="gray" variant="subtle" size="sm">
                          Đã thêm
                        </Badge>
                      ) : (
                        <Button size="sm" onClick={() => onPick(result)}>
                          Thêm
                        </Button>
                      )}
                    </Flex>
                  );
                })}
              </Stack>
            )}
          </Stack>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button variant="outline" onClick={() => scan.mutate({})} loading={scan.isPending}>
            <RefreshCw size={16} />
            Quét lại
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
