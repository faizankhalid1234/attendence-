import PageHeader from "@/app/components/layout/PageHeader";

export default function SuperAdminDashboard() {
  return (
    <div className="min-h-[calc(100vh-6rem)] bg-gradient-to-b from-slate-100 via-white to-violet-50/50 px-4 py-8 dark:from-zinc-950 dark:via-zinc-950 dark:to-violet-950/25 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <PageHeader
          eyebrow="Super admin"
          title="Administration"
          subtitle="Companies are created in Django Admin (backend). Use the company admin email + password to log in on the web app."
          showLogout
          logoutClassName="border-slate-300 text-slate-800 hover:bg-slate-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
        />

        <section className="rounded-3xl border border-slate-200/80 bg-[var(--card)] p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900/80">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Where to manage companies</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
            Open Django Admin on your backend host (local example):{" "}
            <span className="font-mono text-xs font-semibold text-slate-900 dark:text-zinc-100">http://127.0.0.1:4000/admin/</span>
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
            When you create a company, Django creates the company record and the company admin user with the email + password you set.
            That company admin can then log in here and manage members + attendance for that company only.
          </p>
        </section>
      </div>
    </div>
  );
}
