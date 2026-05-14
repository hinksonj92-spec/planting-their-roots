'use client';

import { createClient } from '@/lib/supabase';

const BUCKET = 'milestone-photos';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 1200;

/**
 * Compress an image file to JPEG, resize if needed, return a Blob.
 */
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to compress image'));
        },
        'image/jpeg',
        0.8,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Upload a milestone photo to Supabase Storage.
 * Returns the public URL or null on failure.
 */
export async function uploadMilestonePhoto(
  userId: string,
  childId: string,
  milestoneKey: string,
  file: File,
): Promise<string | null> {
  if (file.size > MAX_SIZE * 2) {
    throw new Error('Photo is too large. Maximum size is 5MB.');
  }

  const supabase = createClient();
  const compressed = await compressImage(file);

  // Path: userId/childId/milestoneKey-timestamp.jpg
  const timestamp = Date.now();
  const safeMilestoneKey = milestoneKey.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `${userId}/${childId}/${safeMilestoneKey}-${timestamp}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) {
    console.error('Photo upload failed:', error);
    return null;
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return urlData.publicUrl;
}

/**
 * Delete a milestone photo from Supabase Storage.
 */
export async function deleteMilestonePhoto(photoUrl: string): Promise<boolean> {
  const supabase = createClient();

  // Extract path from public URL
  const match = photoUrl.match(/milestone-photos\/(.+)$/);
  if (!match) return false;

  const { error } = await supabase.storage.from(BUCKET).remove([match[1]]);
  if (error) {
    console.error('Photo delete failed:', error);
    return false;
  }

  return true;
}
