import type { ImageSourcePropType } from "react-native";
import type { IconName } from "../../components/ui";
import type { Tone } from "../../theme";

// Copy of the public web pages (frontend/src/pages/Landing, AboutUs, Faq, data.ts).

export type Sport = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  badge: string;
  teamSize: string;
  color: string;
  image: ImageSourcePropType;
  available: boolean;
};

export const SPORTS: Sport[] = [
  {
    id: "football",
    name: "Futbol",
    emoji: "⚽",
    description: "Komandanı qur, rəqiblər tap və yerli liqalarda mübarizə apar.",
    badge: "Ən populyar",
    teamSize: "6v6 — 11v11",
    color: "#22C55E",
    image: require("../../../assets/sports/football.jpg"),
    available: true,
  },
  {
    id: "basketball",
    name: "Basketbol",
    emoji: "🏀",
    description: "Komanda yarat, meydançaya çıx və digər komandalarla yarış.",
    badge: "Populyar",
    teamSize: "3v3 — 5v5",
    color: "#F97316",
    image: require("../../../assets/sports/basketball.jpg"),
    available: false,
  },
  {
    id: "tennis",
    name: "Tennis",
    emoji: "🎾",
    description: "Səviyyənə uyğun rəqib tap və fərdi matçlarda gücünü göstər.",
    badge: "Aktiv",
    teamSize: "1v1 — 2v2",
    color: "#EAB308",
    image: require("../../../assets/sports/tennis.jpg"),
    available: false,
  },
  {
    id: "table-tennis",
    name: "Stolüstü tennis",
    emoji: "🏓",
    description: "Rəqibini tap, sürətli matçlara qoşul və reytinqdə yüksəl.",
    badge: "Aktiv",
    teamSize: "1v1 — 2v2",
    color: "#3B82F6",
    image: require("../../../assets/sports/table-tennis.jpg"),
    available: false,
  },
  {
    id: "volleyball",
    name: "Voleybol",
    emoji: "🏐",
    description: "Komanda yığ, oyun təşkil et və turnirlərdə iştirak et.",
    badge: "Yeni",
    teamSize: "4v4 — 6v6",
    color: "#A855F7",
    image: require("../../../assets/sports/volleyball.jpg"),
    available: false,
  },
];

export type Feature = { icon: IconName; title: string; desc: string; tone: Tone };

export const FEATURES: Feature[] = [
  { icon: "search", title: "Oyunçu tap", desc: "Səviyyənə və ərazinə uyğun oyunçular tap.", tone: "lime" },
  { icon: "shield-outline", title: "Komanda yarat", desc: "Heyətini qur, üzvləri idarə et.", tone: "violet" },
  { icon: "person-add-outline", title: "Komandaya qoşul", desc: "Komandaları kəşf et, sorğu göndər.", tone: "blue" },
  { icon: "flash-outline", title: "Rəqib tap", desc: "Oyun təklifi göndər, meydança seç.", tone: "orange" },
  { icon: "trophy-outline", title: "Liqalara qoşul", desc: "Turlar, cədvəl, bombardirlər.", tone: "lime" },
  { icon: "stats-chart-outline", title: "Statistikanı izlə", desc: "Qol, asist, oyun sayı.", tone: "violet" },
  { icon: "chatbubble-outline", title: "Mesajlaş", desc: "Dostlarla birbaşa chat.", tone: "blue" },
  { icon: "lock-closed-outline", title: "Güvənli platforma", desc: "Moderasiya olunan icma.", tone: "orange" },
];

export const HOW_STEPS = [
  { title: "Profilini yarat", desc: "Adını, idman növünü və mövqeyini əlavə et." },
  { title: "Komanda qur və ya qoşul", desc: "Dostlarınla komanda yarat və ya heyətə sorğu göndər." },
  { title: "Rəqib tap", desc: "Oyun təklifi göndər, tarix və meydança seç." },
  { title: "Oyna və izlə", desc: "Nəticə və statistika profilinə yazılır." },
];

export const STATS = [
  { value: "2,500+", label: "Aktiv oyunçu" },
  { value: "350+", label: "Yaradılmış komanda" },
  { value: "1,800+", label: "Keçirilmiş oyun" },
  { value: "120+", label: "Aktiv liqa" },
];

export const TESTIMONIALS = [
  { text: "Rivalio vasitəsilə komandamız üçün iki yeni oyunçu tapdıq. Artıq tam heyətimizdəyik!", name: "Kamran İsmayılov", meta: "Bakı · Futbol" },
  { text: "Bir gündə rəqib komanda tapıb oyun təşkil edə bildik. Platforma çox rahat işləyir.", name: "Tural Həsənov", meta: "Gəncə · Futbol" },
  { text: "Tennis oynamaq üçün partnyor tapmaq artıq çox rahatdır. Bir neçə gündə 3 nəfər tapdım.", name: "Leyla Rəhimova", meta: "Bakı · Tennis" },
];

