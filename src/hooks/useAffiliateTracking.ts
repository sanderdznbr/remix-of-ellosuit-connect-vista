import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const STORAGE_KEY = 'affiliate_ref';
const EXPIRY_KEY = 'affiliate_ref_expiry';
const EXPIRY_DAYS = 30;

/**
 * Captures ?ref=CODE from URL and persists in localStorage for 30 days.
 * Call this once at app level (inside BrowserRouter).
 */
export function useAffiliateTracking() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem(STORAGE_KEY, ref);
      localStorage.setItem(EXPIRY_KEY, String(Date.now() + EXPIRY_DAYS * 86400000));
      // Remove ?ref= from URL to keep it clean, but keep other params
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('ref');
      setSearchParams(newParams, { replace: true });
    } else {
      // Check expiry
      const expiry = localStorage.getItem(EXPIRY_KEY);
      if (expiry && Date.now() > Number(expiry)) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(EXPIRY_KEY);
      }
    }
  }, [searchParams, setSearchParams]);
}

/** Returns the stored affiliate code, or null if expired/missing */
export function getAffiliateRef(): string | null {
  const expiry = localStorage.getItem(EXPIRY_KEY);
  if (expiry && Date.now() > Number(expiry)) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    return null;
  }
  return localStorage.getItem(STORAGE_KEY);
}
