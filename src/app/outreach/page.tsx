"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "../../components/app-sidebar";
import { MobileHeader } from "../../components/mobile-header";

type Restaurant = {
  id: string;
  name: string;
  email: string;
  city: string | null;
};

type OutreachResponse = {
  restaurants: Restaurant[];
};

export default function OutreachPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [outreachPrepared, setOutreachPrepared] = useState(false);
  const [preparedRecipients, setPreparedRecipients] = useState<Restaurant[]>(
    [],
  );

  const [subject, setSubject] = useState("A quick idea for {restaurant_name}");

  const [body, setBody] = useState(`Hi {restaurant_name},

I’m building DishBoost, a tool that helps restaurants turn their food photos into social media content.

I’d love to give you a free trial and get your feedback.

Best,
Jakob`);

  useEffect(() => {
    async function loadRestaurants() {
      try {
        const response = await fetch("/api/leads/outreach");

        const data = (await response.json()) as OutreachResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error || "Could not load restaurants.");
        }

        setRestaurants(data.restaurants);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Something went wrong while loading restaurants.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadRestaurants();
  }, []);

  function toggleRestaurant(id: string) {
    setSelectedRestaurants((current) =>
      current.includes(id)
        ? current.filter((restaurantId) => restaurantId !== id)
        : [...current, id],
    );
  }

  function generateDrafts() {
    const selected = restaurants.filter((restaurant) =>
      selectedRestaurants.includes(restaurant.id),
    );

    setPreparedRecipients(selected);
    setOutreachPrepared(true);
    setSelectedRestaurants([]);

    setTimeout(() => {
      document
        .getElementById("email-drafts")
        ?.scrollIntoView({ block: "start" });
    }, 0);
  }

  async function sendAllOutreach() {
    for (const restaurant of preparedRecipients) {
      const personalizedSubject = subject.replaceAll(
        "{restaurant_name}",
        restaurant.name,
      );

      const personalizedBody = body.replaceAll(
        "{restaurant_name}",
        restaurant.name,
      );

      try {
        const response = await fetch("/api/leads/outreach/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurantId: restaurant.id,
            to: "dr.nick@gmx.net",
            subject: personalizedSubject,
            body: personalizedBody,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Could not send email.");
        }
      } catch (error) {
        console.error(`Failed to send outreach to ${restaurant.name}:`, error);
      }
    }
  }

  const allSelected =
    restaurants.length > 0 && selectedRestaurants.length === restaurants.length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <AppSidebar activePage="outreach" />

        <section className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-12 lg:py-10">
          <MobileHeader />

          {/* Page heading */}
          <div className="mb-8 mt-8 sm:mt-0">
            <p className="text-sm font-medium text-blue-600">Outreach</p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Create restaurant outreach
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Generate personalized outreach emails for your restaurant leads
              using a campaign instruction.
            </p>
          </div>

          {/* Email template */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Email template
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Write the email you want to send. Use {"{restaurant_name}"}{" "}
                where the restaurant&apos;s name should appear.
              </p>
            </div>

            <div className="mt-5 grid gap-5">
              <div>
                <label
                  htmlFor="subject"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className="input w-full"
                />{" "}
              </div>

              <div>
                <label
                  htmlFor="body"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email body
                </label>

                <textarea
                  id="body"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  className="min-h-48 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </section>

          {/* Restaurant selection */}
          <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Select restaurants
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Choose which restaurants should receive a generated outreach
                  email.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => {
                      if (allSelected) {
                        setSelectedRestaurants([]);
                      } else {
                        setSelectedRestaurants(
                          restaurants.map((restaurant) => restaurant.id),
                        );
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Select all
                </label>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {selectedRestaurants.length} of {restaurants.length} selected
                </span>
              </div>
            </div>

            {isLoading ? (
              <LoadingState />
            ) : error ? (
              <p
                role="alert"
                className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </p>
            ) : restaurants.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {restaurants.map((restaurant) => {
                  const isSelected = selectedRestaurants.includes(
                    restaurant.id,
                  );

                  return (
                    <label
                      key={restaurant.id}
                      className={`relative flex cursor-pointer rounded-lg border p-4 transition-colors ${
                        isSelected
                          ? "border-blue-300 bg-blue-50/60"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRestaurant(restaurant.id)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />

                      <div className="ml-3 min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {restaurant.name}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-500">
                          {restaurant.email}
                        </p>

                        {restaurant.city && (
                          <p className="mt-1 text-xs text-slate-400">
                            {restaurant.city}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={generateDrafts}
                disabled={selectedRestaurants.length === 0}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                Prepare outreach
              </button>
            </div>
          </section>

          {/* Outreach ready */}
          <section id="email-drafts" className="mt-8">
            {!outreachPrepared ? (
              <DraftEmptyState />
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">
                      Outreach ready
                    </p>

                    <h2 className="mt-1 text-lg font-semibold tracking-tight">
                      Ready to send
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {preparedRecipients.length}{" "}
                      {preparedRecipients.length === 1
                        ? "recipient"
                        : "recipients"}{" "}
                      will receive this outreach.{" "}
                      <code className="text-xs text-slate-600">
                        {"{restaurant_name}"}
                      </code>{" "}
                      will be personalized when the emails are sent.
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOutreachPrepared(false)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                    >
                      Clear
                    </button>

                    <button
                      type="button"
                      onClick={sendAllOutreach}
                      disabled={preparedRecipients.length === 0}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      Send all ({preparedRecipients.length})
                    </button>
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Subject
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {subject}
                  </p>

                  <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Email body
                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {body}
                  </p>
                </div>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

/* Loading state */

function LoadingState() {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-lg bg-slate-100"
        />
      ))}
    </div>
  );
}

/* Empty restaurant state */

function EmptyState() {
  return (
    <div className="mt-5 grid min-h-40 place-items-center rounded-lg border border-dashed border-slate-300 px-6 text-center">
      <div>
        <h3 className="font-medium text-slate-800">
          No restaurants ready for outreach
        </h3>

        <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
          Find restaurants and their contact emails first. Restaurants will
          appear here once they have an email and haven&apos;t been contacted
          yet.
        </p>
      </div>
    </div>
  );
}

/* Empty drafts state */

function DraftEmptyState() {
  return (
    <div className="grid min-h-60 place-items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 text-center">
      <div>
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-blue-50 text-blue-600">
          <SendIcon />
        </div>

        <h3 className="mt-4 font-medium text-slate-800">
          Your drafts will appear here
        </h3>

        <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
          Select restaurants and generate personalized outreach emails to see
          your drafts here.
        </p>
      </div>
    </div>
  );
}

/* Icons */

function SendIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 11.5 21 4l-5.5 17-4-7.5L3 11.5Z" />
      <path d="m11.5 13.5 4-4" />
    </svg>
  );
}
