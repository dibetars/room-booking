import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createLead, createContact } from "@/lib/zoho";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit(`zoho-lead:${ip}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const input = { ...parsed.data, leadSource: "Calendly Landing Page" };
    const [leadId] = await Promise.all([
      createLead(input),
      createContact(input).catch((err) => console.error("Zoho create contact failed:", err)),
    ]);
    return NextResponse.json({ leadId });
  } catch (err) {
    console.error("Zoho create lead failed:", err);
    return NextResponse.json({ error: "CRM error" }, { status: 502 });
  }
}
