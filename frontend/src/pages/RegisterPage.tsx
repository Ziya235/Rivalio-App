import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Check, AtSign, Camera, X } from 'lucide-react'
import { Button, Input } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../types/auth'
import type { AppOutletContext } from '../App'

const USERNAME_REGEX = /^[a-z0-9._]{3,30}$/
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, updateProfileImage } = useAuth()
  const { isDarkMode } = useOutletContext<AppOutletContext>()
  const light = !isDarkMode
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
    <div className={`min-h-screen relative overflow-hidden ${light ? "" : "bg-[#08080e]"}`}>
      {light && (
        <>
          <div className="absolute inset-0 [background:linear-gradient(135deg,#dbeafe_0%,#e0f2fe_25%,#f0f9ff_50%,#ede9fe_75%,#e0f2fe_100%)]" />
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-sky-300/30 via-blue-200/20 to-transparent blur-3xl" />
          <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-indigo-300/25 via-purple-200/15 to-transparent blur-3xl" />
          <div className="absolute top-[30%] left-[20%] w-[300px] h-[300px] rounded-full bg-gradient-to-br from-emerald-200/20 to-transparent blur-3xl" />
        </>
      )}
      <div className="relative z-10 flex items-center justify-center px-4 py-12 min-h-screen">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-display font-bold text-sm ${light ? "bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/25" : "bg-[#c5f135] text-[#08080e]"}`}>
            R
          </div>
          <span className={`font-display font-700 text-2xl ${light ? "text-gray-900" : "text-white"}`}>
            Rival<span className={light ? "text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-500" : "text-[#c5f135]"}>io</span>
          </span>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                  i + 1 < step
                    ? light ? 'bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-md shadow-sky-500/20' : 'bg-[#c5f135] text-[#08080e]'
                    : i + 1 === step
                      ? light ? 'bg-sky-500/15 border-2 border-sky-500 text-sky-600' : 'bg-[#c5f135]/20 border border-[#c5f135] text-[#c5f135]'
                      : light ? 'bg-white/60 border border-gray-200/80 text-gray-400' : 'bg-white/5 border border-white/10 text-white/30'
                }`}
              >
                {i + 1 < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i + 1 === step ? (light ? 'text-gray-900' : 'text-white') : (light ? 'text-gray-400' : 'text-white/30')}`}>
                {s}
              </span>
              {i < steps.length - 1 && <div className={`flex-1 h-px mx-2 ${light ? "bg-gray-200" : "bg-white/8"}`} />}
            </div>
          ))}
        </div>

        <div className={`rounded-3xl p-7 ${light ? "bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_8px_40px_rgba(56,126,245,0.08)]" : "bg-[#101017] card-border"}`}>
          <h2 className={`font-display text-3xl font-700 mb-1 ${light ? "text-gray-900" : "text-white"}`}>{steps[step - 1]}</h2>
          <p className={`text-sm mb-6 ${light ? "text-gray-400" : "text-white/40"}`}>
            Addım {step} / {steps.length}
          </p>

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className={`text-sm font-medium ${light ? "text-gray-700" : "text-white/80"}`}>İstifadəçi adı *</label>
                <div className="relative">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${light ? "text-gray-400" : "text-white/40"}`}>
                    <AtSign size={16} />
                  </span>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="rivalio_ali"
                    autoComplete="username"
                    maxLength={30}
                    className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-sm transition-all focus:outline-none ${
                      light
                        ? `bg-gray-50 border text-gray-900 placeholder-gray-400 ${
                            form.username && !usernameValid
                              ? 'border-red-500/50 focus:border-red-500/70'
                              : 'border-gray-200 focus:border-emerald-500/50'
                          }`
                        : `bg-[#18181f] border text-white placeholder-white/30 ${
                            form.username && !usernameValid
                              ? 'border-red-500/50 focus:border-red-500/70'
                              : 'border-white/10 focus:border-[#c5f135]/50'
                          }`
                    }`}
                  />
                </div>
                {form.username && !usernameValid ? (
                  <span className="text-xs text-red-400">
                    3–30 simvol: yalnız kiçik hərf, rəqəm, nöqtə və alt xətt
                  </span>
                ) : (
                  <span className={`text-xs ${light ? "text-gray-400" : "text-white/35"}`}>
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
                  light={light}
                />
                <Input
                  label="Soyad *"
                  placeholder="Məmmədov"
                  value={form.lastName}
                  onChange={(v) => update('lastName', v)}
                  light={light}
                />
              </div>

              <Input
                label="Email *"
                type="email"
                placeholder="ali@example.com"
                value={form.email}
                onChange={(v) => update('email', v)}
                light={light}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Şifrə *"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(v) => update('password', v)}
                  error={form.password && form.password.length < 6 ? 'Minimum 6 simvol' : undefined}
                  light={light}
                />
                <Input
                  label="Şifrəni təkrar et *"
                  type="password"
                  placeholder="••••••••"
                  value={form.confirmPass}
                  onChange={(v) => update('confirmPass', v)}
                  error={!passwordsMatch ? 'Şifrələr uyğun gəlmir' : undefined}
                  light={light}
                />
              </div>

              <Input
                label="Doğum tarixi *"
                type="date"
                value={form.dob}
                onChange={(v) => update('dob', v)}
                light={light}
              />

              <div className="flex flex-col gap-1.5">
                <label className={`text-sm font-medium ${light ? "text-gray-700" : "text-white/80"}`}>Hesab tipi *</label>
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
                            ? light ? 'border-sky-500/60 bg-sky-500/10 shadow-sm shadow-sky-500/10' : 'border-[#c5f135]/60 bg-[#c5f135]/10'
                            : light ? 'border-gray-200/80 bg-white/50 hover:border-gray-300' : 'border-white/10 bg-[#18181f] hover:border-white/20'
                        }`}
                      >
                        <span
                          className={`block text-sm font-semibold ${
                            selected ? (light ? 'text-sky-600' : 'text-[#c5f135]') : (light ? 'text-gray-900' : 'text-white')
                          }`}
                        >
                          {option.label}
                        </span>
                        <span className={`block text-xs mt-0.5 ${light ? "text-gray-400" : "text-white/40"}`}>{option.desc}</span>
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
                    className={`w-24 h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden ${
                      light
                        ? "bg-white/50 border-sky-300/50 hover:border-sky-500/50"
                        : "bg-[#18181f] border-white/15 hover:border-[#c5f135]/40"
                    }`}
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Profil şəkli" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Camera size={22} className={light ? "text-gray-400 mb-1" : "text-white/40 mb-1"} />
                        <span className={`text-[10px] ${light ? "text-gray-400" : "text-white/35"}`}>Şəkil seç</span>
                      </>
                    )}
                  </button>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={clearImage}
                      className={`absolute -top-2 -right-2 w-7 h-7 rounded-full border flex items-center justify-center ${
                        light
                          ? "bg-white border-gray-200 text-gray-500 hover:text-gray-700"
                          : "bg-[#18181f] border-white/15 text-white/70 hover:text-white"
                      }`}
                      aria-label="Şəkli sil"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <p className={`text-xs mt-2 ${light ? "text-gray-400" : "text-white/35"}`}>
                  {imageFile ? imageFile.name : 'Optional — jpg, png, webp (max 5MB)'}
                </p>
              </div>
              <div>
                <label className={`text-sm font-medium block mb-1.5 ${light ? "text-gray-700" : "text-white/80"}`}>Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => update('bio', e.target.value)}
                  placeholder="Özünüz haqqında qısa məlumat..."
                  rows={2}
                  className={`w-full rounded-xl px-4 py-2.5 text-sm resize-none ${
                    light
                      ? "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400"
                      : "bg-[#18181f] border border-white/10 text-white placeholder-white/30"
                  }`}
                />
              </div>
              <Input
                label="İş yeri (optional)"
                placeholder="Şirkət adı"
                value={form.workplace}
                onChange={(v) => update('workplace', v)}
                light={light}
              />
              <Input
                label="Oxuduğunuz yer (optional)"
                placeholder="Universitetiniz"
                value={form.school}
                onChange={(v) => update('school', v)}
                light={light}
              />

              <div className={`rounded-xl p-3 text-xs ${light ? "bg-sky-500/5 border border-sky-500/20 text-gray-500" : "bg-[#c5f135]/5 border border-[#c5f135]/20 text-white/55"}`}>
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
            <p className={`text-center text-sm mt-4 ${light ? "text-gray-400" : "text-white/40"}`}>
              Artıq hesabın var?{' '}
              <button
                onClick={() => navigate('/login')}
                className={`font-semibold transition-colors ${light ? "text-sky-600 hover:text-sky-700" : "text-[#c5f135] hover:text-[#d4f55a]"}`}
              >
                Daxil ol
              </button>
            </p>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
