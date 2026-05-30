import { CATEGORIES } from '@/lib/constants/categories'

export function mapTradeCategory(raw: string | null | undefined): string {
  if (!raw?.trim()) return ''
  const normalized = raw.trim().toLowerCase()
  const exact = CATEGORIES.find(c => c.toLowerCase() === normalized)
  if (exact) return exact

  const aliases: Record<string, string> = {
    lawyer: 'Legal',
    attorney: 'Legal',
    'law firm': 'Legal',
    electrician: 'Electrical',
    plumber: 'Plumbing',
    'general contracting': 'General Contractor',
    contractor: 'General Contractor',
    roofer: 'Roofing',
    'auto repair': 'Automotive',
    mechanic: 'Automotive',
    accountant: 'Financial',
    finance: 'Financial',
    'it services': 'Technology',
    software: 'Technology',
    inspector: 'Home Inspection',
    painter: 'Painting',
  }

  for (const [key, category] of Object.entries(aliases)) {
    if (normalized.includes(key)) return category
  }

  const partial = CATEGORIES.find(c => normalized.includes(c.toLowerCase()))
  return partial ?? 'Other'
}
