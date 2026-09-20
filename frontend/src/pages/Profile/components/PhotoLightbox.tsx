import { useEffect } from 'react'
import { Camera, X } from 'lucide-react'
import { Button } from '../../../components/ui'
import { mediaUrl } from '../../../api/base'

export function PhotoLightbox({
  open,
  light,
  src,
  name,
  uploading = false,
  onClose,
  onChangePhoto,
}: {
  open: boolean
  light: boolean
  src?: string | null
  name: string
  uploading?: boolean
  onClose: () => void
  onChangePhoto?: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const imageSrc = mediaUrl(src || undefined)
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Bağla"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-2 right-0 rounded-full bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="flex w-full flex-col items-center gap-5">
          <div className="flex h-[min(72vw,420px)] w-[min(72vw,420px)] items-center justify-center overflow-hidden rounded-[2rem] bg-[#101017] shadow-2xl ring-1 ring-white/10">
            {imageSrc ? (
              <img src={imageSrc} alt={name} className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-6xl font-800 text-[#c5f135]">{initials}</span>
            )}
          </div>

          <p className="text-center text-base font-semibold text-white">{name}</p>

          {onChangePhoto ? (
            <Button
              size="lg"
              onClick={onChangePhoto}
              disabled={uploading}
              className={light ? '' : ''}
            >
              <Camera size={18} />
              {uploading ? 'Yüklənir...' : 'Şəkli dəyiş'}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
