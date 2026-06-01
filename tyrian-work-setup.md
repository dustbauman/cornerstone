# tyrian.work — Domain Setup Guide

## Overview

Do these steps **in order**. You'll collect DNS records from Vercel and Resend first, then enter them all into Namecheap at once, then verify.

---

## Step 1 — Create your Vercel project

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**
2. Import your Git repo (GitHub/GitLab/Bitbucket)
3. Configure build settings if needed, then deploy
4. Once deployed, go to **Project Settings → Domains**
5. Add `tyrian.work` and `www.tyrian.work`
6. Vercel will show you the required DNS records — note them down (they'll match what's in Step 3 below, but confirm)

---

## Step 2 — Add domain to Resend

1. Go to [resend.com](https://resend.com) → **Domains → Add Domain**
2. Enter `tyrian.work`
3. Resend will give you **3–4 DNS records** to verify ownership and enable sending:
   - 1× SPF (TXT record)
   - 2× DKIM (CNAME records — values are unique to your account)
   - 1× DMARC (TXT record — optional but recommended)
4. Copy all of them — you'll add them in the next step

---

## Step 3 — Configure DNS in Namecheap

Go to **Namecheap → Domain List → tyrian.work → Manage → Advanced DNS**

Add all of these records:

### Vercel (site hosting)

| Type  | Host | Value                   | TTL      |
|-------|------|-------------------------|----------|
| A     | @    | `76.76.21.21`           | Automatic |
| CNAME | www  | `cname.vercel-dns.com.` | Automatic |

> The A record points your root domain to Vercel. The CNAME handles `www`.

### Resend (email sending)

Paste the exact values Resend gave you in Step 2. They'll look something like:

| Type  | Host                        | Value                                      | TTL      |
|-------|-----------------------------|--------------------------------------------|----------|
| TXT   | @                           | `v=spf1 include:amazonses.com ~all`        | Automatic |
| CNAME | `resend._domainkey`         | `resend._domainkey.tyrian.work.dkim.resend.com` | Automatic |
| CNAME | `resend2._domainkey`        | *(second DKIM value from Resend)*          | Automatic |
| TXT   | `_dmarc`                    | `v=DMARC1; p=none; rua=mailto:dmarc@tyrian.work` | Automatic |

> ⚠️ Use the **exact CNAME values from your Resend dashboard** — they are unique to your account.

### SPF note
If Namecheap already has a TXT record on `@` (it sometimes auto-adds one), edit it rather than adding a second — multiple SPF records on the same host will break email.

---

## Step 4 — Verify in Vercel

1. Go back to **Project Settings → Domains** in Vercel
2. Within a few minutes (up to 48h, usually <15min), both `tyrian.work` and `www.tyrian.work` should show **Valid Configuration**
3. Set your preferred domain (usually root `tyrian.work`) as primary — Vercel will redirect the other automatically

---

## Step 5 — Verify in Resend

1. Go to **Resend → Domains → tyrian.work**
2. Click **Verify DNS Records**
3. All records should show green checkmarks
4. Once verified, you can send from any address `@tyrian.work`

---

## Step 6 — Configure Resend in your app

Install the SDK:
```bash
npm install resend
# or
pnpm add resend
```

Basic usage:
```ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'Tyrian <hello@tyrian.work>',
  to: ['user@example.com'],
  subject: 'Welcome to Tyrian',
  html: '<p>You're in.</p>',
});
```

Add your API key to Vercel env vars:
- **Project Settings → Environment Variables**
- Key: `RESEND_API_KEY`
- Value: from [resend.com/api-keys](https://resend.com/api-keys)

---

## Common "from" addresses to set up

| Purpose           | Address                  |
|-------------------|--------------------------|
| General / product | `hello@tyrian.work`      |
| Transactional     | `noreply@tyrian.work`    |
| Support           | `support@tyrian.work`    |

You don't need to create mailboxes for these — Resend sends from them without requiring an inbox. If you want to *receive* replies, set up email forwarding (Cloudflare Email Routing or ImprovMX).

---

## DNS propagation

Most records resolve in **5–15 minutes** on Namecheap. If Vercel or Resend isn't verifying after 30 minutes, check:

```bash
# Check A record
dig tyrian.work A

# Check DKIM
dig resend._domainkey.tyrian.work CNAME

# Check SPF
dig tyrian.work TXT
```

Or use [dnschecker.org](https://dnschecker.org) for a visual global propagation view.

---

## Summary checklist

- [ ] Vercel project created and deployed
- [ ] `tyrian.work` + `www.tyrian.work` added to Vercel
- [ ] Resend domain added, DNS records copied
- [ ] Namecheap: A record → `76.76.21.21`
- [ ] Namecheap: CNAME www → `cname.vercel-dns.com`
- [ ] Namecheap: SPF TXT record added
- [ ] Namecheap: DKIM CNAME records added (both)
- [ ] Namecheap: DMARC TXT record added
- [ ] Vercel domain shows "Valid Configuration"
- [ ] Resend domain shows verified
- [ ] `RESEND_API_KEY` added to Vercel env vars
- [ ] Test email sent successfully
