import CompanyManager from "@/app/components/super-admin/CompanyManager";
import SuperAdminMemberAdd from "@/app/components/super-admin/SuperAdminMemberAdd";
import PageHeader from "@/app/components/layout/PageHeader";

export default function SuperAdminDashboard() {
  return (
    <div className="min-h-[calc(100vh-6rem)] bg-gradient-to-b from-slate-100 via-white to-violet-50/50 px-4 py-8 dark:from-zinc-950 dark:via-zinc-950 dark:to-violet-950/25 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <PageHeader
          eyebrow="Super admin"
          title="Saari companies"
          subtitle="Nayi company banao, phir dropdown se kisi company me member seedha yahan se add karo."
          showLogout
          logoutClassName="border-slate-300 text-slate-800 hover:bg-slate-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
        />

        <SuperAdminMemberAdd />
        <CompanyManager />
      </div>
    </div>
  );
}
