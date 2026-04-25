"use client";

import LogoutButton from "@/app/components/LogoutButton";

type Props = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  showLogout?: boolean;
  logoutClassName?: string;
  /** Rich header for company dashboard: logo + name only (omit long subtitle). */
  variant?: "default" | "company";
};

/** Small monoline mark — reads clearly at ~20px. */
function CompanyLogoMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4 20h16M6 20V9.5L12 6l6 3.5V20M9 20v-6h6v6M9 11h2M13 11h2M9 14h2M13 14h2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  showLogout,
  logoutClassName,
  variant = "default",
}: Props) {
  if (variant === "company") {
    return (
      <header className="relative overflow-hidden rounded-2xl border border-emerald-200/55 bg-gradient-to-br from-white via-emerald-50/50 to-teal-100/40 p-6 shadow-xl shadow-emerald-900/10 ring-1 ring-emerald-900/[0.06] dark:border-emerald-800/50 dark:from-zinc-950 dark:via-emerald-950/25 dark:to-teal-950/20 dark:shadow-emerald-950/25 sm:p-8">
        <div className="pointer-events-none absolute -right-8 -top-12 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/10" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-teal-400/15 blur-2xl dark:bg-teal-600/10" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/25 ring-1 ring-white/50 dark:from-emerald-500 dark:to-teal-700 dark:ring-white/10 sm:h-11 sm:w-11"
              aria-hidden
            >
              <CompanyLogoMark className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">{eyebrow}</p>
              <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl md:text-4xl">
                {title}
              </h1>
            </div>
          </div>
          {showLogout && (
            <div className="flex shrink-0 items-center sm:pt-1">
              <LogoutButton
                className={
                  logoutClassName ||
                  "rounded-xl border border-emerald-200/80 bg-white/90 px-4 py-2.5 text-sm font-semibold text-emerald-900 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-zinc-900 dark:text-emerald-100 dark:hover:bg-zinc-800"
                }
              />
            </div>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="border border-gray-300 bg-gray-50 px-4 py-4 sm:px-6 dark:border-zinc-700 dark:bg-zinc-900/80">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-100 sm:text-3xl">{title}</h1>
          {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-zinc-400">{subtitle}</p> : null}
        </div>
        {showLogout && (
          <div className="flex shrink-0 items-start">
            <LogoutButton className={logoutClassName} />
          </div>
        )}
      </div>
    </header>
  );
}
