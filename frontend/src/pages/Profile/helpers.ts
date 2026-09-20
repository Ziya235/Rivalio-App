import type { User } from '../../types/auth'

export const PROFILE_TABS = [
  'Profil Məlumatları',
  'Komandalar',
  'Liqalar',
  'Çempionatlar',
  'Dostlar',
] as const

export type ProfileTab = (typeof PROFILE_TABS)[number]

export type ProfileForm = {
  username: string
  firstName: string
  lastName: string
  email: string
  dateOfBirth: string
  bio: string
  workplace: string
  school: string
}

export function toDateInputValue(value: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return date.toISOString().slice(0, 10)
}

export function calcAge(dateOfBirth: string) {
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

export function formFromUser(user: User): ProfileForm {
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

