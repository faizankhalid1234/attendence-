import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Super admin dashboard",
  robots: { index: false, follow: false },
};

export default function SuperAdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
