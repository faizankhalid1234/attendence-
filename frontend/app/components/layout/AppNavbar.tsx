"use client";

import Link from "next/link";
import ThemeToggle from "@/app/components/layout/ThemeToggle";
import PortalNav from "@/app/components/layout/PortalNav";

export default function AppNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-[var(--background)]/90 shadow-sm backdrop-blur-xl dark:border-zinc-800/90">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
        <div className="flex items-center justify-between gap-3 sm:justify-start">
          <Link
            href="/"
            className="group flex items-center gap-3 rounded-2xl px-1 py-0.5 transition hover:opacity-95"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-lg font-black text-white shadow-lg shadow-indigo-500/25 ring-2 ring-white/30 dark:from-indigo-500 dark:to-violet-500 dark:ring-zinc-800">
              A
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                Attendance Mark
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-indigo-600/90 dark:text-indigo-400">
                Portal
              </span>
            </span>
          </Link>
          <div className="sm:hidden">
            <ThemeToggle />
          </div>
        </div>

        <PortalNav />

        <div className="hidden shrink-0 sm:block">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
