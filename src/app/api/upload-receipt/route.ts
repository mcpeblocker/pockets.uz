import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const expenseId = formData.get('expenseId') as string;

    if (!file || !expenseId) {
      return NextResponse.json({ error: 'File and expenseId are required' }, { status: 400 });
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${expenseId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `receipts/${fileName}`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, uint8Array, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(filePath);

    // Save receipt record
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .insert({
        expense_id: expenseId,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      })
      .select()
      .single();

    if (receiptError) {
      console.error('Error saving receipt record:', receiptError);
      // Don't fail - file is uploaded, just missing DB record
    }

    return NextResponse.json({ 
      success: true, 
      receipt: receipt || { file_url: urlData.publicUrl },
      url: urlData.publicUrl 
    });
  } catch (error) {
    console.error('Error in upload-receipt API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
