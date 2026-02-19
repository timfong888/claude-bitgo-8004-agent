import { NextRequest, NextResponse } from "next/server";

// In-memory store for demo purposes — in production use a database
const webhookEvents: Array<{
  id: string;
  type: string;
  payload: Record<string, unknown>;
  receivedAt: string;
}> = [];

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Store the webhook event
  const event = {
    id: body.pendingApprovalId || body.id || `evt-${Date.now()}`,
    type: body.type || "unknown",
    payload: body,
    receivedAt: new Date().toISOString(),
  };

  webhookEvents.push(event);

  // Keep only last 100 events
  if (webhookEvents.length > 100) {
    webhookEvents.splice(0, webhookEvents.length - 100);
  }

  return NextResponse.json({ received: true, eventId: event.id });
}

// GET endpoint to check recent webhook events (for the UI to poll)
export async function GET() {
  return NextResponse.json({ events: webhookEvents.slice(-20) });
}
