import type { Metadata } from "next";
import DashboardShell from "@/app/components/layout/DashboardShell";

export const metadata: Metadata = {
  title: "Company dashboard",
  robots: { index: false, follow: false },
};

export default function CompanyDashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell variant="company">{children}</DashboardShell>;
}
