import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";

import { formatDateTime } from "~/lib/format-order";
import type { KitchenTicketPayload } from "../domain/kitchen-ticket-payload";
import { ensureFontsRegistered, receiptFont as font, wrapText } from "./receipt-canvas-utils";

ensureFontsRegistered();

const WIDTH = 576;
const PAD_X = 24;
const CONTENT_WIDTH = WIDTH - PAD_X * 2;

// Bếp cần đọc nhanh từ xa — cột đơn giản hơn hoá đơn (không giá tiền), chữ
// to hơn hẳn hoá đơn.
const COL_STT = 50;
const COL_QTY = 70;
const COL_NAME = CONTENT_WIDTH - COL_STT - COL_QTY;

const ROW_FONT_SIZE = 26;
const NOTE_FONT_SIZE = 20;
const ROW_LINE_HEIGHT = 34;
const NOTE_LINE_HEIGHT = 28;
// Chiều cao TỐI THIỂU 1 dòng món dù chỉ 1 dòng ngắn — tránh dòng nào cũng
// dính sát nhau, nội dung được canh giữa theo chiều dọc trong dòng đó.
const MIN_ROW_HEIGHT = 56;
const HEADER_HEIGHT = 46;

const LINE = {
  title: 54,
  transferInfo: 36,
  meta: 30,
  divider: 22,
};

type RowInfo = { lines: string[]; note: string | null; contentHeight: number; height: number };

function measureRows(ctx: SKRSContext2D, payload: KitchenTicketPayload): RowInfo[] {
  ctx.font = font(ROW_FONT_SIZE);
  return payload.items.map((item) => {
    const lines = wrapText(ctx, item.itemName, COL_NAME - 12);
    const contentHeight = lines.length * ROW_LINE_HEIGHT + (item.note ? NOTE_LINE_HEIGHT : 0);
    return { lines, note: item.note, contentHeight, height: Math.max(MIN_ROW_HEIGHT, contentHeight) };
  });
}

/**
 * Render phiếu bếp thành PNG buffer — cùng lý do dùng ảnh thay vì lệnh text
 * ESC/POS thô như bill-image-renderer.ts (đảm bảo tiếng Việt có dấu). Không
 * có giá tiền/QR — bếp chỉ cần biết món + số lượng + ghi chú.
 */
