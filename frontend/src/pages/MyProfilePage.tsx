import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Navigate, useNavigate, useOutletContext } from 'react-router-dom'
import { Camera, Shield, UserMinus, MessageCircle, Pencil, X, Check } from 'lucide-react'
import { Button, Badge, Tabs, Input, Avatar } from '../components/ui'
import { PLAYERS } from '../data'
import { fetchLeagues } from '../api/leagues'
import { fetchTeams, type TeamSummary } from '../api/teams'
import type { League } from '../types/league'
import { useAuth } from '../context/AuthContext'
import type { User } from '../types/auth'
import type { AppOutletContext } from '../App'

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

function TeamLogo({
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
    return <img src={src} alt={name} className={`${box} rounded-xl object-cover`} />
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
  const { isDarkMode } = useOutletContext<AppOutletContext>()
  const light = !isDarkMode
  const bg = light ? "[background:linear-gradient(135deg,#E8FFF3_0%,#EAF8FF_48%,#F2EDFF_100%)]" : "bg-[#08080e]"
  const cardCls = light ? "bg-white/70 backdrop-blur-sm border border-gray-200" : "bg-[#101017] card-border"
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
  const [myTeams, setMyTeams] = useState<TeamSummary[]>([])
  const [myLeagues, setMyLeagues] = useState<League[]>([])
  const [listsLoading, setListsLoading] = useState(false)
  const [listsError, setListsError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setForm(null)
      return
    }
    if (!editing) {
      setForm(formFromUser(user))
    }
  }, [user, editing])

  useEffect(() => {
    if (!user) {
      setMyTeams([])
      setMyLeagues([])
      return
    }

    let cancelled = false
    setListsLoading(true)
    setListsError(null)

    void Promise.all([fetchTeams({ mine: true }), fetchLeagues()])
      .then(([teams, leagues]) => {
        if (cancelled) return
        setMyTeams(teams)

        const teamLeagueIds = new Set(
          teams.flatMap((team) =>
            (team.leagueMemberships ?? []).map((m) => m.league.id),
          ),
        )
        setMyLeagues(
          leagues.filter(
            (league) =>
              teamLeagueIds.has(league.id) ||
              league.visibility === 'PRIVATE' ||
              league.createdBy.id === user.id,
          ),
        )
      })
      .catch((err) => {
        if (cancelled) return
        setListsError(err instanceof Error ? err.message : 'Yüklənmədi')
      })
      .finally(() => {
        if (!cancelled) setListsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  const captainTeams = useMemo(
    () => (user ? myTeams.filter((team) => team.captainId === user.id) : []),
    [myTeams, user],
  )
  const memberTeams = useMemo(
    () => (user ? myTeams.filter((team) => team.captainId !== user.id) : []),
    [myTeams, user],
  )
  const publicLeagues = useMemo(
    () => myLeagues.filter((league) => league.visibility === 'PUBLIC'),
    [myLeagues],
  )
  const privateLeagues = useMemo(
    () => myLeagues.filter((league) => league.visibility === 'PRIVATE'),
    [myLeagues],
  )

  if (isLoading) {
    return (
      <div className={`min-h-screen pt-16 flex items-center justify-center ${bg}`}>
        <p className={`text-sm ${light ? "text-gray-500" : "text-white/50"}`}>Yüklənir...</p>
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
    <div className={`min-h-screen pt-16 pb-20 ${bg}`}>
      <div className={`relative h-48 ${light ? "bg-gradient-to-r from-emerald-500/10 via-purple-500/10 to-blue-500/10" : "bg-gradient-to-r from-[#c5f135]/10 via-[#7c3aed]/10 to-[#3b82f6]/10"}`}>
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
              className={`!rounded-2xl border-4 ${light ? "border-white" : "border-[#08080e]"}`}
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
            <h1 className={`font-display text-4xl font-800 ${light ? "text-gray-900" : "text-white"}`}>{fullName}</h1>
            <p className={`text-sm mt-1 ${light ? "text-gray-400" : "text-white/45"}`}>@{user.username}</p>
            {editing && (
              <p className={`text-xs mt-2 ${light ? "text-gray-400" : "text-white/35"}`}>
                {uploadingImage ? 'Şəkil yüklənir...' : 'Şəkli dəyişmək üçün avatar üzərinə klik edin'}
              </p>
            )}
          </div>
        </div>

        <Tabs
          tabs={['Profil Məlumatları', 'Komandalar', 'Liqalar', 'Dostlar']}
          active={tab}
          onChange={setTab}
          className="mb-8 overflow-x-auto"
          light={light}
        />

        {tab === 'Profil Məlumatları' && (
          <div className="max-w-xl space-y-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className={`text-sm ${light ? "text-gray-400" : "text-white/40"}`}>
                {editing ? 'Məlumatları redaktə edirsiniz' : 'Məlumatlar oxuma rejimindədir'}
              </p>
              {!editing ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(true)}
                  className={
                    light
                      ? '!text-emerald-600 !border-emerald-500/50 hover:!bg-emerald-500/10 hover:!text-emerald-700 hover:!border-emerald-500'
                      : '!text-[#c5f135] !border-[#c5f135]/40 hover:!bg-[#c5f135]/10 hover:!text-[#c5f135]'
                  }
                >
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
              light={light}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Ad"
                value={profileForm.firstName}
                onChange={(v) => update('firstName', v)}
                readOnly={!editing}
                light={light}
              />
              <Input
                label="Soyad"
                value={profileForm.lastName}
                onChange={(v) => update('lastName', v)}
                readOnly={!editing}
                light={light}
              />
            </div>

            <Input
              label="Email"
              type="email"
              value={profileForm.email}
              onChange={(v) => update('email', v)}
              readOnly={!editing}
              light={light}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Doğum tarixi"
                type="date"
                value={profileForm.dateOfBirth}
                onChange={(v) => update('dateOfBirth', v)}
                readOnly={!editing}
                light={light}
              />
              <Input
                label="Yaş"
                value={age !== null ? String(age) : '—'}
                onChange={() => {}}
                readOnly
                light={light}
              />
            </div>

            <div>
              <label className={`text-sm font-medium block mb-1.5 ${light ? "text-gray-700" : "text-white/80"}`}>Bio</label>
              <textarea
                value={profileForm.bio}
                onChange={(e) => update('bio', e.target.value)}
                readOnly={!editing}
                rows={3}
                placeholder="Özünüz haqqında qısa məlumat..."
                className={`w-full rounded-xl px-4 py-2.5 text-sm resize-none ${
                  light
                    ? `bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 ${editing ? 'focus:outline-none focus:border-emerald-500/50' : 'opacity-70 cursor-default'}`
                    : `bg-[#18181f] border border-white/10 text-white placeholder-white/30 ${editing ? 'focus:outline-none focus:border-[#c5f135]/50' : 'opacity-70 cursor-default'}`
                }`}
              />
            </div>

            <Input
              label="İş yeri"
              placeholder="Şirkət adı"
              value={profileForm.workplace}
              onChange={(v) => update('workplace', v)}
              readOnly={!editing}
              light={light}
            />
            <Input
              label="Oxuduğunuz yer"
              placeholder="Universitet"
              value={profileForm.school}
              onChange={(v) => update('school', v)}
              readOnly={!editing}
              light={light}
            />

            <div>
              <p className={`text-sm font-medium mb-1.5 ${light ? "text-gray-700" : "text-white/80"}`}>
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
                    className={`rounded-xl px-3 py-3 text-center ${light ? "bg-gray-50 border border-gray-200" : "bg-[#18181f] border border-white/10"}`}
                  >
                    <div
                      className={`font-display text-2xl font-700 ${
                        stat.accent ? (light ? 'text-emerald-600' : 'text-[#c5f135]') : (light ? 'text-gray-900' : 'text-white')
                      }`}
                    >
                      {stat.value}
                    </div>
                    <div className={`text-xs mt-0.5 ${light ? "text-gray-400" : "text-white/40"}`}>{stat.label}</div>
                  </div>
                ))}
              </div>
              <p className={`mt-2 text-xs ${light ? "text-gray-400" : "text-white/30"}`}>
                Public və private liqalardakı bitmiş oyunlar
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}
            {success && (
              <p className={`text-sm rounded-xl px-4 py-2.5 ${light ? "text-emerald-600 bg-emerald-500/10 border border-emerald-500/20" : "text-[#c5f135] bg-[#c5f135]/10 border border-[#c5f135]/20"}`}>
                {success}
              </p>
            )}
          </div>
        )}

        {tab === 'Komandalar' && (
          <div className="space-y-6">
            {listsLoading ? (
              <p className={`text-sm ${light ? 'text-gray-400' : 'text-white/40'}`}>Yüklənir...</p>
            ) : listsError ? (
              <p className="text-sm text-red-400">{listsError}</p>
            ) : (
              [
                { title: 'Kapitan olduğum komandalar', teams: captainTeams },
                { title: 'Üzv olduğum komandalar', teams: memberTeams },
              ].map(({ title, teams }) => (
                <div key={title}>
                  <h3 className={`font-display text-xl font-700 mb-3 ${light ? 'text-gray-900' : 'text-white'}`}>
                    {title}
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {teams.length > 0 ? (
                      teams.map((team) => (
                        <div
                          key={team.id}
                          className={`rounded-2xl p-4 flex items-center gap-3 cursor-pointer ${
                            light
                              ? 'bg-white/70 backdrop-blur-sm border border-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all'
                              : 'bg-[#101017] card-border hover-card'
                          }`}
                          onClick={() => navigate(`/teams/${team.id}`)}
                        >
                          <TeamLogo src={team.logo} name={team.name} light={light} />
                          <div>
                            <div className={`font-semibold ${light ? 'text-gray-900' : 'text-white'}`}>
                              {team.name}
                            </div>
                            <div className={`text-xs ${light ? 'text-gray-400' : 'text-white/40'}`}>
                              {team.city ? `${team.city} · ` : ''}
                              {team._count?.players ?? 0} üzv
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={`text-sm col-span-2 ${light ? 'text-gray-400' : 'text-white/30'}`}>
                        Yoxdur
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'Liqalar' && (
          <div className="space-y-6">
            {listsLoading ? (
              <p className={`text-sm ${light ? 'text-gray-400' : 'text-white/40'}`}>Yüklənir...</p>
            ) : listsError ? (
              <p className="text-sm text-red-400">{listsError}</p>
            ) : (
              [
                { title: 'Public liqalar', leagues: publicLeagues },
                { title: 'Private liqalar', leagues: privateLeagues },
              ].map(({ title, leagues }) => (
                <div key={title}>
                  <h3 className={`font-display text-xl font-700 mb-3 ${light ? 'text-gray-900' : 'text-white'}`}>
                    {title}
                  </h3>
                  <div className="space-y-3">
                    {leagues.length > 0 ? (
                      leagues.map((league) => {
                        const isPublic = league.visibility === 'PUBLIC'
                        return (
                          <div
                            key={league.id}
                            className={`rounded-2xl p-4 flex items-center gap-3 cursor-pointer ${
                              light
                                ? 'bg-white/70 backdrop-blur-sm border border-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all'
                                : 'bg-[#101017] card-border hover-card'
                            }`}
                            onClick={() => navigate(`/leagues/${league.id}`)}
                          >
                            <TeamLogo src={league.logo} name={league.name} light={light} size="sm" />
                            <div className="flex-1 min-w-0">
                              <div className={`font-medium truncate ${light ? 'text-gray-900' : 'text-white'}`}>
                                {league.name}
                              </div>
                              <div className={`text-xs ${light ? 'text-gray-400' : 'text-white/40'}`}>
                                {league.sport?.name ?? 'Liqa'}
                                {league.season ? ` · ${league.season}` : ''}
                              </div>
                            </div>
                            <Badge variant={isPublic ? 'public' : 'private'}>
                              {isPublic ? 'Public' : 'Private'}
                            </Badge>
                          </div>
                        )
                      })
                    ) : (
                      <div className={`text-sm ${light ? 'text-gray-400' : 'text-white/30'}`}>Yoxdur</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'Dostlar' && (
          <div className="space-y-8">
            {INCOMING_REQUESTS.length > 0 && (
              <div>
                <h3 className={`font-display text-xl font-700 mb-3 flex items-center gap-2 ${light ? "text-gray-900" : "text-white"}`}>
                  Gələn sorğular
                  <Badge variant="lime">{INCOMING_REQUESTS.length}</Badge>
                </h3>
                <div className="space-y-3">
                  {INCOMING_REQUESTS.map((req) => (
                    <div key={req.id} className={`rounded-2xl p-4 flex items-center gap-3 ${cardCls}`}>
                      <img src={req.avatar} alt={req.name} className="w-10 h-10 rounded-full object-cover" />
                      <div className="flex-1">
                        <div className={`font-medium ${light ? "text-gray-900" : "text-white"}`}>{req.name}</div>
                        <div className={`text-xs ${light ? "text-gray-400" : "text-white/40"}`}>
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
              <h3 className={`font-display text-xl font-700 mb-3 ${light ? "text-gray-900" : "text-white"}`}>Dostlar ({FRIENDS.length})</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {FRIENDS.map((f) => (
                  <div key={f.id} className={`rounded-2xl p-4 flex items-center gap-3 ${cardCls}`}>
                    <img src={f.avatar} alt={f.name} className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium truncate ${light ? "text-gray-900" : "text-white"}`}>{f.name}</div>
                      <div className={`text-xs ${light ? "text-gray-400" : "text-white/40"}`}>
                        {f.city} · {f.sport}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => navigate('/chat')}
                        className={`p-2 rounded-lg transition-all ${light ? "text-gray-400 hover:text-emerald-600 hover:bg-emerald-500/10" : "text-white/40 hover:text-[#c5f135] hover:bg-[#c5f135]/10"}`}
                      >
                        <MessageCircle size={14} />
                      </button>
                      <button className={`p-2 rounded-lg transition-all ${light ? "text-gray-400 hover:text-red-500 hover:bg-red-500/10" : "text-white/40 hover:text-red-400 hover:bg-red-400/10"}`}>
                        <UserMinus size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

    
      </div>
    </div>
  )
}
