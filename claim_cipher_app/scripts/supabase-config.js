/**
 * Supabase Configuration
 *
 * Values are resolved at runtime from localStorage or a deploy-time env-var
 * injection, consistent with the pattern in config/api-config-production.js.
 *
 * To inject at deploy time, render a <script> snippet before this file:
 *   window.ENV_SUPABASE_URL      = "<your-project-url>";
 *   window.ENV_SUPABASE_ANON_KEY = "<your-anon-key>";
 *
 * Alternatively, set localStorage keys "SUPABASE_URL" / "SUPABASE_ANON_KEY"
 * at runtime (e.g. from a secure server-side session bootstrap).
 */


// DEV FALLBACK — anon key is public by design, safe to commit
const SUPABASE_URL =
  window.ENV_SUPABASE_URL ||
  localStorage.getItem('SUPABASE_URL') ||
  'https://aviwltfqlunxxvkajpyt.supabase.co';

const SUPABASE_ANON_KEY =
  window.ENV_SUPABASE_ANON_KEY ||
  localStorage.getItem('SUPABASE_ANON_KEY') ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2aXdsdGZxbHVueHh2a2FqcHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MTQ4MTIsImV4cCI6MjA4Mzk5MDgxMn0._4Me4DsKHJ0SRleOmmOGPAcJKq8hmFUDIfNDH66Zu8o';

window.SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
};


