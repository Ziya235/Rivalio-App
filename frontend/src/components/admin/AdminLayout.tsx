import { type ReactNode, useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  Trophy,
  Users,
  BarChart3,
  Calendar,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { to: "/admin", label: "Liqalar", icon: Trophy, end: true },
  { to: "/admin/matches", label: "Oyunlar", icon: Calendar, end: false },
  { to: "/football", label: "Futbol", icon: LayoutDashboard, end: false },
];

export function AdminLayout() {
  const { user, isAdmin, isLoading, logout } = useAuth();
  const navigate = useNavigate();
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
        className={`fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-black text-white">
              S
            </span>
            <span className="text-lg font-extrabold tracking-tight text-ink">
              SPORT
            </span>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to + label}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-ink"
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}

          <p className="px-3 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Tezliklə
          </p>
          {[
            { label: "Komandalar", icon: Users },
            { label: "Oyunçular", icon: Shield },
            { label: "Statistika", icon: BarChart3 },
            { label: "Ayarlar", icon: Settings },
          ].map(({ label, icon: Icon }) => (
            <span
              key={label}
              className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </span>
          ))}
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

      <div className="flex min-h-screen flex-1 flex-col lg:ml-56">
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
