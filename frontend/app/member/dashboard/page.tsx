"use client";

import { startTransition, useEffect, useState } from "react";
import AttendancePanel from "@/app/components/member/AttendancePanel";
import PageHeader from "@/app/components/layout/PageHeader";

export default function MemberDashboard() {
  const [headerCompany, setHeaderCompany] = useState<string | null>(null);
  const [headerName, setHeaderName] = useState<string | null>(null);

  useEffect(() => {
    startTransition(() => {
      setHeaderCompany(sessionStorage.getItem("memberCompanyName"));
      setHeaderName(sessionStorage.getItem("memberUserName"));
    });
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-3 py-6 sm:px-4">
      <section className="overflow-hidden rounded-[2rem] border border-indigo-200/45 bg-white shadow-2xl shadow-indigo-900/10 ring-1 ring-slate-900/5 dark:border-indigo-900/40 dark:bg-zinc-950 dark:shadow-indigo-950/20">
        <div className="p-4 sm:p-6">
          <PageHeader
            eyebrow="Member"
            title="Attendance"
            subtitle={
              headerName || headerCompany
                ? [headerName, headerCompany ? `Company: ${headerCompany}` : ""].filter(Boolean).join(" · ")
                : "Check in / check out and your month list below."
            }
            embedded
            showLogout
            logoutClassName="rounded-md border border-gray-400 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-100"
          />
        </div>
        <div className="border-t border-slate-200/80 bg-gradient-to-b from-white via-indigo-50/20 to-violet-50/20 px-0 py-0 dark:border-zinc-800 dark:from-zinc-950 dark:via-indigo-950/10 dark:to-violet-950/10">
          <AttendancePanel embedded />
        </div>
      </section>
    </div>
  );
}
