import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MapPin, MessageCircle, UserPlus, UserCheck, Clock, Lock } from 'lucide-react'
import { Button, Badge, Tabs } from '../components/ui'
import { PLAYERS, LEAGUES, TEAMS } from '../data'

type FriendStatus = 'none' | 'sent' | 'friends'

export default function PlayerProfilePage() {
  const navigate = useNavigate()
  const { playerId = 'p1' } = useParams<{ playerId: string }>()
  const [tab, setTab] = useState('Profil')
  const [friendStatus, setFriendStatus] = useState<FriendStatus>('none')

  const player = PLAYERS.find((p) => p.id === playerId) || PLAYERS[0]
  const currentTeam = TEAMS.find((t) => t.name === player.team)

  const handleFriend = () => {
    if (friendStatus === 'none') setFriendStatus('sent')
  }

  return (
    <div className="bg-[#08080e] min-h-screen pt-24 pb-20">
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header Card */}
        <div className="bg-[#101017] card-border rounded-3xl overflow-hidden mb-6">
          {/* Cover gradient */}
          <div className="h-36 bg-gradient-to-r from-[#c5f135]/10 via-[#7c3aed]/10 to-[#3b82f6]/10 relative">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1000&h=200&fit=crop&auto=format')] bg-cover bg-center opacity-20" />
          </div>

          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 mb-5">
              <div className="relative">
                <img
                  src={player.avatar}
                  alt={player.name}
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-[#101017]"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#c5f135] rounded-full border-2 border-[#101017]" />
              </div>
              <div className="flex-1 pt-4 sm:pt-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <h1 className="font-display text-4xl font-800 text-white">{player.name}</h1>
                  <Badge variant={player.level === 'Yüksək' ? 'lime' : 'blue'}>{player.level}</Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-white/45 flex-wrap">
                  <span className="flex items-center gap-1"><MapPin size={12} />{player.city}</span>
                  <span>{player.sport}</span>
                  <span>{player.position}</span>
                  <span>Yaş: {player.age}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleFriend}
                  variant={friendStatus === 'friends' ? 'secondary' : 'outline'}
                  size="sm"
                  disabled={friendStatus === 'sent'}
                >
                  {friendStatus === 'none' ? <><UserPlus size={14} /> Dost əlavə et</> :
                   friendStatus === 'sent' ? <><Clock size={14} /> Gözlənilir</> :
                   <><UserCheck size={14} /> Dostlar</>}
                </Button>
                {friendStatus === 'friends' && (
                  <Button onClick={() => navigate('/chat')} size="sm">
                    <MessageCircle size={14} />
                    Mesaj
                  </Button>
                )}
              </div>
            </div>

            {player.bio && (
              <p className="text-white/55 text-sm leading-relaxed">{player.bio}</p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          tabs={['Profil', 'İdman Karyerası', 'Liqalar']}
          active={tab}
          onChange={setTab}
          className="mb-6"
        />

        {tab === 'Profil' && (
          <div className="grid sm:grid-cols-2 gap-5">
            {/* Stats */}
            <div className="bg-[#101017] card-border rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Statistika</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Oyun', value: player.games },
                  { label: 'Qol', value: player.goals, accent: true },
                  { label: 'Assist', value: player.assists },
                  { label: 'Sarı kart', value: player.yellowCards },
                ].map((s) => (
                  <div key={s.label} className="bg-[#0a0a11] rounded-xl p-3 text-center">
                    <div className={`font-display text-2xl font-700 ${s.accent ? 'text-[#c5f135]' : 'text-white'}`}>
                      {s.value}
                    </div>
                    <div className="text-white/40 text-xs">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Current team */}
            {currentTeam && (
              <div
                className="bg-[#101017] card-border rounded-2xl p-5 cursor-pointer hover-card"
                onClick={() => navigate(`/teams/${currentTeam.id}`)}
              >
                <h3 className="text-white font-semibold mb-3 text-sm">Cari komanda</h3>
                <div className="flex items-center gap-3">
                  <img src={currentTeam.logo} alt={currentTeam.name} className="w-12 h-12 rounded-xl object-cover" />
                  <div>
                    <div className="text-white font-semibold">{currentTeam.name}</div>
                    <div className="text-white/40 text-xs">{currentTeam.city} · {currentTeam.sport}</div>
                    <div className="text-xs text-[#c5f135] mt-0.5">{currentTeam.wins} qələbə</div>
                  </div>
                </div>
              </div>
            )}

            {/* Optional info */}
            <div className="bg-[#101017] card-border rounded-2xl p-5 sm:col-span-2">
              <h3 className="text-white font-semibold mb-3 text-sm">Məlumatlar</h3>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Şəhər', value: player.city },
                  { label: 'Yaş', value: player.age },
                  { label: 'Əsas idman', value: player.sport },
                  { label: 'Mövqe', value: player.position },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-white/40">{item.label}</span>
                    <span className="text-white font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'İdman Karyerası' && (
          <div className="space-y-5">
            {/* Current teams */}
            <div className="bg-[#101017] card-border rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Hazırkı komandalar</h3>
              {currentTeam ? (
                <div
                  className="flex items-center gap-3 cursor-pointer hover:bg-white/3 rounded-xl p-2 transition-colors"
                  onClick={() => navigate(`/teams/${currentTeam.id}`)}
                >
                  <img src={currentTeam.logo} alt={currentTeam.name} className="w-10 h-10 rounded-xl object-cover" />
                  <div className="flex-1">
                    <div className="text-white font-medium">{currentTeam.name}</div>
                    <div className="text-white/40 text-xs">{currentTeam.sport} · Aktiv</div>
                  </div>
                  <Badge variant="lime">Aktiv</Badge>
                </div>
              ) : (
                <div className="text-white/35 text-sm">Komanda yoxdur</div>
              )}
            </div>

            {/* Career stats */}
            <div className="bg-[#101017] card-border rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Karyera statistikası</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Ümumi oyun', value: player.games },
                  { label: 'Qol', value: player.goals },
                  { label: 'Assist', value: player.assists },
                  { label: 'Qələbə', value: Math.floor(player.games * 0.65) },
                ].map((s) => (
                  <div key={s.label} className="bg-[#0a0a11] rounded-xl p-3 text-center">
                    <div className="font-display text-2xl font-700 text-[#c5f135]">{s.value}</div>
                    <div className="text-white/40 text-xs">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'Liqalar' && (
          <div className="space-y-3">
            {LEAGUES.map((league) => (
              <div
                key={league.id}
                className={`bg-[#101017] card-border rounded-2xl p-4 ${league.isPublic ? 'hover-card cursor-pointer' : 'opacity-60'}`}
                onClick={() => league.isPublic && navigate(`/leagues/${league.id}`)}
              >
                <div className="flex items-center gap-3">
                  {league.isPublic ? (
                    <img src={league.logo} alt={league.name} className="w-10 h-10 rounded-xl object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                      <Lock size={16} className="text-white/30" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="text-white font-medium">{league.name}</div>
                    <div className="text-white/40 text-xs">{league.sport} · {league.season}</div>
                  </div>
                  <Badge variant={league.isPublic ? 'public' : 'private'}>
                    {league.isPublic ? 'Public' : 'Private'}
                  </Badge>
                </div>
                {!league.isPublic && (
                  <p className="text-xs text-white/25 mt-2">Bu liqaya giriş icazəniz yoxdur</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
