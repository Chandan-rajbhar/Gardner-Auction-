import { useState, useEffect, useCallback } from 'react';
import {
  getSiteContent,
  subscribeToSiteContent
} from '../services/siteContentService';
import type {
  ContentKey,
  SupportedContentMap
} from '../services/siteContentService';

export function useSiteContent<K extends ContentKey>(
  key: K,
  fallback: SupportedContentMap[K]
): {
  content: SupportedContentMap[K];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
} {
  const [content, setContent] = useState<SupportedContentMap[K]>(fallback);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadContent = useCallback(async () => {
    try {
      const data = await getSiteContent(key, fallback);
      if (data) {
        setContent(data);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [key, fallback]);

  useEffect(() => {
    let isMounted = true;

    async function initialFetch() {
      try {
        const data = await getSiteContent(key, fallback);
        if (isMounted && data) {
          setContent(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initialFetch();

    // Realtime subscription for instant updates across tabs/windows
    const unsubscribe = subscribeToSiteContent(key, (newContent) => {
      if (isMounted && newContent) {
        setContent(newContent);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [key]);

  return { content, loading, error, reload: loadContent };
}
