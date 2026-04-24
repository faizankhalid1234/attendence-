"use client";

import { useEffect, useState } from "react";
import AttendancePanel from "@/app/components/member/AttendancePanel";
import PageHeader from "@/app/components/layout/PageHeader";

export default function MemberDashboard() {
  const [headerCompany, setHeaderCompany] = useState<string | null>(null);
  const [headerName, setHeaderName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHeaderCompany(sessionStorage.getItem("memberCompanyName"));
    setHeaderName(sessionStorage.getItem("memberUserName"));
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-10">
        <PageHeader
          eyebrow="Member portal"
          title="Attendance workspace"
          subtitle={
            headerName || headerCompany
              ? [headerName, headerCompany ? `Company: ${headerCompany}` : ""].filter(Boolean).join(" · ")
              : "Check-in / check-out, live GPS aur camera — neeche apna control panel hai."
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
                  Sirf apni attendance aur summary — company admin alag dashboard use karta hai. Neeche wala hissa sirf
                  check-in, check-out aur history ke liye hai.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <span className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-white/25">
                GPS + camera
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-white/25">
                Shift window
              </span>
            </div>
          </div>
        </section>

        <div className="space-y-3">
          <div className="flex items-center gap-3 px-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/15 text-lg ring-1 ring-cyan-300/40">
              ✓
            </span>
            <div>
              <h2 className="text-base font-bold text-white sm:text-lg">Aaj ki attendance</h2>
              <p className="text-xs text-slate-300 sm:text-sm">Status, map hint, aur actions — ek hi card me.</p>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[var(--card)]/95 p-1 shadow-2xl shadow-black/40 ring-1 ring-indigo-500/20 backdrop-blur sm:p-2">
            <div className="rounded-2xl bg-gradient-to-b from-white/5 to-transparent p-3 sm:p-5 dark:from-white/5">
              <AttendancePanel />
            </div>
          </div>
        </div>
      </div>
  );
}
