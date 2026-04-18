import LogoutButton from "@/app/components/LogoutButton";

type Props = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  showLogout?: boolean;
  logoutClassName?: string;
};

export default function PageHeader({ eyebrow, title, subtitle, showLogout, logoutClassName }: Props) {
  return (
    <header className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-indigo-50/40 to-violet-50/30 p-6 shadow-xl dark:border-zinc-800 dark:from-zinc-900 dark:via-indigo-950/40 dark:to-violet-950/20 sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl dark:bg-indigo-500/10" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600 dark:text-indigo-400">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">{title}</h1>
          {subtitle && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-zinc-400">{subtitle}</p>
          )}
        </div>
        {showLogout && (
          <div className="flex shrink-0 items-start">
            <LogoutButton className={logoutClassName} />
          </div>
        )}
      </div>
    </header>
  );
}
