export type ChampionshipTabId =
  | "overview"
  | "groups"
  | "playoff"
  | "scorers"
  | "matches";

export function ChampionshipTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: ChampionshipTabId; label: string }[];
  active: ChampionshipTabId;
  onChange: (id: ChampionshipTabId) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-gray-200 pb-px">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`shrink-0 whitespace-nowrap rounded-t-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            active === tab.id
              ? "border-b-2 border-emerald-500 text-emerald-600"
              : "text-gray-400 hover:text-gray-700"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
