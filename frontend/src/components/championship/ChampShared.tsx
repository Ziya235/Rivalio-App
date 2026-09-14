import { mediaUrl } from "../../api/base";
import { teamInitialTone } from "../../lib/teamAvatar";

export function TeamCrest({
  name,
  logo,
  size = "md",
  className = "",
}: {
  name: string;
  logo?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim =
    size === "lg" ? "h-12 w-12 text-base" : size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  const imageSrc = mediaUrl(logo);
  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt=""
        className={`${dim} shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      className={`${dim} inline-flex shrink-0 items-center justify-center rounded-full font-bold ${teamInitialTone(name)} ${className}`}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function Pulse({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-gray-200/80 ${className}`} />
  );
}

export function ChampSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-52 animate-pulse rounded-2xl border border-gray-200 bg-white/60"
        />
      ))}
    </div>
  );
}

export function ChampionshipDetailSkeleton() {
  return (
    <div role="status" aria-label="Yüklənir" className="pb-8">
      <span className="sr-only">Yüklənir...</span>
      <div className="-mx-4 border-b border-emerald-100/80 bg-white/85 px-4 py-3 sm:-mx-6 sm:px-6">
        <div className="mb-3 flex items-center gap-2">
          <Pulse className="h-3 w-12" />
          <Pulse className="h-3 w-2" />
          <Pulse className="h-3 w-24" />
          <Pulse className="h-3 w-2" />
          <Pulse className="h-3 w-28" />
        </div>
        <Pulse className="mb-4 h-4 w-40" />
        <div className="flex items-start gap-4">
          <Pulse className="h-16 w-16 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-3 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <Pulse className="h-7 w-48 sm:w-72" />
              <Pulse className="h-5 w-16 rounded-full" />
              <Pulse className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Pulse className="h-3.5 w-28" />
              <Pulse className="h-3.5 w-36" />
              <Pulse className="h-3.5 w-24" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-2 overflow-hidden border-b border-gray-200 pb-px">
        {["w-24", "w-20", "w-20", "w-24", "w-20"].map((width, i) => (
          <Pulse key={i} className={`h-9 ${width} rounded-t-xl`} />
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm"
          >
            <Pulse className="h-6 w-6 rounded-md" />
            <Pulse className="mt-3 h-6 w-28" />
            <Pulse className="mt-2 h-3 w-16" />
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm"
          >
            <Pulse className="h-3 w-24" />
            <div className="mt-4 flex items-center gap-3">
              <Pulse className="h-8 w-8 rounded-full" />
              <Pulse className="h-4 flex-1" />
              <Pulse className="h-6 w-12" />
              <Pulse className="h-4 flex-1" />
              <Pulse className="h-8 w-8 rounded-full" />
            </div>
            <Pulse className="mx-auto mt-3 h-3 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChampError({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-10 text-center">
      <p className="text-sm font-medium text-rose-600">
        {message || "Çempionat məlumatlarını yükləmək mümkün olmadı."}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
        >
          Yenidən cəhd et
        </button>
      ) : null}
    </div>
  );
}

export function ChampEmpty({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white/70 px-5 py-12 text-center">
      <p className="text-base font-semibold text-gray-800">{title}</p>
      {hint ? <p className="mt-1 text-sm text-gray-500">{hint}</p> : null}
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 inline-flex rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
