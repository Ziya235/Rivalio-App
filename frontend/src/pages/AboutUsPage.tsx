import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  ArrowRight,
  Target,
  Users,
  Swords,
  Trophy,
  Shield,
  Heart,
} from 'lucide-react'
import { Button } from '../components/ui'
import type { AppOutletContext } from '../App'

const VALUES = [
  {
    icon: Users,
    title: 'İcma',
    desc: 'Oyunçular, komandalar və həvəskarlar eyni məkanda birləşir. Hər oyun yeni əlaqənin başlanğıcıdır.',
  },
  {
    icon: Swords,
    title: 'Rəqabət',
    desc: 'Səviyyəyə uyğun rəqib tap, meydanda özünü göstər və nəticələrini izlə.',
  },
  {
    icon: Heart,
    title: 'Ədalət',
    desc: 'Açıq qaydalar, şəffaf statistikalar və hər kəs üçün eyni imkanlar.',
  },
  {
    icon: Shield,
    title: 'Güvən',
    desc: 'Moderasiya edilmiş icma, doğrulanmış istifadəçilər və məxfi məlumat qoruması.',
  },
]

const STEPS = [
  { num: '01', title: 'Profilini yarat', desc: 'İdman növünü, mövqeyini və səviyyəni əlavə et.' },
  { num: '02', title: 'Komanda qur və ya qoşul', desc: 'Dostlarınla komanda yarat və ya mövcud heyətə request göndər.' },
  { num: '03', title: 'Rəqib tap', desc: 'Challenge göndər, oyun təşkil et və liqalara qoşul.' },
  { num: '04', title: 'Oyna və izlə', desc: 'Nəticələri qeyd et, statistikalarını gör və irəlilə.' },
]

