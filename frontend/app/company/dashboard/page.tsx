"use client";

import { startTransition, useEffect, useState } from "react";
import MemberManager from "@/app/components/company/MemberManager";
import CompanyTeamAttendance from "@/app/components/company/CompanyTeamAttendance";
import PageHeader from "@/app/components/layout/PageHeader";

export default function CompanyDashboard() {
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    startTransition(() => {
      setCompanyName(sessionStorage.getItem("portalCompanyName"));
    });
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <PageHeader
        variant="company"
        eyebrow="Company admin portal"
        title={companyName || "Your company"}
        showLogout
      />

      {/* One merged card: hero + team roster + add members */}
      <section aria-label="Company workspace">
        <div className="overflow-hidden rounded-[2rem] border border-emerald-200/45 bg-white shadow-2xl shadow-emerald-900/15 ring-1 ring-slate-900/5 dark:border-emerald-900/40 dark:bg-zinc-950 dark:shadow-emerald-950/20">
          <CompanyTeamAttendance />

          <div className="border-t border-slate-200/80 bg-gradient-to-b from-white via-emerald-50/25 to-slate-50/90 px-6 py-8 sm:px-10 sm:py-10 dark:border-zinc-800 dark:from-zinc-950 dark:via-emerald-950/10 dark:to-zinc-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white sm:text-xl">Add members</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
              New hires appear in the roster above and can sign in to mark attendance. Email must be unique across the whole app.
            </p>
            <div className="mt-6">
              <MemberManager embedded />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
