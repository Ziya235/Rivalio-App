import { useOutletContext } from 'react-router-dom'
import type { AppOutletContext } from '../../App'
import {
  HeroSection,
  SportsSection,
  FeaturesSection,
  HowItWorksSection,
  StatsSection,
  CommunitySection,
  TestimonialsSection,
  FaqSection,
  FinalCtaSection,
} from './components'

export default function LandingPage() {
  const { isDarkMode } = useOutletContext<AppOutletContext>()

  return (
    <div
      className={`landing-page min-h-screen transition-colors duration-300 ${
        isDarkMode ? 'landing-page--dark' : 'landing-page--light'
      }`}
    >
      <HeroSection />
      <SportsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <StatsSection />
      <CommunitySection />
      <TestimonialsSection />
      <FaqSection />
      <FinalCtaSection />
    </div>
  )
}
