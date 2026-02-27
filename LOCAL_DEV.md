# Local Development Guide

## Quick Start

```bash
# Option A: Shell script (macOS / Linux / Git Bash on Windows)
./start_claim_cipher.sh

# Option B: Batch file (Windows CMD / PowerShell)
start_claim_cipher.bat
```

The app will be available at **http://localhost:5500**.

Both scripts start a Python HTTP server serving `claim_cipher_app/` on port 5500.

## Prerequisites

- Python 3 installed and on your PATH
- A modern browser (Chrome, Edge, Firefox)

## Configuration

### How config resolution works

All configuration values use a three-tier fallback chain resolved at runtime:

| Key | Env-var injection | localStorage override | Hardcoded fallback |
|-----|-------------------|-----------------------|--------------------|
| Supabase URL | `window.ENV_SUPABASE_URL` | `SUPABASE_URL` | `https://aviwltfqlunxxvkajpyt.supabase.co` |
| Supabase Anon Key | `window.ENV_SUPABASE_ANON_KEY` | `SUPABASE_ANON_KEY` | (public anon key baked in) |
| Google Maps API Key | `window.ENV_GOOGLE_MAPS_KEY` | `GOOGLE_MAPS_API_KEY` | Dev key used on localhost |

Login works at localhost:5500 with zero extra setup because the hardcoded Supabase
fallback values point to the shared development project.

### Switching dev / prod config with switch-config.js

The `switch-config.js` script at repo root toggles HTML files between local dev
and GitHub Pages production API config references:

```bash
# Switch to production (GitHub Pages)
node switch-config.js production

# Switch back to development (local)
node switch-config.js development
```

This replaces `<script src="config/api-config.js">` with the production pair
(`github-pages-env.js` + `api-config-production.js`) or vice versa.

### localStorage overrides for manual testing

Open the browser console and set any of these keys to override defaults:

```js
// Point to a different Supabase project
localStorage.setItem('SUPABASE_URL', 'https://your-project.supabase.co');
localStorage.setItem('SUPABASE_ANON_KEY', 'your-anon-key');

// Use a specific Google Maps API key
localStorage.setItem('GOOGLE_MAPS_API_KEY', 'AIza...');

// Clear overrides (revert to hardcoded defaults)
localStorage.removeItem('SUPABASE_URL');
localStorage.removeItem('SUPABASE_ANON_KEY');
localStorage.removeItem('GOOGLE_MAPS_API_KEY');
```

## Using the app without Google Maps (manual mode)

If no Google Maps API key is configured (or the key is invalid), the app falls
back to manual distance entry:

1. Open Mileage Cipher or Route Cipher
2. Enter starting location and destination addresses manually
3. Enter the distance in miles in the distance field
4. Click **Calculate Mileage**

Auto-distance calculation and address autocomplete require a valid Google Maps
API key, but all billing, firm management, and export features work without it.

## Project structure

```
claim_cipher_app/
  config/           # API and environment config
  scripts/          # Core JS (auth, billing, route, mileage)
  styles/           # Shared CSS (universal-system, industrial-plates)
  modules/          # Total Loss Studio v2 module
  *.html            # Application pages
```
