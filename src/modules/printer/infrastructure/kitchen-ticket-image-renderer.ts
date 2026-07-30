import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";

import { formatDateTime } from "~/lib/format-order";
import type { KitchenTicketPayload } from "../domain/kitchen-ticket-payload";
import { ensureFontsRegistered, receiptFont as font, wrapText } from "./receipt-canvas-utils";

ensureFontsRegistered();

const WIDTH = 576;
const PAD_X = 24;
const CONTENT_WIDTH = WIDTH - PAD_X * 2;

// Bếp cần đọc nhanh từ xa — cột đơn giản hơn hoá đơn (không giá tiền), chữ
// to hơn hẳn (20px thay vì 15px của bill).
const COL_STT = 50;
const COL_QTY = 70;
const COL_NAME = CONTENT_WIDTH - COL_STT - COL_QTY;

const ROW_FONT_SIZE = 20;
const NOTE_FONT_SIZE = 16;
const ROW_LINE_HEIGHT = 30;
const NOTE_LINE_HEIGHT = 24;
const ROW_PAD_TOP = 24;
const HEADER_HEIGHT = 38;

const LINE = {
  title: 46,
  transferInfo: 32,
  meta: 26,
  divider: 20,
};

type RowInfo = { lines: string[]; note: string | null; height: number };

function measureRows(ctx: SKRSContext2D, payload: KitchenTicketPayload): RowInfo[] {
  ctx.font = font(ROW_FONT_SIZE);
  return payload.items.map((item) => {
    const lines = wrapText(ctx, item.itemName, COL_NAME - 12);
    const height = lines.length * ROW_LINE_HEIGHT + (item.note ? NOTE_LINE_HEIGHT : 0);
    return { lines, note: item.note, height };
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
  ctx.font = font(28, true);
  y += 28;
  ctx.fillText(payload.title, centerX, y);
  y += LINE.title - 28;

  if (payload.transferInfo) {
    ctx.font = font(17, true);
    ctx.fillText(payload.transferInfo, centerX, (y += LINE.transferInfo) - LINE.transferInfo + 17);
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
  ctx.font = font(17);
  y += LINE.meta;
  ctx.fillText(`Mã HĐ: #${payload.orderId}`, metaLeftX, y - LINE.meta + 17);
  ctx.fillText(`Bàn: ${payload.tableName}`, metaRightX, y - LINE.meta + 17);
  y += LINE.meta;
  ctx.fillText(`Nhân viên: ${payload.staffName}`, metaLeftX, y - LINE.meta + 17);
  ctx.fillText(`Thời gian: ${formatDateTime(payload.createdAt)}`, metaRightX, y - LINE.meta + 17);

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

    ctx.font = font(17, true);
    const headerBaselineY = tableTop + HEADER_HEIGHT / 2 + 6;
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

      ctx.font = font(ROW_FONT_SIZE);
      ctx.textAlign = "center";
      ctx.fillText(String(index + 1), (colX[0]! + colX[1]!) / 2, rowTop + ROW_PAD_TOP);
      ctx.fillText(String(item.quantity), (colX[1]! + colX[2]!) / 2, rowTop + ROW_PAD_TOP);
      ctx.textAlign = "left";
      row.lines.forEach((line, i) => {
        ctx.fillText(line, colX[2]! + 6, rowTop + ROW_PAD_TOP + i * ROW_LINE_HEIGHT);
      });

      if (row.note) {
        ctx.font = font(NOTE_FONT_SIZE);
        ctx.fillText(`* ${row.note}`, colX[2]! + 6, rowTop + ROW_PAD_TOP + row.lines.length * ROW_LINE_HEIGHT - 6);
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
