import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { managerProcedure, createTRPCRouter } from "~/server/api/trpc";
import { listPrinters } from "./application/list-printers.usecase";
import { createPrinter } from "./application/create-printer.usecase";
import { updatePrinter } from "./application/update-printer.usecase";
import { deletePrinter } from "./application/delete-printer.usecase";
import { scanNetworkForPrinters } from "./application/scan-network-for-printers.usecase";
import { printerDrizzleRepository } from "./infrastructure/printer.drizzle-repository";
import { tcpPrinterScanner } from "./infrastructure/tcp-printer-scanner";
import { logActivity } from "~/modules/activity-log/log-activity";

// Cổng raw/JetDirect chuẩn của máy in mạng (ESC/POS) — khớp cổng mặc định
// đang dùng khi tạo máy in thủ công (xem printer-form-dialog.tsx).
const DEFAULT_SCAN_PORT = 9100;

// Xem menu.router.ts — drizzle-zod@0.8 sinh schema kiểu zod/v4, không
// .extend() tương thích được với `z` classic nên viết tay thay vì sinh.
const printerInputSchema = z.object({
  name: z.string().min(1, "Tên máy in không được để trống"),
  ipAddress: z
    .string()
    .min(1, "Địa chỉ IP không được để trống")
    .regex(
      /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/,
      "Địa chỉ IP không hợp lệ",
    ),
  port: z.number().int().min(1).max(65535),
  isActive: z.boolean(),
});

export const printerRouter = createTRPCRouter({
  // Quét mạng LAN tìm IP máy in đang mở cổng 9100 — máy chạy server này vừa
  // nối Wi-Fi vừa nối dây LAN thẳng tới máy in (xem tcp-printer-scanner.ts),
  // nên phải chạy trên server chứ không thể quét từ trình duyệt người dùng.
  scanNetwork: managerProcedure
    .input(z.object({ port: z.number().int().min(1).max(65535).default(DEFAULT_SCAN_PORT) }).optional())
    .mutation(({ input }) => scanNetworkForPrinters(tcpPrinterScanner, input?.port ?? DEFAULT_SCAN_PORT)),

  list: managerProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        isActive: z.boolean().optional(),
      }),
    )
    .query(({ input }) => listPrinters(printerDrizzleRepository, input)),

  create: managerProcedure
    .input(printerInputSchema)
    .mutation(async ({ ctx, input }) => {
      const item = await createPrinter(printerDrizzleRepository, input);
      await logActivity({
        actorId: ctx.session.user.id,
        action: "create",
        entityType: "printer",
        entityId: String(item.id),
        metadata: { name: item.name },
      });
      return item;
    }),

  update: managerProcedure
    .input(printerInputSchema.extend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { before, after } = await updatePrinter(printerDrizzleRepository, input);
      await logActivity({
        actorId: ctx.session.user.id,
        action: "update",
        entityType: "printer",
        entityId: String(after.id),
        metadata: {
          before: { name: before.name, ipAddress: before.ipAddress, port: before.port, isActive: before.isActive },
          after: { name: after.name, ipAddress: after.ipAddress, port: after.port, isActive: after.isActive },
        },
      });
      return after;
    }),

  delete: managerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await deletePrinter(printerDrizzleRepository, input.id);
      } catch (error) {
        throw new TRPCError({
          code: "CONFLICT",
          message: error instanceof Error ? error.message : "Xoá thất bại.",
        });
      }
      await logActivity({
        actorId: ctx.session.user.id,
        action: "delete",
        entityType: "printer",
        entityId: String(input.id),
      });
    }),
});
