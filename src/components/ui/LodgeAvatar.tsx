import { Building2 } from 'lucide-react'

const SIZE_CLASSES = {
  sm: 'w-10 h-10 text-xs',
  md: 'w-14 h-14 text-sm',
  lg: 'w-16 h-16 text-base',
} as const

interface LodgeAvatarProps {
  number: string
  tier?: string | null
  size?: keyof typeof SIZE_CLASSES
  className?: string
}

export default function LodgeAvatar({
  number,
  tier,
  size = 'md',
  className = '',
}: LodgeAvatarProps) {
  const sizeClass = SIZE_CLASSES[size]
  const isFounding = tier === 'founding'
  const label = number ? `#${number}` : null

  return (
    <div
      className={`${sizeClass} rounded-full bg-navy text-[#C9A84C] font-bold flex items-center justify-center flex-shrink-0 ${
        isFounding ? 'ring-2 ring-[#C9A84C] ring-offset-2 ring-offset-navy' : ''
      } ${className}`}
      style={{ fontFamily: "'Cormorant Garamond', serif" }}
      aria-hidden
    >
      {label ? (
        <span className="truncate px-1">{label}</span>
      ) : (
        <Building2 size={size === 'lg' ? 24 : size === 'md' ? 20 : 16} />
      )}
    </div>
  )
}
