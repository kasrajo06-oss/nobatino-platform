import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { BRAND, SITE_URL } from "@/lib/config";
import "./globals.css";
import Providers from "./providers";

const vazirmatn = localFont({
  src: "./fonts/Vazirmatn.woff2",
  variable: "--font-vazirmatn",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${BRAND} | نوبت‌دهی اینترنتی پزشکان و مراکز درمانی`, template: `%s | ${BRAND}` },
  description: "جستجوی پزشک بر اساس شهر، تخصص و بیماری، رزرو آنلاین نوبت مطب، پذیرش آنلاین آزمایشگاه و مراکز درمانی.",
  openGraph: { siteName: BRAND, locale: "fa_IR", type: "website" },
};

export const viewport: Viewport = { themeColor: "#1d8394" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="min-h-screen font-sans antialiased">
        <Providers>
          <Header />
          <main className="min-h-[60vh]">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
