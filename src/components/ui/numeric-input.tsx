import type { InputProps } from "@chakra-ui/react";
import { Input } from "@chakra-ui/react";
import * as React from "react";

export type NumericInputProps = InputProps;

/**
 * Input số nguyên dùng chung — ép bàn phím số trên mobile (`inputMode="numeric"`),
 * dùng `type="text"` + `pattern="[0-9]*"` thay vì `type="number"` để tránh nút
 * tăng/giảm và ký tự +/-/e mà nhiều trình duyệt mobile vẫn hiện. Chỉ dùng cho số
 * nguyên không âm — app này không có trường hợp cần số thập phân. `min`/`max`
 * không được trình duyệt tự enforce trên `type="text"`, chỉ mang tính tài liệu —
 * nơi gọi đã tự validate qua JS/Zod sẵn. `type`/`inputMode`/`pattern` đặt SAU
 * `{...props}` để luôn được ép cứng, tránh nơi gọi lỡ override lại `type="number"`.
 */
export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  function NumericInput(props, ref) {
    return <Input {...props} ref={ref} type="text" inputMode="numeric" pattern="[0-9]*" />;
  },
);
