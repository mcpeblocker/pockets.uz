"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { calculateSettlements, validateExpenseSplits } from "@/lib/settlements";
import { sendSettlementEmail } from "@/lib/email";
import { ensureUserExists } from "@/lib/user-sync";
import { ExpenseFormData } from "@/lib/types";

// Helper to log event history
async function logEventAction(
  supabase: any,
  eventId: string,
  action: string,
  userId: string | null,
  participantId: string | null = null,
  details: Record<string, any> | null = null
) {
  await supabase.rpc('log_event_action', {
    p_event_id: eventId,
    p_action: action,
    p_user_id: userId,
    p_participant_id: participantId,
    p_details: details,
  });
}

export async function createEvent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to create events" };
  }

  // Ensure user exists in the database
  const syncResult = await ensureUserExists(user.id, user.email);
  if (syncResult.error) {
    console.error("Failed to sync user:", syncResult.error);
    return { error: "Failed to sync user account. Please try again." };
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const slug = formData.get("slug") as string;
  const currency = (formData.get("currency") as string) || "USD";

  if (!title || !slug) {
    return { error: "Title and slug are required" };
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { error: "Slug can only contain lowercase letters, numbers, and hyphens" };
  }

  // Check if slug is already taken
  const { data: existing } = await supabase
    .from("events")
    .select("id")
    .eq("slug", slug)
    .single();

  if (existing) {
    return { error: "This slug is already taken. Please choose another." };
  }

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      title,
      description: description || null,
      slug,
      owner_id: user.id,
      status: "open",
      currency,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating event:", error);
    return { error: "Failed to create event" };
  }

  await logEventAction(supabase, event.id, "event_created", user.id, null, { title, slug });

  revalidatePath("/dashboard");
  return { success: true, event };
}

export async function getUserEvents() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching events:", error);
    return [];
  }

  return events || [];
}

