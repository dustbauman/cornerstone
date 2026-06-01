import { EMAIL_TAGLINE, EMAIL_THEME as t } from './theme'

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export interface EmailLayoutOptions {
  /** Hidden preview line in inbox clients */
  preheader?: string
  bodyHtml: string
}

export function emailLayout({ preheader, bodyHtml }: EmailLayoutOptions): string {
  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Tyrian</title>
</head>
<body style="margin:0;padding:0;background-color:${t.stone};font-family:${t.fontSans};color:${t.charcoal};-webkit-font-smoothing:antialiased;">
  ${preheaderHtml}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${t.stone};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:${t.maxWidth}px;">
          <tr>
            <td style="background-color:${t.navy};border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
              <span style="font-family:${t.fontSerif};font-size:26px;font-weight:700;letter-spacing:0.22em;color:${t.white};">TYRIAN</span>
            </td>
          </tr>
          <tr>
            <td style="background-color:${t.white};border-left:1px solid ${t.border};border-right:1px solid ${t.border};padding:32px 32px 28px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color:${t.white};border:1px solid ${t.border};border-top:none;border-radius:0 0 12px 12px;padding:0 32px 28px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;font-style:italic;color:${t.muted};">${EMAIL_TAGLINE}</p>
              <p style="margin:0;font-size:12px;color:${t.mutedLight};">
                <a href="https://tyrian.work" style="color:${t.navy};text-decoration:none;font-weight:600;">tyrian.work</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function emailParagraph(html: string, muted = false): string {
  const color = muted ? t.muted : t.charcoal
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${color};">${html}</p>`
}

export function emailHeading(text: string): string {
  return `<h1 style="margin:0 0 20px;font-family:${t.fontSerif};font-size:24px;font-weight:700;line-height:1.3;color:${t.navy};">${escapeHtml(text)}</h1>`
}

export function emailDivider(): string {
  return `<hr style="border:none;border-top:1px solid ${t.border};margin:28px 0;" />`
}

export interface EmailButtonOptions {
  href: string
  label: string
  variant?: 'primary' | 'trust' | 'secondary'
}

export function emailButton({ href, label, variant = 'primary' }: EmailButtonOptions): string {
  const styles =
    variant === 'primary'
      ? `background-color:${t.gold};color:${t.navy};`
      : variant === 'trust'
        ? `background-color:${t.trust};color:${t.white};`
        : `background-color:${t.white};color:${t.navy};border:2px solid ${t.border};`

  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td>
      <a href="${href}" style="display:inline-block;${styles}font-family:${t.fontSans};font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px;line-height:1.2;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`
}

export function emailButtonRow(buttons: EmailButtonOptions[]): string {
  const cells = buttons
    .map((btn) => {
      const styles =
        btn.variant === 'trust'
          ? `background-color:${t.trust};color:${t.white};`
          : btn.variant === 'secondary'
            ? `background-color:${t.white};color:${t.navy};border:2px solid ${t.border};`
            : `background-color:${t.gold};color:${t.navy};`
      return `<td style="padding-right:12px;">
        <a href="${btn.href}" style="display:inline-block;${styles}font-family:${t.fontSans};font-size:14px;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:10px;">${escapeHtml(btn.label)}</a>
      </td>`
    })
    .join('')

  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;"><tr>${cells}</tr></table>`
}

export function emailCodeBox(code: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td align="center" style="background-color:${t.stone};border:2px solid ${t.navy};border-radius:12px;padding:24px 20px;">
      <span style="font-family:ui-monospace, 'SF Mono', Monaco, Consolas, monospace;font-size:32px;font-weight:700;letter-spacing:0.2em;color:${t.navy};">${escapeHtml(code)}</span>
    </td>
  </tr>
</table>`
}

export interface EmailCalloutOptions {
  title: string
  body: string
  variant?: 'founding' | 'gold' | 'info'
}

export function emailCallout({ title, body, variant = 'gold' }: EmailCalloutOptions): string {
  const bg =
    variant === 'founding' ? t.foundingBg : variant === 'info' ? t.trustBg : t.foundingBg
  const border =
    variant === 'founding'
      ? t.foundingBorder
      : variant === 'info'
        ? t.trust
        : t.gold

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:${bg};border-left:3px solid ${border};border-radius:0 10px 10px 0;padding:16px 18px;">
      <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:${t.foundingTitle};">${escapeHtml(title)}</p>
      <p style="margin:0;font-size:14px;line-height:1.55;color:${t.foundingBody};">${body}</p>
    </td>
  </tr>
</table>`
}

export function emailSteps(items: string[]): string {
  const lis = items.map((item) => `<li style="margin-bottom:8px;">${item}</li>`).join('')
  return `<ol style="margin:0 0 16px;padding-left:20px;font-size:14px;line-height:1.55;color:${t.muted};">${lis}</ol>`
}

export function emailQuoteBlock(label: string, quote: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="border-top:1px solid ${t.border};border-bottom:1px solid ${t.border};padding:16px 0;">
      <p style="margin:0;font-size:13px;color:${t.muted};">${escapeHtml(label)}</p>
      <p style="margin:6px 0 0;font-size:15px;font-weight:600;color:${t.navy};">&ldquo;${escapeHtml(quote)}&rdquo;</p>
    </td>
  </tr>
</table>`
}

export function emailVerifiedBadge(): string {
  return `<span style="display:inline-block;background-color:${t.trustBg};color:${t.trustText};font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;letter-spacing:0.06em;text-transform:uppercase;">&#10003; Lodge-Verified Member</span>`
}

export function emailResponderCard(opts: {
  name: string
  trade: string | null
  lodge: string
  location: string | null
}): string {
  const { name, trade, lodge, location } = opts
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
  <tr>
    <td>
      <p style="margin:0 0 4px;font-size:17px;font-weight:700;color:${t.navy};">${escapeHtml(name)}</p>
      ${trade ? `<p style="margin:0 0 4px;font-size:14px;color:${t.foundingBody};">${escapeHtml(trade)}</p>` : ''}
      <p style="margin:0 0 12px;font-size:14px;color:${t.foundingBody};">${escapeHtml(lodge)}${location ? ` &middot; ${escapeHtml(location)}` : ''}</p>
      ${emailVerifiedBadge()}
    </td>
  </tr>
</table>`
}

/** Plain-text footer appended to all transactional emails. */
export function emailTextFooter(): string {
  return `\n\n—\n${EMAIL_TAGLINE}\nhttps://tyrian.work`
}