export default function AboutUsPage() {
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
        <div className="mb-16 max-w-3xl">
          
          <h1
            className={`font-display text-5xl sm:text-6xl font-bold mb-5 leading-tight ${
              light ? 'text-gray-900' : 'text-white'
            }`}
          >
            Oyunçu, komanda və rəqib tapmaq üçün sosial idman platforması
          </h1>
          <p className={`text-lg leading-relaxed ${light ? 'text-gray-500' : 'text-white/45'}`}>
            Rivalio Azərbaycanda idman həvəskarlarını bir araya gətirir. Meydanda yoldaş,
            komanda və ya növbəti rəqibini tap, liqalara qoşul və nəticələrini izlə.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
          {[
            { value: '2,500+', label: 'Aktiv oyunçu' },
            { value: '350+', label: 'Yaradılmış komanda' },
            { value: '120+', label: 'Aktiv liqa' },
            { value: '1,800+', label: 'Keçirilmiş oyun' },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-2xl p-6 ${
                light
                  ? 'bg-white/70 border border-white/80 shadow-[0_10px_40px_rgba(15,23,42,0.06)]'
                  : 'bg-[#101017] border border-white/5'
              }`}
            >
              <div
                className={`font-display text-4xl font-bold mb-1 ${
                  light ? 'text-[#4d6b0b]' : 'text-[#c5f135]'
                }`}
              >
                {stat.value}
              </div>
              <div className={`text-sm ${light ? 'text-gray-500' : 'text-white/40'}`}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-10 mb-20 items-start">
          <div
            className={`rounded-3xl p-8 ${
              light
                ? 'bg-white/70 border border-white/80'
                : 'bg-[#101017] border border-white/5'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${
                light ? 'bg-[#4d6b0b]/12 text-[#4d6b0b]' : 'bg-[#c5f135]/10 text-[#c5f135]'
              }`}
            >
              <Target size={22} />
            </div>
            <h2 className={`font-display text-3xl font-bold mb-3 ${light ? 'text-gray-900' : 'text-white'}`}>
              Missiyamız
            </h2>
            <p className={`text-sm leading-relaxed ${light ? 'text-gray-500' : 'text-white/50'}`}>
              İdmanı təşkilatçılıq yükündən azad etmək. Kiminsə komandada yer axtarması,
              rəqib tapması və ya liqaya qoşulması bir neçə klikdən ibarət olsun. Rivalio
              yerli idman icmasını rəqəmsal olaraq birləşdirir.
            </p>
          </div>
          <div
            className={`rounded-3xl p-8 ${
              light
                ? 'bg-white/70 border border-white/80'
                : 'bg-[#101017] border border-white/5'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${
                light ? 'bg-[#4d6b0b]/12 text-[#4d6b0b]' : 'bg-[#c5f135]/10 text-[#c5f135]'
              }`}
            >
              <Trophy size={22} />
            </div>
            <h2 className={`font-display text-3xl font-bold mb-3 ${light ? 'text-gray-900' : 'text-white'}`}>
              Nə təklif edirik
            </h2>
            <p className={`text-sm leading-relaxed ${light ? 'text-gray-500' : 'text-white/50'}`}>
              Futbol, basketbol, tennis, stolüstü tennis və voleybol üzrə oyunçu axtarışı,
              komanda idarəetməsi, challenge, liqalar, statistikalar və chat. Əsas
              funksiyalar pulsuzdur.
            </p>
          </div>
        </div>

        <div className="mb-20">
          <h2 className={`font-display text-4xl font-bold mb-8 ${light ? 'text-gray-900' : 'text-white'}`}>
            Dəyərlərimiz
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {VALUES.map((item) => (
              <div
                key={item.title}
                className={`rounded-2xl p-6 ${
                  light
                    ? 'bg-white/70 border border-white/80'
                    : 'bg-[#101017] border border-white/5'
                }`}
              >
                <item.icon
                  size={22}
                  className={`mb-4 ${light ? 'text-[#4d6b0b]' : 'text-[#c5f135]'}`}
                />
                <h3 className={`font-semibold mb-2 ${light ? 'text-gray-900' : 'text-white'}`}>
                  {item.title}
                </h3>
                <p className={`text-sm leading-relaxed ${light ? 'text-gray-500' : 'text-white/45'}`}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-20">
          <h2 className={`font-display text-4xl font-bold mb-8 ${light ? 'text-gray-900' : 'text-white'}`}>
            Necə işləyir
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className={`rounded-2xl p-6 ${
                  light
                    ? 'bg-white/70 border border-white/80'
                    : 'bg-[#101017] border border-white/5'
                }`}
              >
                <div
                  className={`font-display text-2xl font-bold mb-3 ${
                    light ? 'text-[#4d6b0b]' : 'text-[#c5f135]'
                  }`}
                >
                  {step.num}
                </div>
                <h3 className={`font-semibold mb-2 ${light ? 'text-gray-900' : 'text-white'}`}>
                  {step.title}
                </h3>
                <p className={`text-sm leading-relaxed ${light ? 'text-gray-500' : 'text-white/45'}`}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`rounded-3xl p-10 text-center ${
            light
              ? 'bg-white/70 border border-white/80'
              : 'bg-[#101017] border border-white/5'
          }`}
        >
          <h2 className={`font-display text-4xl font-bold mb-3 ${light ? 'text-gray-900' : 'text-white'}`}>
            Növbəti oyunun səni gözləyir
          </h2>
          <p className={`mb-8 ${light ? 'text-gray-500' : 'text-white/45'}`}>
            Rivalio-ya qoşul, komandanı yarat və öz rəqibini tap.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate('/register')} size="lg">
              Qeydiyyatdan keç
              <ArrowRight size={18} />
            </Button>
            <Button
              onClick={() => navigate('/sports')}
              variant="outline"
              size="lg"
              className={light ? '!text-slate-800 !border-slate-300 hover:!border-[#4d6b0b] hover:!text-[#4d6b0b]' : ''}
            >
              İdmanları kəşf et
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
