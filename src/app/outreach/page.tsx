"use client";

import { useState } from "react";

import { AppSidebar } from "../../components/app-sidebar";

export default function OutreachPage() {
  const [instruction, setInstruction] = useState("");
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([]);

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

          {/* Campaign instruction */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Campaign instruction
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Tell the AI what you want the outreach email to communicate.
              </p>
            </div>

            <div className="mt-5">
              <label
                htmlFor="instruction"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                What should the email say?
              </label>

              <textarea
                id="instruction"
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                placeholder={`I built DishBoost, a tool that helps restaurants turn food photos into social media content.

Write a short, friendly outreach email offering them a free trial.`}
                className="min-h-48 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                disabled={!instruction.trim()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                Generate drafts
              </button>
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
        Choose which restaurants should receive a generated outreach email.
      </p>
    </div>

    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
      {selectedRestaurants.length} selected
    </span>
  </div>

  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {[
      {
        id: "1",
        name: "La Casa de Tacos",
        email: "info@lacasadetacos.com",
        city: "Roma Norte",
      },
      {
        id: "2",
        name: "Bistro Central",
        email: "hello@bistrocentral.com",
        city: "Condesa",
      },
      {
        id: "3",
        name: "Café Reforma",
        email: "contacto@caferforma.com",
        city: "Juárez",
      },
      {
        id: "4",
        name: "Verde Cocina",
        email: "info@verdecocina.com",
        city: "Polanco",
      },
      {
        id: "5",
        name: "Casa del Mar",
        email: "hola@casadelmar.com",
        city: "Roma Norte",
      },
      {
        id: "6",
        name: "El Patio",
        email: "info@elpatio.com",
        city: "Condesa",
      },
    ].map((restaurant) => {
      const isSelected = selectedRestaurants.includes(restaurant.id);

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
            onChange={() => {
              setSelectedRestaurants((current) =>
                current.includes(restaurant.id)
                  ? current.filter((id) => id !== restaurant.id)
                  : [...current, restaurant.id],
              );
            }}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />

          <div className="ml-3 min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">
              {restaurant.name}
            </p>

            <p className="mt-1 truncate text-xs text-slate-500">
              {restaurant.email}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {restaurant.city}
            </p>
          </div>
        </label>
      );
    })}
  </div>
</section>
          {/* Drafts */}
          <section className="mt-8">
            <div className="mb-4">
              <h2 className="text-lg font-semibold tracking-tight">
                Email drafts
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Generated emails will appear here for review.
              </p>
            </div>

            <EmptyState />
          </section>
        </section>
      </div>
    </main>
  );
}

/* Empty state */

function EmptyState() {
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
          Write a campaign instruction above and generate personalized
          outreach emails for your restaurant leads.
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