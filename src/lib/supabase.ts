import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'fuel_station_supabase_url';
const STORAGE_ANON_KEY = 'fuel_station_supabase_anon_key';

export function getStoredSupabaseConfig() {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

  const localUrl = localStorage.getItem(STORAGE_URL_KEY) || '';
  const localKey = localStorage.getItem(STORAGE_ANON_KEY) || '';

  const url = localUrl || envUrl;
  const anonKey = localKey || envKey;

  return {
    url: url.trim(),
    anonKey: anonKey.trim(),
    isFromEnv: Boolean(envUrl && !localUrl),
  };
}

export function saveStoredSupabaseConfig(url: string, anonKey: string) {
  if (url) {
    localStorage.setItem(STORAGE_URL_KEY, url.trim());
  } else {
    localStorage.removeItem(STORAGE_URL_KEY);
  }

  if (anonKey) {
    localStorage.setItem(STORAGE_ANON_KEY, anonKey.trim());
  } else {
    localStorage.removeItem(STORAGE_ANON_KEY);
  }

  // Force re-initialization
  initClient();
}

let activeSupabaseClient: SupabaseClient | null = null;

function initClient(): SupabaseClient | null {
  const { url, anonKey } = getStoredSupabaseConfig();
  if (!url || !anonKey || !url.startsWith('http')) {
    activeSupabaseClient = null;
    return null;
  }

  try {
    activeSupabaseClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return activeSupabaseClient;
  } catch (err) {
    console.error('Supabase client init error:', err);
    activeSupabaseClient = null;
    return null;
  }
}

// Initial invocation
initClient();

export function getSupabase(): SupabaseClient | null {
  if (!activeSupabaseClient) {
    return initClient();
  }
  return activeSupabaseClient;
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getStoredSupabaseConfig();
  return Boolean(url && anonKey && url.startsWith('http'));
}

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabase();
  if (!client) {
    return {
      success: false,
      message: 'Supabase URL эсвэл Anon Key тохируулаагүй байна.',
    };
  }

  try {
    // Try pinging profiles or auth session
    const { error } = await client.from('profiles').select('id', { count: 'exact', head: true });
    if (error && error.code !== 'PGRST116') {
      // If table doesn't exist yet, warn about running SQL schema
      if (error.message?.includes('relation "public.profiles" does not exist') || error.code === '42P01') {
        return {
          success: true,
          message: 'Supabase-д амжилттай холбогдлоо! Гэхдээ хүснэгтүүд үүсээгүй тул "Заавар" хуудас дахь SQL файлыг Supabase SQL Editor-д ажиллуулна уу.',
        };
      }
      return {
        success: false,
        message: `Холболтын алдаа: ${error.message} (Код: ${error.code})`,
      };
    }
    return {
      success: true,
      message: 'Supabase өгөгдлийн сантай амжилттай холбогдлоо.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Холбогдоход алдаа гарлаа: ${err?.message || 'Сүлжээний алдаа'}`,
    };
  }
}

// -------------------------------------------------------------
// Formatters for Mongolia (MNT integer, Asia/Ulaanbaatar date/time)
// -------------------------------------------------------------

export function formatMNT(value: number | string | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '0 ₮';
  }
  const intVal = Math.round(Number(value));
  return `${intVal.toLocaleString('mn-MN')} ₮`;
}

export function formatLiters(value: number | string | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '0.00 л';
  }
  return `${Number(value).toLocaleString('mn-MN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} л`;
}

export function formatDateTimeUB(isoStr?: string | null): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('mn-MN', {
      timeZone: 'Asia/Ulaanbaatar',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return isoStr;
  }
}

export function formatDateUB(isoStr?: string | null): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('mn-MN', {
      timeZone: 'Asia/Ulaanbaatar',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return isoStr;
  }
}
