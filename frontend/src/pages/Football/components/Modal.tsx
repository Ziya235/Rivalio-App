import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  light = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  light?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Bağla"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl shadow-2xl ${
          light
            ? "border border-gray-200 bg-white"
            : "border border-white/10 bg-[#101017]"
        }`}
      >
        <div className={`flex items-center justify-between border-b px-5 py-4 ${light ? "border-gray-200" : "border-white/8"}`}>
          <h2 className={`text-lg font-bold ${light ? "text-gray-900" : "text-white"}`}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg p-1.5 ${light ? "text-gray-400 hover:bg-gray-100 hover:text-gray-700" : "text-white/40 hover:bg-white/5 hover:text-white"}`}
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className={`flex items-center justify-end gap-3 border-t px-5 py-4 ${light ? "border-gray-200" : "border-white/8"}`}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
