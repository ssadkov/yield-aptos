"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import Sidebar from "@/components/Sidebar";
import { usePathname } from "next/navigation"; // Импортируем usePathname

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  const pathname = usePathname(); // Получаем текущий путь

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex h-screen overflow-hidden`}>
        <SessionProvider>
          {/* Показываем Sidebar, если это не Swagger */}
          {pathname !== "/swagger" && <Sidebar />}
          <main className="flex-1 overflow-auto">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
