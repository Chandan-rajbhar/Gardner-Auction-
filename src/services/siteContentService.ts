import { supabase, supabaseAdmin } from '../lib/supabase';
import type {
  HomepageHeroContent,
  SiteFooterContent,
  CurrentAuctionsHeroContent,
  EmailListPageContent,
  SiteContentRecord
} from '../types/siteContent';

export type SupportedContentMap = {
  homepage_hero: HomepageHeroContent;
  site_footer: SiteFooterContent;
  current_auctions_hero: CurrentAuctionsHeroContent;
  email_list_page: EmailListPageContent;
};

export type ContentKey = keyof SupportedContentMap;

/**
 * Fetch a specific content record from public.site_content with fallback.
 */
export async function getSiteContent<K extends ContentKey>(
  key: K,
  fallback?: SupportedContentMap[K]
): Promise<SupportedContentMap[K]> {
  try {
    const { data, error } = await supabase
      .from('site_content')
      .select('content')
      .eq('key', key)
      .maybeSingle();

    if (error || !data?.content) {
      if (error) {
        console.warn(`[siteContentService] Error fetching "${key}":`, error.message);
      }
      return fallback as SupportedContentMap[K];
    }

    return data.content as SupportedContentMap[K];
  } catch (err) {
    console.warn(`[siteContentService] Unexpected error fetching "${key}":`, err);
    return fallback as SupportedContentMap[K];
  }
}

/**
 * Fetch all content records from public.site_content.
 */
export async function getAllSiteContent(): Promise<Record<string, any>> {
  try {
    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[siteContentService] Error fetching all site content:', error.message);
      return {};
    }

    const map: Record<string, any> = {};
    if (Array.isArray(data)) {
      data.forEach((row: SiteContentRecord<any>) => {
        map[row.key] = row.content;
      });
    }
    return map;
  } catch (err) {
    console.warn('[siteContentService] Unexpected error fetching all site content:', err);
    return {};
  }
}

/**
 * Save / Update a content record in public.site_content.
 * Uses authenticated supabase client first; if not session-authenticated, falls back to supabaseAdmin.
 */
export async function saveSiteContent<K extends ContentKey>(
  key: K,
  section: string,
  content: SupportedContentMap[K]
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const client = user ? supabase : supabaseAdmin;

    const { data, error } = await client
      .from('site_content')
      .upsert(
        {
          key,
          section,
          content,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'key' }
      )
      .select()
      .single();

    if (error) {
      console.error(`[siteContentService] Save error for "${key}":`, error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[siteContentService] Unexpected save error for "${key}":`, msg);
    return { success: false, error: msg };
  }
}

/**
 * Upload an image asset to Supabase Storage ('avatars' or 'site-assets') and return its permanent public URL.
 */
export async function uploadSiteAsset(
  file: File,
  folder = 'site-assets'
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    if (!file) {
      return { success: false, error: 'No image file provided' };
    }

    const mime = file.type.toLowerCase();
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif', 'image/svg+xml'];
    if (!validMimes.includes(mime)) {
      return { success: false, error: 'Unsupported image type. Use JPG, PNG, WebP, or SVG.' };
    }

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const cleanFileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const bucketName = 'avatars'; // reuse the configured public bucket

    // Attempt standard client upload
    let uploadRes = await supabase.storage
      .from(bucketName)
      .upload(cleanFileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/jpeg'
      });

    // Fallback to supabaseAdmin if standard client faces RLS restriction
    if (uploadRes.error) {
      uploadRes = await supabaseAdmin.storage
        .from(bucketName)
        .upload(cleanFileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'image/jpeg'
        });
    }

    if (uploadRes.error) {
      return { success: false, error: uploadRes.error.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(cleanFileName);

    return { success: true, url: publicUrlData.publicUrl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Subscribe to realtime updates on public.site_content
 */
export function subscribeToSiteContent(
  key: string,
  onUpdate: (newContent: any) => void
): () => void {
  const channel = supabase
    .channel(`site_content_${key}_${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'site_content',
        filter: `key=eq.${key}`
      },
      (payload) => {
        if (payload.new && (payload.new as any).content) {
          onUpdate((payload.new as any).content);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
