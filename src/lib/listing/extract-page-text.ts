const MAX_TEXT_LENGTH = 12_000

export function extractPageText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')

  const title = withoutScripts.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''
  const metaDesc =
    withoutScripts.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ??
    withoutScripts.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1] ??
    ''

  const ogTitle =
    withoutScripts.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? ''
  const ogDesc =
    withoutScripts.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? ''

  const bodyText = withoutScripts
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const combined = [
    ogTitle && `Title: ${decodeHtmlEntities(ogTitle)}`,
    title && `Page title: ${decodeHtmlEntities(title)}`,
    ogDesc && `Summary: ${decodeHtmlEntities(ogDesc)}`,
    metaDesc && `Description: ${decodeHtmlEntities(metaDesc)}`,
    bodyText && `Content: ${decodeHtmlEntities(bodyText)}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  return combined.slice(0, MAX_TEXT_LENGTH)
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}
