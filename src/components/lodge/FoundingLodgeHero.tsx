import TyrianHeroBackground from '@/components/brand/TyrianHeroBackground'
import LodgeHeroContent, { type LodgeHeroContentProps } from '@/components/lodge/LodgeHeroContent'

export default function FoundingLodgeHero(props: LodgeHeroContentProps) {
  return (
    <header className="relative overflow-hidden text-white border-b border-gold/25">
      <TyrianHeroBackground />

      <div className="relative py-14 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <LodgeHeroContent {...props} isFounding />
        </div>
      </div>
    </header>
  )
}
