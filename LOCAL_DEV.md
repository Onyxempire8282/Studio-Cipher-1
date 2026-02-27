# Running Claim Cipher Locally

## Prerequisites

- Python 3 installed and on your PATH
- A modern browser (Chrome, Edge, Firefox)
- Optionally: Node.js for `live-server` or `http-server`

## Start the App

### Mac / Linux / Git Bash

```bash
./start_claim_cipher.sh
```

### Windows CMD / PowerShell

```cmd
start_claim_cipher.bat
```

### Alternative: Node-based servers

```bash
# live-server (auto-reload on save)
npm install -g live-server
cd claim_cipher_app
live-server --port=5500

# http-server
npm install -g http-server
cd claim_cipher_app
http-server -p 5500
```

The app will be available at **http://localhost:5500**.

## Switching Configs

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

## Environment Overrides

To override API keys locally without touching the code,
set these in your browser console or localStorage:

```js
localStorage.setItem('SUPABASE_URL', 'your-url');
localStorage.setItem('SUPABASE_ANON_KEY', 'your-key');
localStorage.setItem('GOOGLE_MAPS_API_KEY', 'your-key');
```

Clear overrides to revert to hardcoded defaults:

```js
localStorage.removeItem('SUPABASE_URL');
localStorage.removeItem('SUPABASE_ANON_KEY');
localStorage.removeItem('GOOGLE_MAPS_API_KEY');
```

Login works at localhost:5500 with zero extra setup because the hardcoded
Supabase fallback values point to the shared development project.

## Using Without Google Maps

If no Google Maps API key is configured (or the key is invalid), the app falls
back to manual distance entry:

1. Open Mileage Cipher or Route Cipher
2. A visible notice will appear: "Google Maps unavailable"
3. Enter starting location and destination addresses manually
4. Enter the distance in miles in the distance field
5. Click **Calculate Mileage**

Auto-distance calculation and address autocomplete require a valid Google Maps
API key, but all billing, firm management, and export features work without it.

## Test Accounts

| Email | Password | Notes |
|-------|----------|-------|
| *(fill in your test credentials)* | | |

## Project Structure

```
claim_cipher_app/
  config/           # API and environment config
  scripts/          # Core JS (auth, billing, route, mileage)
  styles/           # Shared CSS (universal-system, industrial-plates)
  css/              # App-level CSS (app.css, dashboard.css)
  modules/          # Total Loss Studio v2 module
  branding/         # Logo and brand assets
  *.html            # Application pages
```
