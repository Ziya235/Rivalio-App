import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Navigate, useNavigate, useOutletContext } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Tabs } from '../../components/ui'
import { fetchLeagues } from '../../api/leagues'
import { fetchTeams, type TeamSummary } from '../../api/teams'
import { fetchVisibleChampionships } from '../../api/championships'
import {
  acceptFriendRequest,
  fetchFriends,
  fetchIncomingFriendRequests,
  rejectFriendRequest,
  removeFriend,
  type FriendListItem,
  type FriendRequest,
} from '../../api/friends'
import { createDirectConversation } from '../../api/chat'
import type { League } from '../../types/league'
import type { ChampionshipListItem } from '../../types/championship'
import { useAuth } from '../../context/AuthContext'
import type { AppOutletContext } from '../../App'
import {
  PROFILE_TABS,
  calcAge,
  formFromUser,
  type ProfileForm,
  type ProfileTab,
} from './helpers'
import {
  ChampionshipsTab,
  FriendsTab,
  LeaguesTab,
  ProfileHeader,
  ProfileInfoTab,
  TeamsTab,
} from './components'

export default function MyProfilePage() {
  const navigate = useNavigate()
  const { user, isLoading, updateProfile, updateProfileImage } = useAuth()
  const { isDarkMode } = useOutletContext<AppOutletContext>()
  const light = !isDarkMode
  const bg = light
    ? '[background:linear-gradient(135deg,#E8FFF3_0%,#EAF8FF_48%,#F2EDFF_100%)]'
    : 'bg-[#08080e]'
  const [photoOpen, setPhotoOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<ProfileTab>('Profil Məlumatları')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<ProfileForm | null>(() => (user ? formFromUser(user) : null))
  const [myTeams, setMyTeams] = useState<TeamSummary[]>([])
  const [myLeagues, setMyLeagues] = useState<League[]>([])
  const [myChampionships, setMyChampionships] = useState<ChampionshipListItem[]>([])
  const [friends, setFriends] = useState<FriendListItem[]>([])
  const [incoming, setIncoming] = useState<FriendRequest[]>([])
  const [listsLoading, setListsLoading] = useState(false)
  const [listsError, setListsError] = useState<string | null>(null)
  const [friendsBusyId, setFriendsBusyId] = useState<number | null>(null)

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
      setMyChampionships([])
      setFriends([])
      setIncoming([])
      return
    }

    let cancelled = false
    setListsLoading(true)
    setListsError(null)

    void Promise.all([
      fetchTeams({ mine: true }),
      fetchLeagues(),
      fetchVisibleChampionships({ includeAll: true }),
      fetchFriends(),
      fetchIncomingFriendRequests(),
    ])
      .then(([teams, leagues, championships, friendList, incomingList]) => {
        if (cancelled) return
        setMyTeams(teams)
        setFriends(friendList)
        setIncoming(incomingList)

        const teamIds = new Set(teams.map((team) => team.id))
        const teamLeagueIds = new Set(
          teams.flatMap((team) => (team.leagueMemberships ?? []).map((m) => m.league.id)),
        )
        setMyLeagues(
          leagues.filter(
            (league) =>
              teamLeagueIds.has(league.id) ||
              league.visibility === 'PRIVATE' ||
              league.createdBy.id === user.id,
          ),
        )
        setMyChampionships(
          championships.filter(
            (item) =>
              (item.myTeams?.some((team) => teamIds.has(team.id)) ?? false) ||
              (item.teams?.some((row) => teamIds.has(row.teamId)) ?? false),
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

  const reloadFriends = async () => {
    const [friendList, incomingList] = await Promise.all([
      fetchFriends(),
      fetchIncomingFriendRequests(),
    ])
    setFriends(friendList)
    setIncoming(incomingList)
  }

  if (isLoading) {
    return (
      <div className={`min-h-screen pt-16 flex items-center justify-center ${bg}`}>
        <p className={`text-sm ${light ? 'text-gray-500' : 'text-white/50'}`}>Yüklənir...</p>
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
  }

  const handleOpenPhoto = () => {
    if (uploadingImage) return
    setPhotoOpen(true)
  }

  const handleChangePhoto = () => {
    if (uploadingImage) return
    fileInputRef.current?.click()
  }

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Yalnız şəkil faylı seçin')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Şəkil maksimum 5MB ola bilər')
      return
    }

    setUploadingImage(true)
    setError(null)
    try {
      await updateProfileImage(file)
      toast.success('Profil şəkli yeniləndi')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Şəkil yüklənmədi')
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
      toast.success('Profil məlumatları yeniləndi')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Yeniləmə uğursuz oldu')
    } finally {
      setSaving(false)
    }
  }

  const runFriendAction = async (id: number, action: () => Promise<unknown>) => {
    setFriendsBusyId(id)
    setListsError(null)
    try {
      await action()
      await reloadFriends()
    } catch (err) {
      setListsError(err instanceof Error ? err.message : 'Əməliyyat uğursuz oldu')
    } finally {
      setFriendsBusyId(null)
    }
  }

  return (
    <div className={`min-h-screen pt-24 pb-20 ${bg}`}>
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">
        <ProfileHeader
          light={light}
          user={user}
          fullName={fullName}
          age={age}
          uploadingImage={uploadingImage}
          photoOpen={photoOpen}
          fileInputRef={fileInputRef}
          onOpenPhoto={handleOpenPhoto}
          onClosePhoto={() => setPhotoOpen(false)}
          onChangePhoto={handleChangePhoto}
          onImageChange={handleImageChange}
        />

        <Tabs
          tabs={[...PROFILE_TABS]}
          active={tab}
          onChange={(next) => setTab(next as ProfileTab)}
          className="mb-8 overflow-x-auto"
          light={light}
        />

        {tab === 'Profil Məlumatları' ? (
          <ProfileInfoTab
            light={light}
            editing={editing}
            saving={saving}
            error={error}
            profileForm={profileForm}
            age={age}
            onEdit={() => setEditing(true)}
            onCancel={handleCancel}
            onSave={() => void handleSave()}
            onUpdate={update}
          />
        ) : null}

        {tab === 'Komandalar' ? (
          <TeamsTab
            light={light}
            loading={listsLoading}
            error={listsError}
            captainTeams={captainTeams}
            memberTeams={memberTeams}
            onOpenTeam={(id) => navigate(`/teams/${id}`)}
          />
        ) : null}

        {tab === 'Liqalar' ? (
          <LeaguesTab
            light={light}
            loading={listsLoading}
            error={listsError}
            publicLeagues={publicLeagues}
            privateLeagues={privateLeagues}
            onOpenLeague={(id) => navigate(`/leagues/${id}`)}
          />
        ) : null}

        {tab === 'Çempionatlar' ? (
          <ChampionshipsTab
            light={light}
            loading={listsLoading}
            error={listsError}
            items={myChampionships}
            onOpen={(id) => navigate(`/sports/football/championships/${id}`)}
          />
        ) : null}

        {tab === 'Dostlar' ? (
          <FriendsTab
            light={light}
            loading={listsLoading}
            error={listsError}
            friends={friends}
            incoming={incoming}
            busyId={friendsBusyId}
            onOpenProfile={(userId) => navigate(`/users/${userId}`)}
            onMessage={(userId) =>
              void runFriendAction(userId, () =>
                createDirectConversation(userId).then((conversation) => {
                  navigate(`/chat?conversation=${conversation.id}`)
                }),
              )
            }
            onRemove={(userId) => void runFriendAction(userId, () => removeFriend(userId))}
            onAccept={(requestId) => void runFriendAction(requestId, () => acceptFriendRequest(requestId))}
            onReject={(requestId) => void runFriendAction(requestId, () => rejectFriendRequest(requestId))}
          />
        ) : null}
      </div>
    </div>
  )
}
