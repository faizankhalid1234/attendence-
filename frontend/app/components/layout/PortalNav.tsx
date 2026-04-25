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
      className="flex min-w-0 w-full justify-center gap-0.5 overflow-x-auto rounded-full border border-gray-200 bg-white p-1 shadow-inner sm:flex-1 sm:px-2"
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
                ? "bg-gray-800 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
