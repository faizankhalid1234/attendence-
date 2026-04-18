"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/app/components/layout/ThemeToggle";

const links = [
  { href: "/", label: "Home" },
  { href: "/member/dashboard", label: "Member" },
  { href: "/company/dashboard", label: "Company" },
  { href: "/super-admin/dashboard", label: "Super Admin" },
];

export default function AppNavbar() {
  const pathname = usePathname();

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

        <nav
          className="flex min-w-0 w-full justify-center gap-0.5 overflow-x-auto rounded-full border border-slate-200/80 bg-white/70 p-1 shadow-inner dark:border-zinc-700/80 dark:bg-zinc-900/60 sm:flex-1 sm:px-2"
          aria-label="Main"
        >
          {links.map(({ href, label }) => {
            const active =
              href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                  active
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md dark:from-indigo-500 dark:to-violet-500"
                    : "text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden shrink-0 sm:block">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
