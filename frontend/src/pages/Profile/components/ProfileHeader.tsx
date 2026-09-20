import { Camera } from 'lucide-react'
import type { ChangeEvent, RefObject } from 'react'
import { Avatar } from '../../../components/ui'
import type { User } from '../../../types/auth'
import { PhotoLightbox } from './PhotoLightbox'

export function ProfileHeader({
  light,
  user,
  fullName,
  age,
  uploadingImage,
  photoOpen,
  fileInputRef,
  onOpenPhoto,
  onClosePhoto,
  onChangePhoto,
  onImageChange,
}: {
  light: boolean
  user: User
  fullName: string
  age: number | null
  uploadingImage: boolean
  photoOpen: boolean
  fileInputRef: RefObject<HTMLInputElement | null>
  onOpenPhoto: () => void
  onClosePhoto: () => void
  onChangePhoto: () => void
  onImageChange: (e: ChangeEvent<HTMLInputElement>) => void
}) {
  const card = light
    ? 'bg-white/75 border border-white/80 shadow-sm'
    : 'bg-[#101017] border border-white/8'

  return (
    <>
      <div className={`mb-8 rounded-3xl p-5 sm:p-6 ${card}`}>
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={onOpenPhoto}
              className="block cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5f135]"
              aria-label="Profil şəklini aç"
            >
              <Avatar
                src={user.image || undefined}
                name={fullName}
                size="xl"
                className={`!h-20 !w-20 sm:!h-24 sm:!w-24 !rounded-2xl border-4 ${
                  light ? 'border-white shadow-md' : 'border-white/10'
                }`}
              />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={onImageChange}
            />
            <span
              className={`pointer-events-none absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-sm ${
                light ? 'border-white bg-emerald-600 text-white' : 'border-[#101017] bg-[#c5f135] text-[#08080e]'
              }`}
            >
              <Camera size={13} />
            </span>
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h1
              className={`font-display text-3xl sm:text-4xl font-800 leading-tight truncate ${
                light ? 'text-gray-900' : 'text-white'
              }`}
            >
              {fullName}
            </h1>
            <p className={`mt-1 text-sm ${light ? 'text-gray-500' : 'text-white/50'}`}>
              @{user.username}
              {age !== null ? ` · ${age} yaş` : ''}
            </p>
            {user.bio ? (
              <p className={`mt-1.5 text-sm max-w-xl line-clamp-2 ${light ? 'text-gray-600' : 'text-white/55'}`}>
                {user.bio}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex gap-2 sm:gap-3">
          {[
            { label: 'Oyun', value: user.gamesPlayed ?? 0 },
            { label: 'Qol', value: user.goals ?? 0 },
            { label: 'Asist', value: user.assists ?? 0 },
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
        src={user.image}
        name={fullName}
        uploading={uploadingImage}
        onClose={onClosePhoto}
        onChangePhoto={onChangePhoto}
      />
    </>
  )
}
