"use client";

import { useState } from "react";
import { navigationItems } from "./app-sidebar";

export function MobileHeader() {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 pb-5 md:hidden">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-xs font-bold text-white">
          L
        </div>

        <span className="font-semibold">LeadFinder</span>
      </div>

      <span className="text-xs font-medium text-slate-500">Automation</span>
    </header>
  );
}