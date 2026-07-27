import { useNavigate, useParams } from 'react-router-dom'
import { Swords, Users, Trophy, MapPin, ArrowRight } from 'lucide-react'
import { Button, Badge, Card } from '../components/ui'
import { SPORTS, PLAYERS, MATCHES } from '../data'

export default function SportGenericPage() {
  const navigate = useNavigate()
  const { sport = '' } = useParams<{ sport: string }>()
  const sportData = SPORTS.find((s) => s.id === sport)
  if (!sportData) return null

  const sportPlayers = PLAYERS.filter((p) => p.sport === sportData.name)

  return (
    <div className="bg-[#08080e] min-h-screen pt-16">
      {/* Cover */}
      <div className="relative h-64 sm:h-80 overflow-hidden">
        <img
          src={sportData.image}
          alt={sportData.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080e] via-[#08080e]/50 to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <div className="flex items-end gap-4 flex-wrap">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: sportData.color + '18', border: `1px solid ${sportData.color}40` }}
              >
                {sportData.icon}
              </div>
              <div>
                <h1 className="font-display text-5xl font-800 text-white">{sportData.name}</h1>
                <p className="text-white/50 text-sm">
                  {sportData.players} oyunçu ·{' '}
                  {sportData.teams > 0 ? `${sportData.teams} komanda · ` : ''}
                  {sportData.leagues} liqa
                </p>
              </div>
              <div className="ml-auto">
                <Button onClick={() => navigate('/find-opponent')} size="sm">
                  <Swords size={14} />
                  Oyun tap
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          {[
            { label: 'Aktiv oyunçular', value: sportData.players, icon: Users, color: sportData.color },
            { label: 'Aktiv oyunlar', value: sportData.games, icon: Swords, color: '#f97316' },
            { label: 'Liqalar', value: sportData.leagues, icon: Trophy, color: '#a855f7' },
            { label: 'Komandalar', value: sportData.teams || '—', icon: Users, color: '#3b82f6' },
          ].map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="bg-[#101017] card-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} style={{ color: s.color }} />
                  <span className="text-xs text-white/40">{s.label}</span>
                </div>
                <div className="font-display text-2xl font-700 text-white">{s.value}</div>
              </div>
            )
          })}
        </div>

        {/* Players section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-3xl font-700 text-white">Oyunçular</h2>
          </div>
          {sportPlayers.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {sportPlayers.map((player) => (
                <Card
                  key={player.id}
                  hover
                  className="p-5"
                  onClick={() => navigate(`/players/${player.id}`)}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <img src={player.avatar} alt={player.name} className="w-12 h-12 rounded-xl object-cover" />
                    <div>
                      <div className="text-white font-semibold text-sm">{player.name}</div>
                      <div className="text-white/40 text-xs">{player.position}</div>
                      <div className="flex items-center gap-1 text-xs text-white/30 mt-0.5">
                        <MapPin size={9} />
                        {player.city}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 text-center mb-3">
                    <div className="flex-1">
                      <div className="text-white font-bold text-sm">{player.games}</div>
                      <div className="text-white/35 text-[10px]">Oyun</div>
                    </div>
                    {player.goals > 0 && (
                      <div className="flex-1">
                        <div className="text-[#c5f135] font-bold text-sm">{player.goals}</div>
                        <div className="text-white/35 text-[10px]">Qol</div>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-white font-bold text-sm">{player.assists}</div>
                      <div className="text-white/35 text-[10px]">Assist</div>
                    </div>
                  </div>
                  <Badge variant={player.level === 'Yüksək' ? 'lime' : 'blue'}>{player.level}</Badge>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-[#101017] card-border rounded-2xl p-10 text-center">
              <div className="text-4xl mb-3">{sportData.icon}</div>
              <div className="text-white/50 mb-2">Bu idman üzrə oyunçular tezliklə görünəcək</div>
              <Button onClick={() => navigate('/register')} size="sm" variant="outline">
                <ArrowRight size={14} />
                Qoşul
              </Button>
            </div>
          )}
        </div>

        {/* Matches */}
        <div>
          <h2 className="font-display text-3xl font-700 text-white mb-5">Son Oyunlar</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {MATCHES.filter((m) => m.sport === 'Futbol').slice(0, 2).map((m) => (
              <div key={m.id} className="bg-[#101017] card-border rounded-2xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 text-right">
                    <div className="text-white font-semibold text-sm">{m.home}</div>
                  </div>
                  <div className="text-center px-3">
                    {m.status === 'finished' ? (
                      <div className="font-display text-2xl font-800 text-white">
                        {m.homeScore} – {m.awayScore}
                      </div>
                    ) : (
                      <div className="font-display text-xl font-700 text-white/30">vs</div>
                    )}
                    <Badge variant={m.status === 'finished' ? 'accepted' : 'pending'}>
                      {m.status === 'finished' ? 'Bitdi' : 'Gözlənilir'}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-semibold text-sm">{m.away}</div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-white/30 text-center">{m.date}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
