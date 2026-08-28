"use client";

import { useState } from "react";

export default function OutreachPage() {
  const [instruction, setInstruction] = useState("");

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Outreach</h1>
        <p className="mt-1 text-sm text-gray-500">
          Generate personalized outreach emails for your restaurant leads.
        </p>
      </div>

      <div className="max-w-3xl">
        <label className="mb-2 block text-sm font-medium">
          Campaign instruction
        </label>

        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Describe what you want the outreach email to say..."
          className="min-h-[180px] w-full rounded-lg border border-gray-300 p-4 text-sm outline-none focus:border-gray-500"
        />

        <button
          className="mt-4 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          Generate drafts
        </button>
      </div>
    </div>
  );
}