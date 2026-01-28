"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/backend-api";

// -------- Events --------

export async function createEvent(formData: FormData) {
  const title = (formData.get("title") as string | null)?.trim() || "";
  const slug = (formData.get("slug") as string | null)?.trim() || "";
  const description = (formData.get("description") as string | null)?.trim() || "";
  const currency = (formData.get("currency") as string | null)?.trim() || "USD";

  if (!title || !slug) {
    return { error: "Title and slug are required" };
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return {
      error: "Slug can only contain lowercase letters, numbers, and hyphens",
    };
  }

  const { data, error, status } = await apiFetch<any>("/api/events", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ title, slug, description, currency }),
  });

  if (error) {
    if (status === 401 || status === 403) {
      return { error: "You have to sign in before creating an event." };
    }
    return { error };
  }

  revalidatePath("/dashboard");
  return { success: true, event: data };
}

export async function getUserEvents() {
  const { data, error } = await apiFetch<any[]>("/api/events", { auth: true });

  if (error) {
    console.error("Error fetching events from backend:", error);
    return [];
  }

  return data || [];
}

// -------- Expenses --------

export async function addExpense(formData: FormData) {
  const eventId = formData.get("eventId") as string;
  const description = formData.get("description") as string;
  const amount = formData.get("amount") as string;
  const paidByParticipantId = formData.get("paidByParticipantId") as string;
  const expenseDate = (formData.get("expenseDate") as string) || null;
  const currency = (formData.get("currency") as string) || undefined;
  const splitType = (formData.get("splitType") as string) || "equal";
  const splitParticipants = formData.get("splitParticipants") as string | null;
  const splits = formData.get("splits") as string | null;

  if (!eventId || !description || !amount || !paidByParticipantId) {
    return { error: "All required fields are missing" };
  }

  const body: any = {
    eventId,
    description,
    amount,
    paidByParticipantId,
    expenseDate,
    currency,
    splitType,
  };

  if (splitParticipants) body.splitParticipants = splitParticipants;
  if (splits) body.splits = splits;

  const { data, error } = await apiFetch<any>("/api/expenses", {
    method: "POST",
    auth: true,
    body: JSON.stringify(body),
  });

  if (error) return { error };

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/event/${eventId}`);
  revalidatePath(`/event/${body.slug ?? ""}`);

  return { success: true, expense: data };
}

export async function addBulkExpenses(
  eventId: string,
  items: Array<{ description: string; amount: number | null }>,
  paidByParticipantId: string,
  expenseDate: string | null,
  splitType: "equal" | "custom" | "none" = "none",
  splitParticipants: string[] = [],
) {
  const { data, error } = await apiFetch<any>("/api/expenses/bulk", {
    method: "POST",
    auth: true,
    body: JSON.stringify({
      eventId,
      items,
      paidByParticipantId,
      expenseDate,
      splitType,
      splitParticipants,
    }),
  });

  if (error) return { error };

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/event/${eventId}`);
  return { success: true, ...data };
}

export async function updateExpense(expenseId: string, formData: FormData) {
  const eventId = formData.get("eventId") as string;
  const description = formData.get("description") as string;
  const amount = formData.get("amount") as string;
  const paidByParticipantId = formData.get("paidByParticipantId") as string;
  const expenseDate = (formData.get("expenseDate") as string) || null;
  const currency = (formData.get("currency") as string) || undefined;
  const splitType = (formData.get("splitType") as string) || "equal";
  const splitParticipants = formData.get("splitParticipants") as string | null;
  const splits = formData.get("splits") as string | null;

  const body: any = {
    description,
    amount,
    paidByParticipantId,
    expenseDate,
    currency,
    splitType,
  };
  if (splitParticipants) body.splitParticipants = splitParticipants;
  if (splits) body.splits = splits;

  const { error } = await apiFetch(`/api/expenses/${expenseId}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(body),
  });

  if (error) return { error };

  revalidatePath("/dashboard");
  if (eventId) {
    revalidatePath(`/dashboard/event/${eventId}`);
  }
  return { success: true };
}

export async function deleteExpense(expenseId: string, eventId: string) {
  const { error } = await apiFetch(`/api/expenses/${expenseId}`, {
    method: "DELETE",
    auth: true,
  });

  if (error) return { error };

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/event/${eventId}`);
  return { success: true };
}

// -------- Participants --------

export async function addParticipant(formData: FormData) {
  const eventId = formData.get("eventId") as string;
  const name = formData.get("name") as string;
  const email = (formData.get("email") as string) || null;

  if (!eventId || !name) {
    return { error: "Event ID and name are required" };
  }

  const { data, error } = await apiFetch<any>("/api/participants", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ eventId, name, email }),
  });

  if (error) return { error };

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/event/${eventId}`);
  return { success: true, participant: data };
}

export async function deleteParticipant(participantId: string, eventId: string) {
  const { error } = await apiFetch(`/api/participants/${participantId}`, {
    method: "DELETE",
    auth: true,
  });

  if (error) return { error };

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/event/${eventId}`);
  return { success: true };
}

export async function updatePaymentStatus(
  participantId: string,
  eventId: string,
  status: "pending" | "paid",
) {
  const { error } = await apiFetch(`/api/participants/${participantId}/payment-status`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ payment_status: status }),
  });

  if (error) return { error };

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/event/${eventId}`);
  return { success: true };
}

// -------- Event email note & status --------

export async function updateEmailNote(eventId: string, emailNote: string) {
  const { error } = await apiFetch(`/api/events/${eventId}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify({ email_note: emailNote }),
  });

  if (error) return { error };

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/event/${eventId}`);
  return { success: true };
}

export async function closeEvent(eventId: string) {
  const { error } = await apiFetch(`/api/events/${eventId}/close`, {
    method: "POST",
    auth: true,
  });

  if (error) return { error };

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/event/${eventId}`);
  return { success: true };
}

export async function deleteEvent(eventId: string) {
  const { error } = await apiFetch(`/api/events/${eventId}`, {
    method: "DELETE",
    auth: true,
  });

  if (error) return { error };

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

