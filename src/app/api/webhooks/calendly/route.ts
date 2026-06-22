import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createLead, createMeeting } from "@/lib/zoho";

function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  if (!secret) return true; // skip verification in dev if key not set
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("calendly-webhook-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.event as string;

  // Only handle invitee.created (new booking)
  if (eventType !== "invitee.created") {
    return NextResponse.json({ received: true });
  }

  const payload = event.payload as Record<string, unknown>;
  const invitee = payload.invitee as Record<string, unknown>;
  const scheduledEvent = payload.scheduled_event as Record<string, unknown>;

  const fullName = (invitee?.name as string) ?? "Unknown";
  const [firstName, ...rest] = fullName.split(" ");
  const lastName = rest.join(" ") || "-";
  const email = invitee?.email as string;

  // Create or find lead
  let leadId: string | undefined;
  try {
    leadId = await createLead({
      firstName,
      lastName,
      email,
      leadSource: "Calendly",
      description: `Booked via Calendly: ${(scheduledEvent?.name as string) ?? ""}`,
    });
  } catch (err) {
    console.error("Lead creation failed:", err);
  }

  // Create meeting event in Zoho
  try {
    const startTime = scheduledEvent?.start_time as string;
    const endTime = scheduledEvent?.end_time as string;
    await createMeeting({
      subject: `Calendly: ${(scheduledEvent?.name as string) ?? "Meeting"} with ${fullName}`,
      startTime,
      endTime,
      description: `Calendly booking\nInvitee: ${fullName} <${email}>`,
      contactName: fullName,
      contactEmail: email,
      leadId,
    });
  } catch (err) {
    console.error("Meeting creation failed:", err);
  }

  return NextResponse.json({ received: true });
}
