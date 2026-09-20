import { Check, Pencil, X } from 'lucide-react'
import { Button, Input } from '../../../components/ui'
import type { ProfileForm } from '../helpers'

export function ProfileInfoTab({
  light,
  editing,
  saving,
  error,
  profileForm,
  age,
  onEdit,
  onCancel,
  onSave,
  onUpdate,
}: {
  light: boolean
  editing: boolean
  saving: boolean
  error: string | null
  profileForm: ProfileForm
  age: number | null
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  onUpdate: (key: keyof ProfileForm, value: string) => void
}) {
  const card = light
    ? 'bg-white/75 border border-white/80 shadow-sm'
    : 'bg-[#101017] border border-white/8'
  const field = 'min-w-0 flex-1'

  return (
    <div className={`flex flex-col rounded-3xl ${card}`}>
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 sm:px-6">
        <div>
          <h2 className={`font-display text-xl font-700 ${light ? 'text-gray-900' : 'text-white'}`}>
            Profil məlumatları
          </h2>
          <p className={`text-xs mt-0.5 ${light ? 'text-gray-400' : 'text-white/40'}`}>
            {editing ? 'Dəyişiklikləri yadda saxlamağı unutmayın' : 'Məlumatlar oxuma rejimindədir'}
          </p>
        </div>
        {!editing ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            className={
              light
                ? '!text-emerald-600 !border-emerald-500/50 hover:!bg-emerald-500/10 hover:!text-emerald-700 hover:!border-emerald-500'
                : '!text-[#c5f135] !border-[#c5f135]/40 hover:!bg-[#c5f135]/10 hover:!text-[#c5f135]'
            }
          >
            <Pencil size={14} />
            Redaktə et
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 px-5 pb-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            className={field}
            label="İstifadəçi adı"
            value={profileForm.username}
            onChange={(v) => onUpdate('username', v.replace(/^@/, '').replace(/\s/g, '').toLowerCase())}
            readOnly={!editing}
            light={light}
          />
          <Input
            className={field}
            label="Email"
            type="email"
            value={profileForm.email}
            onChange={(v) => onUpdate('email', v)}
            readOnly={!editing}
            light={light}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            className={field}
            label="Ad"
            value={profileForm.firstName}
            onChange={(v) => onUpdate('firstName', v)}
            readOnly={!editing}
            light={light}
          />
          <Input
            className={field}
            label="Soyad"
            value={profileForm.lastName}
            onChange={(v) => onUpdate('lastName', v)}
            readOnly={!editing}
            light={light}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            className={field}
            label="Doğum tarixi"
            type="date"
            value={profileForm.dateOfBirth}
            onChange={(v) => onUpdate('dateOfBirth', v)}
            readOnly={!editing}
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
            placeholder="Şirkət adı"
            value={profileForm.workplace}
            onChange={(v) => onUpdate('workplace', v)}
            readOnly={!editing}
            light={light}
          />
          <Input
            className={field}
            label="Oxuduğunuz yer"
            placeholder="Universitet"
            value={profileForm.school}
            onChange={(v) => onUpdate('school', v)}
            readOnly={!editing}
            light={light}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={`text-sm font-medium ${light ? 'text-gray-700' : 'text-white/80'}`}>Bio</label>
          <textarea
            value={profileForm.bio}
            onChange={(e) => onUpdate('bio', e.target.value)}
            readOnly={!editing}
            rows={2}
            placeholder="Özünüz haqqında qısa məlumat..."
            className={`w-full rounded-xl px-4 py-2 text-sm resize-none ${
              light
                ? `bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 ${editing ? 'focus:outline-none focus:border-emerald-500/50' : 'opacity-70 cursor-default'}`
                : `bg-[#18181f] border border-white/10 text-white placeholder-white/30 ${editing ? 'focus:outline-none focus:border-[#c5f135]/50' : 'opacity-70 cursor-default'}`
            }`}
          />
        </div>

        {error ? (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
            {error}
          </p>
        ) : null}
      </div>

      {editing ? (
        <div
          className={`sticky bottom-4 z-20 mx-4 mb-4 flex items-center justify-end gap-2 rounded-2xl border px-3 py-2.5 shadow-lg backdrop-blur-md sm:mx-5 ${
            light
              ? 'border-white/80 bg-white/90'
              : 'border-white/10 bg-[#101017]/95'
          }`}
        >
          <Button size="sm" variant="secondary" onClick={onCancel} disabled={saving}>
            <X size={14} />
            Ləğv et
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving}>
            <Check size={14} />
            {saving ? 'Saxlanılır...' : 'Yadda saxla'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
