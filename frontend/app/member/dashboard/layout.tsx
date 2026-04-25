import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Member dashboard",
  robots: { index: false, follow: false },
};

export default function MemberDashboardLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[calc(100vh-5rem)] bg-gray-50 text-gray-900">{children}</div>;
}
