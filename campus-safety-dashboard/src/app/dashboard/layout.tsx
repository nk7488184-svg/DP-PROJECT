import DashboardHeader from "@/components/layout/DashboardHeader";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <DashboardHeader />
      <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
