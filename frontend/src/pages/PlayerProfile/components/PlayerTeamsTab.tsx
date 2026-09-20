import type { PlayerProfile } from '../../../api/players'
import { TeamLogo } from '../../Profile/components/TeamLogo'

export function PlayerTeamsTab({
  light,
  teams,
  onOpenTeam,
}: {
  light: boolean
  teams: PlayerProfile['teams']
  onOpenTeam: (id: number) => void
}) {
  return (
    <div>
      <h3 className={`font-display text-xl font-700 mb-3 ${light ? 'text-gray-900' : 'text-white'}`}>
        Komandalar
      </h3>
      <div className="grid sm:grid-cols-2 gap-4">
        {teams.length > 0 ? (
          teams.map((team) => (
            <button
              type="button"
              key={team.playerId}
              className={`rounded-2xl p-4 flex items-center gap-3 text-left ${
                light
                  ? 'bg-white/70 backdrop-blur-sm border border-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all'
                  : 'bg-[#101017] card-border hover-card'
              }`}
              onClick={() => onOpenTeam(team.id)}
            >
              <TeamLogo src={team.logo} name={team.name} light={light} />
              <div className="min-w-0">
                <div className={`font-semibold truncate ${light ? 'text-gray-900' : 'text-white'}`}>
                  {team.name}
                </div>
                <div className={`text-xs ${light ? 'text-gray-400' : 'text-white/40'}`}>
                  {[team.city, team.position, team.shirtNumber != null ? `#${team.shirtNumber}` : null]
                    .filter(Boolean)
                    .join(' · ') || 'Aktiv oyunçu'}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className={`text-sm col-span-2 ${light ? 'text-gray-400' : 'text-white/30'}`}>Yoxdur</div>
        )}
      </div>
    </div>
  )
}
