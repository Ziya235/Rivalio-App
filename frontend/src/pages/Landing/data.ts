import {
  Users,
  Shield,
  Trophy,
  MessageCircle,
  BarChart2,
  Search,
  UserPlus,
  Swords,
} from 'lucide-react'

export const FEATURES = [
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

export const HOW_STEPS = [
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

export const STATS = [
  { value: '2,500+', label: 'Aktiv oyunçu' },
  { value: '350+', label: 'Yaradılmış komanda' },
  { value: '120+', label: 'Aktiv liqa' },
  { value: '1,800+', label: 'Keçirilmiş oyun' },
]

export const TESTIMONIALS = [
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

export const FAQS = [
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
