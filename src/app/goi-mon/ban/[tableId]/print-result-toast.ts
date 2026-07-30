import { toaster } from "~/components/ui/toaster";
import type { PrintOutcome } from "~/modules/printer/domain/print-outcome";

/**
 * Dùng chung cho mọi nút/hành động có gửi lệnh in thật (hoá đơn lẫn phiếu
 * bếp) — `label` để câu thông báo đúng ngữ cảnh (vd "hoá đơn", "phiếu bếp").
 * `silentOnSuccess`: các hành động gọi món/huỷ món/chuyển bàn... xảy ra RẤT
 * thường xuyên — im lặng khi in thành công (giữ đúng UX đã bỏ toast success
 * cho các mutation này), chỉ báo khi thật sự có lỗi in.
 */
export function showPrintResultToast(
  printResult: PrintOutcome[],
  options: { label: string; silentOnSuccess?: boolean },
) {
  const { label, silentOnSuccess = false } = options;

  if (printResult.length === 0) {
    if (!silentOnSuccess) {
      toaster.create({
        title: `Chưa cấu hình máy in ${label}`,
        description: "Vào Quản lý > Máy in để thêm máy in đúng loại.",
        type: "info",
      });
    }
    return;
  }

  const succeeded = printResult.filter((r) => r.success);
  const failed = printResult.filter((r) => !r.success);

  if (failed.length === 0) {
    if (!silentOnSuccess) {
      toaster.create({ title: `Đã in ${label}`, type: "success" });
    }
    return;
  }

  if (succeeded.length > 0) {
    toaster.create({
      title: `Đã in ${label} ${succeeded.length}/${printResult.length} máy in`,
      description: `Lỗi: ${failed.map((f) => f.printerName).join(", ")}`,
      type: "warning",
    });
    return;
  }

  toaster.create({
    title: `In ${label} thất bại`,
    description: failed[0]?.error,
    type: "error",
  });
}
