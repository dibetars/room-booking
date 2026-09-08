# Future: Pass.mess WhatsApp notifications

**Status:** not built. Email (Resend) is the live guest channel. This is the
plan for adding WhatsApp later so website/admin guests also get a message
on the number they enter at booking.

**Provider:** [Pass.mess](https://pass.mess) — confirm the live API docs and
credentials with the Pass.mess dashboard when we start. Do not send OTA
(Airbnb / Booking.com) guests WhatsApp from this app; the OTA owns that
conversation, same rule as email.

---

## Why

Most Ghana guests read WhatsApp faster than email. After a website request
or a confirmed direct booking we should fire a short WhatsApp in parallel
with Resend, not instead of it.

## When to send (mirror email)

| Event | WhatsApp | Notes |
|-------|----------|--------|
| Booking request (Paystack off) | Yes | Dates held, we will follow up |
| Booking confirmed | Yes | After Paystack success or admin Confirm / Mark paid |
| Booking cancelled | Yes | Direct bookings only |
| Payment received | Optional | Can be one combined “confirmed + paid” message |
| Arrival reminder (~3 days out) | Yes | Once a reminder job exists |
| Check-in instructions | Optional | Day before; keep short, link to email for the long version |

Skip if: no phone on the intent, phone fails E.164 normalisation, credentials
missing, or the booking is an OTA channel.

## Proposed shape (when we build it)

- `src/lib/whatsapp.ts` — thin Pass.mess client. Fire-and-forget, never fail
  the booking (same as `sendDirectGuestEmail`).
- Templates next to email copy, or a second body field on Admin → Emails
  (`whatsappBody`) so staff can edit both channels in one place.
- Call it from the same hooks as email: Paystack webhook, `/api/bookings`
  (manual mode), admin confirm / cancel / mark paid.
- Admin toggle in Settings: **WhatsApp notifications** on/off, so we can
  ship dark without going live.

## Env (placeholders only — fill when ready)

```
# Pass.mess WhatsApp (not wired yet)
PASSMESS_API_KEY=
PASSMESS_SENDER=
# Optional override if their API host is not the default
# PASSMESS_API_URL=
```

Normalise Ghana numbers: `024…` / `233…` → `+233…` before send.

## Open questions for implementation

1. Official Pass.mess send endpoint, auth header, and payload field names.
2. Whether first contact must be a pre-approved template (Meta Cloud) or
   session/free-form (some Ghana providers).
3. Opt-in copy on the booking form (“we’ll WhatsApp this number”).
4. Whether `bookings@bokoboko.org` / the property WhatsApp Business number
   is the Pass.mess sender.
