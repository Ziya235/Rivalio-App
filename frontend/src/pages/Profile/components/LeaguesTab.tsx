import { Badge } from '../../../components/ui'
import type { League } from '../../../types/league'
import { TeamLogo } from './TeamLogo'

export function LeaguesTab({
  light,
  loading,
  error,
  publicLeagues,
  privateLeagues,
  onOpenLeague,
}: {
  light: boolean
  loading: boolean
  error: string | null
  publicLeagues: League[]
  privateLeagues: League[]
  onOpenLeague: (id: number) => void
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
        { title: 'Public liqalar', leagues: publicLeagues },
        { title: 'Private liqalar', leagues: privateLeagues },
      ].map(({ title, leagues }) => (
        <div key={title}>
          <h3 className={`font-display text-xl font-700 mb-3 ${light ? 'text-gray-900' : 'text-white'}`}>
            {title}
          </h3>
          <div className="space-y-3">
            {leagues.length > 0 ? (
              leagues.map((league) => {
                const isPublic = league.visibility === 'PUBLIC'
                return (
                  <button
                    type="button"
                    key={league.id}
                    className={`w-full rounded-2xl p-4 flex items-center gap-3 text-left ${
                      light
                        ? 'bg-white/70 backdrop-blur-sm border border-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all'
                        : 'bg-[#101017] card-border hover-card'
                    }`}
                    onClick={() => onOpenLeague(league.id)}
                  >
                    <TeamLogo src={league.logo} name={league.name} light={light} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium truncate ${light ? 'text-gray-900' : 'text-white'}`}>
                        {league.name}
                      </div>
                      <div className={`text-xs ${light ? 'text-gray-400' : 'text-white/40'}`}>
                        {league.sport?.name ?? 'Liqa'}
                        {league.season ? ` · ${league.season}` : ''}
                      </div>
                    </div>
                    <Badge variant={isPublic ? 'public' : 'private'}>
                      {isPublic ? 'Public' : 'Private'}
                    </Badge>
                  </button>
                )
              })
            ) : (
              <div className={`text-sm ${light ? 'text-gray-400' : 'text-white/30'}`}>Yoxdur</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
