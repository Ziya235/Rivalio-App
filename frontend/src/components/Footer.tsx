import { Link } from 'react-router-dom'

type FooterProps = {
  isLightMode?: boolean
}

export default function Footer({ isLightMode = false }: FooterProps) {
  return (
    <footer className={`${isLightMode ? '[background:linear-gradient(135deg,#ddf4ff_0%,#e4eeff_50%,#ede6ff_100%)] border-gray-200/60' : 'bg-[#08080e] border-white/7'} border-t pt-16 pb-8`}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10 mb-14">
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-sm ${isLightMode ? 'bg-[#08080e] text-[#c5f135]' : 'bg-[#c5f135] text-[#08080e]'}`}>
                R
              </div>
              <span className={`font-display font-700 text-xl ${isLightMode ? 'text-gray-900' : 'text-white'}`}>
                Rival<span className="text-[#c5f135]">io</span>
              </span>
            </Link>
            <p className={`text-sm leading-relaxed mb-4 max-w-[200px] ${isLightMode ? 'text-gray-500' : 'text-white/40'}`}>
              Oyunçu, komanda, rəqib və idman partnyoru tapmaq üçün sosial idman platforması.
            </p>
            <div className="flex gap-3">
              {['IG', 'YT', 'TT', 'IN'].map((s) => (
                <a
                  key={s}
                  href="#"
                  aria-label={s}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all text-[10px] font-bold ${isLightMode ? 'bg-gray-100 text-gray-400 hover:bg-[#c5f135]/10 hover:text-[#c5f135]' : 'bg-white/5 hover:bg-[#c5f135]/10 hover:text-[#c5f135] text-white/40'}`}
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className={`font-semibold text-sm mb-4 ${isLightMode ? 'text-gray-900' : 'text-white'}`}>Məhsul</h4>
            <ul className="flex flex-col gap-3">
              {['İdmanlar', 'Komandalar', 'Oyunlar', 'Oyunçular', 'Liqalar'].map((item) => (
                <li key={item}>
                  <Link to="/sports" className={`text-sm transition-colors ${isLightMode ? 'text-gray-500 hover:text-gray-900' : 'text-white/40 hover:text-white'}`}>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className={`font-semibold text-sm mb-4 ${isLightMode ? 'text-gray-900' : 'text-white'}`}>Şirkət</h4>
            <ul className="flex flex-col gap-3">
              <li>
                <Link to="/about-us" className={`text-sm transition-colors ${isLightMode ? 'text-gray-500 hover:text-gray-900' : 'text-white/40 hover:text-white'}`}>
                  Haqqımızda
                </Link>
              </li>
              {['Əlaqə', 'Karyera'].map((item) => (
                <li key={item}>
                  <a href="#" className={`text-sm transition-colors ${isLightMode ? 'text-gray-500 hover:text-gray-900' : 'text-white/40 hover:text-white'}`}>
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className={`font-semibold text-sm mb-4 ${isLightMode ? 'text-gray-900' : 'text-white'}`}>Dəstək</h4>
            <ul className="flex flex-col gap-3">
              <li>
                <Link to="/faq" className={`text-sm transition-colors ${isLightMode ? 'text-gray-500 hover:text-gray-900' : 'text-white/40 hover:text-white'}`}>
                  FAQ
                </Link>
              </li>
              {['Yardım Mərkəzi', 'İcma Qaydaları', 'Məxfilik Siyasəti', 'İstifadə Şərtləri'].map((item) => (
                <li key={item}>
                  <a href="#" className={`text-sm transition-colors ${isLightMode ? 'text-gray-500 hover:text-gray-900' : 'text-white/40 hover:text-white'}`}>
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={`border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 ${isLightMode ? 'border-gray-200' : 'border-white/7'}`}>
          <p className={`text-sm ${isLightMode ? 'text-gray-400' : 'text-white/30'}`}>© 2026 Rivalio. Bütün hüquqlar qorunur.</p>
          <div className="flex items-center gap-4">
            <select className={`rounded-lg px-3 py-1.5 text-xs cursor-pointer ${isLightMode ? 'bg-gray-100 border-gray-200 text-gray-500' : 'bg-white/5 border-white/10 text-white/50'} border`}>
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
