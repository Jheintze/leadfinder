import Link from "next/link";

type AppSidebarProps = {
  activePage: "dashboard" | "restaurant-search" | "email-finder" | "outreach";
};

const navigationItems = [
  { href: "/dashboard", label: "Dashboard", page: "dashboard", icon: DashboardIcon },
  {
    href: "/",
    label: "Restaurant Search",
    page: "restaurant-search",
    icon: SearchIcon,
  },
  {
    href: "/email-finder",
    label: "Email Finder",
    page: "email-finder",
    icon: EmailIcon,
  },
  {
  href: "/outreach",
  label: "Outreach",
  page: "outreach",
  icon: OutreachIcon,
},
] as const;

export function AppSidebar({ activePage }: AppSidebarProps) {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white px-5 py-6 md:flex md:flex-col">
      <div className="flex items-center gap-3 px-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">
          L
        </div>
        <span className="text-lg font-semibold tracking-tight">LeadFinder</span>
      </div>
      <nav className="mt-10">
        {navigationItems.map(({ href, label, page, icon: Icon }) => (
          <Link
            key={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
              activePage === page
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
            href={href}
          >
            <Icon /> {label}
          </Link>
        ))}
      </nav>
      <p className="mt-auto px-2 text-xs leading-5 text-slate-400">
        DishBoost internal tools
        <br />
        Lead research workspace
      </p>
    </aside>
  );
}

function DashboardIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function OutreachIcon() {
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