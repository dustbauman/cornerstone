/** Canonical site URL for metadata, sitemap, and robots. */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return raw.replace(/\/$/, '')
}
