export type ChampionshipTabId = "overview" | "groups" | "matches" | "playoff" | "scorers";

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
    <div className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
            active === tab.id ? "bg-ink text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
