"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "../../components/app-sidebar";
import { MobileHeader } from "../../components/mobile-header";

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

const EMAIL_SUBJECT = "A quick idea for {restaurant_name}";

const EMAIL_BODY = `Hi {restaurant_name},

I’m building DishBoost, a tool that helps restaurants turn their food photos into social media content.

I’d love to give you a free trial and get your feedback.

Best,
Jakob`;

export default function AutomationPage() {
  const [batches, setBatches] = useState<AutomationBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [sendingBatchId, setSendingBatchId] = useState<string | null>(null);
  const [reviewingBatchId, setReviewingBatchId] = useState<string | null>(null);

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
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Could not send batch.");
    } finally {
      setSendingBatchId(null);
    }
  }

  useEffect(() => {
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

    loadBatches();
  }, []);

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
            <div className="max-w-4xl space-y-8">
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
                        isReviewing={reviewingBatchId === batch.id}
                        onToggleReview={() =>
                          setReviewingBatchId((current) =>
                            current === batch.id ? null : batch.id,
                          )
                        }
                      />
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold tracking-tight">
                    Batch history
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Previously processed automated outreach batches.
                  </p>
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
                        isReviewing={reviewingBatchId === batch.id}
                        onToggleReview={() =>
                          setReviewingBatchId((current) =>
                            current === batch.id ? null : batch.id,
                          )
                        }
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function BatchCard({
  batch,
  isReviewing,
  onToggleReview,
}: {
  batch: AutomationBatch;
  isReviewing: boolean;
  onToggleReview: () => void;
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
            {batch.emails_found} emails found from {batch.restaurants_processed}{" "}
            restaurants
            {batch.city ? ` · ${formatCity(batch.city)}` : ""}
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
              onClick={onToggleReview}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              {isReviewing ? "Hide review" : "Review"}
            </button>

            <button
              type="button"
              disabled
              title="Sending will be connected after the review flow is finalized."
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white opacity-50"
            >
              Send all
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
            {EMAIL_SUBJECT}
          </p>

          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
            Email body
          </p>

          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {EMAIL_BODY}
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
