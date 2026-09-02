import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, Layers, Trophy, Users } from "lucide-react";
import {
  currentStageLabel,
  FORMAT_LABEL,
  formatChampDate,
  toUserFacingStatus,
} from "../../lib/championshipUi";
import type { ChampionshipListItem } from "../../types/championship";

function statusClass(status: ChampionshipListItem["status"]) {
  const label = toUserFacingStatus(status);
  if (label === "Active") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (label === "Finished") return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
  return "bg-amber-50 text-amber-800 ring-1 ring-amber-200";
}

export function ChampionshipHeader({
  championship,
}: {
  championship: ChampionshipListItem;
}) {
  const userStatus = toUserFacingStatus(championship.status);
  const stage = currentStageLabel(championship.status, championship.currentStage);

  return (
    <>
    <div className="sticky top-16 z-20 -mx-4 border-b border-emerald-100/80 bg-white/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <Link to="/sports/football" className="hover:text-emerald-600">
            Futbol
          </Link>
          <span>/</span>
          <Link
            to="/sports/football?tab=championships"
            className="hover:text-emerald-600"
          >
            Çempionatlar
          </Link>
          <span>/</span>
          <span className="font-medium text-gray-800">{championship.name}</span>
        </div>

        <Link
          to="/sports/football?tab=championships"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
        >
          <ArrowLeft size={15} />
          Çempionatlara qayıt
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {championship.logo ? (
            <img
              src={championship.logo}
              alt=""
              className="h-16 w-16 rounded-2xl object-cover ring-1 ring-gray-200"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-sky-50 text-emerald-600 ring-1 ring-emerald-100">
              <Trophy size={26} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">
                {championship.name}
              </h1>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(championship.status)}`}
              >
                {userStatus}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-medium text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={13} className="text-sky-500" />
                {formatChampDate(championship.startDate)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Layers size={13} className="text-violet-500" />
                {FORMAT_LABEL[championship.format]}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users size={13} className="text-emerald-500" />
                {championship.teamCount} komanda
              </span>
              {stage ? (
                <span className="inline-flex items-center gap-1.5 text-sky-700">
                  <Trophy size={13} />
                  {stage}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
    {championship.description ? (
      <p className="mx-auto mt-4 max-w-[1100px] text-sm text-gray-500">
        {championship.description}
      </p>
    ) : null}
  </>
  );
}