export const FAQS = [
  {
    q: "Rivalio nədir?",
    a: "Rivalio, oyunçuların müxtəlif idman növləri üzrə rəqib, komanda yoldaşı və idman partnyoru tapmasına kömək edən sosial idman platformasıdır.",
  },
  {
    q: "Necə qeydiyyatdan keçə bilərəm?",
    a: "“Qeydiyyatdan keç” düyməsini basın. Ad, istifadəçi adı və şifrə ilə hesab yarada bilərsiniz. Qeydiyyatdan sonra profilinizi tamamlaya bilərsiniz.",
  },
  {
    q: "Platformada necə komanda yarada bilərəm?",
    a: "İdmanlar → Futbol → “Komanda profilim” bölməsində “Komanda yarat” düyməsini basın. Komandanı yaradan avtomatik kapitan olur.",
  },
  {
    q: "Komandaya necə qoşula bilərəm?",
    a: "Kapitanın göndərdiyi dəvəti qəbul edin və ya “Oyunçu axtarışı” elanlarına sorğu göndərin. Kapitan sorğunuzu qəbul və ya rədd edə bilər.",
  },
  {
    q: "Rəqib komandanı necə tapıram?",
    a: "Komandanız hazır olduqdan sonra “Oyun təklifləri” bölməsindən təklif yaradın və ya digər komandaların təkliflərinə sorğu göndərin.",
  },
  {
    q: "Private liqaları kim görə bilər?",
    a: "Özəl liqalar yalnız həmin liqaya üzv olan istifadəçilərə görünür. Üzv olmayanlar yalnız liqanın adını görə bilər.",
  },
  {
    q: "Digər istifadəçilərlə necə mesajlaşa bilərəm?",
    a: "Dostluğunuzda olan şəxslərlə birbaşa chat əlaqəsi qura bilərsiniz.",
  },
  {
    q: "Rivalio hansı idman növlərini dəstəkləyir?",
    a: "Hazırda futbol aktivdir. Basketbol, tennis, stolüstü tennis və voleybol tezliklə əlavə ediləcək.",
  },
  {
    q: "Platformadan istifadə ödənişlidirmi?",
    a: "Rivalio-nun əsas funksiyaları tamamilə pulsuzdur. Gələcəkdə premium funksiyalar əlavə edilə bilər.",
  },
  {
    q: "Profilimi necə redaktə edə bilərəm?",
    a: "“Profil” bölməsində “Profili redaktə et” düyməsini basın. Şəxsi məlumatları və şəkli oradan yeniləyə bilərsiniz.",
  },
  {
    q: "Bildirişləri harada görürəm?",
    a: "Aşağı menyudakı “Bildirişlər” bölməsində. Dost sorğuları, komanda dəvətləri və oyun təklifləri orada görünür.",
  },
];

export const VALUES: Array<{ icon: IconName; title: string; desc: string; tone: Tone }> = [
  { icon: "people-outline", title: "İcma", desc: "Oyunçular, komandalar və həvəskarlar eyni məkanda birləşir.", tone: "lime" },
  { icon: "flash-outline", title: "Rəqabət", desc: "Səviyyəyə uyğun rəqib tap və nəticələrini izlə.", tone: "orange" },
  { icon: "scale-outline", title: "Ədalət", desc: "Açıq qaydalar və şəffaf statistikalar.", tone: "blue" },
  { icon: "shield-checkmark-outline", title: "Güvən", desc: "Moderasiya edilmiş icma, məlumat qoruması.", tone: "violet" },
];

export const ABOUT = {
  lead: "Rivalio Azərbaycanda idman həvəskarlarını bir araya gətirir. Meydanda yoldaş, komanda və ya növbəti rəqibini tap, liqalara qoşul və nəticələrini izlə.",
  mission:
    "İdmanı təşkilatçılıq yükündən azad etmək. Kiminsə komandada yer axtarması, rəqib tapması və ya liqaya qoşulması bir neçə klikdən ibarət olsun. Rivalio yerli idman icmasını rəqəmsal olaraq birləşdirir.",
  offer:
    "Futbol üzrə oyunçu axtarışı, komanda idarəetməsi, oyun təklifləri, liqalar, çempionatlar, statistikalar və chat. Əsas funksiyalar pulsuzdur.",
};
