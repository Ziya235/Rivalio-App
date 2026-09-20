import { STATS } from '../data'

export function StatsSection() {
  return (
    <section className="py-20 bg-[#0a0a11]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="bg-[#101017] card-border rounded-2xl p-6 text-center hover-card"
            >
              <div className="font-display text-5xl font-800 text-[#c5f135] mb-2 glow-lime-text">
                {s.value}
              </div>
              <div className="text-white/50 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
