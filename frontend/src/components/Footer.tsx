import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-[#08080e] border-t border-white/7 pt-16 pb-8">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10 mb-14">
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#c5f135] flex items-center justify-center font-display font-bold text-[#08080e] text-sm">
                R
              </div>
              <span className="font-display font-700 text-xl text-white">
                Rival<span className="text-[#c5f135]">io</span>
              </span>
            </Link>
            <p className="text-sm text-white/40 leading-relaxed mb-4 max-w-[200px]">
              Oyunçu, komanda, rəqib və idman partnyoru tapmaq üçün sosial idman platforması.
            </p>
            <div className="flex gap-3">
              {['IG', 'YT', 'TT', 'IN'].map((s) => (
                <a
                  key={s}
                  href="#"
                  aria-label={s}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-[#c5f135]/10 hover:text-[#c5f135] text-white/40 flex items-center justify-center transition-all text-[10px] font-bold"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Məhsul</h4>
            <ul className="flex flex-col gap-3">
              {['İdmanlar', 'Komandalar', 'Oyunlar', 'Oyunçular', 'Liqalar'].map((item) => (
                <li key={item}>
                  <Link to="/sports" className="text-sm text-white/40 hover:text-white transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Şirkət</h4>
            <ul className="flex flex-col gap-3">
              {['Haqqımızda', 'Əlaqə', 'Karyera'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-white/40 hover:text-white transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Dəstək</h4>
            <ul className="flex flex-col gap-3">
              {['FAQ', 'Yardım Mərkəzi', 'İcma Qaydaları', 'Məxfilik Siyasəti', 'İstifadə Şərtləri'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-white/40 hover:text-white transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/7 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/30">© 2026 Rivalio. Bütün hüquqlar qorunur.</p>
          <div className="flex items-center gap-4">
            <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/50 cursor-pointer">
              <option>🇦🇿 Azərbaycan</option>
              <option>🇬🇧 English</option>
              <option>🇷🇺 Русский</option>
            </select>
          </div>
        </div>
      </div>
    </footer>
  )
}
