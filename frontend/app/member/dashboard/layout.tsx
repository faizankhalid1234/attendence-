import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Member dashboard",
  robots: { index: false, follow: false },
};

export default function MemberDashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
