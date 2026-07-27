import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Check, AtSign, Camera, X } from 'lucide-react'
import { Button, Input } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../types/auth'

const USERNAME_REGEX = /^[a-z0-9._]{3,30}$/
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, updateProfileImage } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [form, setForm] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPass: '',
    dob: '',
    role: 'USER' as UserRole,
    bio: '',
    workplace: '',
    school: '',
  })

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const update = (key: string, value: string | string[]) => setForm((f) => ({ ...f, [key]: value }))

  const usernameNormalized = form.username.trim().toLowerCase()
  const usernameValid = USERNAME_REGEX.test(usernameNormalized)
  const passwordsMatch = !form.password || !form.confirmPass || form.password === form.confirmPass
  const step1Valid =
    usernameValid &&
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    form.password.length >= 6 &&
    form.confirmPass &&
    form.password === form.confirmPass &&
    form.dob

  const handleUsernameChange = (value: string) => {
    const cleaned = value.replace(/^@/, '').replace(/\s/g, '').toLowerCase()
    update('username', cleaned)
  }

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Yalnız şəkil faylı seçin')
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError('Şəkil maksimum 5MB ola bilər')
      return
    }

    setError(null)
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    setImageFile(file)
  }

  const clearImage = () => {
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setImageFile(null)
  }

  const handleFinish = async () => {
    if (!step1Valid || loading) return

    setError(null)
    setLoading(true)
    try {
      await register({
        username: usernameNormalized,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        dateOfBirth: form.dob,
        role: form.role,
        bio: form.bio.trim() || undefined,
        workplace: form.workplace.trim() || undefined,
        school: form.school.trim() || undefined,
      })

      if (imageFile) {
        try {
          await updateProfileImage(imageFile)
        } catch {
          // Account is created; image can be added later from profile
        }
      }

      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Qeydiyyat uğursuz oldu')
    } finally {
      setLoading(false)
    }
  }

  const steps = ['Əsas məlumatlar', 'Profil (optional)']

  return (
    <div className="min-h-screen bg-[#08080e] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#c5f135] flex items-center justify-center font-display font-bold text-[#08080e]">
            R
          </div>
          <span className="font-display font-700 text-2xl text-white">
            Rival<span className="text-[#c5f135]">io</span>
          </span>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                  i + 1 < step
                    ? 'bg-[#c5f135] text-[#08080e]'
                    : i + 1 === step
                      ? 'bg-[#c5f135]/20 border border-[#c5f135] text-[#c5f135]'
                      : 'bg-white/5 border border-white/10 text-white/30'
                }`}
              >
                {i + 1 < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i + 1 === step ? 'text-white' : 'text-white/30'}`}>
                {s}
              </span>
              {i < steps.length - 1 && <div className="flex-1 h-px bg-white/8 mx-2" />}
            </div>
          ))}
        </div>

        <div className="bg-[#101017] card-border rounded-3xl p-7">
          <h2 className="font-display text-3xl font-700 text-white mb-1">{steps[step - 1]}</h2>
          <p className="text-white/40 text-sm mb-6">
            Addım {step} / {steps.length}
          </p>

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-white/80">İstifadəçi adı *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                    <AtSign size={16} />
                  </span>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="rivalio_ali"
                    autoComplete="username"
                    maxLength={30}
                    className={`w-full bg-[#18181f] border rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/30 text-sm transition-all focus:outline-none ${
                      form.username && !usernameValid
                        ? 'border-red-500/50 focus:border-red-500/70'
                        : 'border-white/10 focus:border-[#c5f135]/50'
                    }`}
                  />
                </div>
                {form.username && !usernameValid ? (
                  <span className="text-xs text-red-400">
                    3–30 simvol: yalnız kiçik hərf, rəqəm, nöqtə və alt xətt
                  </span>
                ) : (
                  <span className="text-xs text-white/35">
                    Unikal olmalıdır — Instagramdakı kimi, məs: @rivalio_ali
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Ad *"
                  placeholder="Əli"
                  value={form.firstName}
                  onChange={(v) => update('firstName', v)}
                />
                <Input
                  label="Soyad *"
                  placeholder="Məmmədov"
                  value={form.lastName}
                  onChange={(v) => update('lastName', v)}
                />
              </div>

              <Input
                label="Email *"
                type="email"
                placeholder="ali@example.com"
                value={form.email}
                onChange={(v) => update('email', v)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Şifrə *"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(v) => update('password', v)}
                  error={form.password && form.password.length < 6 ? 'Minimum 6 simvol' : undefined}
                />
                <Input
                  label="Şifrəni təkrar et *"
                  type="password"
                  placeholder="••••••••"
                  value={form.confirmPass}
                  onChange={(v) => update('confirmPass', v)}
                  error={!passwordsMatch ? 'Şifrələr uyğun gəlmir' : undefined}
                />
              </div>

              <Input
                label="Doğum tarixi *"
                type="date"
                value={form.dob}
                onChange={(v) => update('dob', v)}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-white/80">Hesab tipi *</label>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      { value: 'USER', label: 'İstifadəçi', desc: 'Oyunçu / komanda' },
                      { value: 'ADMIN', label: 'Admin', desc: 'İdarə paneli' },
                    ] as const
                  ).map((option) => {
                    const selected = form.role === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => update('role', option.value)}
                        className={`text-left rounded-xl border px-4 py-3 transition-all ${
                          selected
                            ? 'border-[#c5f135]/60 bg-[#c5f135]/10'
                            : 'border-white/10 bg-[#18181f] hover:border-white/20'
                        }`}
                      >
                        <span
                          className={`block text-sm font-semibold ${
                            selected ? 'text-[#c5f135]' : 'text-white'
                          }`}
                        >
                          {option.label}
                        </span>
                        <span className="block text-xs text-white/40 mt-0.5">{option.desc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleImageChange}
                />
                <div className="relative inline-block">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-2xl bg-[#18181f] border-2 border-dashed border-white/15 flex flex-col items-center justify-center cursor-pointer hover:border-[#c5f135]/40 transition-colors overflow-hidden"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Profil şəkli" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Camera size={22} className="text-white/40 mb-1" />
                        <span className="text-[10px] text-white/35">Şəkil seç</span>
                      </>
                    )}
                  </button>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#18181f] border border-white/15 text-white/70 hover:text-white flex items-center justify-center"
                      aria-label="Şəkli sil"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <p className="text-xs text-white/35 mt-2">
                  {imageFile ? imageFile.name : 'Optional — jpg, png, webp (max 5MB)'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-white/80 block mb-1.5">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => update('bio', e.target.value)}
                  placeholder="Özünüz haqqında qısa məlumat..."
                  rows={2}
                  className="w-full bg-[#18181f] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm resize-none"
                />
              </div>
              <Input
                label="İş yeri (optional)"
                placeholder="Şirkət adı"
                value={form.workplace}
                onChange={(v) => update('workplace', v)}
              />
              <Input
                label="Oxuduğunuz yer (optional)"
                placeholder="Universitetiniz"
                value={form.school}
                onChange={(v) => update('school', v)}
              />

              <div className="bg-[#c5f135]/5 border border-[#c5f135]/20 rounded-xl p-3 text-xs text-white/55">
                Bu məlumatlar optional-dır. İstənilən vaxt profil səhifənizdən əlavə edə bilərsiniz.
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          <div className="flex gap-3 mt-7">
            {step > 1 && (
              <Button
                onClick={() => setStep((s) => s - 1)}
                variant="secondary"
                size="md"
                className="flex-1"
                disabled={loading}
              >
                <ArrowLeft size={16} />
                Geri
              </Button>
            )}
            {step < steps.length ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                size="md"
                className="flex-1"
                disabled={step === 1 && !step1Valid}
              >
                İrəli
                <ArrowRight size={16} />
              </Button>
            ) : (
              <Button onClick={handleFinish} size="md" className="flex-1" disabled={loading || !step1Valid}>
                <Check size={16} />
                {loading ? 'Qeydiyyat edilir...' : 'Qeydiyyatı tamamla'}
              </Button>
            )}
          </div>

          {step === 1 && (
            <p className="text-center text-sm text-white/40 mt-4">
              Artıq hesabın var?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-[#c5f135] font-semibold hover:text-[#d4f55a] transition-colors"
              >
                Daxil ol
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
