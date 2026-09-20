import { LOGIN_STATS } from '../data'
import { BrandMark } from './BrandMark'

export function LoginHero() {
  return (
    <div className="relative hidden min-h-0 overflow-hidden lg:block">
      <img
        src="https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=900&h=700&fit=crop&auto=format"
        alt="Sports"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#08080e]/80 via-[#08080e]/50 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-end p-12">
        <div className="mb-4">
          <div className="mb-6">
            <BrandMark light={false} />
          </div>
          <h2 className="font-display text-5xl font-800 text-white leading-tight mb-3">
            Oyunun sənin
            <br />
            <span className="text-[#c5f135]">üçün başlasın</span>
          </h2>
          <p className="text-white/55 text-base max-w-sm">
            Rivalio-ya qoşul. Oyunçu tap, komanda qur, rəqib axtar.
          </p>
        </div>
        <div className="flex gap-4">
          {LOGIN_STATS.map((s) => (
            <div
              key={s}
              className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-xs text-white font-medium"
            >
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
