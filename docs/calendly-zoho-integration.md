# Calendly → Zoho CRM Integration

This document explains how to wire up any existing web form to create Leads, Contacts, and Meetings in Zoho CRM, and trigger a welcome email via Zoho Campaigns when a user books a meeting through Calendly.

---

## Overview

When a user submits the form:
1. A **Lead** is created in Zoho CRM
2. A **Contact** is created in Zoho CRM simultaneously
3. The **Calendly widget** loads pre-filled with the user's details
4. When the user books a slot, a **Meeting (Event)** is logged in Zoho CRM linked to the lead
5. The new Contact is added to a Zoho Campaigns mailing list → **welcome email fires automatically**

---

## 1. Environment Variables

Add these to your `.env.local` (or your hosting platform's env config):

# Zoho CRM
ZOHO_CLIENT_ID=1000.A5LEK681QFUPRT4BJVB0O7BE1LBWUB
ZOHO_CLIENT_SECRET=f4abf4f9ce9b06184f43874a1f6853594a16264f91
ZOHO_REFRESH_TOKEN=1000.e2bd0933a695e99ba3251cba70f9de97.3b2e8da63c8f88e1b1cbf0e8c8628e7a
ZOHO_ACCOUNTS_URL=https://accounts.zoho.com
ZOHO_API_URL=https://www.zohoapis.com/crm/v2

# Calendly
NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/black-horse/30min
CALENDLY_WEBHOOK_SIGNING_KEY=GjeY2wcW9lQUf2Q_ogSqeVUehFvBObkuYJLXoapKyfY
```

---

## 2. Zoho CRM Client (`src/lib/zoho.ts`)

This file handles token refresh and all Zoho API calls. The access token is cached in memory and refreshed automatically when it expires.

### Key functions:

| Function | What it does |
|----------|-------------|
| `getAccessToken()` | Exchanges refresh token for access token, caches it |
| `createLead(input)` | Creates a Lead record in Zoho CRM |
| `createContact(input)` | Creates a Contact record in Zoho CRM |
| `createMeeting(input)` | Creates an Event/Meeting linked to a Lead |

### Input shape for `createLead` / `createContact`:
```ts
{
  firstName: string
  lastName: string
  email: string
  phone?: string
  company?: string
  leadSource?: string   // e.g. "Web Form", "Calendly"
  description?: string
}
```

---

## 3. API Route — Create Lead + Contact

**Endpoint:** `POST /api/zoho/lead`

**What it does:** Receives form data, validates it, then calls `createLead` and `createContact` in parallel.

```ts
// Both run at the same time
const [leadId] = await Promise.all([
  createLead(input),
  createContact(input),
]);
```

**Request body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@company.com",
  "phone": "+1 555 000 0000",   // optional
  "company": "Acme Inc."         // optional
}
```

**Response:**
```json
{ "leadId": "zoho_lead_id_here" }
```

### Applying this to your existing form

Replace your current form submit handler with a fetch call to this endpoint:

```js
async function handleSubmit(formData) {
  const res = await fetch('/api/zoho/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      company: formData.company,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error);

  // Lead + Contact created — now show Calendly or redirect
  console.log('Lead ID:', data.leadId);
}
```

---

## 4. Calendly Webhook (`POST /api/webhooks/calendly`)

Fires when a user completes a booking. It:
1. Verifies the HMAC signature from Calendly
2. Parses the invitee name and email
3. Creates a Lead (in case they skipped the form)
4. Creates a Meeting Event in Zoho linked to the lead

---

## 6. Calendly Embed (Frontend)

Load the Calendly inline widget after form submission:

```html
<!-- In your <head> -->
<link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet">
<script src="https://assets.calendly.com/assets/external/widget.js" async></script>
```

```js
// After form submit, initialize the widget pre-filled with user details
window.Calendly.initInlineWidget({
  url: 'https://calendly.com/your-username/your-event',
  parentElement: document.getElementById('calendly-container'),
  prefill: {
    name: 'Jane Smith',
    email: 'jane@company.com',
  },
});

// Detect when booking is completed
window.addEventListener('message', (e) => {
  if (e.data?.event === 'calendly.event_scheduled') {
    // Show confirmation screen
  }
});
```

## Files Reference

| File | Purpose |
|------|---------|
| `src/lib/zoho.ts` | Zoho OAuth client + Lead/Contact/Meeting functions |
| `src/app/api/zoho/lead/route.ts` | API endpoint — form submit handler |
| `src/app/api/webhooks/calendly/route.ts` | Calendly webhook handler |
| `src/app/demo/page.tsx` | Example landing page implementation |
