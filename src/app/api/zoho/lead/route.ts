import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createLead, createContact } from "@/lib/zoho";

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
});

export async function POST(req: NextRequest) {
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
