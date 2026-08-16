import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Quản lý trung tâm dạy nhạc · KAT Solutions",
  description: "Quản lý học viên, lớp học, điểm danh, học phí và lương giáo viên.",
  icons: {
    // Trỏ thẳng icon gốc của Kat (không copy file) để tự động theo khi Kat đổi logo.
    icon: [{ url: "https://www.kat-solutions.net/icon.svg", type: "image/svg+xml" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <ClerkProvider>
      <html lang={locale}>
        <body className={inter.className}>
          <NextIntlClientProvider messages={messages}>
            {children} <ToastContainer position="bottom-right" theme="dark" />
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
