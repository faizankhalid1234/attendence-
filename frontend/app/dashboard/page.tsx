"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRouter() {
  const router = useRouter();
  const [hint] = useState("Checking your account…");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const role = (sessionStorage.getItem("portalRole") || "").trim();
    if (!role) {
      return;
    }

    if (role === "MEMBER") {
      router.replace("/member/dashboard");
      return;
    }
    if (role === "COMPANY_ADMIN") {
      router.replace("/company/dashboard");
      return;
    }
    if (role === "SUPER_ADMIN") {
      sessionStorage.removeItem("portalRole");
      sessionStorage.removeItem("portalCompanyName");
      sessionStorage.removeItem("portalUserName");
      window.dispatchEvent(new Event("portalRoleChanged"));
      router.replace("/");
      return;
    }

    sessionStorage.removeItem("portalRole");
    sessionStorage.removeItem("portalCompanyName");
    sessionStorage.removeItem("portalUserName");
    window.dispatchEvent(new Event("portalRoleChanged"));
    router.replace("/");
  }, [router]);

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="text-sm text-slate-600 dark:text-zinc-300">{hint}</p>
    </div>
  );
}
