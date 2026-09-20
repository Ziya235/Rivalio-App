import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle } from 'lucide-react'
import { Button, Badge } from '../../../components/ui'

export function CommunitySection() {
  const navigate = useNavigate()

  return (
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
  )
}
