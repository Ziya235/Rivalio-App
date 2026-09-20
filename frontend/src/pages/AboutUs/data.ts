import { Users, Swords, Heart, Shield } from 'lucide-react'

export const VALUES = [
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

export const STEPS = [
  { num: '01', title: 'Profilini yarat', desc: 'İdman növünü, mövqeyini və səviyyəni əlavə et.' },
  { num: '02', title: 'Komanda qur və ya qoşul', desc: 'Dostlarınla komanda yarat və ya mövcud heyətə request göndər.' },
  { num: '03', title: 'Rəqib tap', desc: 'Challenge göndər, oyun təşkil et və liqalara qoşul.' },
  { num: '04', title: 'Oyna və izlə', desc: 'Nəticələri qeyd et, statistikalarını gör və irəlilə.' },
]

export const STATS = [
  { value: '2,500+', label: 'Aktiv oyunçu' },
  { value: '350+', label: 'Yaradılmış komanda' },
  { value: '120+', label: 'Aktiv liqa' },
  { value: '1,800+', label: 'Keçirilmiş oyun' },
]
