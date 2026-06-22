// Zoho CRM v2 client — uses server-side env vars only

const ZOHO_ACCOUNTS_URL = process.env.ZOHO_ACCOUNTS_URL ?? "https://accounts.zoho.com";
const ZOHO_API_URL = process.env.ZOHO_API_URL ?? "https://www.zohoapis.com/crm/v2";

let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 60_000) {
    return cachedToken.access_token;
  }

  const res = await fetch(`${ZOHO_ACCOUNTS_URL}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
    }),
  });

  if (!res.ok) throw new Error(`Zoho token error: ${res.status}`);
  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.access_token;
}

export interface ZohoLeadInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  leadSource?: string;
  description?: string;
}

export async function createLead(input: ZohoLeadInput): Promise<string> {
  const token = await getAccessToken();

  const res = await fetch(`${ZOHO_API_URL}/Leads`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: [
        {
          First_Name: input.firstName,
          Last_Name: input.lastName,
          Email: input.email,
          Phone: input.phone ?? "",
          Company: input.company ?? "",
          Lead_Source: input.leadSource ?? "Web Form",
          Description: input.description ?? "",
        },
      ],
      trigger: ["approval", "workflow"],
    }),
  });

  if (!res.ok) throw new Error(`Zoho create lead error: ${res.status}`);
  const data = await res.json();
  return data.data?.[0]?.details?.id as string;
}

export interface ZohoMeetingInput {
  subject: string;
  startTime: string; // ISO 8601
  endTime: string;
  description?: string;
  contactName?: string;
  contactEmail?: string;
  leadId?: string;
}

export async function createContact(input: ZohoLeadInput): Promise<string> {
  const token = await getAccessToken();

  const res = await fetch(`${ZOHO_API_URL}/Contacts`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: [
        {
          First_Name: input.firstName,
          Last_Name: input.lastName,
          Email: input.email,
          Phone: input.phone ?? "",
          Account_Name: input.company ?? "",
          Lead_Source: input.leadSource ?? "Web Form",
          Description: input.description ?? "",
        },
      ],
      trigger: ["approval", "workflow"],
    }),
  });

  if (!res.ok) throw new Error(`Zoho create contact error: ${res.status}`);
  const data = await res.json();
  return data.data?.[0]?.details?.id as string;
}

export async function createMeeting(input: ZohoMeetingInput): Promise<string> {
  const token = await getAccessToken();

  const body: Record<string, unknown> = {
    Subject: input.subject,
    Start_DateTime: input.startTime,
    End_DateTime: input.endTime,
    Description: input.description ?? "",
    Type: "Meeting",
  };

  if (input.leadId) {
    body["$se_module"] = "Leads";
    body.What_Id = input.leadId;
  }

  const res = await fetch(`${ZOHO_API_URL}/Events`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: [body] }),
  });

  if (!res.ok) throw new Error(`Zoho create meeting error: ${res.status}`);
  const data = await res.json();
  return data.data?.[0]?.details?.id as string;
}
