import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";

import { formatDateTime, formatVnd } from "~/lib/format-order";
import type { BillPrintPayload } from "../domain/bill-print-payload";
import { ensureFontsRegistered, receiptFont as font, wrapText } from "./receipt-canvas-utils";

ensureFontsRegistered();

// Khổ giấy 80mm — 576px là chiều rộng dot chuẩn của máy in nhiệt 80mm phổ
// biến (203dpi), khớp cách pos-be tham khảo render bill.
const WIDTH = 576;
const PAD_X = 24;
const CONTENT_WIDTH = WIDTH - PAD_X * 2;

const COL_STT = 36;
const COL_QTY = 50;
const COL_PRICE = 112;
const COL_TOTAL = 122;
const COL_NAME = CONTENT_WIDTH - COL_STT - COL_QTY - COL_PRICE - COL_TOTAL;

const ROW_FONT_SIZE = 15;
const NOTE_FONT_SIZE = 12;
const ROW_LINE_HEIGHT = 24;
const NOTE_LINE_HEIGHT = 20;
const ROW_PAD_TOP = 18;
const HEADER_HEIGHT = 32;
// Khoảng cách sau ảnh QR trước khi vào footer — cố tình nhỏ hơn hẳn
// LINE.divider vì QR đã tự có khoảng trắng thị giác riêng quanh nó rồi.
const QR_TO_FOOTER_GAP = 10;

const LINE = {
  title: 40,
  meta: 26,
  divider: 20,
  total: 26,
  grandTotal: 38,
  footerName: 24,
  footer: 22,
};

type RowInfo = { lines: string[]; note: string | null; height: number };

function measureRows(ctx: SKRSContext2D, payload: BillPrintPayload): RowInfo[] {
  ctx.font = font(ROW_FONT_SIZE);
  return payload.items.map((item) => {
    const lines = wrapText(ctx, item.itemName, COL_NAME - 12);
    const height = lines.length * ROW_LINE_HEIGHT + (item.note ? NOTE_LINE_HEIGHT : 0);
    return { lines, note: item.note, height };
  });
}

/**
 * Render hoá đơn thành PNG buffer để in dạng ảnh (không dùng lệnh text
 * ESC/POS thô) — đảm bảo tiếng Việt có dấu hiển thị đúng trên mọi máy in
 * nhiệt, bất kể máy có hỗ trợ codepage tiếng Việt hay không.
 */
