"use client";

import { useEffect, useState } from "react";
import { Box, Button, Flex, Image, Input, Stack, Text } from "@chakra-ui/react";

import { FilterSelect } from "~/components/data-table/filter-select";
import { EmptyState } from "~/components/ui/empty-state";
import { Field } from "~/components/ui/field";
import { NumericInput } from "~/components/ui/numeric-input";
import { toaster } from "~/components/ui/toaster";
import { api } from "~/trpc/react";
import { buildVietQrImageUrl } from "~/lib/vietqr";
import type { PaymentConfig } from "~/modules/payment-config/domain/payment-config.entity";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type FormState = {
  bankCode: string;
  bankAccountNumber: string;
  bankAccountName: string;
};

function toFormState(config: PaymentConfig | null): FormState {
  return {
    bankCode: config?.bankCode ?? "",
    bankAccountNumber: config?.bankAccountNumber ?? "",
    bankAccountName: config?.bankAccountName ?? "",
  };
}

function InfoRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <Flex
      justify="space-between"
      align="center"
      gap={4}
      py={3}
      borderBottomWidth={isLast ? 0 : "1px"}
      borderColor="border"
    >
      <Text fontSize="sm" color="fg.muted">
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="semibold" textAlign="right">
        {value}
      </Text>
    </Flex>
  );
}

/**
 * Thông tin ngân hàng nhận tiền + ảnh QR VietQR thật tương ứng (đúng ảnh sẽ
 * in lên bill, chỉ chưa gắn amount vì trang này không thuộc về 1 đơn cụ
 * thể). Chỉ 1 bản duy nhất cho toàn hệ thống — admin sửa, quản lý chỉ xem
 * (chặn thật ở payment-config.router.ts, `canEdit` ở đây chỉ để ẩn/hiện UI).
 */
