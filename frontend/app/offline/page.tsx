export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-300">Offline mode</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-zinc-100">Internet connection required</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
          Attendance Mark needs internet for login and attendance sync. Please reconnect and refresh this page.
        </p>
      </section>
    </main>
  );
}
