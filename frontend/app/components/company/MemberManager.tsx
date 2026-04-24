"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Member = { id: string; name: string; email: string; createdAt: string };

export default function MemberManager() {
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

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-3xl border border-slate-200/80 bg-[var(--card)] p-6 shadow-md dark:border-zinc-800 dark:bg-zinc-900/80"
      >
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Add Member</h3>
        <p className="text-xs text-slate-600 dark:text-zinc-400">
          Email must be globally unique. Leave password empty for auto-generated credentials, or set at least 8 characters.
        </p>
        <input
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          placeholder="Member Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          placeholder="Member Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          placeholder="Member login password (optional, min 8 chars)"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          disabled={submitting}
          className="rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-60"
        >
          {submitting ? "Adding member..." : "Add Member"}
        </button>
        {message && (
          <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">
            {message}
          </p>
        )}
      </form>

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-[var(--card)] shadow-md dark:border-zinc-800 dark:bg-zinc-900/80">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-t border-slate-100 dark:border-zinc-800">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-zinc-100">{member.name}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-zinc-400">{member.email}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-zinc-400">
                  {new Date(member.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-slate-500" colSpan={3}>
                  No members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