export function PaymentConfigView({ canEdit }: { canEdit: boolean }) {
  const utils = api.useUtils();
  const [config] = api.paymentConfig.get.useSuspenseQuery();
  // Không dùng suspense — VietQR có thể chậm/lỗi, không nên chặn cả trang vì
  // 1 API bên ngoài; lỗi thì tự rớt về nhập tay mã ngân hàng (xem bên dưới).
  const banksQuery = api.paymentConfig.listBanks.useQuery(undefined, { staleTime: ONE_DAY_MS });
  const banks = banksQuery.data ?? [];
  const bankOptions = banks.map((b) => ({ value: b.code, label: `${b.shortName} (${b.code})` }));
  const bankLabel = (code: string) => {
    const bank = banks.find((b) => b.code === code);
    return bank ? `${bank.shortName} (${bank.code})` : code;
  };

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(() => toFormState(config));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (!editing) setForm(toFormState(config));
  }, [config, editing]);

  const update = api.paymentConfig.update.useMutation({
    onSuccess: () => {
      toaster.create({ title: "Đã lưu thông tin ngân hàng", type: "success" });
      setEditing(false);
      void utils.paymentConfig.get.invalidate();
    },
    onError: (error) => {
      toaster.create({ title: "Không lưu được", description: error.message, type: "error" });
    },
  });

  const handleSubmit = () => {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.bankCode.trim()) nextErrors.bankCode = "Vui lòng chọn ngân hàng";
    if (!form.bankAccountNumber.trim()) nextErrors.bankAccountNumber = "Số tài khoản không được để trống";
    if (!form.bankAccountName.trim()) nextErrors.bankAccountName = "Tên chủ tài khoản không được để trống";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    update.mutate({
      bankCode: form.bankCode.trim().toUpperCase(),
      bankAccountNumber: form.bankAccountNumber.trim(),
      bankAccountName: form.bankAccountName.trim(),
    });
  };

  const handleStartEdit = () => {
    setForm(toFormState(config));
    setErrors({});
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setForm(toFormState(config));
    setErrors({});
    setEditing(false);
  };

  if (!config && !canEdit) {
    return (
      <Flex align="center" justify="center" py={16}>
        <EmptyState
          title="Chưa có thông tin ngân hàng"
          description="Liên hệ admin để thiết lập tài khoản nhận tiền."
        />
      </Flex>
    );
  }

  const showForm = editing || !config;

  // Ảnh QR lấy từ giá trị đang gõ dở khi ở chế độ sửa (xem trước ngay), hoặc
  // từ bản đã lưu khi chỉ xem — đây là URL QR THẬT (không phải minh hoạ),
  // đúng format sẽ dùng khi in bill (chưa gắn amount vì trang này không gắn
  // với 1 đơn cụ thể, xem lib/vietqr.ts).
  const qrValues = showForm ? form : config;
  const qrUrl =
    qrValues && qrValues.bankCode.trim() && qrValues.bankAccountNumber.trim()
      ? buildVietQrImageUrl(
          qrValues.bankCode.trim(),
          qrValues.bankAccountNumber.trim(),
          qrValues.bankAccountName.trim(),
        )
      : null;

  return (
    <Box w="full" borderWidth="1px" borderColor="border" rounded="l3" bg="bg.panel" overflow="hidden">
      <Flex align="center" justify="space-between" gap={3} px={6} py={4} borderBottomWidth="1px" borderColor="border">
        <Box>
          <Text fontWeight="semibold">Thông tin nhận tiền</Text>
          <Text fontSize="xs" color="fg.muted">
            Chỉ 1 bản dùng chung cho toàn hệ thống
          </Text>
        </Box>
        {!showForm && canEdit && (
          <Button size="sm" variant="outline" onClick={handleStartEdit}>
            Sửa
          </Button>
        )}
      </Flex>

      <Flex direction={{ base: "column", md: "row" }}>
        <Box flex="1" p={6}>
          {showForm ? (
            <Stack gap={4}>
              <Field label="Ngân hàng" invalid={!!errors.bankCode} errorText={errors.bankCode}>
                {banksQuery.isError ? (
                  <Input
                    placeholder="Không tải được danh sách — nhập tay mã ngân hàng (vd: VCB, TCB...)"
                    value={form.bankCode}
                    onChange={(e) => setForm((f) => ({ ...f, bankCode: e.target.value }))}
                  />
                ) : (
                  <FilterSelect
                    options={bankOptions}
                    value={form.bankCode}
                    onValueChange={(value) => setForm((f) => ({ ...f, bankCode: value }))}
                    placeholder={banksQuery.isPending ? "Đang tải danh sách ngân hàng..." : "Chọn ngân hàng"}
                    width="full"
                  />
                )}
              </Field>
              <Field label="Số tài khoản" invalid={!!errors.bankAccountNumber} errorText={errors.bankAccountNumber}>
                <NumericInput
                  value={form.bankAccountNumber}
                  onChange={(e) => setForm((f) => ({ ...f, bankAccountNumber: e.target.value }))}
                />
              </Field>
              <Field label="Tên chủ tài khoản" invalid={!!errors.bankAccountName} errorText={errors.bankAccountName}>
                <Input
                  value={form.bankAccountName}
                  onChange={(e) => setForm((f) => ({ ...f, bankAccountName: e.target.value.toUpperCase() }))}
                />
              </Field>
            </Stack>
          ) : (
            config && (
              <Box>
                <InfoRow label="Ngân hàng" value={bankLabel(config.bankCode)} />
                <InfoRow label="Số tài khoản" value={config.bankAccountNumber} />
                <InfoRow label="Tên chủ tài khoản" value={config.bankAccountName} isLast />
              </Box>
            )
          )}
        </Box>

        <Box
          flex="1"
          p={6}
          borderLeftWidth={{ base: 0, md: "1px" }}
          borderTopWidth={{ base: "1px", md: 0 }}
          borderColor="border"
        >
          <Flex direction="column" align="center" gap={3}>
            {qrUrl ? (
              <>
                <Image src={qrUrl} alt="Mã QR chuyển khoản" boxSize="220px" rounded="l2" />
                <Text fontSize="sm" fontWeight="medium">
                  {qrValues && bankLabel(qrValues.bankCode)} · {qrValues?.bankAccountNumber}
                </Text>
              </>
            ) : (
              <Flex
                boxSize="220px"
                borderWidth="1px"
                borderStyle="dashed"
                borderColor="border"
                rounded="l2"
                align="center"
                justify="center"
                p={4}
              >
                <Text fontSize="xs" color="fg.muted" textAlign="center">
                  Chọn ngân hàng và nhập số tài khoản để hiện mã QR
                </Text>
              </Flex>
            )}
            <Text fontSize="2xs" color="fg.muted" textAlign="center">
              Mã QR sẽ dùng khi in hoá đơn — quét thử để kiểm tra đúng tài khoản trước khi lưu.
            </Text>
          </Flex>
        </Box>
      </Flex>

      {showForm && (
        <Flex gap={2} justify="flex-end" px={6} py={4} borderTopWidth="1px" borderColor="border">
          {config && (
            <Button variant="outline" onClick={handleCancelEdit} disabled={update.isPending}>
              Huỷ
            </Button>
          )}
          <Button colorPalette="blue" onClick={handleSubmit} loading={update.isPending}>
            Lưu
          </Button>
        </Flex>
      )}
    </Box>
  );
}
