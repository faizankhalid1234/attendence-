"use client";

import DashboardShell from "@/app/components/layout/DashboardShell";
import LoginForm from "@/app/components/LoginForm";

export default function HomePageBody() {
  return (
    <DashboardShell variant="home">
      <main className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:gap-12">
        <section className="flex flex-col justify-center rounded-3xl border border-white/15 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-indigo-950/95 p-8 text-white shadow-2xl shadow-black/40 ring-1 ring-white/10 backdrop-blur-sm lg:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-300">Attendance Mark</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
            Lovely dashboards.
            <br />
            Clear roles.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-300">
            Companies are set up in Django Admin. Company admins see only their team; members see only their own record
            — summary and day-by-day views in separate sections. Use the navbar to jump to the right dashboard.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-200">
            <li className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
              <span className="text-emerald-400">✓</span> Live GPS + camera check-in / check-out
            </li>
            <li className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
              <span className="text-emerald-400">✓</span> Summary and daily status in a clear layout for every role
            </li>
            <li className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
              <span className="text-emerald-400">✓</span> Each company&apos;s data stays scoped to that company
            </li>
          </ul>
        </section>

        <section className="rounded-3xl border border-white/15 bg-[var(--card)]/95 p-8 shadow-2xl shadow-black/30 ring-1 ring-white/10 backdrop-blur-md dark:border-zinc-800 lg:p-10">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Login</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
            Pehle role chunein, phir apni email aur password — company admin ya member.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
            English: sign in with the credentials issued from Django Admin — each account has its own email and password.
          </p>
          <div className="mt-8">
            <LoginForm />
          </div>
        </section>
      </main>
    </DashboardShell>
  );
}
