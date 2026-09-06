import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  Users,
  Shield,
  Trophy,
  MessageCircle,
  BarChart2,
  Search,
  UserPlus,
  Swords,
  Star,
  ChevronDown,
  ArrowRight,
  Play,
  MapPin,
  CheckCircle,
} from 'lucide-react'
import { Button, Badge } from '../components/ui'
import { SPORTS } from '../data'
import type { AppOutletContext } from '../App'


const FEATURES = [
  {
    icon: Search,
    title: 'Oyunçu tap',
    desc: 'Müxtəlif idman növləri üzrə öz səviyyənə və yerləşdiyin əraziyə uyğun oyunçular tap.',
    color: '#c5f135',
  },
  {
    icon: Users,
    title: 'Komanda yarat',
    desc: 'Dostlarınla və ya digər istifadəçilərlə öz komandanı yarat və komanda üzvlərini idarə et.',
    color: '#3b82f6',
  },
  {
    icon: UserPlus,
    title: 'Komandaya qoşul',
    desc: 'Public komandaları kəşf et və həmin komandada oynamaq üçün request göndər.',
    color: '#a855f7',
  },
  {
    icon: Swords,
    title: 'Rəqib tap',
    desc: 'Komandan üçün digər komandaları tap və oyun keçirmək üçün challenge request göndər.',
    color: '#f97316',
  },
  {
    icon: Trophy,
    title: 'Liqalara qoşul',
    desc: 'Public liqaları kəşf et, qoşulduğun private liqaları gör və standings məlumatlarını izlə.',
    color: '#eab308',
  },
  {
    icon: BarChart2,
    title: 'Statistikaları izlə',
    desc: 'Komandaların xallarını, oyun nəticələrini, qələbə, məğlubiyyət, qol və assist məlumatlarını izlə.',
    color: '#22c55e',
  },
  {
    icon: MessageCircle,
    title: 'Mesajlaş',
    desc: 'Dostların, komanda üzvlərin və qəbul olunmuş istifadəçilərlə chat vasitəsilə əlaqə saxla.',
    color: '#06b6d4',
  },
  {
    icon: Shield,
    title: 'Güvənli platforma',
    desc: 'Doğrulanmış istifadəçilər, moderasiya edilmiş icma və məxfi məlumat qoruması.',
    color: '#ec4899',
  },
]

const HOW_STEPS = [
  { num: '01', title: 'Profilini yarat', desc: 'Adını, idman növünü, mövqeyini və bacarıq səviyyəni əlavə et.' },
  {
    num: '02',
    title: 'İdman növünü seç',
    desc: 'Futbol, basketbol, tennis, stolüstü tennis və ya voleybol arasında seç.',
  },
  {
    num: '03',
    title: 'Oyunçu, komanda və ya rəqib tap',
    desc: 'Ətrafındakı oyunçuları, komandaları və liqaları kəşf et.',
  },
  {
    num: '04',
    title: 'Oyna və nəticələrini izlə',
    desc: 'Oyunlarına qatıl, nəticələri qeyd et, statistikalarını izlə.',
  },
]

const HERO_IMAGES = {
  match:
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=700&h=900&fit=crop&auto=format',
  team:
    'https://images.unsplash.com/photo-1546519638405-a8d71a7f5e49?w=500&h=400&fit=crop&auto=format',
}

const STATS = [
  { value: '2,500+', label: 'Aktiv oyunçu' },
  { value: '350+', label: 'Yaradılmış komanda' },
  { value: '120+', label: 'Aktiv liqa' },
  { value: '1,800+', label: 'Keçirilmiş oyun' },
]

const TESTIMONIALS = [
  {
    text: 'Rivalio vasitəsilə komandamız üçün iki yeni oyunçu tapdıq. Artıq tam heyətimizdəyik!',
    name: 'Kamran İsmayılov',
    city: 'Bakı',
    sport: 'Futbol',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format',
    rating: 5,
  },
  {
    text: 'Bir gündə rəqib komanda tapıb oyun təşkil edə bildik. Platform çox rahat işləyir.',
    name: 'Tural Həsənov',
    city: 'Gəncə',
    sport: 'Futbol',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=60&h=60&fit=crop&auto=format',
    rating: 5,
  },
  {
    text: 'Tennis oynamaq üçün partnyor tapmaq artıq çox rahatdır. Bir neçə gündə 3 nəfər tapdım.',
    name: 'Leyla Rəhimova',
    city: 'Bakı',
    sport: 'Tennis',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format',
    rating: 5,
  },
]

