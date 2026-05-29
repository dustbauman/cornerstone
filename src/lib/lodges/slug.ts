/** URL-safe slug from lodge name + number, e.g. "Acacia Lodge" + "123" → "acacia-lodge-123" */
export function generateLodgeSlug(name: string, number: string): string {
  const base = `${name}-${number}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return base || `lodge-${number}`
}

/** Ensure slug is unique — appends -2, -3, … on collision */
export async function generateUniqueLodgeSlug(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  name: string,
  number: string,
  excludeId?: string
): Promise<string> {
  let slug = generateLodgeSlug(name, number)
  let attempt = 0

  while (attempt < 20) {
    const { data: existing } = await supabase
      .from('lodges')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (!existing || (excludeId && existing.id === excludeId)) return slug
    attempt++
    slug = `${generateLodgeSlug(name, number)}-${attempt + 1}`
  }

  return `${generateLodgeSlug(name, number)}-${Date.now()}`
}
