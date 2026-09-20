import { mediaUrl } from '../../../api/base'

export function TeamLogo({
  src,
  name,
  light,
  size = 'md',
}: {
  src: string | null
  name: string
  light: boolean
  size?: 'md' | 'sm'
}) {
  const box = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12'
  if (src) {
    return <img src={mediaUrl(src)} alt={name} className={`${box} rounded-xl object-cover`} />
  }
  return (
    <div
      className={`${box} rounded-xl flex items-center justify-center font-bold shrink-0 ${
        light ? 'bg-emerald-500/15 text-emerald-600' : 'bg-[#c5f135]/15 text-[#c5f135]'
      }`}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  )
}
