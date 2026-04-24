"use client";

import { useEffect, useState } from "react";
import MemberManager from "@/app/components/company/MemberManager";
import CompanyTeamAttendance from "@/app/components/company/CompanyTeamAttendance";
import PageHeader from "@/app/components/layout/PageHeader";

export default function CompanyDashboard() {
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCompanyName(sessionStorage.getItem("portalCompanyName"));
    setUserName(sessionStorage.getItem("portalUserName"));
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-10">
        <PageHeader
          eyebrow="Company admin portal"
          title={companyName || "Your company"}
          subtitle={
            companyName
              ? `${userName ? `${userName} · ` : ""}Team, reports aur members yahin se manage hon — shift / map settings Django Admin se set hoti hain.`
              : "Login ke baad yahan company naam aur tools dikhenge."
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
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100/90">Aap ka role</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight">Company administrator</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-emerald-50/95">
                  Sirf apni company ka data — members add karna, un ki attendance dekhna, charts aur reports. Har section
                  neeche alag rang / layout se alag kaam dikhaya gaya hai.
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
              <h2 className="text-lg font-bold text-white sm:text-xl">Block 1 — Team attendance & reports</h2>
              <p className="text-sm text-emerald-100/80">Charts, date range, har member ka streak — yeh reporting zone hai.</p>
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
              <h2 className="text-lg font-bold text-white sm:text-xl">Block 2 — Team members</h2>
              <p className="text-sm text-violet-100/85">Naye staff ki email se invite; neeche poori list.</p>
            </div>
          </div>
          <div className="rounded-3xl ring-1 ring-violet-500/25 ring-offset-4 ring-offset-zinc-950">
            <MemberManager />
          </div>
        </div>
      </div>
  );
}
