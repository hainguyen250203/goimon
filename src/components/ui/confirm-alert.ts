/**
 * Xác nhận hành động bằng `window.confirm` (alert mặc định của trình duyệt)
 * thay vì Chakra Dialog — dùng cho các thao tác đã có 1 bước chọn/thao tác
 * trước đó rồi (vd chọn bàn đích, chọn món), thêm hẳn 1 dialog "Bạn có chắc?"
 * nữa là dư thừa/phiền. Hành động CHỈ thực thi khi bấm OK — bấm nhầm bước
 * trước đó không tự thực thi ngay.
 *
 * Đây là 1 trong 2 kiểu xác nhận dùng chung trong app — kiểu còn lại là
 * Chakra Dialog (`~/components/ui/dialog.tsx`) cho các luồng cần hiển thị
 * nhiều nội dung/form hơn là 1 câu hỏi đơn giản.
 */
export function confirmAlert(options: {
  title: string;
  description?: string;
  onConfirm: () => void;
}) {
  const { title, description, onConfirm } = options;
  const message = description ? `${title}\n${description}` : title;
  if (window.confirm(message)) {
    onConfirm();
  }
}
