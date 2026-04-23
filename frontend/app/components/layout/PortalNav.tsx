"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

export default function PortalNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setRole(sessionStorage.getItem("portalRole") || "");
    sync();
    window.addEventListener("portalRoleChanged", sync);
    return () => window.removeEventListener("portalRoleChanged", sync);
  }, [pathname]);

  const links = useMemo(() => {
    const base: NavItem[] = [
      { href: "/", label: "Home" },
      { href: "/dashboard", label: "Dashboard" },
    ];
    void role;
    return base;
  }, [role]);

  return (
    <nav
      className="flex min-w-0 w-full justify-center gap-0.5 overflow-x-auto rounded-full border border-slate-200/80 bg-white/70 p-1 shadow-inner dark:border-zinc-700/80 dark:bg-zinc-900/60 sm:flex-1 sm:px-2"
      aria-label="Main"
    >
      {links.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
              active
                ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md dark:from-indigo-500 dark:to-violet-500"
                : "text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