// V2: Enhanced expense creation with custom splits and categories
export async function addExpense(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in" };
  }

  const eventId = formData.get("eventId") as string;
  const description = formData.get("description") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const paidByParticipantId = formData.get("paidByParticipantId") as string;
  const expenseDate = formData.get("expenseDate") as string | null;
  const categoryId = formData.get("categoryId") as string | null;
  const splitType = (formData.get("splitType") as string) || "equal";

  if (!eventId || !description || !amount || !paidByParticipantId) {
    return { error: "All required fields are missing" };
  }

  if (amount <= 0) {
    return { error: "Amount must be greater than 0" };
  }

  // Verify ownership
  const { data: event } = await supabase
    .from("events")
    .select("owner_id, status, currency")
    .eq("id", eventId)
    .single();

  if (!event || event.owner_id !== user.id) {
    return { error: "Unauthorized" };
  }

  if (event.status === "closed") {
    return { error: "Cannot add expenses to closed events. Please reopen the event first." };
  }

  // Check if participant exists
  const { data: participant } = await supabase
    .from("participants")
    .select("id")
    .eq("id", paidByParticipantId)
    .eq("event_id", eventId)
    .single();

  if (!participant) {
    return { error: "Invalid participant" };
  }

  // Create expense
  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .insert({
      event_id: eventId,
      description,
      amount,
      paid_by_participant_id: paidByParticipantId,
      expense_date: expenseDate || null,
      category_id: categoryId || null,
      currency: event.currency,
    })
    .select()
    .single();

  if (expenseError) {
    console.error("Error adding expense:", expenseError);
    return { error: "Failed to add expense" };
  }

  // Handle custom splits
  if (splitType === "custom") {
    const splitsJson = formData.get("splits") as string;
    if (splitsJson) {
      try {
        const splits = JSON.parse(splitsJson);
        
        // Validate splits
        const validation = validateExpenseSplits(amount, splits);
        if (!validation.valid) {
          // Delete the expense we just created
          await supabase.from("expenses").delete().eq("id", expense.id);
          return { error: validation.error || "Invalid expense splits" };
        }

        // Create splits
        const splitRecords = splits.map((split: any) => ({
          expense_id: expense.id,
          participant_id: split.participantId,
          amount: split.amount !== undefined ? split.amount : null,
          percentage: split.percentage !== undefined ? split.percentage : null,
        }));

        const { error: splitsError } = await supabase
          .from("expense_splits")
          .insert(splitRecords);

        if (splitsError) {
          console.error("Error adding expense splits:", splitsError);
          await supabase.from("expenses").delete().eq("id", expense.id);
          return { error: "Failed to add expense splits" };
        }
      } catch (e) {
        await supabase.from("expenses").delete().eq("id", expense.id);
        return { error: "Invalid splits data" };
      }
    }
  }

  await logEventAction(supabase, eventId, "expense_added", user.id, null, {
    expense_id: expense.id,
    description,
    amount,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/event/${eventId}`);
  revalidatePath(`/event/${event.slug}`);
  return { success: true, expense };
}

// V2: New function to update expenses
export async function updateExpense(expenseId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in" };
  }

  const eventId = formData.get("eventId") as string;
  const description = formData.get("description") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const paidByParticipantId = formData.get("paidByParticipantId") as string;
  const expenseDate = formData.get("expenseDate") as string | null;
  const categoryId = formData.get("categoryId") as string | null;
  const splitType = (formData.get("splitType") as string) || "equal";

  if (!eventId || !description || !amount || !paidByParticipantId) {
    return { error: "All required fields are missing" };
  }

  if (amount <= 0) {
    return { error: "Amount must be greater than 0" };
  }

  // Verify ownership
  const { data: event } = await supabase
    .from("events")
    .select("owner_id, status")
    .eq("id", eventId)
    .single();

  if (!event || event.owner_id !== user.id) {
    return { error: "Unauthorized" };
  }

  if (event.status === "closed") {
    return { error: "Cannot update expenses in closed events. Please reopen the event first." };
  }

  // Update expense
  const { error: updateError } = await supabase
    .from("expenses")
    .update({
      description,
      amount,
      paid_by_participant_id: paidByParticipantId,
      expense_date: expenseDate || null,
      category_id: categoryId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", expenseId);

  if (updateError) {
    console.error("Error updating expense:", updateError);
    return { error: "Failed to update expense" };
  }

  // Delete existing splits and recreate if custom
  await supabase.from("expense_splits").delete().eq("expense_id", expenseId);

  if (splitType === "custom") {
    const splitsJson = formData.get("splits") as string;
    if (splitsJson) {
      try {
        const splits = JSON.parse(splitsJson);
        
        // Validate splits
        const validation = validateExpenseSplits(amount, splits);
        if (!validation.valid) {
          return { error: validation.error || "Invalid expense splits" };
        }

        // Create splits
        const splitRecords = splits.map((split: any) => ({
          expense_id: expenseId,
          participant_id: split.participantId,
          amount: split.amount !== undefined ? split.amount : null,
          percentage: split.percentage !== undefined ? split.percentage : null,
        }));

        const { error: splitsError } = await supabase
          .from("expense_splits")
          .insert(splitRecords);

        if (splitsError) {
          console.error("Error updating expense splits:", splitsError);
          return { error: "Failed to update expense splits" };
        }
      } catch (e) {
        return { error: "Invalid splits data" };
      }
    }
  }

  await logEventAction(supabase, eventId, "expense_updated", user.id, null, {
    expense_id: expenseId,
    description,
    amount,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/event/${eventId}`);
  revalidatePath(`/event/${event.slug}`);
  return { success: true };
}

export async function deleteExpense(expenseId: string, eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Verify ownership
  const { data: event } = await supabase
    .from("events")
    .select("owner_id, status, slug")
    .eq("id", eventId)
    .single();

  if (!event || event.owner_id !== user.id) {
    return { error: "Unauthorized" };
  }

  if (event.status === "closed") {
    return { error: "Cannot delete expenses from closed events. Please reopen the event first." };
  }

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId);

  if (error) {
    console.error("Error deleting expense:", error);
    return { error: "Failed to delete expense" };
  }

  await logEventAction(supabase, eventId, "expense_deleted", user.id, null, {
    expense_id: expenseId,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/event/${eventId}`);
  revalidatePath(`/event/${event.slug}`);
  return { success: true };
}

// V2: Enhanced participant management with duplicate prevention
export async function addParticipant(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const eventId = formData.get("eventId") as string;
  const name = formData.get("name") as string;
  const email = (formData.get("email") as string) || null;

  if (!eventId || !name) {
    return { error: "Event ID and name are required" };
  }

  // Verify ownership
  const { data: event } = await supabase
    .from("events")
    .select("owner_id, status")
    .eq("id", eventId)
    .single();

  if (!event || event.owner_id !== user.id) {
    return { error: "Unauthorized" };
  }

  if (event.status === "closed") {
    return { error: "Cannot add participants to closed events. Please reopen the event first." };
  }

  // V2: Check for duplicate email in same event
  if (email) {
    const { data: existing } = await supabase
      .from("participants")
      .select("id, name")
      .eq("event_id", eventId)
      .ilike("email", email)
      .single();

    if (existing) {
      return { 
        error: `A participant with email ${email} already exists in this event (${existing.name})` 
      };
    }
  }

  const { data: participant, error } = await supabase
    .from("participants")
    .insert({
      event_id: eventId,
      name,
      email,
      payment_status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding participant:", error);
    // Check if it's a duplicate constraint violation
    if (error.code === "23505") {
      return { error: "A participant with this email already exists in this event" };
    }
    return { error: "Failed to add participant" };
  }

  await logEventAction(supabase, eventId, "participant_added", user.id, participant.id, {
    name,
    email,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/event/${eventId}`);
  revalidatePath(`/event/${event.slug}`);
  return { success: true, participant };
}