export async function renderKitchenTicketImage(payload: KitchenTicketPayload): Promise<Buffer> {
  const measure = createCanvas(WIDTH, 10).getContext("2d");
  const rows = measureRows(measure, payload);
  const hasTable = payload.items.length > 0;
  const tableHeight = hasTable ? HEADER_HEIGHT + rows.reduce((sum, r) => sum + r.height, 0) : 0;

  let height = PAD_X;
  height += LINE.title;
  if (payload.transferInfo) height += LINE.transferInfo;
  height += LINE.divider;
  height += LINE.meta * 2; // 2 dòng, mỗi dòng 2 cột (mã HĐ/bàn, NV/thời gian)
  if (hasTable) {
    height += LINE.divider;
    height += tableHeight;
  }
  height += PAD_X;

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
  ctx.fillText(payload.title, centerX, y);
  y += LINE.title - 34;

  if (payload.transferInfo) {
    ctx.font = font(20, true);
    ctx.fillText(payload.transferInfo, centerX, (y += LINE.transferInfo) - LINE.transferInfo + 20);
  }

  y += LINE.divider / 2;
  ctx.beginPath();
  ctx.moveTo(PAD_X, y);
  ctx.lineTo(WIDTH - PAD_X, y);
  ctx.stroke();
  y += LINE.divider / 2;

  // Meta 2 cột — tận dụng hết chiều ngang thay vì xếp dọc từng dòng riêng lẻ.
  const metaLeftX = PAD_X;
  const metaRightX = PAD_X + CONTENT_WIDTH / 2 + 8;
  ctx.textAlign = "left";
  ctx.font = font(20);
  y += LINE.meta;
  ctx.fillText(`Mã HĐ: #${payload.orderId}`, metaLeftX, y - LINE.meta + 20);
  ctx.fillText(`Bàn: ${payload.tableName}`, metaRightX, y - LINE.meta + 20);
  y += LINE.meta;
  ctx.fillText(`Nhân viên: ${payload.staffName}`, metaLeftX, y - LINE.meta + 20);
  ctx.fillText(`Thời gian: ${formatDateTime(payload.createdAt)}`, metaRightX, y - LINE.meta + 20);

  if (hasTable) {
    y += LINE.divider;

    // Bảng món — khung viền đủ 4 cạnh + kẻ dòng/cột, giống cách pos-be tham
    // khảo trình bày.
    const colX = [PAD_X, PAD_X + COL_STT, PAD_X + COL_STT + COL_QTY, WIDTH - PAD_X];
    const tableTop = y;

    ctx.strokeRect(PAD_X, tableTop, CONTENT_WIDTH, tableHeight);
    for (let i = 1; i < colX.length - 1; i++) {
      ctx.beginPath();
      ctx.moveTo(colX[i]!, tableTop);
      ctx.lineTo(colX[i]!, tableTop + tableHeight);
      ctx.stroke();
    }

    ctx.font = font(20, true);
    const headerBaselineY = tableTop + HEADER_HEIGHT / 2 + 7;
    ctx.textAlign = "center";
    ctx.fillText("STT", (colX[0]! + colX[1]!) / 2, headerBaselineY);
    ctx.fillText("SL", (colX[1]! + colX[2]!) / 2, headerBaselineY);
    ctx.textAlign = "left";
    ctx.fillText("Tên món", colX[2]! + 6, headerBaselineY);

    ctx.beginPath();
    ctx.moveTo(PAD_X, tableTop + HEADER_HEIGHT);
    ctx.lineTo(WIDTH - PAD_X, tableTop + HEADER_HEIGHT);
    ctx.stroke();

    let rowTop = tableTop + HEADER_HEIGHT;
    rows.forEach((row, index) => {
      const item = payload.items[index]!;
      // Canh giữa nội dung theo chiều dọc trong dòng — dòng chỉ 1 dòng ngắn
      // (chưa chạm MIN_ROW_HEIGHT) vẫn nằm giữa, không dính sát mép trên.
      const blockTop = rowTop + (row.height - row.contentHeight) / 2;
      const numberBaselineY = rowTop + row.height / 2 + 9;

      ctx.font = font(ROW_FONT_SIZE);
      ctx.textAlign = "center";
      ctx.fillText(String(index + 1), (colX[0]! + colX[1]!) / 2, numberBaselineY);
      ctx.fillText(String(item.quantity), (colX[1]! + colX[2]!) / 2, numberBaselineY);
      ctx.textAlign = "left";
      row.lines.forEach((line, i) => {
        ctx.fillText(line, colX[2]! + 6, blockTop + (i + 1) * ROW_LINE_HEIGHT - 9);
      });

      // Phiếu huỷ món — gạch ngang mảnh qua giữa tên món để bếp nhận biết
      // ngay đây là món bị trả, không phải món cần chuẩn bị.
      if (payload.isRemoval) {
        const nameBlockHeight = row.lines.length * ROW_LINE_HEIGHT;
        const maxLineWidth = Math.max(...row.lines.map((line) => ctx.measureText(line).width));
        const strikeY = blockTop + nameBlockHeight / 2;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(colX[2]! + 6, strikeY);
        ctx.lineTo(colX[2]! + 6 + maxLineWidth, strikeY);
        ctx.stroke();
        ctx.lineWidth = 1;
      }

      if (row.note) {
        ctx.font = font(NOTE_FONT_SIZE);
        ctx.fillText(`* ${row.note}`, colX[2]! + 6, blockTop + row.lines.length * ROW_LINE_HEIGHT + NOTE_LINE_HEIGHT - 9);
      }

      rowTop += row.height;
      if (index < rows.length - 1) {
        ctx.beginPath();
        ctx.moveTo(PAD_X, rowTop);
        ctx.lineTo(WIDTH - PAD_X, rowTop);
        ctx.stroke();
      }
    });
  }

  return canvas.toBuffer("image/png");
}
