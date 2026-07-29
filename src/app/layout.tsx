import "~/styles/globals.css";

import { type Metadata, type Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";

import { Provider } from "~/components/ui/provider";
import { EmotionRegistry } from "~/components/ui/emotion-registry";
import { Toaster } from "~/components/ui/toaster";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "Goimon",
  description: "Hệ thống POS quản lý nhà hàng",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
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
