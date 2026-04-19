// Fallbacks for server-side Supabase config.
// The anon key is public by design (the NEXT_PUBLIC_ prefix exposes it to the
// browser bundle too). Hardcoding here guarantees the server routes work even
// if the Netlify env var is missing or truncated.

const FALLBACK_URL = "https://gbulutnlacwjzqsrxoku.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdidWx1dG5sYWN3anpxc3J4b2t1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MzY4OTksImV4cCI6MjA5MjAxMjg5OX0.bd4g33wH7LGf23oBIuyvtrjbSmAVxcL6ntUW0qDi8XE";

function looksLikeJwt(v: string | undefined): v is string {
  return !!v && v.split(".").length === 3 && v.length > 100;
}

export function getSupabaseServerConfig(): {
  url: string;
  key: string;
} {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return {
    url: envUrl && envUrl.startsWith("http") ? envUrl : FALLBACK_URL,
    key: looksLikeJwt(envKey) ? envKey : FALLBACK_ANON_KEY,
  };
}
