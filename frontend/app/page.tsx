import LoginForm from "@/app/components/LoginForm";
import JsonLd from "@/app/components/JsonLd";
import { siteUrl } from "@/lib/site";

export default function Home() {
  const base = siteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "Attendance Mark",
        url: `${base}/`,
        description:
          "Shift-based attendance with live GPS and camera check-in/out for super admin, company admin, and members.",
        inLanguage: "en",
      },
      {
        "@type": "WebApplication",
        name: "Attendance Mark",
        url: `${base}/`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Any",
        description:
          "Super admin, company admin, and member portals with team dashboards and scoped attendance data.",
      },
    ],
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <div className="relative min-h-[calc(100vh-8rem)] overflow-hidden px-4 py-10 sm:py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-300/35 via-transparent to-transparent dark:from-indigo-600/20" />
      <div className="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl dark:bg-violet-600/10" />

      <main className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:gap-12">
        <section className="flex flex-col justify-center rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-8 text-white shadow-2xl dark:border-zinc-800 lg:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-300">Attendance Mark</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
            Lovely dashboards.
            <br />
            Clear roles.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-300">
            Super admin manages every company and member. Company admins see only their team. Members see only their own
            record — summary and day-by-day views in separate sections. Use the navbar to jump straight to each dashboard.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-200">
            <li className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
              <span className="text-emerald-400">✓</span> Live GPS + camera check-in / check-out
            </li>
            <li className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
              <span className="text-emerald-400">✓</span> Summary and daily status in a clear layout for every role
            </li>
            <li className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
              <span className="text-emerald-400">✓</span> Each company’s data stays scoped to that company
            </li>
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200/90 bg-[var(--card)] p-8 shadow-xl dark:border-zinc-800 lg:p-10">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Login</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
            Sign in with the email and password for your role. After login, members also see their company name.
          </p>
          <div className="mt-8">
            <LoginForm />
          </div>
        </section>
      </main>
    </div>
    </>
  );
}
