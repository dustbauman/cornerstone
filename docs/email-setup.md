# Tyrian transactional email

All branded emails go through **Resend** (`src/lib/email/`). Supabase Auth default emails are **not** used for sign-in or password reset — those routes use `generateLink` + Tyrian templates.

## Env (`.env.local` + Vercel)

```bash
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=hello@yourdomain.com   # must be verified in Resend
NEXT_PUBLIC_APP_URL=https://tyrian.work
TEST_EMAIL=you@example.com               # optional, for pnpm email:test
CRON_SECRET=...                          # for claim reminder cron
```

## Templates & triggers

| Template | Send function | Trigger |
|----------|---------------|---------|
| Lodge claim | `sendLodgeClaimEmail` | Checkout, Stripe webhook, resend-claim |
| Claim reminder | `sendClaimReminder` | Cron `/api/cron/lodge-reminders` |
| Member join magic link | `sendMemberMagicLinkEmail` | `/api/member-join` |
| Sponsor confirm | `sendSponsorConfirmEmail` | `/api/member-join` |
| Member verified | `sendMemberVerifiedEmail` | `/api/sponsor-confirm` |
| Request response | `sendResponseNotification` | Respond API |
| Auth sign-in / claim | `sendAuthMagicLinkEmail` | `/api/auth/send-magic-link` |
| Password reset | `sendPasswordResetEmail` | `/api/auth/send-reset` |
| Lodge member invite | `sendLodgeMemberInviteEmail` | `/api/admin/invite-member` |
| Listing invite | `sendListingInviteEmail` | `/api/admin/listing-invite` |
| Listing live | `sendListingLiveEmail` | `/api/listings/live-email` |

## Local test

```bash
pnpm email:test --preview --type all
pnpm email:test --to you@example.com --type listing-live
```

## Supabase dashboard

To avoid duplicate emails, disable built-in Auth email templates (or leave them unused — the app no longer calls `signInWithOtp` / `resetPasswordForEmail` from the client).

OAuth (Google) is unchanged and does not use Resend.
