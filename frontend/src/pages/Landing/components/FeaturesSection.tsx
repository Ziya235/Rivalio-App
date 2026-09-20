import { FEATURES } from '../data'

export function FeaturesSection() {
  return (
    <section className="py-24 bg-[#0a0a11]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="font-display text-5xl font-bold text-white mb-3">
            Rivalio ilə nələr edə bilərsən?
          </h2>
          <p className="text-white/45 text-base max-w-xl mx-auto">
            Sadəcə oyun deyil — oyunçu tapmaqdan liqaya qoşulmağa qədər hər şey bir yerdə.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="bg-[#101017] card-border rounded-2xl p-5 hover-card group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ background: f.color + '18', border: `1px solid ${f.color}30` }}
                >
                  <Icon size={18} style={{ color: f.color }} />
                </div>
                <h3 className="text-white font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
