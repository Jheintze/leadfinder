"use client";

import { useState } from "react";
import { AppSidebar } from "../../components/app-sidebar";
import { MobileHeader } from "../../components/mobile-header";
import { useAuthStatus } from "@/hooks/use-auth-status";

export default function AgentPage() {
  const [task, setTask] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [sendingOutreach, setSendingOutreach] = useState(false);
  const [sendMessage, setSendMessage] = useState("");
  const [outreach, setOutreach] = useState<{
    restaurants: {
      id: string;
      name: string;
    }[];
    restaurantCount: number;
    template: {
      subject: string;
      body: string;
    };
  } | null>(null);

  const isLoggedIn = useAuthStatus();

  async function handleRunAgent() {
    setLoading(true);
    setResponse("");
    setOutreach(null);
    setSendMessage("");

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ task }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to run agent.");
      }

      setResponse(data.message);
      setOutreach(data.outreach);
    } catch (error) {
      console.error("Failed to run agent:", error);
      setResponse("Could not connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOutreach() {
    if (!outreach) return;

    setSendingOutreach(true);
    setSendMessage("");

    let successfulSends = 0;
    let failedRestaurant: string | null = null;
    let errorMessage = "";

    // Capture the current batch so state changes don't affect this loop.
    const batch = outreach;

    try {
      for (const restaurant of batch.restaurants) {
        const subject = batch.template.subject.replaceAll(
          "{restaurant_name}",
          restaurant.name,
        );

        const body = batch.template.body.replaceAll(
          "{restaurant_name}",
          restaurant.name,
        );

        try {
          const res = await fetch("/api/leads/outreach/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              restaurantId: restaurant.id,
              to: "dr.nick@gmx.net",
              subject,
              body,
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error ?? "Could not send email.");
          }

          successfulSends++;
        } catch (error) {
          console.error(
            `Failed to send outreach to ${restaurant.name}:`,
            error,
          );

          failedRestaurant = restaurant.name;
          errorMessage =
            error instanceof Error
              ? error.message
              : "An unexpected error occurred.";

          break;
        }
      }

      if (successfulSends === batch.restaurants.length) {
        setSendMessage(
          `success:${successfulSends} ${
            successfulSends === 1 ? "email was" : "emails were"
          } sent successfully.`,
        );
        setOutreach(null);
      } else if (successfulSends > 0) {
        setSendMessage(
          `partial:${successfulSends} of ${batch.restaurants.length} emails sent. Failed at ${failedRestaurant}. Remaining emails were not attempted. Error: ${errorMessage}`,
        );

        // Remove confirmed successes so they aren't retried from this preview.
        const sentIds = new Set(
          batch.restaurants
            .slice(0, successfulSends)
            .map((restaurant) => restaurant.id),
        );

        setOutreach((current) =>
          current
            ? {
                ...current,
                restaurants: current.restaurants.filter(
                  (restaurant) => !sentIds.has(restaurant.id),
                ),
                restaurantCount: Math.max(
                  0,
                  current.restaurantCount - successfulSends,
                ),
              }
            : null,
        );
      } else {
        setSendMessage(
          `error:No emails were confirmed sent. Failed at ${
            failedRestaurant ?? "the first recipient"
          }. Error: ${errorMessage}`,
        );
      }
    } finally {
      setSendingOutreach(false);
    }
  }

  const notificationType = sendMessage.split(":")[0];
  const notificationText = sendMessage.includes(":")
    ? sendMessage.slice(sendMessage.indexOf(":") + 1)
    : sendMessage;

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
              Give the agent a task and let it work through your lead generation
              workflow.
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
              value={task}
              onChange={(event) => setTask(event.target.value)}
              placeholder="e.g. Find 20 suitable restaurants in Berlin and prepare personalized outreach..."
              className="mt-3 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleRunAgent}
              disabled={loading || !task.trim()}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Running..." : "Run Agent"}
            </button>
            {response && (
              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="whitespace-pre-line text-sm leading-6 text-slate-700">
                  {response}
                </div>
              </div>
            )}
            
            {outreach && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Outreach prepared
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {outreach.restaurantCount} recipient
                      {outreach.restaurantCount === 1 ? "" : "s"} remaining
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={
                      isLoggedIn !== true ||
                      sendingOutreach ||
                      outreach.restaurants.length === 0
                    }
                    onClick={handleSendOutreach}
                    className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sendingOutreach ? "Sending..." : "Send outreach"}
                  </button>
                </div>

                {isLoggedIn === false && (
                  <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
                    <p>
                      <span className="font-semibold">Demo mode:</span> You can
                      search for restaurants and prepare outreach drafts.
                      Sending emails requires you to log in.{" "}
                      <a
                        href="/login"
                        className="font-semibold underline underline-offset-2 hover:text-blue-950"
                      >
                        Log in
                      </a>
                    </p>
                  </div>
                )}

                <div className="mt-5 border-t border-slate-300 pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Subject
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {outreach.template.subject}
                  </p>

                  <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Message
                  </p>

                  <div className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">
                    {outreach.template.body}
                  </div>
                </div>
              </div>
            )}
            
            {sendMessage && (
              <div
                role="status"
                aria-live="polite"
                className={`fixed bottom-4 left-4 right-4 z-50 rounded-lg border bg-white px-4 py-3 shadow-lg sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-md ${
                  notificationType === "success"
                    ? "border-green-200"
                    : notificationType === "partial"
                      ? "border-amber-200"
                      : "border-red-200"
                }`}
              >
                <p className="text-sm font-medium text-slate-800">
                  {notificationType === "success"
                    ? "✓ Outreach sent"
                    : notificationType === "partial"
                      ? "⚠ Outreach partially sent"
                      : "✕ Outreach failed"}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {notificationText}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
