"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "../../components/app-sidebar";
import { AutomationIcon } from "../../components/app-sidebar";
import { MobileHeader } from "../../components/mobile-header";
import { useAuthStatus } from "@/hooks/use-auth-status";
import {
  OUTREACH_SUBJECT,
  OUTREACH_BODY,
} from "@/lib/outreach/outreach-template";

type AutomationBatch = {
  id: string;
  created_at: string;
  status: "preparing" | "ready" | "sent" | "failed";
  target_emails: number;
  emails_found: number;
  restaurants_processed: number;
  restaurant_ids: string[];
  error: string | null;
  city: string;
  city_exhausted: boolean;
  sent_at: string | null;
};

type AutomationResponse = {
  batches: AutomationBatch[];
};

export default function AutomationPage() {
  const [batches, setBatches] = useState<AutomationBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [sendingBatchId, setSendingBatchId] = useState<string | null>(null);
  const [reviewingBatchId, setReviewingBatchId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const isLoggedIn = useAuthStatus();
  const [toastType, setToastType] = useState<"success" | "partial" | "error">(
    "success",
  );

  async function handleSendAll(batchId: string) {
    setSendingBatchId(batchId);

    try {
      const response = await fetch("/api/automation/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ batchId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not send batch.");
      }

      await loadBatches();

      if (data.success) {
        setToastType("success");
        setToastMessage(`Batch sent successfully. ${data.sent} emails sent.`);
      } else if (data.sent > 0) {
        setToastType("partial");
        setToastMessage(
          `Batch partially sent: ${data.sent} sent, ${data.failed} failed.`,
        );
      } else {
        setToastType("error");
        setToastMessage(
          `Sending failed: 0 emails sent, ${data.failed} failed.`,
        );
      }
    } catch (error) {
      console.error(error);
      setToastType("error");
      setToastMessage(
        error instanceof Error ? error.message : "Could not send batch.",
      );
    } finally {
      setSendingBatchId(null);
    }
  }

  
async function handleRemoveBatch(batchId: string) {
  if (!window.confirm("Remove this batch? This cannot be undone.")) {
    return;
  }

  try {
    const response = await fetch("/api/automation/batches", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ batchId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not remove batch.");
    }

    setBatches((current) => current.filter((batch) => batch.id !== batchId));
    setToastType("success");
    setToastMessage("Batch removed.");
  } catch (error) {
    setToastType("error");
    setToastMessage(
      error instanceof Error ? error.message : "Could not remove batch.",
    );
  }
}

async function handleClearHistory() {
  if (
    !window.confirm(
      "Clear all completed and failed batch history? This cannot be undone.",
    )
  ) {
    return;
  }

  try {
    const response = await fetch("/api/automation/batches", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ clearHistory: true }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not clear batch history.");
    }

    setBatches((current) =>
      current.filter(
        (batch) => batch.status !== "sent" && batch.status !== "failed",
      ),
    );

    setToastType("success");
    setToastMessage(`Batch history cleared. ${data.deleted} batches removed.`);
  } catch (error) {
    setToastType("error");
    setToastMessage(
      error instanceof Error
        ? error.message
        : "Could not clear batch history.",
    );
  }
}

  async function loadBatches() {
    try {
      const response = await fetch("/api/automation/batches");

      const data = (await response.json()) as AutomationResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Could not load automation batches.");
      }

      setBatches(data.batches);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong while loading automation batches.",
      );
    } finally {
      setIsLoading(false);
    }
  }
  useEffect(() => {
    loadBatches();
  }, []);

  useEffect(() => {
    if (!toastMessage) return;

    const timer = setTimeout(() => {
      setToastMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [toastMessage]);

  const pendingBatches = batches.filter(
    (batch) => batch.status === "ready" || batch.status === "preparing",
  );

  const completedBatches = batches.filter(
    (batch) => batch.status === "sent" || batch.status === "failed",
  );
 
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <AppSidebar activePage="automation" />

        <section className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-12 lg:py-10">
          <MobileHeader />

          <div className="mb-8 mt-8 sm:mt-0">
            <p className="text-sm font-medium text-blue-600">Automation</p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Daily outreach
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Review and send the restaurant outreach batches prepared by your
              automated workflow.
            </p>
          </div>

          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <p
              role="alert"
              className="max-w-3xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          ) : (
            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
              <div className="min-w-0 w-full max-w-3xl justify-self-start space-y-8">
                <section>
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold tracking-tight">
                      Pending outreach
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Batches waiting to be reviewed and sent.
                    </p>
                  </div>

                  {pendingBatches.length === 0 ? (
                    <EmptyState
                      title="No pending outreach"
                      description="There are currently no automated outreach batches waiting to be sent."
                    />
                  ) : (
                    <div className="space-y-4">
                      {pendingBatches.map((batch) => (
                        <BatchCard
                          key={batch.id}
                          batch={batch}
                          isLoggedIn={isLoggedIn}
                          isReviewing={reviewingBatchId === batch.id}
                          onRemove={() => handleRemoveBatch(batch.id)}
                          onToggleReview={() =>
                            setReviewingBatchId((current) =>
                              current === batch.id ? null : batch.id,
                            )
                          }
                          onSendAll={() => handleSendAll(batch.id)}
                          isSending={sendingBatchId === batch.id}
                        />
                      ))}
                    </div>
                  )}
                </section>
                <section>
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight">
                        Batch history
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Previously processed automated outreach batches.
                      </p>
                    </div>

                    {completedBatches.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearHistory}
                        disabled={isLoggedIn !== true}
                        title={
                          isLoggedIn === true
                            ? undefined
                            : "Log in to clear history"
                        }
                        className="self-start rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
                      >
                        Clear history
                      </button>
                    )}
                  </div>

                  {completedBatches.length === 0 ? (
                    <EmptyState
                      title="No batch history yet"
                      description="Completed and failed batches will appear here."
                    />
                  ) : (
                    <div className="space-y-3">
                      {completedBatches.map((batch) => (
                        <BatchCard
                          key={batch.id}
                          batch={batch}
                          isLoggedIn={isLoggedIn}
                          isReviewing={reviewingBatchId === batch.id}
                          onRemove={() => handleRemoveBatch(batch.id)}
                          onToggleReview={() =>
                            setReviewingBatchId((current) =>
                              current === batch.id ? null : batch.id,
                            )
                          }
                          onSendAll={() => handleSendAll(batch.id)}
                          isSending={sendingBatchId === batch.id}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-8">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-sm font-semibold text-blue-600">
                    <AutomationIcon />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Daily outreach automation
                    </h2>
                    <p className="text-xs text-slate-500">
                      Scheduled lead generation and outreach preparation
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      1. Automated daily runs
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      A scheduled Vercel Cron Job runs once a day to find
                      restaurants and prepare an outreach batch of up to 5
                      restaurants.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      2. Review prepared batches
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Review the restaurants and prepared outreach messages
                      before deciding whether to send them.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      3. Track batch history
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      View previously processed batches and check their status.
                    </p>
                  </div>
                </div>

                {isLoggedIn === false && (
                  <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-blue-900">
                      Demo mode
                    </p>

                    <ul className="mt-3 space-y-2 text-sm leading-5 text-blue-900">
                      <li>
                        • Viewing batches and reviewing messages are available.
                      </li>
                      <li>
                        • Sending emails and deleting batches require login.
                      </li>
                    </ul>

                    <div className="my-4 border-t border-blue-200" />

                    <p className="text-sm leading-6 text-blue-800">
                      Existing users can{" "}
                      <a
                        href="/login"
                        className="font-semibold underline underline-offset-2"
                      >
                        log in
                      </a>
                      . New account registration is currently unavailable.
                    </p>
                  </div>
                )}

                {isLoggedIn === true && (
                  <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-800">
                      You&apos;re logged in
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      You can send outreach batches and manage batch history.
                    </p>
                  </div>
                )}
              </aside>
            </div>
          )}
        </section>
      </div>

      {toastMessage && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 rounded-lg border bg-white px-4 py-3 text-sm shadow-lg ${
            toastType === "success"
              ? "border-green-200 text-green-700"
              : toastType === "partial"
                ? "border-amber-200 text-amber-700"
                : "border-red-200 text-red-700"
          }`}
        >
          {toastMessage}
        </div>
      )}
    </main>
  );
}

function BatchCard({
  batch,
  isReviewing,
  onToggleReview,
  onSendAll,
  isSending,
  isLoggedIn,
  onRemove,
}: {
  batch: AutomationBatch;
  isReviewing: boolean;
  onToggleReview: () => void;
  onSendAll: () => void;
  isSending: boolean;
  isLoggedIn: boolean | null;
  onRemove: () => void;
}) {

  const isReady = batch.status === "ready";
  const isPreparing = batch.status === "preparing";
  const isSent = batch.status === "sent";
  const isFailed = batch.status === "failed";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-slate-800">
              {formatDate(batch.created_at)}
            </p>

            <StatusBadge status={batch.status} />
          </div>

          <p className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
            {batch.emails_found}{" "}
            {batch.emails_found === 1 ? "contact" : "contacts"} ready
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            {batch.city ? `  ${formatCity(batch.city)}` : ""}
          </p>

          {isFailed && batch.error && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {batch.error}
            </p>
          )}
        </div>

        {isReady && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onRemove}
              disabled={isLoggedIn !== true}
              title={
                isLoggedIn === true ? undefined : "Log in to remove batches"
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Remove
            </button>
            <button
              type="button"
              onClick={onToggleReview}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              {isReviewing ? "Hide review" : "Review"}
            </button>

            <button
              type="button"
              onClick={onSendAll}
              disabled={isLoggedIn !== true || isSending}
              title={
                isLoggedIn === true ? undefined : "Log in to send outreach"
              }
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSending ? "Sending..." : "Send"}
            </button>
          </div>
        )}
      </div>

      {isReviewing && isReady && (
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Subject
          </p>

          <p className="mt-1 text-sm font-medium text-slate-800">
            {OUTREACH_SUBJECT}
          </p>

          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
            Email body
          </p>

          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {OUTREACH_BODY}
          </p>
        </div>
      )}

      {isPreparing && (
        <p className="mt-4 text-sm text-slate-500">
          This batch is still being prepared.
        </p>
      )}

      {isSent && batch.sent_at && (
        <p className="mt-2 text-xs text-slate-400">
          Sent {formatDateTime(batch.sent_at)}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: AutomationBatch["status"] }) {
  const labels = {
    preparing: "Preparing",
    ready: "Ready",
    sent: "Sent",
    failed: "Failed",
  };

  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
      {labels[status]}
    </span>
  );
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCity(city: string) {
  return city
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 text-center">
      <div>
        <h3 className="font-medium text-slate-800">{title}</h3>

        <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="max-w-4xl space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-40 animate-pulse rounded-xl bg-white" />
      ))}
    </div>
  );
}
