import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { ChevronDown, ArrowRight } from 'lucide-react'
import { Button } from '../components/ui'
import type { AppOutletContext } from '../App'

const FAQS = [
  {
    q: 'Rivalio nədir?',
    a: 'Rivalio, oyunçuların müxtəlif idman növləri üzrə rəqib, komanda yoldaşı və idman partnyoru tapmasına kömək edən sosial idman platformasıdır.',
  },
  {
    q: 'Necə qeydiyyatdan keçə bilərəm?',
    a: 'Ana səhifədə və ya header-də “Qeydiyyat” düyməsinə klikləyin. Ad, istifadəçi adı və şifrə ilə hesab yarada bilərsiniz. Qeydiyyatdan sonra profilinizi idman növü və mövqe ilə tamamlaya bilərsiniz.',
  },
  {
    q: 'Platformada necə komanda yarada bilərəm?',
    a: 'Qeydiyyatdan keçdikdən sonra “Komanda Yarat” bölməsinə keçin, idman növünü, komanda adını və digər məlumatları doldurun. Komandanı public və ya private olaraq təyin edə bilərsiniz.',
  },
  {
    q: 'Komandaya necə qoşula bilərəm?',
    a: 'Komandalar bölməsindən istədiyiniz komandanı tapın və qoşulmaq üçün request göndərin. Komanda kapitanı sorğunuzu qəbul və ya rədd edə bilər.',
  },
  {
    q: 'Rəqib komandanı necə tapıram?',
    a: 'Komandanız hazır olduqdan sonra “Rəqib tap” funksiyasından istifadə edin. Uyğun komandalara challenge göndərin. Qəbul olunarsa, oyun təşkil olunur.',
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
    q: 'Rivalio hansı idman növlərini dəstəkləyir?',
    a: 'Hazırda futbol, basketbol, tennis, stolüstü tennis və voleybol dəstəklənir. Yeni idman növləri tezliklə əlavə ediləcək.',
  },
  {
    q: 'Platformadan istifadə ödənişlidirmi?',
    a: 'Rivalio-nun əsas funksiyaları tamamilə pulsuzdur. Gələcəkdə premium funksiyalar əlavə edilə bilər.',
  },
  {
    q: 'Profilimi necə redaktə edə bilərəm?',
    a: 'Daxil olduqdan sonra header-dəki profil menyusundan “Profilim” səhifəsinə keçin. Şəxsi məlumatlar, şəkil və idman məlumatlarını oradan yeniləyə bilərsiniz.',
  },
  {
    q: 'Bildirişləri harada görürəm?',
    a: 'Daxil olduqdan sonra header-dəki zəng ikonuna klikləyin. Dost sorğuları, komanda request-ləri və challenge-lər bildirişlərdə görünür.',
  },
  {
    q: 'Hesabımı necə silə bilərəm?',
    a: 'Hesab silmə və ya məlumatlarınızla bağlı sorğular üçün dəstək komandası ilə əlaqə saxlayın. Silinmədən əvvəl komanda kapitansı və liqa üzvlüyü yoxlanılır.',
  },
]

function AccordionItem({
  q,
  a,
  light,
}: {
  q: string
  a: string
  light: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className={`rounded-xl overflow-hidden border ${
        light ? 'border-slate-900/10 bg-white/70' : 'border-white/7 bg-[#101017]'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between p-5 text-left transition-colors ${
          light ? 'hover:bg-slate-900/5' : 'hover:bg-white/3'
        }`}
      >
        <span className={`font-medium text-sm pr-4 ${light ? 'text-gray-900' : 'text-white'}`}>
          {q}
        </span>
        <ChevronDown
          size={18}
          className={`flex-shrink-0 transition-transform duration-300 ${
            light ? 'text-[#4d6b0b]' : 'text-[#c5f135]'
          } ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`accordion-content ${open ? 'open' : ''}`}>
        <div className={`px-5 pb-5 text-sm leading-relaxed ${light ? 'text-gray-500' : 'text-white/55'}`}>
          {a}
        </div>
      </div>
    </div>
  )
}

export default function FaqPage() {
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
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p
            className={`text-xs font-semibold uppercase tracking-[0.2em] mb-4 ${
              light ? 'text-[#4d6b0b]' : 'text-[#c5f135]'
            }`}
          >
            Dəstək
          </p>
          <h1
            className={`font-display text-5xl sm:text-6xl font-bold mb-4 ${
              light ? 'text-gray-900' : 'text-white'
            }`}
          >
            Tez-tez verilən suallar
          </h1>
          <p className={`text-lg ${light ? 'text-gray-500' : 'text-white/45'}`}>
            Qeydiyyat, komandalar, liqalar və chat haqqında ən çox soruşulan suallar.
          </p>
        </div>

        <div className="flex flex-col gap-3 mb-16">
          {FAQS.map((faq) => (
            <AccordionItem key={faq.q} q={faq.q} a={faq.a} light={light} />
          ))}
        </div>

        <div
          className={`rounded-3xl p-8 text-center ${
            light
              ? 'bg-white/70 border border-white/80'
              : 'bg-[#101017] border border-white/5'
          }`}
        >
          <h2 className={`font-display text-3xl font-bold mb-2 ${light ? 'text-gray-900' : 'text-white'}`}>
            Cavabını tapmadın?
          </h2>
          <p className={`mb-6 text-sm ${light ? 'text-gray-500' : 'text-white/45'}`}>
            Platformanı kəşf et və ya hesab yaradıb dərhal istifadəyə başla.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate('/register')} size="lg">
              Qeydiyyatdan keç
              <ArrowRight size={18} />
            </Button>
            <Button
              onClick={() => navigate('/about-us')}
              variant="outline"
              size="lg"
              className={light ? '!text-slate-800 !border-slate-300 hover:!border-[#4d6b0b] hover:!text-[#4d6b0b]' : ''}
            >
              Haqqımızda
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
