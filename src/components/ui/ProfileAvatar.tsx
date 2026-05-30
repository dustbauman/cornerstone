import Image from 'next/image'
import { getInitials } from '@/lib/avatars'

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-sm',
} as const

interface ProfileAvatarProps {
  name: string
  imageUrl?: string | null
  size?: keyof typeof SIZE_CLASSES
  /** `inverse` for navy/dark backgrounds (e.g. navbar) */
  tone?: 'default' | 'inverse'
  className?: string
}

const TONE_CLASSES = {
  default: 'bg-navy/10 text-navy',
  inverse: 'bg-[#C9A84C] text-navy',
} as const

export default function ProfileAvatar({
  name,
  imageUrl,
  size = 'md',
  tone = 'default',
  className = '',
}: ProfileAvatarProps) {
  const sizeClass = SIZE_CLASSES[size]

  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt=""
        width={size === 'lg' ? 48 : size === 'md' ? 40 : 32}
        height={size === 'lg' ? 48 : size === 'md' ? 40 : 32}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
        unoptimized
      />
    )
  }

  return (
    <div
      className={`${sizeClass} rounded-full font-bold flex items-center justify-center flex-shrink-0 ${TONE_CLASSES[tone]} ${className}`}
      style={{ fontFamily: "'Cormorant Garamond', serif" }}
      aria-hidden
    >
      {getInitials(name)}
    </div>
  )
}
