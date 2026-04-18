"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Company = { id: string; name: string; email: string; membersCount: number };

export default function SuperAdminMemberAdd() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await apiFetch("/api/super-admin/companies");
      const data = await res.json();
      if (res.ok) {
        const list = (data.companies || []) as Company[];
        setCompanies(list);
        setCompanyId((prev) => prev || list[0]?.id || "");
      }
    })();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (!companyId) {
      setMessage("Pehle koi company honi chahiye.");
      return;
    }
    const res = await apiFetch("/api/super-admin/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, name: name.trim(), email: email.trim().toLowerCase() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Member add nahi ho saka.");
      return;
    }
    let msg = `OK — temp password: ${data.member?.tempPassword}`;
    if (data.emailWarning) msg += ` | ${data.emailWarning}`;
    setMessage(msg);
    setName("");
    setEmail("");
    const r2 = await apiFetch("/api/super-admin/companies");
    const d2 = await r2.json();
    if (r2.ok) setCompanies(d2.companies || []);
  };

  return (
    <section className="rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/50 via-white to-violet-50/30 p-6 shadow-lg dark:border-indigo-900/50 dark:from-indigo-950/30 dark:via-zinc-900 dark:to-violet-950/20">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Kisi company me member add karein</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
        Company dropdown se choose karein — jitni companies ban chuki hain un me se kisi me bhi naya member bana sakte
        hain. Har user ka login alag email se hoga.
      </p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
            Company
          </label>
          <select
            required
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          >
            {companies.length === 0 && <option value="">— koi company nahi —</option>}
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.membersCount} members)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-400">Member naam</label>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-400">Member email</label>
          <input
            type="email"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-500 sm:w-auto sm:px-8"
          >
            Member create
          </button>
        </div>
      </form>
      {message && (
        <p className="mt-4 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-800 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100">
          {message}
        </p>
      )}
    </section>
  );
}
