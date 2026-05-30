import TyrianMark from './TyrianMark'

type Variant = 'inline' | 'pill' | 'callout'

const VARIANT_CLASSES: Record<Variant, string> = {
  inline: 'inline-flex items-center gap-1.5 text-[#C9A84C] font-semibold',
  pill: 'inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#92400E] bg-[#FEF3C7] border border-[#C9A84C]/40 px-2 py-0.5 rounded-full',
  callout: 'inline-flex items-center gap-2 text-[#92400E] font-semibold',
}

export default function FoundingLodgeBadge({
  variant = 'inline',
  label = 'Founding Lodge',
  className = '',
}: {
  variant?: Variant
  label?: string
  className?: string
}) {
  const markSize = variant === 'pill' ? 12 : variant === 'callout' ? 18 : 14

  return (
    <span className={`${VARIANT_CLASSES[variant]} ${className}`}>
      <TyrianMark size={markSize} className="text-[#C9A84C]" />
      {variant === 'pill' ? (
        <span>{label}</span>
      ) : (
        <span style={{ fontFamily: variant === 'inline' ? "'Cormorant Garamond', serif" : undefined }}>
          {label}
        </span>
      )}
    </span>
  )
}
