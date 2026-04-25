"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Member = { id: string; name: string; email: string; createdAt: string };

type Props = { embedded?: boolean };

export default function MemberManager({ embedded = false }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const res = await apiFetch("/api/company/members");
    const data = await res.json();
    if (res.ok) setMembers(data.members || []);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage("");
    const body: { name: string; email: string; password?: string } = { name, email: email.trim().toLowerCase() };
    if (password.trim().length >= 8) body.password = password.trim();

    const res = await apiFetch("/api/company/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Could not add member");
      setSubmitting(false);
      return;
    }

    let msg = password.trim().length >= 8
      ? "Member added. The password you set has been saved and a welcome email was sent (if SMTP is configured)."
      : `Member added. Temporary password: ${data.member.tempPassword}`;
    if (data.emailWarning) msg += ` | ${data.emailWarning}`;
    setMessage(msg);
    setName("");
    setEmail("");
    setPassword("");
    await load();
    setSubmitting(false);
  };

  const shell = embedded ? "space-y-5" : "space-y-6";
  const formShell = embedded
    ? "grid gap-4 rounded-2xl border border-emerald-200/40 bg-white/95 p-5 dark:border-emerald-900/35 dark:bg-zinc-900/50"
    : "grid gap-4 rounded-3xl border border-emerald-200/50 bg-gradient-to-b from-white to-emerald-50/30 p-6 shadow-lg shadow-emerald-900/5 ring-1 ring-slate-900/5 dark:border-emerald-900/30 dark:from-zinc-950 dark:to-emerald-950/20 dark:shadow-none";
  const tableShell = embedded
    ? "overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-zinc-700 dark:bg-zinc-950"
    : "overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-md ring-1 ring-slate-900/5 dark:border-zinc-800 dark:bg-zinc-950";

  return (
    <div className={shell}>
      <form onSubmit={onSubmit} className={formShell}>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add member</h3>
        <p className="text-xs text-slate-600 dark:text-zinc-400">
          Email must be globally unique. Leave password empty for auto-generated credentials, or set at least 8 characters.
        </p>
        <input
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          placeholder="Member name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          placeholder="Member email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          placeholder="Login password (optional, min 8 characters)"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          disabled={submitting}
          className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 font-bold text-white shadow-md shadow-emerald-600/25 transition hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60"
        >
          {submitting ? "Adding…" : "Add member"}
        </button>
        {message && (
          <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">
            {message}
          </p>
        )}
      </form>

      <div className={tableShell}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/40 px-5 py-3 dark:border-zinc-800 dark:from-zinc-900 dark:to-emerald-950/20">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Member accounts</p>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-zinc-400">Everyone listed here can sign in as a member and mark their own attendance.</p>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-600 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {members.map((member) => (
              <tr key={member.id} className="transition hover:bg-emerald-50/40 dark:hover:bg-zinc-900/80">
                <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-zinc-100">{member.name}</td>
                <td className="px-5 py-3.5 text-slate-600 dark:text-zinc-400">{member.email}</td>
                <td className="px-5 py-3.5 tabular-nums text-slate-600 dark:text-zinc-400">
                  {new Date(member.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-sm text-slate-500 dark:text-zinc-500" colSpan={3}>
                  No members yet — use the form above to add your first hire.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
