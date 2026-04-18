"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type LoginOk = {
  role: string;
  userName?: string | null;
  companyName?: string | null;
  companyId?: string | null;
};

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [memberBanner, setMemberBanner] = useState<LoginOk | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMemberBanner(null);

    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    });

    const data = (await res.json()) as LoginOk & { error?: string; debug_hint?: string };

    if (!res.ok) {
      setLoading(false);
      const hint = data.debug_hint ? ` (${data.debug_hint})` : "";
      setError((data.error || "Login failed") + hint);
      return;
    }

    if (typeof window !== "undefined" && data.role === "MEMBER") {
      if (data.companyName) sessionStorage.setItem("memberCompanyName", String(data.companyName));
      else sessionStorage.removeItem("memberCompanyName");
      if (data.userName) sessionStorage.setItem("memberUserName", String(data.userName));
      else sessionStorage.removeItem("memberUserName");
      if (data.companyId) sessionStorage.setItem("memberCompanyId", String(data.companyId));
      else sessionStorage.removeItem("memberCompanyId");
    }

    setLoading(false);

    if (data.role === "SUPER_ADMIN") {
      router.push("/super-admin/dashboard");
      router.refresh();
      return;
    }
    if (data.role === "COMPANY_ADMIN") {
      router.push("/company/dashboard");
      router.refresh();
      return;
    }
    if (data.role === "MEMBER") {
      setMemberBanner({
        role: data.role,
        userName: data.userName ?? null,
        companyName: data.companyName ?? null,
        companyId: data.companyId ?? null,
      });
      window.setTimeout(() => {
        router.push("/member/dashboard");
        router.refresh();
      }, 900);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300">Email</label>
        <input
          type="email"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-900"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300">Password</label>
        <input
          type="password"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-900"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {memberBanner && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
          <p className="font-semibold">Login successful</p>
          {memberBanner.companyName && (
            <p className="mt-1">
              Attendance company: <span className="font-bold">{memberBanner.companyName}</span>
            </p>
          )}
          {memberBanner.userName && (
            <p className="mt-0.5 text-emerald-800 dark:text-emerald-200">
              Member: <span className="font-medium">{memberBanner.userName}</span>
            </p>
          )}
          <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">Opening your dashboard…</p>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !!memberBanner}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-indigo-500 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
      >
        {loading ? "Please wait..." : memberBanner ? "Redirecting..." : "Login"}
      </button>
    </form>
  );
}
