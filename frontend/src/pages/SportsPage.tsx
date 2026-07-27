import { useNavigate } from 'react-router-dom'
import { ArrowRight, Users, Trophy, Swords } from 'lucide-react'
import { Button, Badge } from '../components/ui'
import { SPORTS } from '../data'

export default function SportsPage() {
  const navigate = useNavigate()
  return (
    <div className="bg-[#08080e] min-h-screen pt-24 pb-20">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#c5f135]/8 border border-[#c5f135]/20 rounded-full mb-4">
            <span className="w-1.5 h-1.5 bg-[#c5f135] rounded-full" />
            <span className="text-xs font-semibold text-[#c5f135]">5 aktiv idman növü</span>
          </div>
          <h1 className="font-display text-6xl font-bold text-white mb-3">İdman Növləri</h1>
          <p className="text-white/45 text-lg max-w-xl">
            Oynadığın idman növünü seç, oyunçuları tap, komandalar qur, liqalara qoşul.
          </p>
        </div>

        {/* Sports Grid */}
        <div className="flex flex-col gap-6">
          {SPORTS.map((sport) => (
            <div
              key={sport.id}
              className="group bg-[#101017] card-border rounded-3xl overflow-hidden hover-card"
            >
              <div className="grid lg:grid-cols-[1fr_auto] gap-0">
                {/* Left content */}
                <div className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                      style={{ background: sport.color + '18', border: `1px solid ${sport.color}30` }}
                    >
                      {sport.icon}
                    </div>
                    <div>
                      <h2 className="font-display text-4xl font-800 text-white mb-1">{sport.name}</h2>
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant="lime">{sport.players} oyunçu</Badge>
                        {sport.teams > 0 && <Badge variant="blue">{sport.teams} komanda</Badge>}
                        <Badge variant="orange">{sport.games} oyun</Badge>
                        <Badge variant="purple">{sport.leagues} liqa</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-[#0a0a11] rounded-xl p-4 border border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <Users size={14} className="text-[#c5f135]" />
                        <span className="text-xs text-white/40">Oyunçular</span>
                      </div>
                      <div className="font-display text-2xl font-700 text-white">{sport.players}</div>
                    </div>
                    <div className="bg-[#0a0a11] rounded-xl p-4 border border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <Users size={14} className="text-blue-400" />
                        <span className="text-xs text-white/40">Komandalar</span>
                      </div>
                      <div className="font-display text-2xl font-700 text-white">
                        {sport.teams > 0 ? sport.teams : '—'}
                      </div>
                    </div>
                    <div className="bg-[#0a0a11] rounded-xl p-4 border border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <Swords size={14} className="text-orange-400" />
                        <span className="text-xs text-white/40">Aktiv oyunlar</span>
                      </div>
                      <div className="font-display text-2xl font-700 text-white">{sport.games}</div>
                    </div>
                    <div className="bg-[#0a0a11] rounded-xl p-4 border border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy size={14} className="text-purple-400" />
                        <span className="text-xs text-white/40">Liqalar</span>
                      </div>
                      <div className="font-display text-2xl font-700 text-white">{sport.leagues}</div>
                    </div>
                  </div>

                  <Button onClick={() => navigate(`/sports/${sport.id}`)} size="lg">
                    İdmana keç
                    <ArrowRight size={18} />
                  </Button>
                </div>

                {/* Right: Image */}
                <div className="relative lg:w-[380px] h-48 lg:h-auto overflow-hidden">
                  <img
                    src={sport.image}
                    alt={sport.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#101017] via-transparent to-transparent lg:bg-gradient-to-l" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
