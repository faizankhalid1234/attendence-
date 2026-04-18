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
    <div className="min-h-[calc(100vh-6rem)] bg-gradient-to-b from-slate-100 via-white to-indigo-50/40 px-4 py-8 dark:from-zinc-950 dark:via-zinc-950 dark:to-indigo-950/30 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <PageHeader
          eyebrow="Member"
          title="Attendance"
          subtitle={
            headerName || headerCompany
              ? [headerName, headerCompany ? `Company: ${headerCompany}` : ""].filter(Boolean).join(" · ")
              : "Check in and out with live location and camera — summary and daily breakdown below."
          }
          showLogout
          logoutClassName="border-slate-300 text-slate-800 hover:bg-slate-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
        />

        <div className="rounded-3xl border border-slate-200/80 bg-[var(--card)]/95 p-4 shadow-xl backdrop-blur dark:border-zinc-800 sm:p-6">
          <AttendancePanel />
        </div>
      </div>
    </div>
  );
}
