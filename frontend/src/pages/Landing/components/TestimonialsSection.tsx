import { useOutletContext } from 'react-router-dom'
import { Star } from 'lucide-react'
import type { AppOutletContext } from '../../../App'
import { TESTIMONIALS } from '../data'

export function TestimonialsSection() {
  const { isDarkMode } = useOutletContext<AppOutletContext>()
  const accent = isDarkMode ? '#c5f135' : '#4d6b0b'

  return (
    <section className="py-24 bg-[#0a0a11]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="font-display text-5xl font-bold text-white mb-3">
            İstifadəçilər nə deyir?
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="bg-[#101017] card-border rounded-2xl p-6 hover-card">
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} size={14} fill={accent} color={accent} />
                ))}
              </div>
              <p className="text-white/70 text-sm leading-relaxed mb-5 italic">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <div className="text-white font-semibold text-sm">{t.name}</div>
                  <div className="text-white/40 text-xs">
                    {t.city} · {t.sport}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
