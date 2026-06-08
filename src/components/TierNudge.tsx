'use client'

const TIER_BOUNDARIES = {
  small:    { min: 0,   max: 39  },
  standard: { min: 40,  max: 100 },
  large:    { min: 101, max: Infinity },
}

const TIERS = [
  { value: 'small',    label: 'Small',    price: '$99/year', cap: 'Unlimited member invites' },
  { value: 'standard', label: 'Standard', price: '$99/year', cap: 'Unlimited member invites' },
  { value: 'large',    label: 'Large',    price: '$99/year', cap: 'Unlimited member invites' },
]

function getRecommended(memberCount: number): string {
  if (memberCount > 100) return 'large'
  if (memberCount >= 40) return 'standard'
  return 'small'
}

function getNudge(selectedSize: string, memberCount: number | null): 'none' | 'upgrade' | 'downgrade' {
  if (!memberCount) return 'none'
  const boundary = TIER_BOUNDARIES[selectedSize as keyof typeof TIER_BOUNDARIES]
  if (!boundary) return 'none'
  if (memberCount > boundary.max) return 'upgrade'
  if (memberCount < boundary.min && selectedSize !== 'small') return 'downgrade'
  return 'none'
}

interface TierNudgeProps {
  memberCount: number | null
  selectedSize: string
  onTierChange: (size: string) => void
}

export function TierNudge({ memberCount, selectedSize, onTierChange }: TierNudgeProps) {
  const nudge = getNudge(selectedSize, memberCount)
  if (nudge === 'none' || !memberCount) return null

  const recommended = getRecommended(memberCount)
  const recommendedTier = TIERS.find(t => t.value === recommended)!

  return (
    <div className="border-l-4 border-gold bg-[#FAF3E0] rounded-r-xl px-4 py-4 mb-5">
      <p className="text-sm font-semibold text-navy mb-1">
        Based on Grand Lodge records, your lodge has approximately{' '}
        <strong>{memberCount} registered members</strong>.
      </p>
      <p className="text-xs text-muted leading-relaxed mb-4">
        We&apos;ve suggested <strong>{recommendedTier.label}</strong> as the right fit.
        Every lodge gets the same $99/year platform access with unlimited member invites.
      </p>

      <div className="space-y-1.5">
        {TIERS.map(tier => {
          const isSelected = selectedSize === tier.value
          const isSuggested = tier.value === recommended
          return (
            <label
              key={tier.value}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer border transition-all ${
                isSelected
                  ? 'bg-navy border-navy text-white'
                  : 'bg-white border-[#E5E0D5] text-[#1A1A1A] hover:border-navy/30'
              }`}
            >
              <input
                type="radio"
                name="lodge_size_nudge"
                value={tier.value}
                checked={isSelected}
                onChange={() => onTierChange(tier.value)}
                className="sr-only"
              />
              <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-colors ${
                isSelected ? 'border-gold bg-gold' : 'border-gray-300 bg-transparent'
              }`} />
              <span className={`text-sm font-medium flex-1 ${isSelected ? 'text-white' : 'text-navy'}`}>
                {tier.label} — {tier.price}
              </span>
              <span className={`text-xs ${isSelected ? 'text-white/60' : 'text-muted'}`}>
                {tier.cap}
              </span>
              {isSuggested && (
                <span className="text-[10px] font-bold bg-gold text-navy px-2 py-0.5 rounded-full flex-shrink-0">
                  Suggested
                </span>
              )}
            </label>
          )
        })}
      </div>
    </div>
  )
}
