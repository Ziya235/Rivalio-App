import { MapPin, Plus, Users } from "lucide-react";
import { Button, Card } from "../../../components/ui";
import { mediaUrl } from "../../../api/base";
import type { TeamSummary } from "../../../api/teams";

export function TeamTab({
  light,
  myTeams,
  userId,
  onCreate,
  onOpenTeam,
}: {
  light: boolean;
  myTeams: TeamSummary[];
  userId: number;
  onCreate: () => void;
  onOpenTeam: (id: number) => void;
}) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className={`text-sm ${light ? "text-gray-500" : "text-white/45"}`}>
          Yaradığınız və ya üzvü olduğunuz komandalar
        </p>
        <Button size="sm" onClick={onCreate}>
          <Plus size={14} />
          Komanda yarat
        </Button>
      </div>

      {myTeams.length === 0 ? (
        <p className={`text-center py-10 ${light ? "text-gray-400" : "text-white/40"}`}>
          Hələ komandanız yoxdur. Yeni komanda yaradın.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {myTeams.map((team) => {
            const captain = team.captainId === userId;
            return (
              <Card
                key={team.id}
                hover
                light={light}
                className="p-5 cursor-pointer"
                onClick={() => onOpenTeam(team.id)}
              >
                <div className="flex items-start gap-3">
                  {team.logo ? (
                    <img
                      src={mediaUrl(team.logo)}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold shrink-0 ${light ? "bg-emerald-500/15 text-emerald-600" : "bg-[#c5f135]/15 text-[#c5f135]"}`}>
                      {team.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-semibold truncate ${light ? "text-gray-900" : "text-white"}`}>
                        {team.name}
                      </h3>
                      {captain ? (
                        <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${light ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" : "text-[#c5f135] bg-[#c5f135]/10 border-[#c5f135]/20"}`}>
                          Kapitan
                        </span>
                      ) : (
                        <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${light ? "text-gray-500 bg-gray-100 border-gray-200" : "text-white/50 bg-white/5 border-white/10"}`}>
                          Üzv
                        </span>
                      )}
                    </div>
                    <div className={`flex flex-wrap gap-3 text-xs mt-2 ${light ? "text-gray-400" : "text-white/45"}`}>
                      {team.city ? (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {team.city}
                        </span>
                      ) : null}
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {team._count?.players ?? "—"} oyunçu
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
