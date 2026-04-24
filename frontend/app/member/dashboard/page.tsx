"use client";

import { useMemo } from "react";
import AttendancePanel from "@/app/components/member/AttendancePanel";
import PageHeader from "@/app/components/layout/PageHeader";

export default function MemberDashboard() {
  const headerCompany = useMemo(
    () => (typeof window === "undefined" ? null : sessionStorage.getItem("memberCompanyName")),
    [],
  );
  const headerName = useMemo(
    () => (typeof window === "undefined" ? null : sessionStorage.getItem("memberUserName")),
    [],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-10">
        <PageHeader
          eyebrow="Member portal"
          title="Attendance workspace"
          subtitle={
            headerName || headerCompany
              ? [headerName, headerCompany ? `Company: ${headerCompany}` : ""].filter(Boolean).join(" · ")
              : "Check-in/check-out and attendance history are available below."
          }
          showLogout
          logoutClassName="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
        />

        <section
          aria-label="Account type"
          className="relative overflow-hidden rounded-3xl border border-indigo-400/35 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-700 p-6 text-white shadow-2xl shadow-indigo-950/50 sm:p-8"
        >
          <div className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-3xl ring-2 ring-white/35">
                👤
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-100/90">Your role</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight">Staff / member</h2>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-indigo-50/95">
                  This dashboard is for your own attendance and summary. Company admins use a separate dashboard.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <span className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-white/25">
                Attendance
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-white/25">
                Shift window
              </span>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/90 to-indigo-50/40 p-5 shadow-lg ring-1 ring-slate-200/60 dark:border-zinc-700/80 dark:from-zinc-900 dark:via-zinc-900/95 dark:to-indigo-950/30 dark:ring-zinc-700/50 sm:p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-indigo-400/20 blur-2xl dark:bg-indigo-500/15"
            />
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-bold text-white shadow-md shadow-indigo-500/30">
                  ✓
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">
                    Today
                  </p>
                  <h2 className="mt-0.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                    Today&apos;s attendance
                  </h2>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                    GPS lock, camera capture, submit, and your daily status — all in one place below.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[var(--card)]/95 p-1 shadow-2xl shadow-black/40 ring-1 ring-indigo-500/20 backdrop-blur sm:p-2">
            <div className="rounded-2xl bg-gradient-to-b from-white/5 to-transparent p-3 text-slate-900 dark:from-white/5 dark:text-zinc-100 sm:p-5">
              <AttendancePanel />
            </div>
          </div>
        </div>
      </div>
  );
}
