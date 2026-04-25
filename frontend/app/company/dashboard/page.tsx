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
              ? `${userName ? `${userName} · ` : ""}Review attendance and manage who you have hired. Only members can mark check-in/out from their account — you cannot submit attendance for them. Shift and office location are set in Django Admin.`
              : "After login, your company name and tools appear here."
          }
          showLogout
          logoutClassName="rounded-md border border-gray-400 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
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

        <section className="space-y-3">
          <div className="px-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">Attendance & team</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-zinc-400">
              Click any team member card to open their own page with a full day-by-day table for the range you select.
            </p>
          </div>
          <CompanyTeamAttendance />
        </section>

        <section className="space-y-3">
          <div className="px-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">Add members</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-zinc-400">
              New hires appear in the list below and in attendance reports after their account is created.
            </p>
          </div>
          <MemberManager />
        </section>
      </div>
  );
}
