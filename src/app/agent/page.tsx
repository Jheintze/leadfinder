import { AppSidebar } from "../../components/app-sidebar";
import { MobileHeader } from "../../components/mobile-header";

export default function AgentPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <AppSidebar activePage="agent" />

        <section className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-12 lg:py-10">
          <MobileHeader />

          <div className="mb-8 mt-8 sm:mt-0">
            <p className="text-sm font-medium text-blue-600">Automation</p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Agent
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Give the agent a task and let it work through your lead generation workflow.
            </p>
          </div>

          <div className="max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <label
              htmlFor="agent-task"
              className="text-sm font-medium text-slate-700"
            >
              What should the agent do?
            </label>

            <textarea
              id="agent-task"
              rows={5}
              placeholder="e.g. Find 20 suitable restaurants in Berlin and prepare personalized outreach..."
              className="mt-3 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />

            <button
              type="button"
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Run Agent
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

