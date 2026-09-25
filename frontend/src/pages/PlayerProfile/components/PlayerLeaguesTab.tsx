import { Badge } from '../../../components/ui'
import type { PlayerProfile } from '../../../api/players'
import { TeamLogo } from '../../Profile/components/TeamLogo'

export function PlayerLeaguesTab({
  light,
  leagues,
  onOpenLeague,
}: {
  light: boolean
  leagues: PlayerProfile['leagues']
  onOpenLeague: (id: number) => void
}) {
  const publicLeagues = leagues.filter((league) => league.visibility === 'PUBLIC')
  const privateLeagues = leagues.filter((league) => league.visibility === 'PRIVATE')

  return (
    <div className="space-y-6">
      {[
        { title: 'İctimai liqalar', list: publicLeagues },
        { title: 'Özəl liqalar', list: privateLeagues },
      ].map(({ title, list }) => (
        <div key={title}>
          <h3 className={`font-display text-xl font-700 mb-3 ${light ? 'text-gray-900' : 'text-white'}`}>
            {title}
          </h3>
          <div className="space-y-3">
            {list.length > 0 ? (
              list.map((league) => {
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
                        {league.season || '—'}
                      </div>
                    </div>
                    <Badge variant={isPublic ? 'public' : 'private'}>
                      {isPublic ? 'İctimai' : 'Özəl'}
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
