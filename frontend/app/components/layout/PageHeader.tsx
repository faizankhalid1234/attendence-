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
    <header className="border border-gray-300 bg-gray-50 px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">{subtitle}</p>}
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
