import { useOutletContext } from 'react-router-dom'
import type { AppOutletContext } from '../../App'
import { LoginBackground, LoginForm, LoginHero } from './components'

export default function LoginPage() {
  const { isDarkMode } = useOutletContext<AppOutletContext>()
  const light = !isDarkMode

  return (
    <div
      className={`relative grid min-h-dvh lg:h-dvh lg:grid-cols-2 lg:overflow-hidden ${
        light ? '' : 'bg-[#08080e]'
      }`}
    >
      <LoginBackground light={light} />
      <LoginHero />
      <LoginForm light={light} />
    </div>
  )
}
