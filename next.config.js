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
  serverExternalPackages: ["postgres"],
};

export default config;
