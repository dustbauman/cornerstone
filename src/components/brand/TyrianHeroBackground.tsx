import TyrianMark from '@/components/brand/TyrianMark'

interface Props {
  /** Larger watermark for wide hero layouts (e.g. landing page). */
  markSize?: 'default' | 'large'
}

export default function TyrianHeroBackground({ markSize = 'default' }: Props) {
  const desktopMarkSize = markSize === 'large' ? 380 : 300

  return (
    <>
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
        <TyrianMark
          size={desktopMarkSize}
          className="text-white opacity-[0.04] md:opacity-[0.05]"
        />
      </div>
    </>
  )
}
