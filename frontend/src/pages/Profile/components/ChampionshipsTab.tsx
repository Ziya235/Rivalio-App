import { Badge } from '../../../components/ui'
import { userFacingChampLabel } from '../../../lib/championshipUi'
import type { ChampionshipListItem } from '../../../types/championship'
import { TeamLogo } from './TeamLogo'

export function ChampionshipsTab({
  light,
  loading,
  error,
  items,
  onOpen,
}: {
  light: boolean
  loading: boolean
  error: string | null
  items: ChampionshipListItem[]
  onOpen: (id: number) => void
}) {
  if (loading) {
    return <p className={`text-sm ${light ? 'text-gray-400' : 'text-white/40'}`}>Yüklənir...</p>
  }
  if (error) {
    return <p className="text-sm text-red-400">{error}</p>
  }

  const publicItems = items.filter((c) => c.visibility !== 'PRIVATE')
  const privateItems = items.filter((c) => c.visibility === 'PRIVATE')

  return (
    <div className="space-y-6">
      {[
        { title: 'İctimai çempionatlar', list: publicItems },
        { title: 'Özəl çempionatlar', list: privateItems },
      ].map(({ title, list }) => (
        <div key={title}>
          <h3 className={`font-display text-xl font-700 mb-3 ${light ? 'text-gray-900' : 'text-white'}`}>
            {title}
          </h3>
          <div className="space-y-3">
            {list.length > 0 ? (
              list.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`w-full rounded-2xl p-4 flex items-center gap-3 text-left ${
                    light
                      ? 'bg-white/70 backdrop-blur-sm border border-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all'
                      : 'bg-[#101017] card-border hover-card'
                  }`}
                  onClick={() => onOpen(item.id)}
                >
                  <TeamLogo src={item.logo} name={item.name} light={light} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate ${light ? 'text-gray-900' : 'text-white'}`}>
                      {item.name}
                    </div>
                    <div className={`text-xs ${light ? 'text-gray-400' : 'text-white/40'}`}>
                      {userFacingChampLabel(item.status)}
                      {item.teamCount != null ? ` · ${item.teamCount} komanda` : ''}
                    </div>
                  </div>
                  <Badge variant={item.visibility === 'PUBLIC' ? 'public' : 'private'}>
                    {item.visibility === 'PUBLIC' ? 'İctimai' : 'Özəl'}
                  </Badge>
                </button>
              ))
            ) : (
              <div className={`text-sm ${light ? 'text-gray-400' : 'text-white/30'}`}>Yoxdur</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
