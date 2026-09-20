import { Input } from '../../../components/ui'
import type { PlayerProfile } from '../../../api/players'
import { displayValue, formatDate } from '../helpers'

export function PlayerInfoTab({
  light,
  player,
  age,
}: {
  light: boolean
  player: PlayerProfile
  age: number | null
}) {
  const card = light
    ? 'bg-white/75 border border-white/80 shadow-sm'
    : 'bg-[#101017] border border-white/8'
  const field = 'min-w-0 flex-1'

  return (
    <div className={`flex flex-col rounded-3xl ${card}`}>
      <div className="px-5 pt-5 pb-3 sm:px-6">
        <h2 className={`font-display text-xl font-700 ${light ? 'text-gray-900' : 'text-white'}`}>
          Profil məlumatları
        </h2>
        <p className={`text-xs mt-0.5 ${light ? 'text-gray-400' : 'text-white/40'}`}>
          Oyunçu haqqında ümumi məlumat
        </p>
      </div>

      <div className="flex flex-col gap-3 px-5 pb-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            className={field}
            label="İstifadəçi adı"
            value={player.username ? `@${player.username}` : '—'}
            onChange={() => {}}
            readOnly
            light={light}
          />
          <Input
            className={field}
            label="Pozisiya"
            value={displayValue(player.position)}
            onChange={() => {}}
            readOnly
            light={light}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            className={field}
            label="Ad"
            value={player.firstName}
            onChange={() => {}}
            readOnly
            light={light}
          />
          <Input
            className={field}
            label="Soyad"
            value={player.lastName}
            onChange={() => {}}
            readOnly
            light={light}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            className={field}
            label="Doğum tarixi"
            value={formatDate(player.dateOfBirth)}
            onChange={() => {}}
            readOnly
            light={light}
          />
          <Input
            className={field}
            label="Yaş"
            value={age !== null ? String(age) : '—'}
            onChange={() => {}}
            readOnly
            light={light}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            className={field}
            label="İş yeri"
            value={displayValue(player.workplace)}
            onChange={() => {}}
            readOnly
            light={light}
          />
          <Input
            className={field}
            label="Təhsil"
            value={displayValue(player.school)}
            onChange={() => {}}
            readOnly
            light={light}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={`text-sm font-medium ${light ? 'text-gray-700' : 'text-white/80'}`}>Bio</label>
          <textarea
            value={player.description || ''}
            readOnly
            rows={2}
            placeholder="Bio yoxdur"
            className={`w-full rounded-xl px-4 py-2 text-sm resize-none opacity-70 cursor-default ${
              light
                ? 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                : 'bg-[#18181f] border border-white/10 text-white placeholder-white/30'
            }`}
          />
        </div>
      </div>
    </div>
  )
}
