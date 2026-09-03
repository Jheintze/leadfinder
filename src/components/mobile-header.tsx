"use client";

import { useState } from "react";
import { navigationItems } from "./app-sidebar";


export function MobileHeader() {

    const [menuOpen, setMenuOpen] = useState(false);
    
  return (
    <header className="flex items-center justify-between border-b border-slate-200 pb-5 md:hidden">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-xs font-bold text-white">
          L
        </div>

        <span className="font-semibold">LeadFinder</span>
      </div>

      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
      >
        ☰
      </button>
    </header>
  );
}