export async function renderBillImage(payload: BillPrintPayload): Promise<Buffer> {
  const qrImage = payload.qrImageUrl ? await loadImage(payload.qrImageUrl).catch(() => null) : null;
  const qrDisplaySize = 220;

  // Pass 1 — đo trước để biết chiều cao canvas thật cần dùng (canvas không
  // tự co giãn theo nội dung như DOM, phải biết trước kích thước).
  const measure = createCanvas(WIDTH, 10).getContext("2d");
  const rows = measureRows(measure, payload);
  const tableHeight = HEADER_HEIGHT + rows.reduce((sum, r) => sum + r.height, 0);

  let height = PAD_X;
  height += LINE.title;
  height += LINE.divider;
  height += LINE.meta * 2; // 2 dòng, mỗi dòng 2 cột (mã HĐ/bàn, NV/thời gian)
  height += LINE.divider;
  height += tableHeight;
  height += LINE.divider;
  height += LINE.total; // tạm tính
  if (payload.discountLabel) height += LINE.total;
  height += LINE.grandTotal;
  if (qrImage) {
    height += LINE.meta; // nhãn "Quét mã..." phía trên QR
    height += qrDisplaySize + QR_TO_FOOTER_GAP;
  } else {
    height += LINE.divider;
  }
  height += LINE.footerName + LINE.footer * 2; // tên quán + địa chỉ + SĐT
  height += LINE.footer; // câu cảm ơn
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
  ctx.font = font(26, true);
  y += 26;
  ctx.fillText("PHIẾU HOÁ ĐƠN", centerX, y);
  y += LINE.title - 26;

  y += LINE.divider / 2;
  ctx.beginPath();
  ctx.moveTo(PAD_X, y);
  ctx.lineTo(WIDTH - PAD_X, y);
  ctx.stroke();
  y += LINE.divider / 2;

  // Meta 2 cột — tận dụng hết chiều ngang thay vì xếp dọc 3 dòng riêng lẻ,
  // giống cách pos-be tham khảo bố trí (Mã HĐ/NV cùng hàng, Bàn/Thời gian
  // cùng hàng).
  const metaLeftX = PAD_X;
  const metaRightX = PAD_X + CONTENT_WIDTH / 2 + 8;
  ctx.textAlign = "left";
  ctx.font = font(15);
  y += LINE.meta;
  ctx.fillText(`Mã HĐ: #${payload.orderId}`, metaLeftX, y - LINE.meta + 15);
  ctx.fillText(`Bàn: ${payload.tableName}`, metaRightX, y - LINE.meta + 15);
  y += LINE.meta;
  ctx.fillText(`Nhân viên: ${payload.staffName}`, metaLeftX, y - LINE.meta + 15);
  ctx.fillText(`Thời gian: ${formatDateTime(payload.createdAt)}`, metaRightX, y - LINE.meta + 15);

  y += LINE.divider;

  // Bảng món — khung viền đủ 4 cạnh + kẻ dòng/cột, giống cách pos-be tham
  // khảo trình bày (không chỉ 1 đường kẻ dưới tiêu đề như bản trước).
  const colX = [PAD_X, PAD_X + COL_STT, PAD_X + COL_STT + COL_NAME, PAD_X + COL_STT + COL_NAME + COL_QTY, PAD_X + COL_STT + COL_NAME + COL_QTY + COL_PRICE, WIDTH - PAD_X];
  const tableTop = y;

  ctx.strokeRect(PAD_X, tableTop, CONTENT_WIDTH, tableHeight);
  for (let i = 1; i < colX.length - 1; i++) {
    ctx.beginPath();
    ctx.moveTo(colX[i]!, tableTop);
    ctx.lineTo(colX[i]!, tableTop + tableHeight);
    ctx.stroke();
  }

  ctx.font = font(14, true);
  const headerBaselineY = tableTop + HEADER_HEIGHT / 2 + 5;
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

    ctx.font = font(ROW_FONT_SIZE);
    ctx.textAlign = "center";
    ctx.fillText(String(index + 1), (colX[0]! + colX[1]!) / 2, rowTop + ROW_PAD_TOP);
    ctx.textAlign = "left";
    row.lines.forEach((line, i) => {
      ctx.fillText(line, colX[1]! + 6, rowTop + ROW_PAD_TOP + i * ROW_LINE_HEIGHT);
    });
    ctx.textAlign = "center";
    ctx.fillText(String(item.quantity), (colX[2]! + colX[3]!) / 2, rowTop + ROW_PAD_TOP);
    ctx.textAlign = "right";
    ctx.fillText(formatVnd(item.unitPrice), colX[4]! - 6, rowTop + ROW_PAD_TOP);
    ctx.fillText(formatVnd(item.unitPrice * item.quantity), colX[5]! - 6, rowTop + ROW_PAD_TOP);

    if (row.note) {
      ctx.textAlign = "left";
      ctx.font = font(NOTE_FONT_SIZE);
      ctx.fillText(`* ${row.note}`, colX[1]! + 6, rowTop + ROW_PAD_TOP + row.lines.length * ROW_LINE_HEIGHT - 4);
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

  ctx.font = font(16);
  ctx.textAlign = "left";
  ctx.fillText("Tạm tính", PAD_X, (y += LINE.total) - LINE.total + 16);
  ctx.textAlign = "right";
  ctx.fillText(formatVnd(payload.subtotal), WIDTH - PAD_X, y - LINE.total + 16);

  if (payload.discountLabel) {
    ctx.textAlign = "left";
    ctx.fillText(payload.discountLabel, PAD_X, (y += LINE.total) - LINE.total + 16);
    ctx.textAlign = "right";
    ctx.fillText(`-${formatVnd(payload.discountAmount)}`, WIDTH - PAD_X, y - LINE.total + 16);
  }

  ctx.font = font(22, true);
  ctx.textAlign = "left";
  ctx.fillText("Tổng cộng", PAD_X, (y += LINE.grandTotal) - LINE.grandTotal + 22);
  ctx.textAlign = "right";
  ctx.fillText(formatVnd(payload.totalAmount), WIDTH - PAD_X, y - LINE.grandTotal + 22);

  if (qrImage) {
    ctx.font = font(15);
    ctx.textAlign = "center";
    ctx.fillText("Quét mã để chuyển khoản", centerX, (y += LINE.meta) - LINE.meta + 15);
    const qrX = centerX - qrDisplaySize / 2;
    ctx.drawImage(qrImage, qrX, y, qrDisplaySize, qrDisplaySize);
    y += qrDisplaySize + QR_TO_FOOTER_GAP;
  } else {
    y += LINE.divider;
  }

  // Thông tin quán dời xuống cuối (footer) — đầu phiếu chỉ còn tiêu đề
  // chung "PHIẾU HOÁ ĐƠN", giống bố cục các phiếu bếp.
  ctx.textAlign = "center";
  ctx.font = font(18, true);
  ctx.fillText(payload.shopName, centerX, (y += LINE.footerName) - LINE.footerName + 18);
  ctx.font = font(14);
  ctx.fillText(payload.shopAddress, centerX, (y += LINE.footer) - LINE.footer + 14);
  ctx.fillText(`ĐT: ${payload.shopPhone}`, centerX, (y += LINE.footer) - LINE.footer + 14);

  ctx.font = font(15, true);
  ctx.fillText(payload.footerNote, centerX, (y += LINE.footer) - LINE.footer + 15);

  return canvas.toBuffer("image/png");
}
