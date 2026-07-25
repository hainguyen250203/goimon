import "~/styles/globals.css";

import { type Metadata } from "next";
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
