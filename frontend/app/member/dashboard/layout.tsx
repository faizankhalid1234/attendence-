import type { Metadata } from "next";
import DashboardShell from "@/app/components/layout/DashboardShell";

export const metadata: Metadata = {
  title: "Member dashboard",
  robots: { index: false, follow: false },
};

export default function MemberDashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell variant="member">{children}</DashboardShell>;
}
