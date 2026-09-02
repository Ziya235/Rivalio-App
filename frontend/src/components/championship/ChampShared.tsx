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
  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        className={`${dim} shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      className={`${dim} inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-50 font-bold text-emerald-600 ${className}`}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
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
