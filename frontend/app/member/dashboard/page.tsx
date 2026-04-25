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
    <div className="mx-auto max-w-4xl px-3 py-6 sm:px-4">
      <PageHeader
        eyebrow="Member"
        title="Attendance"
        subtitle={
          headerName || headerCompany
            ? [headerName, headerCompany ? `Company: ${headerCompany}` : ""].filter(Boolean).join(" · ")
            : "Check in / check out and your month list below."
        }
        showLogout
        logoutClassName="rounded-md border border-gray-400 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-100"
      />
      <div className="mt-6">
        <AttendancePanel />
      </div>
    </div>
  );
}
