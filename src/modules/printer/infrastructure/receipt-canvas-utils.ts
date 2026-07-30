import path from "node:path";

import { GlobalFonts, type SKRSContext2D } from "@napi-rs/canvas";

export const FONT_FAMILY = "Be Vietnam Pro";

// Máy chủ (kể cả môi trường serverless như Vercel) thường KHÔNG có sẵn font
// hệ thống nào — không đăng ký font thì @napi-rs/canvas không vẽ được chữ có
// dấu tiếng Việt. Đặt file font ở `public/fonts` (không phải `src/assets`)
// vì Next.js đảm bảo copy nguyên `public/` ra output, còn đường dẫn tương
// đối tới file trong `src/` không còn đúng sau khi server code được bundle.
// Đăng ký 1 lần lúc module load (guard bằng `has()` để hot-reload dev không
// đăng ký trùng) — dùng chung cho cả renderer hoá đơn lẫn phiếu bếp.
export function ensureFontsRegistered() {
  if (GlobalFonts.has(FONT_FAMILY)) return;
  const fontsDir = path.join(process.cwd(), "public", "fonts");
  GlobalFonts.registerFromPath(path.join(fontsDir, "BeVietnamPro-Regular.ttf"), FONT_FAMILY);
  GlobalFonts.registerFromPath(path.join(fontsDir, "BeVietnamPro-Bold.ttf"), FONT_FAMILY);
}

export function receiptFont(sizePx: number, bold = false) {
  return `${bold ? "bold " : ""}${sizePx}px "${FONT_FAMILY}"`;
}

export function wrapText(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ").filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(attempt).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = attempt;
    }
  }
  if (current) lines.push(current);
  return lines;
}
