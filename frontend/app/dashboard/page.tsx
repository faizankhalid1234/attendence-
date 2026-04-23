"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRouter() {
  const router = useRouter();
  const [hint, setHint] = useState("Checking your account…");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const role = (sessionStorage.getItem("portalRole") || "").trim();
    if (!role) {
      setHint("Please log in from the home page first — after login you will be routed automatically.");
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
      router.replace("/super-admin/dashboard");
      return;
    }

    setHint("Unknown role — please log in again.");
  }, [router]);

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="text-sm text-slate-600 dark:text-zinc-300">{hint}</p>
    </div>
  );
}
