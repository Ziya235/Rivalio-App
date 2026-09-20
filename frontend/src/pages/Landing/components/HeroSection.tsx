import { useNavigate, useOutletContext } from 'react-router-dom'
import { ArrowRight, Play } from 'lucide-react'
import { Button } from '../../../components/ui'
import { useAuth } from '../../../context/AuthContext'
import type { AppOutletContext } from '../../../App'

export function HeroSection() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isDarkMode } = useOutletContext<AppOutletContext>()

  const handleStart = () => {
    navigate(user ? '/sports' : '/login')
  }

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      {/* Background glows */}
      <div className="hero-glow w-[600px] h-[600px] bg-[#c5f135]/5 top-0 -left-[200px]" />
      <div className="hero-glow w-[400px] h-[400px] bg-[#7c3aed]/8 top-[30%] right-0" />

      {/* Grid lines bg */}
      <div
        className={
          isDarkMode
            ? 'absolute inset-0 opacity-[0.03]'
            : 'absolute inset-0 opacity-[0.05]'
        }
        style={{
          backgroundImage: isDarkMode
            ? 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)'
            : 'linear-gradient(rgba(15,23,42,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Left */}
          <div className="relative z-20">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#c5f135]/8 border border-[#c5f135]/20 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-[#c5f135] rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-[#c5f135]">
                2,500+ aktiv oyunçu
              </span>
            </div>

            <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl font-bold text-white leading-[0.95] mb-6">
              Rəqibini tap.
              <br />
              <span className="text-gradient-lime glow-lime-text">
                Komandanı qur.
              </span>
              <br />
              Oyuna qoşul.
            </h1>

            <p className="text-white/55 text-lg leading-relaxed mb-8 max-w-lg">
              Yaxınlığındakı oyunçuları, komandaları və idman partnyorlarını tap.
              Öz komandanı yarat, oyun təşkil et və yerli yarışlara qoşul.
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              <Button onClick={handleStart} size="lg">
                İndi Başla
                <ArrowRight size={18} />
              </Button>

              <Button
                onClick={() => navigate('/sports')}
                variant="outline"
                size="lg"
              >
                <Play size={16} />
                İdmanları Kəşf Et
              </Button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-white/30">
                Dəstəklənən idmanlar:
              </span>

              {['⚽', '🏀', '🎾', '🏓', '🏐'].map((icon) => (
                <span
                  key={icon}
                  className="w-9 h-9 bg-white/5 border border-white/8 rounded-xl flex items-center justify-center text-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {icon}
                </span>
              ))}
            </div>
          </div>

          {/* Right */}
          <div className="hidden lg:flex justify-center items-center relative">
            <div className="relative w-[680px] h-[620px] flex items-center justify-center">
              <div className="absolute w-[480px] h-[480px] rounded-full bg-[#7c3aed]/15 blur-[120px]" />

              <img
                src={new URL('../../../assets/rivalio-hero.png', import.meta.url).href}
                alt="Rivalio platform preview"
                className="
                  relative
                  z-10
                  w-[720px]
                  max-w-none
                  object-contain
                  translate-x-10
                  drop-shadow-[0_30px_80px_rgba(124,58,237,0.25)]
                "
              />

              <div className="absolute bottom-[90px] right-[40px] w-[180px] h-[180px] rounded-full bg-[#c5f135]/10 blur-[80px]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
