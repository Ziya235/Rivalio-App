import type { Championship } from "../../../../types/championship";
import {
  championshipPhase,
  championshipStatusLabel,
  competitionPhaseClass,
} from "../../../../lib/competitionStatus";
import type { ManagementTabId } from "../constants";

export function ChampionshipHeader({
  championship,
  tabs,
  activeTab,
  onTab,
}: {
  championship: Championship;
  tabs: { id: ManagementTabId; label: string }[];
  activeTab: ManagementTabId;
  onTab: (id: ManagementTabId) => void;
}) {
  const phase = championshipPhase(championship.status);

  return (
    <div className="mb-5 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${competitionPhaseClass(phase)}`}
        >
          {championshipStatusLabel(championship.status)}
        </span>
        <span
          className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${
            championship.visibility === "PUBLIC"
              ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
              : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
          }`}
        >
          {championship.visibility === "PUBLIC" ? "İctimai" : "Özəl"}
        </span>
        <span className="text-xs text-slate-400">{championship.sport?.name ?? "Futbol"}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTab(tab.id)}
            className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-ink text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
