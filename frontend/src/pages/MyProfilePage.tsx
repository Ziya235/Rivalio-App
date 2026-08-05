import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Camera, Shield, UserMinus, MessageCircle, Pencil, X, Check } from 'lucide-react'
import { Button, Badge, Tabs, Input, Avatar } from '../components/ui'
import { TEAMS, LEAGUES, PLAYERS } from '../data'
import { useAuth } from '../context/AuthContext'
import type { User } from '../types/auth'

const ME = PLAYERS[0]

const FRIENDS = [
  { id: 'f1', name: 'Tural Həsənov', city: 'Gəncə', sport: 'Futbol', avatar: PLAYERS[1].avatar, mutual: 4 },
  { id: 'f2', name: 'Nigar Əliyeva', city: 'Bakı', sport: 'Voleybol', avatar: PLAYERS[2].avatar, mutual: 2 },
  { id: 'f3', name: 'Rauf Quliyev', city: 'Sumqayıt', sport: 'Basketbol', avatar: PLAYERS[3].avatar, mutual: 1 },
]

const INCOMING_REQUESTS = [
  { id: 'r1', name: 'Kamran İsmayılov', city: 'Bakı', sport: 'Futbol', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop&auto=format' },
]

type ProfileForm = {
  username: string
  firstName: string
  lastName: string
  email: string
  dateOfBirth: string
  bio: string
  workplace: string
  school: string
}

function toDateInputValue(value: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return date.toISOString().slice(0, 10)
}

function calcAge(dateOfBirth: string) {
  const birth = new Date(dateOfBirth)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }
  return age
}

function formFromUser(user: User): ProfileForm {
  return {
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    dateOfBirth: toDateInputValue(user.dateOfBirth),
    bio: user.bio || '',
    workplace: user.workplace || '',
    school: user.school || '',
  }
}

