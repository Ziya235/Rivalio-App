import { Plus } from "lucide-react";

export function CreateChampionshipButton({
  onClick,
  className = "shadow-sm",
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-ink hover:bg-brand-dark ${className}`}
    >
      <Plus className="h-4 w-4" />
      Çempionat yarat
    </button>
  );
}
