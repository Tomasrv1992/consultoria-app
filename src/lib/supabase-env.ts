// Supabase config baked in. The anon key is PUBLIC by design (the NEXT_PUBLIC_
// prefix exposes it to the browser bundle anyway). This guarantees server
// routes work regardless of Netlify env var state.

export const SUPABASE_URL = "https://gbulutnlacwjzqsrxoku.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdidWx1dG5sYWN3anpxc3J4b2t1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MzY4OTksImV4cCI6MjA5MjAxMjg5OX0.bd4g33wH7LGf23oBIuyvtrjbSmAVxcL6ntUW0qDi8XE";

// Public shared secret for embed URLs. Not a real secret — just deters random URL guessing.
export const EMBED_SECRET_FALLBACK = "embed-consultoria-a7x9k2m5p3";

export function getEmbedSecret(): string {
  return process.env.EMBED_SECRET || EMBED_SECRET_FALLBACK;
}

export function getSupabaseServerConfig(): {
  url: string;
  key: string;
} {
  return { url: SUPABASE_URL, key: SUPABASE_ANON_KEY };
}
