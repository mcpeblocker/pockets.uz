import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { participantId, eventId } = await request.json();

    if (!participantId || !eventId) {
      return NextResponse.json(
        { error: 'Participant ID and Event ID are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if event is still open
    const { data: event } = await supabase
      .from('events')
      .select('status')
      .eq('id', eventId)
      .single();

    if (!event || event.status !== 'open') {
      return NextResponse.json(
        { error: 'Cannot leave a closed event' },
        { status: 400 }
      );
    }

    // Bug Fix #2 & #4: Check if this participant has any expenses (as payer or in splits)
    const { data: expenses } = await supabase
      .from('expenses')
      .select('id')
      .eq('paid_by_participant_id', participantId)
      .limit(1);

    if (expenses && expenses.length > 0) {
      return NextResponse.json(
        { error: 'Cannot leave: you have expenses associated with this event' },
        { status: 400 }
      );
    }

    // Check if participant is in any expense splits (owes money)
    const { data: splits } = await supabase
      .from('expense_splits')
      .select('id')
      .eq('participant_id', participantId)
      .limit(1);

    if (splits && splits.length > 0) {
      return NextResponse.json(
        { error: 'Cannot leave: you are included in expense splits for this event' },
        { status: 400 }
      );
    }

    // Delete the participant
    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('id', participantId)
      .eq('event_id', eventId);

    if (error) {
      console.error('Error leaving event:', error);
      return NextResponse.json(
        { error: 'Failed to leave event' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in leave-event API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
