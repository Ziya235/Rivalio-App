import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, ChevronRight, Trophy, Users } from "lucide-react";
import { fetchVisibleChampionships } from "../../api/championships";
import {
  currentStageLabel,
  FORMAT_LABEL,
  formatChampDate,
  toUserFacingStatus,
} from "../../lib/championshipUi";
import type { ChampionshipListItem } from "../../types/championship";
import { Button, Card } from "../ui";
import { ChampEmpty, ChampError, ChampSkeleton, TeamCrest } from "./ChampShared";

function statusBadge(status: ChampionshipListItem["status"]) {
  const label = toUserFacingStatus(status);
  if (label === "Active") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }
  if (label === "Finished") {
    return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
  }
  return "bg-amber-50 text-amber-800 ring-1 ring-amber-200";
}

function ChampionshipCard({
  item,
  onOpen,
}: {
  item: ChampionshipListItem;
  onOpen: () => void;
}) {
  const userStatus = toUserFacingStatus(item.status);
  const stage = currentStageLabel(item.status, item.currentStage);
  const progress = item.progress;
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.finished / progress.total) * 100)
      : 0;

  return (
    <Card hover light className="flex h-full flex-col p-5" onClick={onOpen}>
      <div className="flex items-start gap-3">
        {item.logo ? (
          <img
            src={item.logo}
            alt=""
            className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-gray-200"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-sky-50 text-emerald-600 ring-1 ring-emerald-100">
            <Trophy size={22} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-display text-lg font-bold text-gray-900">
              {item.name}
            </h3>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadge(item.status)}`}
            >
              {userStatus}
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-gray-500">
            {FORMAT_LABEL[item.format]}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <Calendar size={13} className="text-sky-500" />
          {formatChampDate(item.startDate)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users size={13} className="text-emerald-500" />
          {item.teamCount} komanda
        </span>
      </div>

      {item.myTeams.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.myTeams.map((team) => (
            <span
              key={team.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
            >
              <TeamCrest name={team.name} logo={team.logo} size="sm" />
              {team.name}
            </span>
          ))}
        </div>
      ) : null}

      {progress && progress.total > 0 ? (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-gray-500">
            <span>
              {progress.finished}/{progress.total} oyun
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-4 text-[11px] text-gray-400">Oyun hələ başlamayıb</p>
      )}

      {userStatus === "Active" && stage ? (
        <p className="mt-3 text-xs font-semibold text-sky-700">
          Hazırkı mərhələ: {stage}
        </p>
      ) : null}

      <div className="mt-auto pt-4">
        <Button size="sm" className="w-full" onClick={onOpen}>
          Çempionata bax
          <ChevronRight size={14} />
        </Button>
      </div>
    </Card>
  );
}

export function ChampionshipList({
  onCreateTeam,
}: {
  onCreateTeam?: () => void;
}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ChampionshipListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchVisibleChampionships();
      setRows(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Çempionat məlumatlarını yükləmək mümkün olmadı.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <ChampSkeleton />;
  if (error) return <ChampError message={error} onRetry={() => void load()} />;
  if (rows.length === 0) {
    return (
      <ChampEmpty
        title="Henüz heç bir çempionatda iştirak etmirsiniz"
        hint="Komandanız çempionata əlavə olunduqda burada görünəcək."
        action={
          onCreateTeam
            ? { label: "Komanda yarat", onClick: onCreateTeam }
            : undefined
        }
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {rows.map((item) => (
        <ChampionshipCard
          key={item.id}
          item={item}
          onOpen={() =>
            navigate(`/sports/football/championships/${item.id}`)
          }
        />
      ))}
    </div>
  );
}
