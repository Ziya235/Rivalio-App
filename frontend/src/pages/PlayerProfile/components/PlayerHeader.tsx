import { Avatar } from '../../../components/ui'
import FriendActions from '../../../components/FriendActions'
import type { PlayerProfile } from '../../../api/players'
import { PhotoLightbox } from '../../Profile/components/PhotoLightbox'

export function PlayerHeader({
  light,
  player,
  fullName,
  age,
  isSelf,
  photoOpen,
  onOpenPhoto,
  onClosePhoto,
}: {
  light: boolean
  player: PlayerProfile
  fullName: string
  age: number | null
  isSelf: boolean
  photoOpen: boolean
  onOpenPhoto: () => void
  onClosePhoto: () => void
}) {
  const card = light
    ? 'bg-white/75 border border-white/80 shadow-sm'
    : 'bg-[#101017] border border-white/8'

  const meta = [
    player.username ? `@${player.username}` : null,
    age !== null ? `${age} yaş` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <div className={`mb-8 rounded-3xl p-5 sm:p-6 ${card}`}>
        <div className="flex items-center gap-4 sm:gap-5">
          <button
            type="button"
            onClick={onOpenPhoto}
            className="relative shrink-0 cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5f135]"
            aria-label="Profil şəklini aç"
          >
            <Avatar
              src={player.image || undefined}
              name={fullName}
              size="xl"
              className={`!h-20 !w-20 sm:!h-24 sm:!w-24 !rounded-2xl border-4 ${
                light ? 'border-white shadow-md' : 'border-white/10'
              }`}
            />
          </button>

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
            <div>
              <h1
                className={`font-display text-3xl sm:text-4xl font-800 leading-tight truncate ${
                  light ? 'text-gray-900' : 'text-white'
                }`}
              >
                {fullName}
              </h1>
              {meta ? (
                <p className={`mt-1 text-sm ${light ? 'text-gray-500' : 'text-white/50'}`}>{meta}</p>
              ) : null}
              {player.description ? (
                <p className={`mt-1.5 text-sm max-w-xl line-clamp-2 ${light ? 'text-gray-600' : 'text-white/55'}`}>
                  {player.description}
                </p>
              ) : null}
            </div>
            {player.userId ? (
              <FriendActions targetUserId={player.userId} isSelf={isSelf} light={light} />
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex gap-2 sm:gap-3">
          {[
            { label: 'Oyun', value: player.stats.gamesPlayed },
            { label: 'Qol', value: player.stats.goals },
            { label: 'Asist', value: player.stats.assists },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`flex flex-1 flex-col items-center rounded-2xl px-3 py-3 text-center ${
                light ? 'bg-white/80 border border-gray-200/80' : 'bg-white/5 border border-white/8'
              }`}
            >
              <div className={`font-display text-2xl font-700 ${light ? 'text-gray-900' : 'text-[#c5f135]'}`}>
                {stat.value}
              </div>
              <div className={`text-[11px] mt-0.5 ${light ? 'text-gray-400' : 'text-white/40'}`}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <PhotoLightbox
        open={photoOpen}
        light={light}
        src={player.image}
        name={fullName}
        onClose={onClosePhoto}
      />
    </>
  )
}
