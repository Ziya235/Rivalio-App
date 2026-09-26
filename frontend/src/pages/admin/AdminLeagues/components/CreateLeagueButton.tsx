import { Plus } from "lucide-react";

export function CreateLeagueButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-ink shadow-sm hover:bg-brand-dark"
    >
      <Plus className="h-4 w-4" />
      Liqa yarat
    </button>
  );
}
