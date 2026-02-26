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

window.SUPABASE_CONFIG = {
  url:
    localStorage.getItem("SUPABASE_URL") ||
    window.ENV_SUPABASE_URL ||
    "",

  anonKey:
    localStorage.getItem("SUPABASE_ANON_KEY") ||
    window.ENV_SUPABASE_ANON_KEY ||
    "",
};


