"use client";

import { useMemo } from "react";
import MemberManager from "@/app/components/company/MemberManager";
import CompanyTeamAttendance from "@/app/components/company/CompanyTeamAttendance";
import PageHeader from "@/app/components/layout/PageHeader";

export default function CompanyDashboard() {
  const companyName = useMemo(
    () => (typeof window === "undefined" ? null : sessionStorage.getItem("portalCompanyName")),
    [],
  );
  const userName = useMemo(
    () => (typeof window === "undefined" ? null : sessionStorage.getItem("portalUserName")),
    [],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-10">
        <PageHeader
          eyebrow="Company admin portal"
          title={companyName || "Your company"}
          subtitle={
            companyName
              ? `${userName ? `${userName} · ` : ""}Manage team, reports, and members from here. Shift and map settings are configured from Django Admin.`
              : "After login, your company name and tools appear here."
          }
          showLogout
          logoutClassName="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
        />

        <section
          aria-label="Account type"
          className="relative overflow-hidden rounded-3xl border border-emerald-400/30 bg-gradient-to-r from-emerald-600/90 via-teal-600/85 to-cyan-700/90 p-6 text-white shadow-2xl shadow-emerald-900/40 sm:p-8"
        >
          <div className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-3xl shadow-inner ring-2 ring-white/30">
                🏢
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100/90">Your role</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight">Company administrator</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-emerald-50/95">
                  This area only shows your company data: add members, review attendance, and check reports.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide ring-1 ring-white/25">
                Reports & charts
              </span>
              <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide ring-1 ring-white/25">
                Team members
              </span>
            </div>
          </div>
        </section>

        <div className="space-y-3">
          <div className="flex items-center gap-3 px-1">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-xl ring-1 ring-emerald-500/30 dark:bg-emerald-400/10">
              📊
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white sm:text-xl">Block 1 — Team attendance & reports</h2>
              <p className="text-sm text-slate-600 dark:text-emerald-100/80">Charts, date range, and member trends.</p>
            </div>
          </div>
          <div className="rounded-3xl ring-1 ring-emerald-500/20 ring-offset-4 ring-offset-zinc-950">
            <CompanyTeamAttendance />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 px-1">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-xl ring-1 ring-violet-400/35 dark:bg-violet-400/10">
              👥
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white sm:text-xl">Block 2 — Team members</h2>
              <p className="text-sm text-slate-600 dark:text-violet-100/85">Invite new staff by email and review the full member list.</p>
            </div>
          </div>
          <div className="rounded-3xl ring-1 ring-violet-500/25 ring-offset-4 ring-offset-zinc-950">
            <MemberManager />
          </div>
        </div>
      </div>
  );
}
