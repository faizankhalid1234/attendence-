"use client";

import { useEffect, useState } from "react";
import CompanySettingsPanel from "@/app/components/company/CompanySettingsPanel";
import MemberManager from "@/app/components/company/MemberManager";
import CompanyTeamAttendance from "@/app/components/company/CompanyTeamAttendance";
import PageHeader from "@/app/components/layout/PageHeader";

export default function CompanyDashboard() {
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCompanyName(sessionStorage.getItem("portalCompanyName"));
  }, []);

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-gradient-to-b from-emerald-50/80 via-white to-teal-50/40 px-4 py-8 dark:from-emerald-950/20 dark:via-zinc-950 dark:to-teal-950/20 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <PageHeader
          eyebrow="Company admin"
          title={companyName ? companyName : "Company dashboard"}
          subtitle={
            companyName
              ? "Members add karein, team attendance dekhein, aur company settings yahan manage karein."
              : "Login ke baad company name yahan show hoga."
          }
          showLogout
          logoutClassName="border-emerald-300 text-emerald-950 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-100 dark:hover:bg-emerald-950/40"
        />

        <CompanyTeamAttendance />
        <CompanySettingsPanel />
        <MemberManager />
      </div>
    </div>
  );
}
