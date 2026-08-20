"use client";

import { useState } from "react";
import type { SubmitEvent } from "react";

type Lead = {
  id: string;
  businessName: string;
  website: string | null;
  email: string | null;
  location: string;
  status: "Website found" | "Website missing";
};

type SearchResponse = {
  leads: Lead[];
  query: { city: string; businessType: string; limit: number };
};

const leadOptions = [5, 10, 20, 50];

export default function Home() {
  const [city, setCity] = useState("");
  const [businessType, setBusinessType] = useState("Restaurant");
  const [limit, setLimit] = useState(10);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [lastQuery, setLastQuery] = useState<SearchResponse["query"] | null>(
    null,
  );

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedCity = city.trim();

    if (!trimmedCity) {
      setError("Enter a city to start finding leads.");
      return;
    }

    setError("");
    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await fetch("/api/leads/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: trimmedCity, businessType, limit }),
      });
      const data = (await response.json()) as SearchResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "We could not find leads right now.");
      }

      setLeads(data.leads);
      setLastQuery(data.query);
    } catch (caughtError) {
      setLeads([]);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white px-5 py-6 md:flex md:flex-col">
          <div className="flex items-center gap-3 px-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              L
            </div>
            <span className="text-lg font-semibold tracking-tight">
              LeadFinder
            </span>
          </div>
          <nav className="mt-10">
            <a
              className="flex items-center gap-3 rounded-lg bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-700"
              href="#dashboard"
            >
              <DashboardIcon /> Dashboard
            </a>
          </nav>
          <p className="mt-auto px-2 text-xs leading-5 text-slate-400">
            DishBoost internal tools
            <br />
            Lead research workspace
          </p>
        </aside>

        <section
          id="dashboard"
          className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-12 lg:py-10"
        >
          <header className="flex items-center justify-between border-b border-slate-200 pb-5 md:hidden">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-xs font-bold text-white">
                L
              </div>
              <span className="font-semibold">LeadFinder</span>
            </div>
            <span className="text-xs font-medium text-slate-500">
              Lead research
            </span>
          </header>

          <div className="mb-8 mt-8 sm:mt-0">
            <p className="text-sm font-medium text-blue-600">Lead research</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Find your next restaurant leads
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Search a city to generate a focused list of businesses for
              DishBoost outreach.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_160px_auto] lg:items-end">
              <Field label="City" htmlFor="city">
                <input
                  id="city"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="e.g. Berlin"
                  className="input"
                />
              </Field>
              <Field label="Business type" htmlFor="businessType">
                <input
                  id="businessType"
                  value={businessType}
                  onChange={(event) => setBusinessType(event.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Number of leads" htmlFor="limit">
                <select
                  id="limit"
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value))}
                  className="input"
                >
                  {leadOptions.map((option) => (
                    <option key={option} value={option}>
                      {option} leads
                    </option>
                  ))}
                </select>
              </Field>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                {isLoading ? (
                  <>
                    <Spinner /> Searching
                  </>
                ) : (
                  <>
                    <SearchIcon /> Find Leads
                  </>
                )}
              </button>
            </div>
            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </p>
            )}
          </form>

          <section aria-live="polite" className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Results
                </h2>
                {lastQuery && !isLoading && (
                  <p className="mt-1 text-sm text-slate-500">
                    {leads.length} leads found in {lastQuery.city} for{" "}
                    {lastQuery.businessType.toLowerCase()}s.
                  </p>
                )}
              </div>
              {leads.length > 0 && !isLoading && (
                <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {leads.length} leads
                </span>
              )}
            </div>

            {isLoading ? (
              <LoadingState count={limit} />
            ) : leads.length > 0 ? (
              <ResultsTable leads={leads} />
            ) : (
              <EmptyState hasSearched={hasSearched} />
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium text-slate-700"
    >
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  );
}

function ResultsTable({ leads }: { leads: Lead[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3.5">Business</th>
              <th className="px-5 py-3.5">Website</th>
              <th className="px-5 py-3.5">Email</th>
              <th className="px-5 py-3.5">Location</th>
              <th className="px-5 py-3.5">Place ID</th>
              <th className="px-5 py-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-50/70">
                <td className="px-5 py-4 font-medium text-slate-800">
                  {lead.businessName}
                </td>
                <td className="px-5 py-4">
                  {lead.website ? (
                    <a
                      className="text-blue-600 hover:text-blue-700 hover:underline"
                      href={lead.website}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {lead.website.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    <span className="text-slate-400">Not available</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {lead.email ? (
                    <a
                      className="text-blue-600 hover:text-blue-700 hover:underline"
                      href={`mailto:${lead.email}`}
                    >
                      {lead.email}
                    </a>
                  ) : (
                    <span className="text-slate-400">Not available</span>
                  )}
                </td>
                <td className="px-5 py-4 text-slate-600">{lead.location}</td>
                <td
                  className="max-w-44 truncate px-5 py-4 font-mono text-xs text-slate-500"
                  title={lead.id}
                >
                  {lead.id}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={
                      lead.status === "Website found" ? "status-ready" : "status-review"
                    }
                  >
                    {lead.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LoadingState({ count }: { count: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3 text-sm text-slate-600">
        <Spinner />
        <span>Looking for {count} businesses that match your search…</span>
      </div>
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="mb-4 h-5 animate-pulse rounded bg-slate-100 last:mb-0"
          style={{ width: `${92 - index * 11}%` }}
        />
      ))}
    </div>
  );
}
function EmptyState({ hasSearched }: { hasSearched: boolean }) {
  return (
    <div className="grid min-h-60 place-items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 text-center">
      <div>
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-blue-50 text-blue-600">
          <SearchIcon />
        </div>
        <h3 className="mt-4 font-medium text-slate-800">
          {hasSearched ? "No leads found" : "Your results will appear here"}
        </h3>
        <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
          {hasSearched
            ? "Try a different city or business type and search again."
            : "Choose a city, business type, and lead count to start building your outreach list."}
        </p>
      </div>
    </div>
  );
}
function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  );
}
function DashboardIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function Spinner() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M21 12a9 9 0 0 0-9-9v3a6 6 0 0 1 6 6h3Z"
      />
    </svg>
  );
}