const FAQS = [
  {
    q: 'Rivalio nədir?',
    a: 'Rivalio, oyunçuların müxtəlif idman növləri üzrə rəqib, komanda yoldaşı və idman partnyoru tapmasına kömək edən sosial idman platformasıdır.',
  },
  {
    q: 'Platformada necə komanda yarada bilərəm?',
    a: 'Qeydiyyatdan keçdikdən sonra "Komanda Yarat" düyməsinə klikləyin, idman növünü, komanda adını və digər məlumatları doldurun.',
  },
  {
    q: 'Komandaya necə qoşula bilərəm?',
    a: 'Komandalar bölməsindən istədiyiniz komandanı tapın və "Qoşulmaq üçün request göndər" düyməsinə klikləyin. Komanda kapitanı sorğunuzu qəbul edəcək.',
  },
  {
    q: 'Private liqaları kim görə bilər?',
    a: 'Private liqalar yalnız həmin liqaya üzv olan istifadəçilərə görünür. Üzv olmayanlar yalnız liqanın adını görə bilər.',
  },
  {
    q: 'Digər istifadəçilərlə necə mesajlaşa bilərəm?',
    a: 'Dostluğunuzda olan şəxslərlə birbaşa chat əlaqəsi qura bilərsiniz. Komanda üzvləri üçün ayrıca qrup chat yaradılır.',
  },
  {
    q: 'Rivalio bütün idman növlərini dəstəkləyir?',
    a: 'Hazırda futbol, basketbol, tennis, stolüstü tennis və voleybol dəstəklənir. Yeni idman növləri tezliklə əlavə ediləcək.',
  },
  {
    q: 'Platformadan istifadə ödənişlidirmi?',
    a: 'Rivalio-nun əsas funksiyaları tamamilə pulsuzdur. Gələcəkdə premium funksiyalar əlavə edilə bilər.',
  },
]

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-white/7 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/3 transition-colors"
      >
        <span className="text-white font-medium text-sm pr-4">{q}</span>
        <ChevronDown
          size={18}
          className={`text-[#c5f135] flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`accordion-content ${open ? 'open' : ''}`}>
        <div className="px-5 pb-5 text-sm text-white/55 leading-relaxed">{a}</div>
      </div>
    </div>
  )
}

function AppPreview() {
  return (
    <div className="landing-dark-preview relative w-full max-w-[340px] mx-auto">
      {/* Phone frame */}
      <div className="relative bg-[#0e0e16] rounded-[40px] border-2 border-white/10 shadow-2xl overflow-hidden"
        style={{ aspectRatio: '9/19' }}>
        {/* Screen content */}
        <div className="absolute inset-2 bg-[#08080e] rounded-[32px] overflow-hidden flex flex-col">
          {/* Status bar */}
          <div className="flex justify-between items-center px-5 pt-3 pb-1">
            <span className="text-white text-[10px] font-semibold">9:41</span>
            <div className="flex gap-1 items-center">
              <div className="w-4 h-2 bg-[#c5f135] rounded-sm text-[6px] flex items-center justify-center text-[#08080e] font-bold">▮▮▮</div>
            </div>
          </div>

          {/* App content */}
          <div className="flex-1 overflow-hidden px-3 py-2 flex flex-col gap-2">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-white font-semibold text-xs">Salam, Əli 👋</span>
              <div className="w-6 h-6 rounded-full bg-[#c5f135]/20 flex items-center justify-center">
                <span className="text-[8px] text-[#c5f135]">🔔</span>
              </div>
            </div>

            {/* Sports pills */}
            <div className="flex gap-1.5 overflow-hidden">
              {['⚽ Futbol', '🏀 Basketbol', '🎾 Tennis'].map((s, i) => (
                <span
                  key={s}
                  className={`px-2 py-0.5 rounded-full text-[8px] font-semibold whitespace-nowrap ${
                    i === 0
                      ? 'bg-[#c5f135] text-[#08080e]'
                      : 'bg-white/8 text-white/60'
                  }`}
                >
                  {s}
                </span>
              ))}
            </div>

            {/* Nearby players card */}
            <div className="bg-[#101017] rounded-2xl p-2.5 border border-white/7">
              <div className="flex items-center gap-1 mb-2">
                <MapPin size={8} className="text-[#c5f135]" />
                <span className="text-[9px] text-white/50">Yaxınlıqdakı oyunçular</span>
              </div>
              {[
                { name: 'Tural H.', pos: 'Yarım müd.', dist: '0.8km', avatar: '👤' },
                { name: 'Nigar Ə.', pos: 'Hücumçu', dist: '1.2km', avatar: '👤' },
                { name: 'Rauf Q.', pos: 'Müdafiəçi', dist: '2.1km', avatar: '👤' },
              ].map((p) => (
                <div key={p.name} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#c5f135]/30 to-[#7c3aed]/30 flex items-center justify-center text-[8px]">
                      {p.avatar}
                    </div>
                    <div>
                      <div className="text-[9px] text-white font-semibold">{p.name}</div>
                      <div className="text-[7px] text-white/40">{p.pos}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[7px] text-white/30">{p.dist}</span>
                    <div className="w-8 h-3.5 bg-[#c5f135]/15 rounded-full flex items-center justify-center">
                      <span className="text-[6px] text-[#c5f135] font-semibold">Tap</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Team card */}
            <div className="bg-gradient-to-r from-[#c5f135]/10 to-[#7c3aed]/10 rounded-2xl p-2.5 border border-[#c5f135]/15">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <div className="text-[10px] text-white font-semibold">Bakı Strikerlər</div>
                  <div className="text-[7px] text-white/40">11 üzv · ⚽ Futbol</div>
                </div>
                <div className="text-[9px] text-[#c5f135] font-semibold">W 16/24</div>
              </div>
              <div className="flex gap-1">
                {['⚽', '🏃', '🛡️', '🎯'].map((e, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-full bg-[#c5f135]/10 flex items-center justify-center text-[7px]"
                  >
                    {e}
                  </div>
                ))}
                <div className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center text-[7px] text-white/40">
                  +7
                </div>
              </div>
            </div>

            {/* Match challenge notification */}
            <div className="bg-[#101017] rounded-2xl p-2.5 border border-white/7">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-orange-500/20 flex items-center justify-center text-[7px]">⚔️</div>
                <div>
                  <div className="text-[9px] text-white font-semibold">Yeni Challenge!</div>
                  <div className="text-[7px] text-white/40">Gənclik Feniks · 26 iyul</div>
                </div>
                <div className="ml-auto flex gap-1">
                  <div className="w-8 h-3.5 bg-[#c5f135]/15 rounded-full flex items-center justify-center">
                    <span className="text-[6px] text-[#c5f135] font-semibold">Qəbul</span>
                  </div>
                </div>
              </div>
            </div>

            {/* League standings mini */}
            <div className="bg-[#101017] rounded-2xl p-2.5 border border-white/7">
              <div className="text-[8px] text-white/40 mb-1.5 flex items-center gap-1">
                <Trophy size={7} className="text-[#c5f135]" />
                Bakı Futbol Liqa
              </div>
              {[
                { pos: 1, name: 'Neftçi Jr.', pts: 51 },
                { pos: 2, name: 'Bakı Striker', pts: 46 },
                { pos: 3, name: 'Gənclik Fe.', pts: 42 },
              ].map((r) => (
                <div key={r.pos} className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[7px] w-3 text-center font-bold ${r.pos === 1 ? 'text-[#c5f135]' : 'text-white/30'}`}
                    >
                      {r.pos}
                    </span>
                    <span className="text-[8px] text-white">{r.name}</span>
                  </div>
                  <span className="text-[8px] text-[#c5f135] font-bold">{r.pts}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Glow effects */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[200px] h-[80px] bg-[#c5f135]/15 rounded-full blur-3xl pointer-events-none" />
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const { isDarkMode } = useOutletContext<AppOutletContext>()
  const accent = isDarkMode ? '#c5f135' : '#4d6b0b'

  return (
    <div
      className={`landing-page min-h-screen transition-colors duration-300 ${
        isDarkMode ? 'landing-page--dark' : 'landing-page--light'
      }`}
    >
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
          <Button onClick={() => navigate('/register')} size="lg">
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
            src={new URL('../assets/rivalio-hero.png', import.meta.url).href}
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

      {/* ======= SPORTS ======= */}
      <section className="py-24">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-5xl font-bold text-white mb-3">İdman Növünü Seç</h2>
            <p className="text-white/45 text-base">5 fərqli idman üzrə oyunçular, komandalar və liqalar</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {SPORTS.map((sport) => (
              <button
                key={sport.id}
                onClick={() => navigate(`/sports/${sport.id}`)}
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
                  <div
                    className="text-xs font-semibold flex items-center gap-1 group-hover:gap-2 transition-all"
                    style={{ color: sport.color }}
                  >
                    Kəşf Et <ArrowRight size={12} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ======= FEATURES ======= */}
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

      {/* ======= HOW IT WORKS ======= */}
      <section className="py-24">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-5xl font-bold text-white mb-3">Necə işləyir?</h2>
            <p className="text-white/45 text-base">4 sadə addımda idman icmasına qoşul</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connector line */}
            <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-[#c5f135]/20 to-transparent" />

            {HOW_STEPS.map((step) => (
              <div key={step.num} className="flex flex-col items-center text-center relative">
                <div className="w-20 h-20 rounded-2xl bg-[#101017] border border-white/8 flex flex-col items-center justify-center mb-5 relative z-10 hover:border-[#c5f135]/30 transition-colors">
                  <span className="font-display text-3xl font-800 text-[#c5f135]/50 leading-none">{step.num}</span>
                </div>
                <h3 className="text-white font-semibold text-base mb-2">{step.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======= STATS ======= */}
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

      {/* ======= COMMUNITY ======= */}
      <section className="py-24">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Text */}
            <div>
              <h2 className="font-display text-5xl font-bold text-white mb-4 leading-tight">
                Sadəcə oyun deyil,{' '}
                <span className="text-gradient-lime">idman icmasıdır</span>
              </h2>
              <p className="text-white/45 text-base leading-relaxed mb-6">
                Rivalio-da sadəcə oyun oynamırsınız. Yeni dostlar tapırsınız, komandalar qurursunuz
                və yerli idman icmasına qoşulursunuz. Hər oyun yeni əlaqələrin başlanğıcıdır.
              </p>
              <ul className="flex flex-col gap-3 mb-8">
                {[
                  'Dost sorğusu göndər və qəbul et',
                  'Komanda üzvləri ilə qrup chat',
                  'Oyun dəvəti paylaş',
                  'Match nəticəsini icma ilə bölüş',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-white/60">
                    <CheckCircle size={16} className="text-[#c5f135] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button onClick={() => navigate('/register')} size="lg">
                İcmaya Qoşul
                <ArrowRight size={18} />
              </Button>
            </div>

            {/* Right: Community UI mockup */}
            <div className="grid grid-cols-2 gap-3">
              {/* Friend request card */}
              <div className="bg-[#101017] card-border rounded-2xl p-4 col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-white/40 font-semibold uppercase tracking-wider">
                    Dost sorğuları
                  </span>
                  <Badge variant="lime">3 yeni</Badge>
                </div>
                {[
                  { name: 'Tural H.', sport: '⚽', mutual: 4 },
                  { name: 'Nigar Ə.', sport: '🏐', mutual: 2 },
                ].map((u) => (
                  <div key={u.name} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c5f135]/30 to-[#7c3aed]/30 flex items-center justify-center text-xs font-bold text-[#c5f135]">
                        {u.name[0]}
                      </div>
                      <div>
                        <div className="text-sm text-white font-medium">{u.name}</div>
                        <div className="text-xs text-white/35">
                          {u.sport} · {u.mutual} ümumi dost
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="primary">Qəbul</Button>
                      <Button size="sm" variant="ghost">Rədd</Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Team invite */}
              <div className="bg-gradient-to-br from-[#c5f135]/8 to-transparent card-border-lime rounded-2xl p-4">
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Komanda dəvəti</div>
                <div className="text-sm text-white font-semibold mb-0.5">Bakı Strikerlər</div>
                <div className="text-xs text-white/40 mb-3">⚽ Futbol · 11 üzv</div>
                <Button size="sm" fullWidth>Qəbul et</Button>
              </div>

              {/* Match result */}
              <div className="bg-[#101017] card-border rounded-2xl p-4">
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Son oyun</div>
                <div className="text-center">
                  <div className="text-2xl font-display font-800 text-white mb-1">3 – 1</div>
                  <div className="text-xs text-[#c5f135] font-semibold">Qələbə 🏆</div>
                  <div className="text-xs text-white/30 mt-1">vs Gənclik Feniks</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= TESTIMONIALS ======= */}
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

      {/* ======= FAQ ======= */}
      <section className="py-24">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-5xl font-bold text-white mb-3">Tez-tez verilən suallar</h2>
          </div>
          <div className="flex flex-col gap-3">
            {FAQS.map((faq) => (
              <AccordionItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ======= FINAL CTA ======= */}
      <section className="py-28 relative overflow-hidden">
        <div className="hero-glow w-[500px] h-[500px] bg-[#c5f135]/6 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="font-display text-6xl sm:text-7xl font-bold text-white mb-4 leading-tight">
            Növbəti oyunun
            <br />
            <span className="text-gradient-lime">səni gözləyir</span>
          </h2>
          <p className="text-white/45 text-lg mb-10">
            Rivalio-ya qoşul, komandanı yarat və öz rəqibini tap.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => navigate('/register')} size="lg">
              Qeydiyyatdan keç
              <ArrowRight size={18} />
            </Button>
            <Button onClick={() => navigate('/sports')} variant="outline" size="lg">
              İdmanları kəşf et
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
