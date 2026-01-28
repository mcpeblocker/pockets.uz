import { NextResponse } from "next/server";
import { getAuthTokenFromCookiesAsync } from "@/lib/backend-api";

function getBackendUrl() {
  return process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:3001";
}

export async function POST(request: Request) {
  try {
    const { participantId } = await request.json();

    if (!participantId) {
      return NextResponse.json(
        { error: "Participant ID is required" },
        { status: 400 },
      );
    }

    const token = await getAuthTokenFromCookiesAsync();

    const backendUrl = `${getBackendUrl()}/api/participants/${participantId}/leave`;
    const res = await fetch(backendUrl, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: body?.error || `Failed to leave event (${res.status})` },
        { status: res.status },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in leave-event API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
