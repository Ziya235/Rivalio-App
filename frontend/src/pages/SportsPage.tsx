import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  ArrowRight,
  Users,
  Gamepad2,
  Trophy,
  Shield,
} from 'lucide-react'

import { Button, Badge } from '../components/ui'
import { SPORTS1 } from '../data'
import type { AppOutletContext } from '../App'

export default function SportsPage() {
  const navigate = useNavigate()
  const { isDarkMode } = useOutletContext<AppOutletContext>()

  const light = !isDarkMode

  return (
    <div
      className={`min-h-screen pt-24 pb-20 ${
        light
          ? '[background:linear-gradient(135deg,#E8FFF3_0%,#EAF8FF_48%,#F2EDFF_100%)]'
          : 'bg-[#08080e]'
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-14">
          {/* <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 ${
              light
                ? 'bg-emerald-500/10 border border-emerald-500/20'
                : 'bg-[#c5f135]/8 border border-[#c5f135]/20'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                light ? 'bg-emerald-500' : 'bg-[#c5f135]'
              }`}
            />

            <span
              className={`text-xs font-semibold ${
                light ? 'text-emerald-600' : 'text-[#c5f135]'
              }`}
            >
              {SPORTS1.length} aktiv idman növü
            </span>
          </div> */}

          <h1
            className={`font-display text-5xl sm:text-6xl font-bold mb-3 ${
              light ? 'text-gray-900' : 'text-white'
            }`}
          >
            İdman Növləri
          </h1>

          <p
            className={`text-lg max-w-xl ${
              light ? 'text-gray-500' : 'text-white/45'
            }`}
          >
            Sevdiyin idmanı seç, oyunçuları tap, komandalar qur və
            rəqabətə qoşul.
          </p>
        </div>

        {/* Sports */}
        <div className="flex flex-col gap-6">
          {SPORTS1.map((sport) => (
            <div
              key={sport.id}
              className={`group rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                light
                  ? 'bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_10px_40px_rgba(15,23,42,0.06)] hover:shadow-[0_20px_60px_rgba(15,23,42,0.1)]'
                  : 'bg-[#101017] border border-white/5 hover:border-white/10'
              }`}
            >
              <div className="grid lg:grid-cols-[1fr_380px]">
                {/* Content */}
                <div className="p-6 sm:p-8">
                  {/* Sport title */}
                  <div className="flex items-start gap-4 mb-7">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                      style={{
                        background: `${sport.color}18`,
                        border: `1px solid ${sport.color}30`,
                      }}
                    >
                      {sport.icon}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <h2
                          className={`font-display text-3xl sm:text-4xl font-bold ${
                            light ? 'text-gray-900' : 'text-white'
                          }`}
                        >
                          {sport.name}
                        </h2>

                        <Badge variant="lime">{sport.status}</Badge>
                      </div>

                      <p
                        className={`text-sm sm:text-base leading-relaxed max-w-xl ${
                          light ? 'text-gray-500' : 'text-white/45'
                        }`}
                      >
                        {sport.description}
                      </p>
                    </div>
                  </div>

                  {/* Information Boxes */}
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-7">
                    <div
                      className={`rounded-2xl p-4 border transition-colors ${
                        light
                          ? 'bg-white/60 border-gray-200/70'
                          : 'bg-[#0a0a11] border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Gamepad2 size={15} style={{ color: sport.color }} />
                        <span className={`text-xs ${light ? 'text-gray-400' : 'text-white/40'}`}>
                          Oyun formatı
                        </span>
                      </div>
                      <div className={`font-display text-lg sm:text-xl font-bold ${light ? 'text-gray-900' : 'text-white'}`}>
                        {sport.teamSize}
                      </div>
                    </div>

                    <div
                      className={`rounded-2xl p-4 border transition-colors ${
                        light
                          ? 'bg-white/60 border-gray-200/70'
                          : 'bg-[#0a0a11] border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Users size={15} className="text-emerald-500" />
                        <span className={`text-xs ${light ? 'text-gray-400' : 'text-white/40'}`}>
                          Aktiv oyunçular
                        </span>
                      </div>
                      <div className={`font-display text-2xl font-bold ${light ? 'text-gray-900' : 'text-white'}`}>
                        {sport.players.toLocaleString()}
                      </div>
                    </div>

                    <div
                      className={`rounded-2xl p-4 border transition-colors ${
                        light
                          ? 'bg-white/60 border-gray-200/70'
                          : 'bg-[#0a0a11] border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Shield size={15} className="text-blue-400" />
                        <span className={`text-xs ${light ? 'text-gray-400' : 'text-white/40'}`}>
                          Komandalar
                        </span>
                      </div>
                      <div className={`font-display text-2xl font-bold ${light ? 'text-gray-900' : 'text-white'}`}>
                        {sport.teams}
                      </div>
                    </div>

                    <div
                      className={`rounded-2xl p-4 border transition-colors ${
                        light
                          ? 'bg-white/60 border-gray-200/70'
                          : 'bg-[#0a0a11] border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy size={15} className="text-purple-400" />
                        <span className={`text-xs ${light ? 'text-gray-400' : 'text-white/40'}`}>
                          Liqalar
                        </span>
                      </div>
                      <div className={`font-display text-2xl font-bold ${light ? 'text-gray-900' : 'text-white'}`}>
                        {sport.leagues}
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <Button
                    onClick={() => navigate(`/sports/${sport.id}`)}
                    size="lg"
                  >
                    {sport.name} bölməsinə keç
                    <ArrowRight size={18} />
                  </Button>
                </div>

                {/* Image */}
                <div className="relative h-[240px] lg:h-auto min-h-[280px] overflow-hidden">
                  <img
                    src={sport.image}
                    alt={sport.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />

                  {/* Desktop blend */}
                  <div
                    className={`hidden lg:block absolute inset-0 ${
                      light
                        ? 'bg-gradient-to-r from-white/60 via-white/5 to-transparent'
                        : 'bg-gradient-to-r from-[#101017]/80 via-[#101017]/10 to-transparent'
                    }`}
                  />

                  {/* Mobile blend */}
                  <div
                    className={`lg:hidden absolute inset-0 ${
                      light
                        ? 'bg-gradient-to-b from-transparent via-transparent to-white/20'
                        : 'bg-gradient-to-b from-transparent via-transparent to-[#101017]/50'
                    }`}
                  />

                  {/* Sport floating icon */}
                  <div
                    className={`absolute bottom-5 right-5 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-md border ${
                      light
                        ? 'bg-white/70 border-white/80 shadow-lg'
                        : 'bg-black/30 border-white/10'
                    }`}
                  >
                    {sport.icon}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}