import { type ReactNode, useEffect, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Calendar,
  ChevronDown,
  HelpCircle,
  LogOut,
  Medal,
  Menu,
  Trophy,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

type SportModule = {
  to: string;
  label: string;
  icon: typeof Trophy;
  matchPrefix: string;
};

type SportNav = {
  id: string;
  label: string;
  enabled: boolean;
  to?: string;
  modules?: SportModule[];
};

const SPORTS: SportNav[] = [
  {
    id: "football",
    label: "Futbol",
    enabled: true,
    to: "/admin/football/leagues",
    modules: [
      {
        to: "/admin/football/leagues",
        label: "Liqalar",
        icon: Trophy,
        matchPrefix: "/admin/football/leagues",
      },
      {
        to: "/admin/football/matches",
        label: "Oyunlar",
        icon: Calendar,
        matchPrefix: "/admin/football/matches",
      },
      {
        to: "/admin/football/championships",
        label: "Çempionatlar",
        icon: Medal,
        matchPrefix: "/admin/football/championships",
      },
    ],
  },
  { id: "tennis", label: "Tennis", enabled: false },
  { id: "table-tennis", label: "Stolüstü tennis", enabled: false },
  { id: "volleyball", label: "Voleybol", enabled: false },
  { id: "basketball", label: "Basketbol", enabled: false },
];

export function AdminLayout() {
  const { user, isAdmin, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add("admin-light");
    return () => document.body.classList.remove("admin-light");
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6] text-slate-500">
        Yüklənir...
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] text-slate-900">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Menyunu bağla"
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
          <Link to="/admin/football/leagues" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-black text-ink">
              R
            </span>
            <span className="text-lg font-extrabold tracking-tight text-ink">
              Rival<span className="text-brand">io</span>
            </span>
          </Link>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            İdman növləri
          </p>
          <div className="space-y-1">
            {SPORTS.map((sport) => {
              const sportActive =
                sport.enabled &&
                Boolean(sport.to) &&
                pathname.startsWith(`/admin/${sport.id}`);

              if (!sport.enabled) {
                return (
                  <span
                    key={sport.id}
                    title="Tezliklə"
                    className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300"
                  >
                    {sport.label}
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Tezliklə
                    </span>
                  </span>
                );
              }

              return (
                <div key={sport.id}>
                  <Link
                    to={sport.to!}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                      sportActive
                        ? "bg-brand-soft text-ink"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {sport.label}
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition ${
                        sportActive ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                  </Link>
                  {sportActive && sport.modules ? (
                    <div className="mt-1 space-y-0.5 border-l border-slate-200 ml-4 pl-2">
                      {sport.modules.map(({ to, label, icon: Icon, matchPrefix }) => {
                        const moduleActive = pathname.startsWith(matchPrefix);
                        return (
                          <NavLink
                            key={to}
                            to={to}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                              moduleActive
                                ? "bg-brand text-ink shadow-sm"
                                : "text-slate-600 hover:bg-slate-50 hover:text-ink"
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            {label}
                          </NavLink>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-slate-100 p-3">
          <div className="rounded-xl bg-brand-soft/60 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
              <HelpCircle className="h-4 w-4 text-brand" />
              Kömək lazımdır?
            </div>
            <p className="mb-3 text-xs text-slate-500">
              Liqa və komanda idarəçiliyi üçün bələdçi.
            </p>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              Çıxış
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden items-center gap-6 text-sm font-medium text-slate-500 lg:flex">
            <span className="text-ink">Admin paneli</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-ink">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-slate-500">Admin</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">
              {user.firstName.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminPageShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 max-w-xl text-sm text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
