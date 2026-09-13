import { formatNotificationDate } from "../lib/notificationDisplay";

type NotificationTimeProps = {
  value: string;
  light?: boolean;
  className?: string;
};

export function NotificationTime({
  value,
  light = false,
  className = "",
}: NotificationTimeProps) {
  const formatted = formatNotificationDate(value);
  if (!formatted) return null;
  const [day, time] = formatted.split("  ");

  return (
    <time
      dateTime={value}
      className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] tabular-nums tracking-wide ${
        light
          ? "bg-slate-900/[0.05] text-slate-500"
          : "bg-white/[0.06] text-white/45"
      } ${className}`}
    >
      <span>{day}</span>
      <span className={light ? "text-slate-300" : "text-white/20"}>·</span>
      <span className={light ? "text-slate-700" : "text-white/75"}>{time}</span>
    </time>
  );
}
