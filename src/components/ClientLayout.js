"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  
  return (
    <>
      {pathname !== "/swagger" && <Sidebar />}
      <main className="flex-1 overflow-auto">{children}</main>
    </>
  );
} 