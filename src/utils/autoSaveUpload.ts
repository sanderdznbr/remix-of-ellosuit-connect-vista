import { supabase } from '@/integrations/supabase/client';

const UPLOADS_FOLDER_NAME = 'Uploads realizados';
const UPLOADS_FOLDER_COLOR = '#3B82F6';

/**
 * Ensures the "Uploads realizados" folder exists, creating it if needed.
 * Returns the folder ID.
 */
// Module-level cache to avoid repeated queries and race-condition duplicates
let cachedFolderId: string | null = null;
let folderPromise: Promise<string | null> | null = null;

async function ensureUploadsFolder(companyId: string, userId: string): Promise<string | null> {
  // Return cached value if available
  if (cachedFolderId) return cachedFolderId;

  // If a lookup is already in flight, reuse it (prevents parallel creates)
  if (folderPromise) return folderPromise;

  folderPromise = (async () => {
    try {
      // Check if folder already exists (may be multiple from previous bug — pick first)
      const { data: existing } = await supabase
        .from('brand_asset_folders')
        .select('id')
        .eq('company_id', companyId)
        .eq('name', UPLOADS_FOLDER_NAME)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existing) {
        cachedFolderId = existing.id;
        return existing.id;
      }

      // Create folder
      const { data: created, error } = await supabase
        .from('brand_asset_folders')
        .insert({
          company_id: companyId,
          name: UPLOADS_FOLDER_NAME,
          color: UPLOADS_FOLDER_COLOR,
          created_by: userId,
        })
        .select('id')
        .single();

      if (error) {
        // Could be a unique-ish race; try fetching again
        const { data: retry } = await supabase
          .from('brand_asset_folders')
          .select('id')
          .eq('company_id', companyId)
          .eq('name', UPLOADS_FOLDER_NAME)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (retry) { cachedFolderId = retry.id; return retry.id; }
        console.error('Error creating uploads folder:', error);
        return null;
      }
      cachedFolderId = created?.id || null;
      return cachedFolderId;
    } catch (err) {
      console.error('ensureUploadsFolder error:', err);
      return null;
    } finally {
      folderPromise = null;
    }
  })();

  return folderPromise;
}

/**
 * Auto-saves a base64 or blob image to the "Uploads realizados" folder in the brand gallery.
 * Runs in the background — does not block the UI.
 */
export async function autoSaveToGallery(
  dataUrl: string,
  fileName: string,
): Promise<void> {
  try {
    // Skip if not base64
    if (!dataUrl.startsWith('data:')) return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const { data: cu } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', userData.user.id)
      .limit(1)
      .maybeSingle();
    if (!cu) return;

    const folderId = await ensureUploadsFolder(cu.company_id, userData.user.id);
    if (!folderId) return;

    // Convert base64 to blob
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
    const storagePath = `${cu.company_id}/${crypto.randomUUID()}.${ext}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('brand-assets')
      .upload(storagePath, blob, { contentType: blob.type, upsert: false });

    if (uploadError) {
      console.warn('Auto-save upload error:', uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage.from('brand-assets').getPublicUrl(storagePath);
    if (!urlData?.publicUrl) return;

    // Save to brand_assets table
    const safeName = fileName || `upload-${Date.now()}.${ext}`;
    await supabase.from('brand_assets').insert({
      company_id: cu.company_id,
      name: safeName,
      file_url: urlData.publicUrl,
      file_type: 'image',
      category: 'upload',
      folder_id: folderId,
    });
  } catch (err) {
    console.warn('autoSaveToGallery error:', err);
  }
}

/**
 * Auto-saves multiple files (from FileList) to the gallery.
 * Runs in background.
 */
export function autoSaveFilesToGallery(files: FileList | File[]): void {
  Array.from(files).forEach((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        autoSaveToGallery(reader.result as string, file.name);
      }
    };
    reader.readAsDataURL(file);
  });
}
