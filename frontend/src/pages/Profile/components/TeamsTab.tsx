import type { TeamSummary } from '../../../api/teams'
import { TeamLogo } from './TeamLogo'

export function TeamsTab({
  light,
  loading,
  error,
  captainTeams,
  memberTeams,
  onOpenTeam,
}: {
  light: boolean
  loading: boolean
  error: string | null
  captainTeams: TeamSummary[]
  memberTeams: TeamSummary[]
  onOpenTeam: (id: number) => void
}) {
  if (loading) {
    return <p className={`text-sm ${light ? 'text-gray-400' : 'text-white/40'}`}>Yüklənir...</p>
  }
  if (error) {
    return <p className="text-sm text-red-400">{error}</p>
  }

  return (
    <div className="space-y-6">
      {[
        { title: 'Kapitan olduğum komandalar', teams: captainTeams },
        { title: 'Üzv olduğum komandalar', teams: memberTeams },
      ].map(({ title, teams }) => (
        <div key={title}>
          <h3 className={`font-display text-xl font-700 mb-3 ${light ? 'text-gray-900' : 'text-white'}`}>
            {title}
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {teams.length > 0 ? (
              teams.map((team) => (
                <button
                  type="button"
                  key={team.id}
                  className={`rounded-2xl p-4 flex items-center gap-3 text-left ${
                    light
                      ? 'bg-white/70 backdrop-blur-sm border border-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all'
                      : 'bg-[#101017] card-border hover-card'
                  }`}
                  onClick={() => onOpenTeam(team.id)}
                >
                  <TeamLogo src={team.logo} name={team.name} light={light} />
                  <div>
                    <div className={`font-semibold ${light ? 'text-gray-900' : 'text-white'}`}>
                      {team.name}
                    </div>
                    <div className={`text-xs ${light ? 'text-gray-400' : 'text-white/40'}`}>
                      {team.city ? `${team.city} · ` : ''}
                      {team._count?.players ?? 0} üzv
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className={`text-sm col-span-2 ${light ? 'text-gray-400' : 'text-white/30'}`}>
                Yoxdur
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
