import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";

import type { BillPrintPayload } from "../domain/bill-print-payload";
import { ensureFontsRegistered, receiptFont as font, wrapText } from "./receipt-canvas-utils";

ensureFontsRegistered();

// Khổ giấy 80mm — 576px là chiều rộng dot chuẩn của máy in nhiệt 80mm phổ
// biến (203dpi). Cấu trúc/nội dung tham khảo sát theo bill mẫu đang dùng ở
// pos-be (render-bill-image.action.ts) theo yêu cầu — viết lại code mới,
// không copy, nhưng giữ đúng các phần: tiêu đề, Mã HĐ/TN/Bàn/Ngày/Giờ vào
// giờ ra, bảng có khung kẻ đủ, khối ngân hàng phía trên QR, footer.
const WIDTH = 576;
const PAD_X = 24;
const CONTENT_WIDTH = WIDTH - PAD_X * 2;

const COL_STT = 45;
const COL_QTY = 40;
const COL_PRICE = 110;
const COL_TOTAL = 120;
const COL_NAME = CONTENT_WIDTH - COL_STT - COL_QTY - COL_PRICE - COL_TOTAL;

// Cỡ chữ to hơn hẳn bản cũ (16px) để đọc rõ trên giấy in nhiệt — mỗi dòng
// món có chiều cao TỐI THIỂU (MIN_ROW_HEIGHT) dù chỉ 1 dòng ngắn, tránh dòng
// nào cũng sát nhau; nội dung được canh giữa theo chiều dọc trong dòng đó.
const ROW_FONT_SIZE = 22;
const NOTE_FONT_SIZE = 17;
const ROW_LINE_HEIGHT = 28;
const NOTE_LINE_HEIGHT = 22;
const MIN_ROW_HEIGHT = 52;
const HEADER_HEIGHT = 46;

const LINE = {
  title: 46,
  subtitle: 34,
  meta: 32,
  divider: 22,
  // Khoảng cách riêng, nhỏ hơn divider — giữa tiêu đề/Số HĐ với khối
  // Mã HĐ/Bàn..., và giữa khối đó với bảng món — cố tình sát nhau hơn.
  sectionGap: 10,
  total: 34,
  grandTotal: 38,
  bank: 34,
  bankName: 28,
  gapSmall: 12,
  gapTiny: 8,
  footerName: 32,
  footer: 26,
};

type RowInfo = { lines: string[]; note: string | null; contentHeight: number; height: number };

function measureRows(ctx: SKRSContext2D, payload: BillPrintPayload): RowInfo[] {
  ctx.font = font(ROW_FONT_SIZE);
  return payload.items.map((item) => {
    const lines = wrapText(ctx, item.itemName, COL_NAME - 12);
    const contentHeight = lines.length * ROW_LINE_HEIGHT + (item.note ? NOTE_LINE_HEIGHT : 0);
    return { lines, note: item.note, contentHeight, height: Math.max(MIN_ROW_HEIGHT, contentHeight) };
  });
}

// Tên quán/địa chỉ do người dùng tự cấu hình, độ dài không lường trước được
// — thay vì tự xuống dòng (tốn thêm giấy, phải tính lại chiều cao 2-pass),
// thu nhỏ chữ vừa đúng 1 dòng trong CONTENT_WIDTH, không nhỏ hơn MIN_FIT_SIZE.
const MIN_FIT_SIZE = 12;

function fitFontSize(ctx: SKRSContext2D, text: string, baseSize: number, maxWidth: number, bold = false): number {
  ctx.font = font(baseSize, bold);
  const width = ctx.measureText(text).width;
  if (width <= maxWidth) return baseSize;
  return Math.max(MIN_FIT_SIZE, Math.floor(baseSize * (maxWidth / width)));
}

function formatDateVi(d: Date) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

function formatTimeVi(d: Date) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

/**
 * Render hoá đơn thành PNG buffer để in dạng ảnh (không dùng lệnh text
 * ESC/POS thô) — đảm bảo tiếng Việt có dấu hiển thị đúng trên mọi máy in
 * nhiệt, bất kể máy có hỗ trợ codepage tiếng Việt hay không.
 */
