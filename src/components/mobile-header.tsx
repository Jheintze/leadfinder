"use client";

import Link from "next/link";
import { useState } from "react";
import { navigationItems } from "./app-sidebar";

export function MobileHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative md:hidden">
      <header className="flex items-center justify-between border-b border-slate-200 pb-5">
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
          aria-label="Toggle navigation menu"
        >
          ☰
        </button>
      </header>

      <nav
        className={`absolute left-0 right-0 top-full z-50 mt-3 rounded-xl border border-slate-200 bg-white p-2 shadow-lg transition-all duration-150 ${
          menuOpen
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-1 opacity-0"
        }`}
      >
        {navigationItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            <Icon />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

