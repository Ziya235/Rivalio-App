import { mediaUrl } from "../../../../api/base";
import { teamInitialTone } from "../../../../lib/teamAvatar";

export function TeamMark({
  name,
  logo,
  align = "left",
  size = "md",
  badge,
}: {
  name: string;
  logo: string | null;
  align?: "left" | "right";
  size?: "sm" | "md";
  badge?: string | null;
}) {
  const dim = size === "sm" ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs";
  const mark = logo ? (
    <img src={mediaUrl(logo)} alt="" className={`${dim} shrink-0 rounded-full object-cover`} />
  ) : (
    <span
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full font-bold ${teamInitialTone(name)}`}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );

  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      {mark}
      {badge ? (
        <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded bg-slate-800 px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      ) : null}
      <span className="truncate font-semibold text-ink">{name}</span>
    </div>
  );
}
