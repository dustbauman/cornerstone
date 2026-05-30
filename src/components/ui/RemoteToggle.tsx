interface RemoteToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

/** Toggle switch — uses flex alignment so the knob tracks correctly. */
export default function RemoteToggle({ checked, onChange }: RemoteToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full p-0.5 transition-colors ${
        checked ? 'bg-navy justify-end' : 'bg-gray-200 justify-start'
      }`}
    >
      <span className="h-5 w-5 rounded-full bg-white shadow" />
    </button>
  )
}
