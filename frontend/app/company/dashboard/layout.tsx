import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Company dashboard",
  robots: { index: false, follow: false },
};

export default function CompanyDashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
