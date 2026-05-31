import TyrianMark from '@/components/brand/TyrianMark'
import LodgeHeroContent, { type LodgeHeroContentProps } from '@/components/lodge/LodgeHeroContent'

export default function FoundingLodgeHero(props: LodgeHeroContentProps) {
  return (
    <header className="relative overflow-hidden text-white border-b border-gold/25">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, #131f37 0%, #1B2A4A 42%, #243660 72%, #1e3354 100%)',
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_15%_40%,rgba(201,168,76,0.14),transparent_55%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_85%_20%,rgba(201,168,76,0.06),transparent)]"
        aria-hidden
      />

      <div
        className="pointer-events-none select-none absolute -right-8 md:right-0 top-1/2 -translate-y-1/2 translate-x-[18%] md:translate-x-[6%] hidden sm:block"
        aria-hidden
      >
        <TyrianMark size={300} className="text-white opacity-[0.07] md:opacity-[0.08]" />
      </div>
      <div className="pointer-events-none select-none absolute right-2 top-6 sm:hidden" aria-hidden>
        <TyrianMark size={100} className="text-white opacity-[0.06]" />
      </div>

      <div className="relative py-14 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <LodgeHeroContent {...props} isFounding />
        </div>
      </div>
    </header>
  )
}
