'use client'

import { formatPhoneAsYouType } from '@/lib/contact-fields'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  onClearError?: () => void
  id?: string
  className?: string
  placeholder?: string
  error?: string
  required?: boolean
}

export default function PhoneInput({
  value,
  onChange,
  onClearError,
  id,
  className = 'w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy',
  placeholder = '(918) 555-0000',
  error,
  required,
}: PhoneInputProps) {
  return (
    <div>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        required={required}
        value={value}
        onChange={e => {
          onChange(formatPhoneAsYouType(e.target.value))
          onClearError?.()
        }}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className={`${className}${error ? ' border-red-300 focus:border-red-400 focus:ring-red-200' : ''}`}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
