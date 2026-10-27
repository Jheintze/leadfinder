"use client";

import { useState } from "react";
import { AppSidebar } from "../../components/app-sidebar";
import { MobileHeader } from "../../components/mobile-header";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { AgentIcon } from "../../components/app-sidebar";

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
    <main className="min-h-screen bg-app-bg text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <AppSidebar activePage="agent" />

        <section className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-12 lg:py-10">
          <MobileHeader />

          <div className="mb-8 mt-8 sm:mt-0">
            <p className="text-sm font-medium text-terracotta">Automation</p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Agent
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Give the agent a task and let it work through your lead generation
              workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
            <div className="min-w-0 w-full max-w-3xl justify-self-start rounded-xl border border-neutral-border bg-white p-5 shadow-sm">
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
                placeholder="e.g. Find 20 restaurants in Berlin and prepare personalized outreach..."
                className="mt-3 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none transition focus:border-terracotta focus:ring-1 focus:ring-terracotta"
              />
              <button
                type="button"
                onClick={handleRunAgent}
                disabled={loading || !task.trim()}
                className="mt-4 rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white transition hover:bg-terracotta-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Running..." : "Run Agent"}
              </button>
              {response && (
                <div className="mt-6 rounded-lg border border-neutral-border bg-slate-50 p-4">
                  <div className="whitespace-pre-line text-sm leading-6 text-slate-700">
                    {response}
                  </div>
                </div>
              )}

              {outreach && (
                <div className="mt-6 rounded-xl border border-neutral-border bg-white p-5 shadow-sm">
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
                      className="shrink-0 rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white transition hover:bg-terracotta-hover disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sendingOutreach ? "Sending..." : "Send outreach"}
                    </button>
                  </div>

                  {isLoggedIn === false && (
                    <div className="mt-4 rounded-lg border border-demo-border bg-demo-bg px-4 py-3 text-sm leading-6 text-demo-text">
                      <p>
                        <span className="text-md font-bold text-demo-text">
                          Portfolio demo mode:
                        </span>{" "}
                        You can explore the available features without an
                        account, but some actions like sending require login.
                        New account registration is currently unavailable.
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

            {/* Demo mode information */}
            <aside className="rounded-xl border border-neutral-border bg-white p-5 shadow-sm xl:sticky xl:top-8">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-demo-bg text-sm font-semibold text-terracotta">
                  <AgentIcon />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    How to use the Agent
                  </h2>
                  <p className="text-xs text-slate-500">
                    Your AI-assisted lead generation workflow
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    1. Find restaurants
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Ask the Agent to find restaurants by city, area or cuisine.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    2. Discover contact emails
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Ask it to find publicly available email addresses for
                    potential leads.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    3. Prepare outreach
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Ask the Agent to prepare personalized outreach drafts and
                    review the generated message.
                  </p>
                </div>
              </div>

              {isLoggedIn === false && (
                <div className="mt-6 rounded-lg border border-demo-border bg-demo-bg p-4">
                  <p className="text-md font-bold text-demo-text">
                    Portfolio demo mode
                  </p>

                  <ul className="mt-3 space-y-2 text-sm leading-5 text-demo-text">
                    <li>
                      • Restaurant and email searches are limited to 5 results
                      per request.
                    </li>
                    <li>• You can prepare and review outreach drafts.</li>
                    <li>• Sending emails is disabled.</li>
                  </ul>

                  <div className="my-4 border-t border-demo-border" />

                  <p className="text-sm leading-6 text-demo-text">
                    You can explore the available features without an account,
                    but some actions require login. New account registration is
                    currently unavailable.
                  </p>
                </div>
              )}
              {isLoggedIn === true && (
                <div className="mt-6 rounded-lg border border-neutral-border bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-800">
                    You&apos;re logged in
                  </p>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    You can use the Agent with your account permissions.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
