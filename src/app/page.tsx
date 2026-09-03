import { AppSidebar } from "../components/app-sidebar";
import { MobileHeader } from "../components/mobile-header";
import { supabase } from "../lib/supabase";

export default async function DashboardPage() {
  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select("email");

  const totalRestaurants = restaurants?.length ?? 0;
  const emailsFound =
    restaurants?.filter((restaurant) => restaurant.email).length ?? 0;
  const emailCoverage =
  totalRestaurants > 0
    ? Math.round((emailsFound / totalRestaurants) * 100)
    : 0;

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
              Overview of your restaurant leads and contact information.
            </p>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              Could not load dashboard data.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-3">
              <StatCard
                label="Total restaurants"
                value={totalRestaurants}
              />

              <StatCard
                label="Emails found"
                value={emailsFound}
              />

              <StatCard
  label="Email coverage"
  value={`${emailCoverage}%`}
/>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>

      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

