import type { MessagePart } from "../lib/notificationDisplay";

export function NotificationMessage({
  parts,
  mutedClass,
}: {
  parts: MessagePart[];
  mutedClass: string;
}) {
  return (
    <>
      {parts.map((part, index) => (
        <span
          key={index}
          className={part.strong ? "font-semibold" : mutedClass}
        >
          {part.text}
        </span>
      ))}
    </>
  );
}
