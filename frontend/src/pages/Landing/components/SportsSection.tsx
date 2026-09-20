import { useNavigate, useOutletContext } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { SPORTS } from '../../../data'
import type { AppOutletContext } from '../../../App'

export function SportsSection() {
  const navigate = useNavigate()
  const { isDarkMode } = useOutletContext<AppOutletContext>()

  return (
    <section className="py-24">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="font-display text-5xl font-bold text-white mb-3">İdman Növünü Seç</h2>
          <p className="text-white/45 text-base">5 fərqli idman üzrə oyunçular, komandalar və liqalar</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {SPORTS.map((sport) => {
            const isAvailable = sport.id === 'football'

            return (
              <div
                key={sport.id}
                className="group relative bg-[#101017] card-border rounded-2xl overflow-hidden hover-card text-left"
              >
                <div className="aspect-[4/3] relative overflow-hidden">
                  <img
                    src={sport.image}
                    alt={sport.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div
                    className={`absolute inset-0 bg-gradient-to-t ${
                      isDarkMode
                        ? 'from-[#08080e] via-[#08080e]/40 to-transparent'
                        : 'from-[#0f172a]/50 via-[#0f172a]/10 to-transparent'
                    }`}
                  />
                  <div
                    className="absolute top-3 left-3 w-8 h-8 rounded-xl flex items-center justify-center text-base"
                    style={{ background: sport.color + '22', border: `1px solid ${sport.color}44` }}
                  >
                    {sport.icon}
                  </div>
                </div>
                <div className="p-3.5">
                  <h3 className="font-display text-lg font-700 text-white mb-1">{sport.name}</h3>
                  <div className="text-xs text-white/40 mb-3">
                    {sport.players} oyunçu · {sport.teams > 0 ? `${sport.teams} komanda` : `${sport.games} oyun`}
                  </div>
                  <button
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => navigate(`/sports/${sport.id}`)}
                    className="text-xs font-semibold flex items-center gap-1 group-hover:gap-2 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    style={{ color: sport.color }}
                  >
                    {isAvailable ? (
                      <>
                        Kəşf Et <ArrowRight size={12} />
                      </>
                    ) : (
                      'Tezliklə'
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
