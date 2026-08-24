"use client";

import { useState } from "react";
import type { SubmitEvent } from "react";
import { AppSidebar } from "../../components/app-sidebar";

type EmailResult = {
  id: string;
  name: string;
  website: string;
  email: string | null;
};

type EmailFinderResponse = {
  processed: number;
  found: number;
  results: EmailResult[];
};

const batchOptions = [5, 10, 20, 50];

export default function EmailFinderPage() {
  const [limit, setLimit] = useState(5);
  const [results, setResults] = useState<EmailResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [summary, setSummary] = useState<{
    processed: number;
    found: number;
  } | null>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await fetch("/api/leads/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ limit }),
      });

      const data = (await response.json()) as EmailFinderResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "We could not find emails right now.");
      }

      setResults(data.results);
      setSummary({
        processed: data.processed,
        found: data.found,
      });
    } catch (caughtError) {
      setResults([]);
      setSummary(null);

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
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <AppSidebar activePage="email-finder" />

        <section className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-12 lg:py-10">
          <MobileHeader />

          {/* Page heading */}
          <div className="mb-8 mt-8 sm:mt-0">
            <p className="text-sm font-medium text-blue-600">Lead research</p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Find restaurant emails
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Search your existing restaurant leads for publicly listed contact
              email addresses from their websites.
            </p>
          </div>

          {/* Email finder form */}
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <Field label="Number to process" htmlFor="limit">
                <select
                  id="limit"
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value))}
                  className="input w-full sm:w-48"
                >
                  {batchOptions.map((option) => (
                    <option key={option} value={option}>
                      {option} restaurants
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
                    <Spinner /> Finding emails
                  </>
                ) : (
                  <>
                    <EmailIcon /> Find Emails
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

          {/* Results */}
          <section aria-live="polite" className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Results
                </h2>

                {summary && !isLoading && (
                  <p className="mt-1 text-sm text-slate-500">
                    {summary.found} emails found from {summary.processed}{" "}
                    restaurants processed.
                  </p>
                )}
              </div>

              {summary && !isLoading && (
                <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {summary.processed} processed
                </span>
              )}
            </div>

            {isLoading ? (
              <LoadingState count={limit} />
            ) : results.length > 0 ? (
              <ResultsTable results={results} />
            ) : (
              <EmptyState hasSearched={hasSearched} />
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

/* Reusable form field */

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

/* Email results table */

function ResultsTable({ results }: { results: EmailResult[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3.5">Restaurant</th>
              <th className="px-5 py-3.5">Website</th>
              <th className="px-5 py-3.5">Email</th>
              <th className="px-5 py-3.5">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {results.map((restaurant) => (
              <tr key={restaurant.id} className="hover:bg-slate-50/70">
                <td className="px-5 py-4 font-medium text-slate-800">
                  {restaurant.name}
                </td>

                <td className="px-5 py-4">
                  <a
                    className="text-blue-600 hover:text-blue-700 hover:underline"
                    href={restaurant.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {restaurant.website.replace(/^https?:\/\//, "")}
                  </a>
                </td>

                <td className="px-5 py-4">
                  {restaurant.email ? (
                    <a
                      className="text-blue-600 hover:text-blue-700 hover:underline"
                      href={`mailto:${restaurant.email}`}
                    >
                      {restaurant.email}
                    </a>
                  ) : (
                    <span className="text-slate-400">Not found</span>
                  )}
                </td>

                <td className="px-5 py-4">
                  <span
                    className={
                      restaurant.email ? "status-ready" : "status-review"
                    }
                  >
                    {restaurant.email ? "Found" : "Not found"}
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

/* Loading state */

function LoadingState({ count }: { count: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3 text-sm text-slate-600">
        <Spinner />
        <span>Searching {count} restaurant websites for email addresses…</span>
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

/* Empty state */

function EmptyState({ hasSearched }: { hasSearched: boolean }) {
  return (
    <div className="grid min-h-60 place-items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 text-center">
      <div>
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-blue-50 text-blue-600">
          <EmailIcon />
        </div>

        <h3 className="mt-4 font-medium text-slate-800">
          {hasSearched
            ? "No restaurants found"
            : "Your results will appear here"}
        </h3>

        <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
          {hasSearched
            ? "There may be no remaining restaurants with websites and missing email addresses."
            : "Choose how many restaurants to process and start searching for contact emails."}
        </p>
      </div>
    </div>
  );
}

/* Mobile header */

function MobileHeader() {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 pb-5 md:hidden">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-xs font-bold text-white">
          L
        </div>

        <span className="font-semibold">LeadFinder</span>
      </div>

      <span className="text-xs font-medium text-slate-500">Lead research</span>
    </header>
  );
}

/* Icons */

function EmailIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
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
