import type { LucideIcon } from "lucide-react";

export function MetaChip({
  light,
  icon: Icon,
  label,
  value,
}: {
  light: boolean;
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div
      className={`inline-flex min-w-0 max-w-full items-center gap-2.5 rounded-xl border px-2.5 py-1.5 ${
        light
          ? "border-gray-200/80 bg-white shadow-sm"
          : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          light ? "bg-emerald-50 text-emerald-600" : "bg-[#c5f135]/12 text-[#c5f135]"
        }`}
      >
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <p
          className={`text-[10px] font-semibold uppercase tracking-wider ${
            light ? "text-gray-400" : "text-white/35"
          }`}
        >
          {label}
        </p>
        <p
          title={value}
          className={`truncate text-sm font-semibold tabular-nums ${
            light ? "text-gray-800" : "text-white/90"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
