# Supabase Storage Setup for Receipt Uploads

To enable photo/receipt uploads for expenses, you need to set up a Supabase Storage bucket.

## Quick Setup

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Create Storage Bucket**
   - Click **Storage** in the left sidebar
   - Click **New bucket**
   - Name: `receipts`
   - Make it **Public** (so uploaded receipts can be viewed)
   - Click **Create bucket**

3. **Set Up Storage Policies**
   - Click on the `receipts` bucket
   - Go to **Policies** tab
   - Click **New Policy**
   - Policy name: "Allow authenticated users to upload receipts"
   - Allowed operation: **INSERT**
   - Policy definition:
     ```sql
     (bucket_id = 'receipts'::text) AND (auth.role() = 'authenticated'::text)
     ```
   - Click **Save**

   - Create another policy for reading:
     - Policy name: "Allow public read access to receipts"
     - Allowed operation: **SELECT**
     - Policy definition:
       ```sql
       (bucket_id = 'receipts'::text)
       ```
     - Click **Save**

## Alternative: Quick SQL Setup

Run this in Supabase SQL Editor:

```sql
-- Create receipts bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- Allow public read access
CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'receipts');
```

## Verification

After setup, try uploading a receipt when adding an expense. The file should appear in the `receipts` bucket in Storage.

## Troubleshooting

- **Error: "Bucket not found"** - Make sure the bucket is named exactly `receipts`
- **Error: "Permission denied"** - Check that the storage policies are set up correctly
- **Files not showing** - Ensure the bucket is set to **Public**
