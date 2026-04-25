"use client";

import Link from "next/link";
import PortalNav from "@/app/components/layout/PortalNav";

export default function AppNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="group flex items-center gap-3 rounded-lg px-1 py-0.5 transition hover:opacity-90"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-lg font-black text-white">
              A
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-bold tracking-tight text-gray-900">Attendance Mark</span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Portal</span>
            </span>
          </Link>
        </div>

        <PortalNav />
      </div>
    </header>
  );
}
