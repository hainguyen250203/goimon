import "~/styles/globals.css";

import { type Metadata, type Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import NextTopLoader from "nextjs-toploader";

import { Provider } from "~/components/ui/provider";
import { EmotionRegistry } from "~/components/ui/emotion-registry";
import { Toaster } from "~/components/ui/toaster";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "Goimon",
  description: "Hệ thống POS quản lý nhà hàng",
  // Bộ file sinh từ favicon.io (public/) — favicon.ico cho trình duyệt cũ,
  // 2 bản PNG cho trình duyệt hiện đại (ưu tiên theo "sizes"), apple-touch-icon
  // cho màn hình chính iOS, manifest cho Android/PWA "Thêm vào màn hình chính".
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
};

// Khoá zoom bằng tay (userScalable/maximumScale) — app chủ yếu chạy như 1 màn
// hình thao tác nhanh trên điện thoại, để khách/nhân viên lỡ chạm 2 ngón tay
// zoom ra thì layout vỡ không đáng có. viewportFit "cover" để dùng hết màn
// hình trên thiết bị có notch/tai thỏ (safe-area).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

// Be Vietnam Pro: thiết kế riêng cho tiếng Việt (dấu thanh điệu chuẩn), sans
// hiện đại, phù hợp UI quản trị/dashboard.
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="vi"
      className={beVietnamPro.variable}
      suppressHydrationWarning
    >
      <body>
        <NextTopLoader
          initialPosition={0.3}
          crawlSpeed={800}
          height={3}
          showSpinner={false}
          easing="ease-in"
          speed={600}
          zIndex={9999}
        />
        <EmotionRegistry>
          <Provider defaultTheme="system" enableSystem>
            <TRPCReactProvider>
              {children}
              <Toaster />
            </TRPCReactProvider>
          </Provider>
        </EmotionRegistry>
      </body>
    </html>
  );
}
