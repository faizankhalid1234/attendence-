"use client";

import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Props = { className?: string };

export default function LogoutButton({ className = "" }: Props) {
  const router = useRouter();

  const onLogout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("memberCompanyName");
      sessionStorage.removeItem("memberUserName");
      sessionStorage.removeItem("memberCompanyId");
      sessionStorage.removeItem("memberDemoMode");
      sessionStorage.removeItem("portalRole");
      sessionStorage.removeItem("portalCompanyName");
      sessionStorage.removeItem("portalUserName");
      window.dispatchEvent(new Event("portalRoleChanged"));
    }
    router.push("/");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={onLogout}
      className={`rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 ${className}`}
    >
      Logout
    </button>
  );
}
