export interface ProfileCompletionInput {
  fullName: string
  city?: string | null
  state?: string | null
  tradeCategory?: string | null
  occupation?: string | null
  hasActiveListing: boolean
  listingHasDescription?: boolean
  listingHasPhone?: boolean
}

export interface ProfileCompletionStep {
  id: string
  label: string
  done: boolean
  href?: string
}

export interface ProfileCompletionResult {
  percent: number
  steps: ProfileCompletionStep[]
  isComplete: boolean
  nextStep: ProfileCompletionStep | null
  summary: string
}

const STEPS: {
  id: string
  label: string
  href?: string
  check: (input: ProfileCompletionInput) => boolean
}[] = [
  {
    id: 'name',
    label: 'Add your full name',
    href: '/settings',
    check: (i) => !!i.fullName?.trim() && i.fullName.trim() !== 'Member',
  },
  {
    id: 'location',
    label: 'Add your city and state',
    href: '/settings',
    check: (i) => !!i.city?.trim() && !!i.state?.trim(),
  },
  {
    id: 'trade',
    label: 'Add your trade or occupation',
    href: '/settings',
    check: (i) => !!(i.tradeCategory?.trim() || i.occupation?.trim()),
  },
  {
    id: 'listing',
    label: 'Create your business listing',
    href: '/dashboard/listing/new',
    check: (i) => i.hasActiveListing,
  },
  {
    id: 'listing_details',
    label: 'Add phone and description to your listing',
    href: undefined,
    check: (i) =>
      i.hasActiveListing && !!i.listingHasDescription && !!i.listingHasPhone,
  },
]

export function computeProfileCompletion(
  input: ProfileCompletionInput
): ProfileCompletionResult {
  const steps: ProfileCompletionStep[] = STEPS.map(step => ({
    id: step.id,
    label: step.label,
    done: step.check(input),
    href: step.href,
  }))

  const doneCount = steps.filter(s => s.done).length
  const percent = Math.round((doneCount / steps.length) * 100)
  const nextStep = steps.find(s => !s.done) ?? null
  const isComplete = percent === 100

  let summary: string
  if (isComplete) {
    summary = 'Your profile and listing are set up.'
  } else if (nextStep) {
    summary = `${percent}% complete — ${nextStep.label.charAt(0).toLowerCase()}${nextStep.label.slice(1)}.`
  } else {
    summary = `${percent}% complete.`
  }

  return { percent, steps, isComplete, nextStep, summary }
}
