/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // Turbopack (mặc định từ Next 16) không tự loại trừ các package Node-only
  // như "postgres" khỏi client bundle như webpack trước đây — phải khai báo
  // tường minh, nếu không build sẽ lỗi "Module not found: Can't resolve 'tls'".
  // "escpos"/"escpos-network" cùng lý do (raw TCP socket qua "net"), CommonJS.
  // "@napi-rs/canvas" load native binding (.node qua js-binding.js) — Turbopack
  // báo lỗi "non-ecmascript placeable asset" nếu cố bundle thay vì external hoá.
  serverExternalPackages: ["postgres", "escpos", "escpos-network", "@napi-rs/canvas"],
  allowedDevOrigins: ['low-institutes-alcohol-kyle.trycloudflare.com'],
  experimental: {
    // Mặc định Next 16 để staleTimes.dynamic = 0 — mọi trang trong app đều
    // dynamic (session/DB) nên MỌI lần chuyển trang, kể cả bấm back, đều bắt
    // Server Component render lại từ đầu (chạy lại toàn bộ prefetch() xuống
    // DB) dù TanStack Query phía client đã có data cache sẵn. Nâng lên 30s để
    // back/forward hoặc quay lại đúng route trong 30s tái dùng RSC payload cũ
    // thay vì hit DB lại. Không ảnh hưởng dữ liệu real-time thật (vd bàn
    // trống/đang phục vụ ở table-selector.tsx đã tự poll 8s phía client,
    // và mọi mutation vẫn tự invalidate() cache ngay khi thành công, không
    // phụ thuộc staleTime này).
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default config;