export default function MyProfilePage() {
  const navigate = useNavigate()
  const { user, isLoading, updateProfile, updateProfileImage } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState('Profil Məlumatları')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState<ProfileForm | null>(() =>
    user ? formFromUser(user) : null,
  )

  useEffect(() => {
    if (!user) {
      setForm(null)
      return
    }
    if (!editing) {
      setForm(formFromUser(user))
    }
  }, [user, editing])

  if (isLoading) {
    return (
      <div className="bg-[#08080e] min-h-screen pt-16 flex items-center justify-center">
        <p className="text-white/50 text-sm">Yüklənir...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const profileForm = form ?? formFromUser(user)
  const fullName = `${user.firstName} ${user.lastName}`.trim()
  const age = calcAge(profileForm.dateOfBirth)
  const update = (key: keyof ProfileForm, value: string) =>
    setForm((prev) => {
      const base = prev ?? formFromUser(user)
      return { ...base, [key]: value }
    })

  const handleCancel = () => {
    setForm(formFromUser(user))
    setEditing(false)
    setError(null)
    setSuccess(null)
  }

  const handleImageClick = () => {
    if (!editing || uploadingImage) return
    fileInputRef.current?.click()
  }

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Yalnız şəkil faylı seçin')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Şəkil maksimum 5MB ola bilər')
      return
    }

    setUploadingImage(true)
    setError(null)
    setSuccess(null)
    try {
      await updateProfileImage(file)
      setSuccess('Profil şəkli yeniləndi')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Şəkil yüklənmədi')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async () => {
    if (
      !profileForm.firstName.trim() ||
      !profileForm.lastName.trim() ||
      !profileForm.email.trim() ||
      !profileForm.username.trim() ||
      !profileForm.dateOfBirth
    ) {
      setError('Mütləq sahələr boş ola bilməz')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await updateProfile({
        username: profileForm.username.trim().toLowerCase(),
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        email: profileForm.email.trim(),
        dateOfBirth: profileForm.dateOfBirth,
        bio: profileForm.bio.trim() || undefined,
        workplace: profileForm.workplace.trim() || undefined,
        school: profileForm.school.trim() || undefined,
      })
      setEditing(false)
      setSuccess('Profil məlumatları yeniləndi')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yeniləmə uğursuz oldu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-[#08080e] min-h-screen pt-16 pb-20">
      <div className="relative h-48 bg-gradient-to-r from-[#c5f135]/10 via-[#7c3aed]/10 to-[#3b82f6]/10">
        <img
          src="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1600&h=300&fit=crop&auto=format"
          alt="Cover"
          className="w-full h-full object-cover opacity-30"
        />
      </div>

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 mb-8 relative z-10">
          <div className="relative group">
            <Avatar
              src={user.image || undefined}
              name={fullName}
              size="xl"
              className="!rounded-2xl border-4 border-[#08080e]"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleImageChange}
            />
            <button
              type="button"
              onClick={handleImageClick}
              disabled={!editing || uploadingImage}
              className={`absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center transition-opacity ${
                editing
                  ? 'opacity-100 cursor-pointer'
                  : 'opacity-0 group-hover:opacity-100 cursor-default'
              } ${!editing ? 'pointer-events-none' : ''}`}
            >
              <Camera size={16} className="text-white" />
            </button>
          </div>
          <div className="flex-1 pt-4 sm:pt-0">
            <h1 className="font-display text-4xl font-800 text-white">{fullName}</h1>
            <p className="text-white/45 text-sm mt-1">@{user.username}</p>
            {editing && (
              <p className="text-xs text-white/35 mt-2">
                {uploadingImage ? 'Şəkil yüklənir...' : 'Şəkli dəyişmək üçün avatar üzərinə klik edin'}
              </p>
            )}
          </div>
        </div>

        <Tabs
          tabs={['Profil Məlumatları', 'Komandalar', 'Liqalar', 'Dostlar', 'Tənzimləmələr']}
          active={tab}
          onChange={setTab}
          className="mb-8 overflow-x-auto"
        />

        {tab === 'Profil Məlumatları' && (
          <div className="max-w-xl space-y-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-sm text-white/40">
                {editing ? 'Məlumatları redaktə edirsiniz' : 'Məlumatlar oxuma rejimindədir'}
              </p>
              {!editing ? (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <Pencil size={14} />
                  Redaktə et
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={handleCancel} disabled={saving}>
                    <X size={14} />
                    Ləğv et
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    <Check size={14} />
                    {saving ? 'Saxlanılır...' : 'Yadda saxla'}
                  </Button>
                </div>
              )}
            </div>

            <Input
              label="İstifadəçi adı"
              value={profileForm.username}
              onChange={(v) => update('username', v.replace(/^@/, '').replace(/\s/g, '').toLowerCase())}
              readOnly={!editing}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Ad"
                value={profileForm.firstName}
                onChange={(v) => update('firstName', v)}
                readOnly={!editing}
              />
              <Input
                label="Soyad"
                value={profileForm.lastName}
                onChange={(v) => update('lastName', v)}
                readOnly={!editing}
              />
            </div>

            <Input
              label="Email"
              type="email"
              value={profileForm.email}
              onChange={(v) => update('email', v)}
              readOnly={!editing}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Doğum tarixi"
                type="date"
                value={profileForm.dateOfBirth}
                onChange={(v) => update('dateOfBirth', v)}
                readOnly={!editing}
              />
              <Input
                label="Yaş"
                value={age !== null ? String(age) : '—'}
                onChange={() => {}}
                readOnly
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white/80 block mb-1.5">Bio</label>
              <textarea
                value={profileForm.bio}
                onChange={(e) => update('bio', e.target.value)}
                readOnly={!editing}
                rows={3}
                placeholder="Özünüz haqqında qısa məlumat..."
                className={`w-full bg-[#18181f] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm resize-none ${
                  editing ? 'focus:outline-none focus:border-[#c5f135]/50' : 'opacity-70 cursor-default'
                }`}
              />
            </div>

            <Input
              label="İş yeri"
              placeholder="Şirkət adı"
              value={profileForm.workplace}
              onChange={(v) => update('workplace', v)}
              readOnly={!editing}
            />
            <Input
              label="Oxuduğunuz yer"
              placeholder="Universitet"
              value={profileForm.school}
              onChange={(v) => update('school', v)}
              readOnly={!editing}
            />

            <div>
              <p className="text-sm font-medium text-white/80 mb-1.5">
                Bütün liqalar üzrə statistika
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Oyun', value: user.gamesPlayed ?? 0 },
                  { label: 'Qol', value: user.goals ?? 0, accent: true },
                  { label: 'Asist', value: user.assists ?? 0 },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-[#18181f] border border-white/10 rounded-xl px-3 py-3 text-center"
                  >
                    <div
                      className={`font-display text-2xl font-700 ${
                        stat.accent ? 'text-[#c5f135]' : 'text-white'
                      }`}
                    >
                      {stat.value}
                    </div>
                    <div className="text-white/40 text-xs mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-white/30">
                Public və private liqalardakı bitmiş oyunlar
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-[#c5f135] bg-[#c5f135]/10 border border-[#c5f135]/20 rounded-xl px-4 py-2.5">
                {success}
              </p>
            )}
          </div>
        )}

        {tab === 'Komandalar' && (
          <div className="space-y-6">
            {[
              { title: 'Yaratdığım komandalar', teams: TEAMS.filter((t) => t.captain === ME.name) },
              { title: 'Oynadığım komandalar', teams: TEAMS.slice(0, 1) },
            ].map(({ title, teams }) => (
              <div key={title}>
                <h3 className="text-white font-display text-xl font-700 mb-3">{title}</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {teams.length > 0 ? (
                    teams.map((team) => (
                      <div
                        key={team.id}
                        className="bg-[#101017] card-border rounded-2xl p-4 flex items-center gap-3 hover-card cursor-pointer"
                        onClick={() => navigate('/teams/t1')}
                      >
                        <img src={team.logo} alt={team.name} className="w-12 h-12 rounded-xl object-cover" />
                        <div>
                          <div className="text-white font-semibold">{team.name}</div>
                          <div className="text-white/40 text-xs">
                            {team.sport} · {team.members} üzv
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-white/30 text-sm col-span-2">Yoxdur</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'Liqalar' && (
          <div className="space-y-3">
            {LEAGUES.map((league) => (
              <div
                key={league.id}
                className="bg-[#101017] card-border rounded-2xl p-4 flex items-center gap-3 hover-card cursor-pointer"
                onClick={() => league.isPublic && navigate('/leagues/l1')}
              >
                <img src={league.logo} alt={league.name} className="w-10 h-10 rounded-xl object-cover" />
                <div className="flex-1">
                  <div className="text-white font-medium">{league.name}</div>
                  <div className="text-white/40 text-xs">
                    {league.sport} · {league.season}
                  </div>
                </div>
                <Badge variant={league.isPublic ? 'public' : 'private'}>
                  {league.isPublic ? 'Public' : 'Private'}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {tab === 'Dostlar' && (
          <div className="space-y-8">
            {INCOMING_REQUESTS.length > 0 && (
              <div>
                <h3 className="text-white font-display text-xl font-700 mb-3 flex items-center gap-2">
                  Gələn sorğular
                  <Badge variant="lime">{INCOMING_REQUESTS.length}</Badge>
                </h3>
                <div className="space-y-3">
                  {INCOMING_REQUESTS.map((req) => (
                    <div key={req.id} className="bg-[#101017] card-border rounded-2xl p-4 flex items-center gap-3">
                      <img src={req.avatar} alt={req.name} className="w-10 h-10 rounded-full object-cover" />
                      <div className="flex-1">
                        <div className="text-white font-medium">{req.name}</div>
                        <div className="text-white/40 text-xs">
                          {req.city} · {req.sport}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm">Qəbul et</Button>
                        <Button size="sm" variant="ghost">
                          Rədd et
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-white font-display text-xl font-700 mb-3">Dostlar ({FRIENDS.length})</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {FRIENDS.map((f) => (
                  <div key={f.id} className="bg-[#101017] card-border rounded-2xl p-4 flex items-center gap-3">
                    <img src={f.avatar} alt={f.name} className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{f.name}</div>
                      <div className="text-white/40 text-xs">
                        {f.city} · {f.sport}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => navigate('/chat')}
                        className="p-2 text-white/40 hover:text-[#c5f135] hover:bg-[#c5f135]/10 rounded-lg transition-all"
                      >
                        <MessageCircle size={14} />
                      </button>
                      <button className="p-2 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                        <UserMinus size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'Tənzimləmələr' && (
          <div className="max-w-xl space-y-6">
            <div className="bg-[#101017] card-border rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Shield size={16} className="text-[#c5f135]" />
                Hesab görünürlüyü
              </h3>
              <div className="flex gap-3">
                <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#c5f135]/10 border border-[#c5f135]/40 text-[#c5f135]">
                  Public
                </button>
                <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#18181f] border border-white/10 text-white/50">
                  Private
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
