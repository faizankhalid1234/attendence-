"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, readJsonSafe } from "@/lib/api";

type LoginOk = {
  role: string;
  loginAs?: string;
  userName?: string | null;
  companyName?: string | null;
  companyId?: string | null;
  demoMode?: boolean;
};

type LoginErr = { error?: string; debug_hint?: string; debug_note?: string; hint?: string };

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [memberBanner, setMemberBanner] = useState<LoginOk | null>(null);

  const handleLoginSuccess = (data: LoginOk) => {
    if (typeof window !== "undefined") {
      if (data.role === "MEMBER") {
        if (data.companyName) sessionStorage.setItem("memberCompanyName", String(data.companyName));
        else sessionStorage.removeItem("memberCompanyName");
        if (data.userName) sessionStorage.setItem("memberUserName", String(data.userName));
        else sessionStorage.removeItem("memberUserName");
        if (data.companyId) sessionStorage.setItem("memberCompanyId", String(data.companyId));
        else sessionStorage.removeItem("memberCompanyId");
      }
      if (data.demoMode) sessionStorage.setItem("memberDemoMode", "1");
      else sessionStorage.removeItem("memberDemoMode");

      sessionStorage.setItem("portalRole", String(data.role));
      if (data.companyName) sessionStorage.setItem("portalCompanyName", String(data.companyName));
      else sessionStorage.removeItem("portalCompanyName");
      if (data.userName) sessionStorage.setItem("portalUserName", String(data.userName));
      else sessionStorage.removeItem("portalUserName");

      window.dispatchEvent(new Event("portalRoleChanged"));
    }

    if (data.role === "MEMBER") {
      setMemberBanner({
        role: data.role,
        userName: data.userName ?? null,
        companyName: data.companyName ?? null,
        companyId: data.companyId ?? null,
      });
      window.setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 900);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

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
        password: password.trim(),
      }),
    });

    const data = ((await readJsonSafe(res)) || {}) as LoginOk & LoginErr;

    if (!res.ok) {
      setLoading(false);
      const hint = data.debug_hint ? ` (${data.debug_hint})` : "";
      const note = data.debug_note ? ` ${data.debug_note}` : "";
      const friendly = data.hint ? `\n\n${data.hint}` : "";
      setError((data.error || "Login failed") + hint + note + friendly);
      return;
    }

    setLoading(false);
    handleLoginSuccess(data);
  };

  const onDemoLogin = async () => {
    setDemoLoading(true);
    setLoading(false);
    setError("");
    setMemberBanner(null);
    setEmail("faizandemo@yopmail.com");

    const res = await apiFetch("/api/auth/demo-login", { method: "POST" });
    const data = ((await readJsonSafe(res)) || {}) as LoginOk & { error?: string; debug_hint?: string };
    setDemoLoading(false);

    if (!res.ok) {
      const hint = data.debug_hint ? ` (${data.debug_hint})` : "";
      setError((data.error || "Demo login failed") + hint);
      return;
    }
    handleLoginSuccess(data);
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

      <p className="text-xs leading-relaxed text-slate-600 dark:text-zinc-400">
        Har bande ki <strong>apni email</strong> — company admin, member, super admin sab alag email se login. Password har account ka alag hota hai; login ke baad dashboard role ke hisaab se khulta hai.
      </p>

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
        <p className="whitespace-pre-line rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || demoLoading || !!memberBanner}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-indigo-500 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
      >
        {loading ? "Please wait..." : memberBanner ? "Redirecting..." : "Login"}
      </button>
      <button
        type="button"
        onClick={onDemoLogin}
        disabled={loading || demoLoading || !!memberBanner}
        className="w-full rounded-xl border border-indigo-300 bg-white px-4 py-3 font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-700 dark:bg-zinc-900 dark:text-indigo-300 dark:hover:bg-zinc-800"
      >
        {demoLoading ? "Opening demo..." : "Demo Login (Faizan)"}
      </button>
    </form>
  );
}
