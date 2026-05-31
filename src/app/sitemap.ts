import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site'
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from '@/lib/supabase/admin'
import { demoListingSlugs } from '@/lib/demo/listings'
import { DB_LISTING_SELECT, isVerifiedPublicListing, type DbListingRow } from '@/lib/db/listings'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl()
  const now = new Date()

  const staticPaths = [
    '',
    '/directory',
    '/requests',
    '/network',
    '/join',
    '/about',
    '/contact',
    '/login',
    '/claim',
  ]

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? 'weekly' : 'weekly',
    priority: path === '' ? 1 : 0.8,
  }))

  const profileEntries: MetadataRoute.Sitemap = demoListingSlugs.map((slug) => ({
    url: `${base}/directory/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const seenProfiles = new Set(profileEntries.map((e) => e.url))

  try {
    if (!isSupabaseAdminConfigured()) {
      return [...staticEntries, ...profileEntries]
    }
    const admin = createAdminClient()

    const { data: listings } = await admin
      .from('listings')
      .select(DB_LISTING_SELECT)
      .eq('is_active', true)
      .eq('visibility', 'public')

    for (const row of listings ?? []) {
      const listingRow = row as unknown as DbListingRow
      if (!isVerifiedPublicListing(listingRow)) continue
      const url = `${base}/directory/${listingRow.id}`
      if (seenProfiles.has(url)) continue
      seenProfiles.add(url)
      profileEntries.push({
        url,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }

    const { data: lodges } = await admin
      .from('lodges')
      .select('slug, updated_at')
      .eq('status', 'active')
      .not('slug', 'is', null)

    const lodgeEntries: MetadataRoute.Sitemap = (lodges ?? [])
      .filter((l) => l.slug)
      .map((l) => ({
        url: `${base}/lodge/${l.slug}`,
        lastModified: l.updated_at ? new Date(l.updated_at) : now,
        changeFrequency: 'weekly',
        priority: 0.6,
      }))

    return [...staticEntries, ...profileEntries, ...lodgeEntries]
  } catch {
    return [...staticEntries, ...profileEntries]
  }
}
