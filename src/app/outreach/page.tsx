"use client";

import { useEffect, useState } from "react";

import { AppSidebar } from "../../components/app-sidebar";

type Restaurant = {
  id: string;
  name: string;
  email: string;
  city: string | null;
};

type Draft = {
  restaurantId: string;
  restaurantName: string;
  email: string;
  subject: string;
  body: string;
};

type OutreachResponse = {
  restaurants: Restaurant[];
};

export default function OutreachPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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

    const generatedDrafts = selected.map((restaurant) => ({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      email: restaurant.email,
      subject: subject.replaceAll("{restaurant_name}", restaurant.name),
      body: body.replaceAll("{restaurant_name}", restaurant.name),
    }));

    setDrafts(generatedDrafts);
  }

  function updateDraft(
    restaurantId: string,
    field: "subject" | "body",
    value: string,
  ) {
    setDrafts((currentDrafts) =>
      currentDrafts.map((draft) =>
        draft.restaurantId === restaurantId
          ? { ...draft, [field]: value }
          : draft,
      ),
    );
  }

  function removeDraft(restaurantId: string) {
    setDrafts((currentDrafts) =>
      currentDrafts.filter((draft) => draft.restaurantId !== restaurantId),
    );
  }

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
                where the restaurant's name should appear.
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

              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {selectedRestaurants.length} selected
              </span>
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
                Generate drafts
              </button>
            </div>
          </section>

          {/* Email drafts */}
          <section className="mt-8">
            <div className="mb-4">
              <h2 className="text-lg font-semibold tracking-tight">
                Email drafts
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Generated emails will appear here for review.
              </p>
            </div>

            {drafts.length === 0 ? (
              <DraftEmptyState />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {drafts.map((draft) => (
                  <article
                    key={draft.restaurantId}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    {drafts.map((draft) => (
                      <article
                        key={draft.restaurantId}
                        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="font-medium text-slate-800">
                              {draft.restaurantName}
                            </h3>

                            <p className="mt-1 truncate text-xs text-slate-500">
                              {draft.email}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                            >
                              Send
                            </button>

                            <button
                              type="button"
                              onClick={() => removeDraft(draft.restaurantId)}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        <div className="mt-5 border-t border-slate-100 pt-4">
                          <label
                            htmlFor={`subject-${draft.restaurantId}`}
                            className="text-xs font-medium uppercase tracking-wide text-slate-400"
                          >
                            Subject
                          </label>

                          <input
                            id={`subject-${draft.restaurantId}`}
                            type="text"
                            value={draft.subject}
                            onChange={(event) =>
                              updateDraft(
                                draft.restaurantId,
                                "subject",
                                event.target.value,
                              )
                            }
                            className="input mt-1 w-full"
                          />

                          <label
                            htmlFor={`body-${draft.restaurantId}`}
                            className="mt-4 block text-xs font-medium uppercase tracking-wide text-slate-400"
                          >
                            Email body
                          </label>

                          <textarea
                            id={`body-${draft.restaurantId}`}
                            value={draft.body}
                            onChange={(event) =>
                              updateDraft(
                                draft.restaurantId,
                                "body",
                                event.target.value,
                              )
                            }
                            className="mt-1 min-h-48 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                      </article>
                    ))}
                  </article>
                ))}
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
          Restaurants need a contact email and must not have been contacted yet.
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

      <span className="text-xs font-medium text-slate-500">Outreach</span>
    </header>
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
