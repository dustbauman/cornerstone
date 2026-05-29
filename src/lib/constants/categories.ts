import type { TradeCategory } from '@/lib/types'

export const CATEGORIES: readonly TradeCategory[] = [
  'Roofing',
  'Electrical',
  'Legal',
  'Plumbing',
  'Landscaping',
  'Automotive',
  'HVAC',
  'Financial',
  'General Contractor',
  'Technology',
  'Home Inspection',
  'Painting',
  'Other',
]

export const FILTER_STATES = ['Florida', 'Oklahoma'] as const
