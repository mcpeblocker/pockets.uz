import { NextRequest, NextResponse } from "next/server";
import { getAuthTokenFromCookiesAsync } from "@/lib/backend-api";

function getBackendUrl() {
  return process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:3001";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const expenseId = formData.get("expenseId") as string;

    if (!file || !expenseId) {
      return NextResponse.json({ error: "File and expenseId are required" }, { status: 400 });
    }

    const token = await getAuthTokenFromCookiesAsync();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Forward file to backend API
    const backendFormData = new FormData();
    backendFormData.append("file", file);

    const backendUrl = `${getBackendUrl()}/api/expenses/${expenseId}/receipts`;
    const res = await fetch(backendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: backendFormData,
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: body?.error || `Failed to upload receipt (${res.status})` },
        { status: res.status },
      );
    }

    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    console.error("Error in upload-receipt API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
