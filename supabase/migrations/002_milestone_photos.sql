-- Add photo_url column to milestone_progress
ALTER TABLE milestone_progress ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create storage bucket for milestone photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'milestone-photos',
  'milestone-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload milestone photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'milestone-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to view milestone photos (public bucket)
CREATE POLICY "Public read access for milestone photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'milestone-photos');

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own milestone photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'milestone-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
