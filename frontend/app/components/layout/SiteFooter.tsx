import type { ReactNode } from "react";
import Link from "next/link";

function IconPhone({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </svg>
  );
}

function IconLinkedIn({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69A1.69 1.69 0 0 0 5.2 6.88c0 .93.76 1.69 1.69 1.69m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

function IconGitHub({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.1.39-1.99 1.03-2.69a3.6 3.6 0 0 1 .05-2.64s.84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.4.1 2.64.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85l-.01 2.75c0 .27.16.59.67.5A10.01 10.01 0 0 0 22 12 10 10 0 0 0 12 2z" />
    </svg>
  );
}

function IconGlobe({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm7.93 9h-3.4A15.6 15.6 0 0 0 15 4.6 8.09 8.09 0 0 1 19.93 11zM12 4a14.1 14.1 0 0 1 2.27 7H9.73A14.1 14.1 0 0 1 12 4zM8.09 4.6A15.6 15.6 0 0 0 7.47 11H4.07A8.09 8.09 0 0 1 8.09 4.6zM4.07 13h3.4a15.6 15.6 0 0 0 .62 6.4A8.09 8.09 0 0 1 4.07 13zm2.66 7.4A14.1 14.1 0 0 1 9.73 13h4.54a14.1 14.1 0 0 1-2.27 7 8.11 8.11 0 0 1-5.54-2.6zm9.18 0a8.09 8.09 0 0 1-5.86 2.6 14.1 14.1 0 0 1 2.27-7h3.4a15.6 15.6 0 0 0 .19 4.4zM15.93 13h3.4a8.09 8.09 0 0 1-4.84 6.4 15.6 15.6 0 0 0 1.44-6.4z" />
    </svg>
  );
}

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
    </svg>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/80 hover:text-indigo-800 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-200"
    >
      {children}
      <span>{label}</span>
    </a>
  );
}

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-gradient-to-b from-white/90 to-slate-50/90 py-10 backdrop-blur-md dark:border-zinc-800 dark:from-zinc-950/90 dark:to-zinc-900/90">
      <div className="mx-auto max-w-6xl space-y-10 px-4 sm:px-6">
        <details className="group rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <summary className="cursor-pointer list-none text-sm font-bold text-slate-900 dark:text-white [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <span className="rounded-lg bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                How it works
              </span>
              <span className="text-indigo-600 transition group-open:rotate-90 dark:text-indigo-400">▸</span>
              <span className="font-semibold text-indigo-700 dark:text-indigo-300">How this attendance app works</span>
            </span>
          </summary>
          <ol className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm leading-relaxed text-slate-600 dark:border-zinc-800 dark:text-zinc-300">
            <li>
              <strong className="text-slate-800 dark:text-zinc-100">1. Setup</strong> — Companies aur company-admin
              accounts Django Admin (backend) se banaye jate hain; is web app par sirf company admin aur member login
              hota hai.
            </li>
            <li>
              <strong className="text-slate-800 dark:text-zinc-100">2. Company Admin</strong> — Logs in with the
              company email, adds team members, and views team attendance reports (only their company&apos;s data).
              Shift times and office reference are configured in Django Admin.
            </li>
            <li>
              <strong className="text-slate-800 dark:text-zinc-100">3. Member</strong> — Logs in, locks live GPS, takes
              a live camera photo, and marks check-in / check-out during the allowed shift window. Each member sees
              only their own history and summary.
            </li>
            <li>
              <strong className="text-slate-800 dark:text-zinc-100">4. Status</strong> — &quot;Complete&quot; means
              both check-in and check-out that day; &quot;Pending&quot; means check-in only; &quot;Absent&quot; means no
              attendance was recorded for that day.
            </li>
          </ol>
        </details>

        <div className="grid gap-8 border-t border-slate-200/70 pt-8 dark:border-zinc-800 sm:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-zinc-100">Attendance Mark</p>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
              Shift window, live GPS, and camera-based check-in / check-out. Built by{" "}
              <span className="font-semibold text-slate-700 dark:text-zinc-200">Faizan Khalid</span> — Full Stack
              Developer.
            </p>
            <p className="mt-4 text-xs text-slate-500 dark:text-zinc-500">© {new Date().getFullYear()} Attendance portal</p>
            <Link
              href="/"
              className="mt-2 inline-block text-xs font-semibold text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
            >
              Login
            </Link>
          </div>

          <div className="space-y-4 sm:text-right">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500">Developer</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">Faizan Khalid</p>
            <a
              href="tel:+923029655325"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-2 text-sm font-semibold text-emerald-900 shadow-sm hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100 sm:ml-auto"
            >
              <IconPhone className="h-4 w-4 shrink-0" />
              0302 9655325
            </a>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <SocialLink href="https://www.linkedin.com/in/faizan-khalid-developerp/" label="LinkedIn">
                <IconLinkedIn className="h-4 w-4 text-[#0A66C2]" />
              </SocialLink>
              <SocialLink href="https://portfolio-faizan-topaz.vercel.app/" label="Portfolio">
                <IconGlobe className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </SocialLink>
              <SocialLink href="https://github.com/faizankhalid1234" label="GitHub">
                <IconGitHub className="h-4 w-4 text-slate-800 dark:text-zinc-200" />
              </SocialLink>
              <SocialLink href="https://www.instagram.com/faizan_rajpoot_0011/" label="Instagram">
                <IconInstagram className="h-4 w-4 text-pink-600 dark:text-pink-400" />
              </SocialLink>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
