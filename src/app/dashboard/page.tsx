import { AppSidebar } from "../../components/app-sidebar";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <AppSidebar activePage="dashboard" />
        <section className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-12 lg:py-10">
          <MobileHeader />
          <div className="mb-8 mt-8 sm:mt-0">
            <p className="text-sm font-medium text-blue-600">Lead research</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Coming soon
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function MobileHeader() {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 pb-5 md:hidden">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-xs font-bold text-white">L</div>
        <span className="font-semibold">LeadFinder</span>
      </div>
      <span className="text-xs font-medium text-slate-500">Lead research</span>
    </header>
  );
}
