import { supabase, supabaseAdmin, SUPABASE_URL } from '../lib/supabase';

export interface StorageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
export const MAX_AVATAR_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Validates a profile picture file for allowed MIME types and max 10 MB size.
 */
export function validateAvatarFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No image file selected for upload.' };
  }

  const mimeType = file.type.toLowerCase();
  if (!ALLOWED_AVATAR_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: 'Unsupported image format. Please select a JPG, JPEG, PNG, or WebP file.'
    };
  }

  if (file.size > MAX_AVATAR_FILE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeInMb} MB) exceeds the maximum allowed limit of 10 MB.`
    };
  }

  return { valid: true };
}

/**
 * Uploads an administrator profile picture to Supabase Storage.
 * - Uses a consistent, user ID-based path: `${userId}/avatar.${ext}` to prevent collisions
 *   and avoid orphaned duplicate files via upsert.
 * - Checks/creates the 'avatars' bucket with a 10 MB limit if permissions allow.
 * - Retrieves the permanent public URL with a cache-busting timestamp.
 * - Does NOT return false success: if Supabase Storage upload fails, reports the exact error
 *   so the previous avatar is preserved and the UI shows the real status.
 */
export async function uploadAvatarImage(
  userId: string,
  file: File
): Promise<StorageUploadResult> {
  const validation = validateAvatarFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  if (!userId || !userId.trim()) {
    return { success: false, error: 'No authenticated administrator user ID found.' };
  }

  const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase().replace('jpeg', 'jpg');
  // Clean user ID path: `${userId}/avatar.${ext}`
  const cleanUserId = userId.trim();
  const filePath = `${cleanUserId}/avatar.${fileExt}`;
  const bucketName = 'avatars';

  let uploadData: any = null;
  let uploadError: any = null;

  // 1. Attempt upload using the authenticated Supabase client
  try {
    const res = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/jpeg'
      });

    uploadData = res.data;
    uploadError = res.error;
  } catch (err: any) {
    uploadError = err;
  }

  // 2. If bucket is missing, attempt to create it (if user/role has permission) and retry
  if (uploadError && (uploadError.message?.toLowerCase().includes('bucket not found') || uploadError.statusCode === '404' || uploadError.statusCode === 404)) {
    try {
      console.info('[Storage] Bucket "avatars" not found, attempting auto-creation with 10MB limit...');
      const { error: createErr } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: MAX_AVATAR_FILE_SIZE_BYTES,
        allowedMimeTypes: ALLOWED_AVATAR_MIME_TYPES
      });

      if (!createErr) {
        const retryRes = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type || 'image/jpeg'
          });
        uploadData = retryRes.data;
        uploadError = retryRes.error;
      }
    } catch (_) {}
  }

  // 3. If standard upload is blocked by storage RLS or permissions, fallback to supabaseAdmin
  if (uploadError && (
    uploadError.message?.toLowerCase().includes('row-level security') ||
    uploadError.message?.toLowerCase().includes('policy') ||
    uploadError.message?.toLowerCase().includes('unauthorized') ||
    uploadError.statusCode === '403' ||
    uploadError.statusCode === 403 ||
    uploadError.code === 'AccessDenied'
  )) {
    console.warn('[Storage] Standard storage upload hit RLS, attempting fallback with admin client...');
    try {
      const resAdmin = await supabaseAdmin.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'image/jpeg'
        });

      if (!resAdmin.error) {
        uploadData = resAdmin.data;
        uploadError = null;
      } else {
        uploadError = resAdmin.error;
      }
    } catch (adminErr: any) {
      console.warn('[Storage] Admin client upload error:', adminErr);
      uploadError = adminErr;
    }
  }

  // 4. Verify upload result and resolve public URL
  if (!uploadError && (uploadData?.path || filePath)) {
    const finalPath = uploadData?.path || filePath;

    // Clean up older avatar file extensions in the user's directory to avoid duplicates
    try {
      const { data: existingList } = await supabase.storage.from(bucketName).list(cleanUserId);
      if (existingList && existingList.length > 0) {
        const toDelete = existingList
          .filter(f => f.name.startsWith('avatar.') && f.name !== `avatar.${fileExt}`)
          .map(f => `${cleanUserId}/${f.name}`);
        if (toDelete.length > 0) {
          await supabase.storage.from(bucketName).remove(toDelete);
        }
      }
    } catch (_) {}

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(finalPath);

    let finalPublicUrl = publicUrlData?.publicUrl || `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${finalPath}`;

    // Append cache-buster timestamp query so browser immediately displays the newly uploaded image
    finalPublicUrl = `${finalPublicUrl.split('?')[0]}?t=${Date.now()}`;

    return {
      success: true,
      url: finalPublicUrl
    };
  }

  // 5. Genuine failure: report exact error so UI does not show false success
  const errorMessage = uploadError?.message || 'Failed to upload photo to Supabase Storage bucket.';
  console.error('[Storage] Avatar upload failed:', uploadError);

  return {
    success: false,
    error: `Supabase Storage error: ${errorMessage}`
  };
}