// V2: New function to update participants
export async function updateParticipant(
  participantId: string,
  eventId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Verify ownership
  const { data: event } = await supabase
    .from("events")
    .select("owner_id, status, slug")
    .eq("id", eventId)
    .single();

  if (!event || event.owner_id !== user.id) {
    return { error: "Unauthorized" };
  }

  if (event.status === "closed") {
    return { error: "Cannot update participants in closed events. Please reopen the event first." };
  }

  const name = formData.get("name") as string;
  const email = (formData.get("email") as string) || null;

  if (!name) {
    return { error: "Name is required" };
  }

  // V2: Check for duplicate email (excluding current participant)
  if (email) {
    const { data: existing } = await supabase
      .from("participants")
      .select("id")
      .eq("event_id", eventId)
      .ilike("email", email)
      .neq("id", participantId)
      .single();

    if (existing) {
      return { error: "A participant with this email already exists in this event" };
    }
  }

  const { error } = await supabase
    .from("participants")
    .update({
      name,
      email,
      updated_at: new Date().toISOString(),
    })
    .eq("id", participantId);

  if (error) {
    console.error("Error updating participant:", error);
    if (error.code === "23505") {
      return { error: "A participant with this email already exists in this event" };
    }
    return { error: "Failed to update participant" };
  }

  await logEventAction(supabase, eventId, "participant_updated", user.id, participantId, {
    name,
    email,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/event/${eventId}`);
  revalidatePath(`/event/${event.slug}`);
  return { success: true };
}

export async function deleteParticipant(
  participantId: string,
  eventId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Verify ownership
  const { data: event } = await supabase
    .from("events")
    .select("owner_id, status, slug")
    .eq("id", eventId)
    .single();

  if (!event || event.owner_id !== user.id) {
    return { error: "Unauthorized" };
  }

  if (event.status === "closed") {
    return { error: "Cannot remove participants from closed events. Please reopen the event first." };
  }

  // Check if participant has any expenses (as payer or in splits)
  const { data: expenses } = await supabase
    .from("expenses")
    .select("id")
    .eq("paid_by_participant_id", participantId)
    .limit(1);

  if (expenses && expenses.length > 0) {
    return { error: "Cannot remove participant who has paid for expenses" };
  }

  // Check if participant is in any expense splits
  const { data: splits } = await supabase
    .from("expense_splits")
    .select("id")
    .eq("participant_id", participantId)
    .limit(1);

  if (splits && splits.length > 0) {
    return { error: "Cannot remove participant who is included in expense splits" };
  }

  const { error } = await supabase
    .from("participants")
    .delete()
    .eq("id", participantId);

  if (error) {
    console.error("Error deleting participant:", error);
    return { error: "Failed to remove participant" };
  }

  await logEventAction(supabase, eventId, "participant_removed", user.id, participantId);

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/event/${eventId}`);
  revalidatePath(`/event/${event.slug}`);
  return { success: true };
}

export async function updatePaymentStatus(
  participantId: string,
  eventId: string,
  status: "pending" | "paid"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Verify ownership and get event slug
  const { data: event } = await supabase
    .from("events")
    .select("owner_id, slug")
    .eq("id", eventId)
    .single();

  if (!event || event.owner_id !== user.id) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("participants")
    .update({ payment_status: status })
    .eq("id", participantId);

  if (error) {
    console.error("Error updating payment status:", error);
    return { error: "Failed to update payment status" };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/event/${eventId}`);
  revalidatePath(`/event/${event.slug}`);
  return { success: true };
}

export async function updateEmailNote(eventId: string, emailNote: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Verify ownership
  const { data: event } = await supabase
    .from("events")
    .select("owner_id")
    .eq("id", eventId)
    .single();

  if (!event || event.owner_id !== user.id) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("events")
    .update({ email_note: emailNote })
    .eq("id", eventId);

  if (error) {
    console.error("Error updating email note:", error);
    return { error: "Failed to update email note" };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

// V2: Enhanced close event with better settlement handling
export async function closeEvent(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Verify ownership and get event details
  const { data: event } = await supabase
    .from("events")
    .select("*, participants(*), expenses(*)")
    .eq("id", eventId)
    .single();

  if (!event || event.owner_id !== user.id) {
    return { error: "Unauthorized" };
  }

  if (event.status === "closed") {
    return { error: "Event is already closed" };
  }

  // Get expense splits for custom splitting
  const { data: expenseSplits } = await supabase
    .from("expense_splits")
    .select("*")
    .in("expense_id", event.expenses.map((e: any) => e.id));

  // Calculate settlements with custom splits support
  const settlements = calculateSettlements(
    event.participants,
    event.expenses,
    expenseSplits || []
  );

  // Delete existing settlements if any (in case of reopening)
  await supabase.from("settlements").delete().eq("event_id", eventId);

  // Save settlements to database
  if (settlements.length > 0) {
    const { error: settlementsError } = await supabase
      .from("settlements")
      .insert(
        settlements.map((s) => ({
          event_id: eventId,
          from_participant_id: s.fromParticipantId,
          to_participant_id: s.toParticipantId,
          from_name: s.fromName,
          to_name: s.toName,
          amount: s.amount,
        }))
      );

    if (settlementsError) {
      console.error("Error saving settlements:", settlementsError);
      return { error: "Failed to save settlements" };
    }
  }

  // Close the event
  const { error: closeError } = await supabase
    .from("events")
    .update({ status: "closed" })
    .eq("id", eventId);

  if (closeError) {
    console.error("Error closing event:", closeError);
    return { error: "Failed to close event" };
  }

  // Send personalized emails to participants
  for (const participant of event.participants) {
    // Filter settlements relevant to this participant
    const relevantSettlements = {
      toPay: settlements
        .filter((s) => s.fromParticipantId === participant.id)
        .map((s) => ({ to: s.toName, amount: s.amount })),
      toReceive: settlements
        .filter((s) => s.toParticipantId === participant.id)
        .map((s) => ({ from: s.fromName, amount: s.amount })),
    };

    // Send email if available
    if (participant.email) {
      await sendSettlementEmail(
        participant.email,
        participant.name,
        event.title,
        event.currency || "USD",
        relevantSettlements,
        event.email_note,
        event.slug
      );
    }
  }

  await logEventAction(supabase, eventId, "event_closed", user.id, null);

  revalidatePath("/dashboard");
  revalidatePath(`/event/${event.slug}`);
  return { success: true };
}

// V2: New function to reopen closed events
export async function reopenEvent(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Verify ownership
  const { data: event } = await supabase
    .from("events")
    .select("owner_id, status, slug")
    .eq("id", eventId)
    .single();

  if (!event || event.owner_id !== user.id) {
    return { error: "Unauthorized" };
  }

  if (event.status === "open") {
    return { error: "Event is already open" };
  }

  // Reopen the event
  const { error } = await supabase
    .from("events")
    .update({ status: "open" })
    .eq("id", eventId);

  if (error) {
    console.error("Error reopening event:", error);
    return { error: "Failed to reopen event" };
  }

  // Optionally delete settlements (or keep them for reference)
  // For now, we'll keep them but they'll be recalculated on next close

  await logEventAction(supabase, eventId, "event_reopened", user.id, null);

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/event/${eventId}`);
  revalidatePath(`/event/${event.slug}`);
  return { success: true };
}

export async function deleteEvent(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Verify ownership
  const { data: event } = await supabase
    .from("events")
    .select("owner_id")
    .eq("id", eventId)
    .single();

  if (!event || event.owner_id !== user.id) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase.from("events").delete().eq("id", eventId);

  if (error) {
    console.error("Error deleting event:", error);
    return { error: "Failed to delete event" };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// V2: Expense category management
export async function createExpenseCategory(eventId: string, name: string, color?: string, icon?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Verify ownership
  const { data: event } = await supabase
    .from("events")
    .select("owner_id")
    .eq("id", eventId)
    .single();

  if (!event || event.owner_id !== user.id) {
    return { error: "Unauthorized" };
  }

  const { data: category, error } = await supabase
    .from("expense_categories")
    .insert({
      event_id: eventId,
      name,
      color: color || null,
      icon: icon || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating category:", error);
    if (error.code === "23505") {
      return { error: "A category with this name already exists" };
    }
    return { error: "Failed to create category" };
  }

  revalidatePath(`/dashboard/event/${eventId}`);
  return { success: true, category };
}

export async function getExpenseCategories(eventId: string) {
  const supabase = await createClient();

  const { data: categories, error } = await supabase
    .from("expense_categories")
    .select("*")
    .eq("event_id", eventId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }

  return categories || [];
}