export async function renderBillImage(payload: BillPrintPayload): Promise<Buffer> {
  const hasBankInfo = !!(payload.bankCode && payload.bankAccountNumber);
  const qrImage = hasBankInfo && payload.qrImageUrl ? await loadImage(payload.qrImageUrl).catch(() => null) : null;
  const qrDisplaySize = 220;

  // Pass 1 — đo trước để biết chiều cao canvas thật cần dùng (canvas không
  // tự co giãn theo nội dung như DOM, phải biết trước kích thước).
  const measure = createCanvas(WIDTH, 10).getContext("2d");
  const rows = measureRows(measure, payload);
  const tableHeight = HEADER_HEIGHT + rows.reduce((sum, r) => sum + r.height, 0);

  let height = PAD_X;
  height += LINE.title;
  height += LINE.subtitle;
  height += LINE.sectionGap;
  height += LINE.meta * 3; // Mã HĐ/TN, Bàn/Ngày, Giờ vào/Giờ ra
  height += LINE.sectionGap;
  height += tableHeight;
  height += LINE.divider;
  height += LINE.total; // Thành tiền
  if (payload.discountLabel) height += LINE.total;
  height += LINE.grandTotal; // Tổng tiền
  if (hasBankInfo) {
    height += LINE.gapSmall + LINE.bank * 2 + LINE.bankName; // mã NH + số TK + tên TK
    if (qrImage) height += qrDisplaySize + LINE.gapTiny;
  }
  height += LINE.gapSmall;
  height += LINE.footerName + LINE.footer; // tên quán + địa chỉ
  height += PAD_X;

  // Pass 2 — vẽ thật trên canvas đúng kích thước đã tính.
  const canvas = createCanvas(WIDTH, Math.ceil(height));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, WIDTH, canvas.height);
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;

  let y = PAD_X;
  const centerX = WIDTH / 2;

  ctx.textAlign = "center";
  ctx.font = font(34, true);
  y += 34;
  ctx.fillText("HÓA ĐƠN THANH TOÁN", centerX, y);
  y += LINE.title - 34;

  ctx.font = font(24, true);
  y += 24;
  ctx.fillText(`Số HĐ: #${payload.orderId}`, centerX, y);
  y += LINE.subtitle - 24;

  y += LINE.sectionGap;

  // Meta 3 dòng x 2 cột — Mã HĐ/TN, Bàn/Ngày, Giờ vào/Giờ ra, đúng bố cục
  // bill mẫu tham khảo.
  const metaLeftX = PAD_X;
  const metaRightX = PAD_X + CONTENT_WIDTH / 2 + 8;
  const shortId = String(payload.orderId).slice(-5).toUpperCase();
  ctx.textAlign = "left";
  ctx.font = font(22);
  y += LINE.meta;
  ctx.fillText(`Mã HĐ: #${shortId}`, metaLeftX, y - LINE.meta + 22);
  ctx.fillText(`TN: ${payload.staffName}`, metaRightX, y - LINE.meta + 22);
  y += LINE.meta;
  ctx.fillText(`Bàn: ${payload.tableName}`, metaLeftX, y - LINE.meta + 22);
  ctx.fillText(`Ngày: ${formatDateVi(payload.createdAt)}`, metaRightX, y - LINE.meta + 22);
  y += LINE.meta;
  ctx.fillText(`Giờ vào: ${formatTimeVi(payload.createdAt)}`, metaLeftX, y - LINE.meta + 22);
  ctx.fillText(`Giờ ra: ${formatTimeVi(payload.printedAt)}`, metaRightX, y - LINE.meta + 22);

  y += LINE.sectionGap;

  // Bảng món — khung viền đủ 4 cạnh + kẻ dòng/cột.
  const colX = [PAD_X, PAD_X + COL_STT, PAD_X + COL_STT + COL_NAME, PAD_X + COL_STT + COL_NAME + COL_QTY, PAD_X + COL_STT + COL_NAME + COL_QTY + COL_PRICE, WIDTH - PAD_X];
  const tableTop = y;

  ctx.strokeRect(PAD_X, tableTop, CONTENT_WIDTH, tableHeight);
  for (let i = 1; i < colX.length - 1; i++) {
    ctx.beginPath();
    ctx.moveTo(colX[i]!, tableTop);
    ctx.lineTo(colX[i]!, tableTop + tableHeight);
    ctx.stroke();
  }

  ctx.font = font(21, true);
  const headerBaselineY = tableTop + HEADER_HEIGHT / 2 + 7;
  ctx.textAlign = "center";
  ctx.fillText("STT", (colX[0]! + colX[1]!) / 2, headerBaselineY);
  ctx.textAlign = "left";
  ctx.fillText("Tên món", colX[1]! + 6, headerBaselineY);
  ctx.textAlign = "center";
  ctx.fillText("SL", (colX[2]! + colX[3]!) / 2, headerBaselineY);
  ctx.textAlign = "right";
  ctx.fillText("Đơn giá", colX[4]! - 6, headerBaselineY);
  ctx.fillText("Thành tiền", colX[5]! - 6, headerBaselineY);

  ctx.beginPath();
  ctx.moveTo(PAD_X, tableTop + HEADER_HEIGHT);
  ctx.lineTo(WIDTH - PAD_X, tableTop + HEADER_HEIGHT);
  ctx.stroke();

  let rowTop = tableTop + HEADER_HEIGHT;
  rows.forEach((row, index) => {
    const item = payload.items[index]!;
    // Canh giữa nội dung theo chiều dọc trong dòng — dòng nào chỉ 1 dòng
    // ngắn (chưa chạm MIN_ROW_HEIGHT) vẫn nằm giữa, không dính sát mép trên.
    const blockTop = rowTop + (row.height - row.contentHeight) / 2;
    const numberBaselineY = rowTop + row.height / 2 + 7;

    ctx.font = font(ROW_FONT_SIZE);
    ctx.textAlign = "center";
    ctx.fillText(String(index + 1), (colX[0]! + colX[1]!) / 2, numberBaselineY);
    ctx.textAlign = "left";
    row.lines.forEach((line, i) => {
      ctx.fillText(line, colX[1]! + 6, blockTop + (i + 1) * ROW_LINE_HEIGHT - 8);
    });
    ctx.textAlign = "center";
    ctx.fillText(String(item.quantity), (colX[2]! + colX[3]!) / 2, numberBaselineY);
    ctx.textAlign = "right";
    ctx.fillText(item.unitPrice.toLocaleString("vi-VN"), colX[4]! - 6, numberBaselineY);
    ctx.fillText((item.unitPrice * item.quantity).toLocaleString("vi-VN"), colX[5]! - 6, numberBaselineY);

    if (row.note) {
      ctx.textAlign = "left";
      ctx.font = font(NOTE_FONT_SIZE);
      ctx.fillText(`* ${row.note}`, colX[1]! + 6, blockTop + row.lines.length * ROW_LINE_HEIGHT + NOTE_LINE_HEIGHT - 8);
    }

    rowTop += row.height;
    if (index < rows.length - 1) {
      ctx.beginPath();
      ctx.moveTo(PAD_X, rowTop);
      ctx.lineTo(WIDTH - PAD_X, rowTop);
      ctx.stroke();
    }
  });

  y = tableTop + tableHeight;
  y += LINE.divider;

  ctx.font = font(22);
  ctx.textAlign = "left";
  ctx.fillText("Thành tiền:", PAD_X, (y += LINE.total) - LINE.total + 22);
  ctx.textAlign = "right";
  ctx.fillText(`${payload.subtotal.toLocaleString("vi-VN")} đ`, WIDTH - PAD_X, y - LINE.total + 22);

  if (payload.discountLabel) {
    ctx.textAlign = "left";
    ctx.fillText(payload.discountLabel, PAD_X, (y += LINE.total) - LINE.total + 22);
    ctx.textAlign = "right";
    ctx.fillText(`-${payload.discountAmount.toLocaleString("vi-VN")} đ`, WIDTH - PAD_X, y - LINE.total + 22);
  }

  ctx.font = font(24, true);
  ctx.textAlign = "left";
  ctx.fillText("Tổng tiền:", PAD_X, (y += LINE.grandTotal) - LINE.grandTotal + 24);
  ctx.textAlign = "right";
  ctx.fillText(`${payload.totalAmount.toLocaleString("vi-VN")} đ`, WIDTH - PAD_X, y - LINE.grandTotal + 24);

  if (hasBankInfo) {
    y += LINE.gapSmall;
    ctx.textAlign = "center";
    ctx.font = font(26, true);
    ctx.fillText(payload.bankCode!, centerX, (y += LINE.bank) - LINE.bank + 26);
    ctx.fillText(payload.bankAccountNumber!, centerX, (y += LINE.bank) - LINE.bank + 26);
    ctx.font = font(22);
    ctx.fillText(payload.bankAccountName ?? "", centerX, (y += LINE.bankName) - LINE.bankName + 22);

    if (qrImage) {
      y += LINE.gapTiny;
      const qrX = centerX - qrDisplaySize / 2;
      ctx.drawImage(qrImage, qrX, y, qrDisplaySize, qrDisplaySize);
      y += qrDisplaySize;
    }
  }

  y += LINE.gapSmall;

  // Footer — tên quán + địa chỉ, luôn vừa đúng 1 dòng (xem fitFontSize).
  const addressText = `Địa chỉ: ${payload.shopAddress}`;
  const shopNameSize = fitFontSize(ctx, payload.shopName, 24, CONTENT_WIDTH, true);
  const addressSize = fitFontSize(ctx, addressText, 20, CONTENT_WIDTH);
  ctx.textAlign = "center";
  ctx.font = font(shopNameSize, true);
  ctx.fillText(payload.shopName, centerX, (y += LINE.footerName) - LINE.footerName + shopNameSize);
  ctx.font = font(addressSize);
  ctx.fillText(addressText, centerX, (y += LINE.footer) - LINE.footer + addressSize);

  return canvas.toBuffer("image/png");
}
