import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/backend-api";

export async function GET() {
  const { data, error, status } = await apiFetch("/api/auth/me", { auth: true });
  if (error) {
    return NextResponse.json({ user: null }, { status: status || 200 });
  }
  return NextResponse.json({ user: data }, { status: 200 });
}

