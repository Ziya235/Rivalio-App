import type { ChampionshipGroup } from "../../../../types/championship";

export type GroupCardInfo = {
  id: number;
  name: string;
  leader: string | null;
  doneRounds: number;
  totalRounds: number;
};

export function GroupSelector({
  groups,
  cards,
  activeId,
  onSelect,
}: {
  groups: ChampionshipGroup[];
  cards: GroupCardInfo[];
  activeId: number | null;
  onSelect: (id: number) => void;
}) {
  const info = new Map(cards.map((card) => [card.id, card]));

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex w-max min-w-full gap-3">
        {groups.map((group) => {
          const card = info.get(group.id);
          const selected = group.id === activeId;
          const progress =
            card && card.totalRounds > 0
              ? `${card.doneRounds}/${card.totalRounds} tur`
              : "0 tur";
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onSelect(group.id)}
              className={`flex min-w-[14rem] flex-1 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                selected
                  ? "border-lime-300 bg-lime-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold text-ink">{group.name}</span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  Lider: {card?.leader ?? "—"}
                </span>
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${
                  selected ? "bg-lime-200/80 text-lime-900" : "bg-slate-100 text-slate-500"
                }`}
              >
                {progress}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
