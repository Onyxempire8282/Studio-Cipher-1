CLAIM CIPHER DESIGN SYSTEM (AUTHORITATIVE)
==========================================

This document is the single source of truth for visual styling and layout.

Non-negotiables:
1. All buttons use .cipher-btn exactly (modifiers optional, base class required).
2. All sections use .cipher-plate (or .cipher-plate-sm for compact sections).
3. Typography uses only system classes.
4. Spacing matches system variables.
5. Nav structure matches the app exactly.
6. Remove all page-specific overrides.

Source of truth CSS files:
- claim_cipher_app/styles/universal-system.css
- claim_cipher_app/styles/industrial-plates.css

Do not treat any other CSS file as authoritative.

## 1) Color Palette

Purpose: Define a single copper-on-steel palette used across the app.
When to use: Always reference CSS variables; never hardcode colors in page CSS.

CSS reference:
```css
:root {
    --cipher-bg-primary: #0a0a0a;
    --cipher-bg-secondary: #1a1a1a;
    --cipher-bg-accent: #2d1810;
    --cipher-accent: #B87333;
    --cipher-accent-dark: #96572a;
    --cipher-gold: #B87333;
    --cipher-gold-dark: #96572a;
    --cipher-electric-blue: #B87333;
    --cipher-electric-blue-dark: #96572a;
    --cipher-focus: rgba(184, 115, 51, 0.4);
    --cipher-text-primary: #ffffff;
    --cipher-text-secondary: #cccccc;
    --cipher-text-muted: #999999;
    --cipher-danger: #e74c3c;
    --cipher-success: #27ae60;
    --cipher-warning: #f39c12;
}
```

Plate gradients (steel hues):
```css
.cipher-plate {
    background: linear-gradient(160deg, #4f555b 0%, #2a2f35 55%, #1a1e22 100%);
}

.hero-section {
    background: linear-gradient(160deg, #4a4f55 0%, #353a3f 20%, #252a2e 55%, #1a1e22 100%);
}

.stat-plate {
    background: linear-gradient(160deg, #4e5359 0%, #3a3f44 25%, #2a2f33 60%, #1e2226 100%);
}

.module-card {
    background: linear-gradient(160deg, #5a6066 0%, #454a50 15%, #353a3f 40%, #252a2e 70%, #1a1e22 100%);
}
```

Common mistakes to avoid:
- Hardcoded hex colors in page styles.
- Introducing new accent colors or glow effects.

## 2) Typography

Purpose: Maintain consistent hierarchy and professional tone.
When to use: All headings and body text use system classes only.

CSS reference:
```css
:root {
    --cipher-font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --cipher-font-weight-normal: 400;
    --cipher-font-weight-medium: 500;
    --cipher-font-weight-bold: 700;
    --font-hero: 1.75rem;
    --font-section: 1.4rem;
    --font-subsection: 1.1rem;
    --font-body: 0.95rem;
    --tracking-tight: 0.02em;
    --tracking-wide: 0.08em;
}

h1, h2, h3, h4, h5, h6,
.title, .heading, .cipher-title {
    color: inherit;
    font-weight: var(--cipher-font-weight-bold);
    text-shadow: none;
    margin-bottom: var(--cipher-space-sm);
}

h1, .h1 { font-size: 2.5rem; }
h2, .h2 { font-size: 2rem; }
h3, .h3 { font-size: 1.5rem; }
h4, .h4 { font-size: 1.25rem; }
h5, .h5 { font-size: 1.1rem; }
h6, .h6 { font-size: 1rem; }

.cipher-hero-title {
    font-size: var(--font-hero);
    font-weight: 600;
    letter-spacing: var(--tracking-tight);
}

.cipher-section-title {
    font-size: var(--font-section);
    font-weight: 600;
    letter-spacing: var(--tracking-tight);
}

.cipher-label {
    font-size: var(--font-subsection);
    letter-spacing: var(--tracking-wide);
    text-transform: uppercase;
}

.cipher-body {
    font-size: var(--font-body);
}

p, span, div, label,
.text, .description, .subtitle {
    color: var(--cipher-text-secondary);
}

.text-muted,
.secondary-text,
.help-text {
    color: var(--cipher-text-muted);
}
```

HTML example:
```html
<h1 class="cipher-hero-title">Welcome back</h1>
<h2 class="cipher-section-title">Operations</h2>
<p class="cipher-body">Route optimization and mileage operations</p>
<span class="cipher-label">Status</span>
```

Do not override:
- Page-specific font sizes or weights.
- Any custom font stack outside the system tokens.

## 3) Spacing Scale

Purpose: Consistent vertical rhythm and layout spacing.
When to use: All padding, margin, and gaps use the system variables.

CSS reference:
```css
:root {
    --cipher-space-xs: 0.5rem;
    --cipher-space-sm: 1rem;
    --cipher-space-md: 1.5rem;
    --cipher-space-lg: 2rem;
    --cipher-space-xl: 2.5rem;
    --cipher-space-xxl: 3rem;
}

.gap-sm { gap: var(--cipher-space-sm); }
.gap-md { gap: var(--cipher-space-md); }
.gap-lg { gap: var(--cipher-space-lg); }

.mt-sm { margin-top: var(--cipher-space-sm); }
.mt-md { margin-top: var(--cipher-space-md); }
.mt-lg { margin-top: var(--cipher-space-lg); }
.mb-sm { margin-bottom: var(--cipher-space-sm); }
.mb-md { margin-bottom: var(--cipher-space-md); }
.mb-lg { margin-bottom: var(--cipher-space-lg); }
.p-sm { padding: var(--cipher-space-sm); }
.p-md { padding: var(--cipher-space-md); }
.p-lg { padding: var(--cipher-space-lg); }
```

Rules:
- Use `--cipher-space-lg` for section spacing and `--cipher-space-md` for module spacing.
- Use `--cipher-space-xs` only for inline or tight control elements.

Common mistakes:
- Mixing raw pixel values with system spacing.
- Using margins to simulate padding inside plates.

## 4) Elevation & Shadows

Purpose: Standardize depth cues across plates and cards.
When to use: Plates use elevation classes, never custom shadows.

CSS reference:
```css
:root {
    --cipher-shadow-sm: 0 2px 10px rgba(0, 0, 0, 0.1);
    --cipher-shadow-md: 0 8px 32px rgba(0, 0, 0, 0.3);
    --cipher-shadow-lg: 0 20px 40px rgba(0, 0, 0, 0.4);
    --cipher-shadow-glow: none;
}

.elevation-3 {
    box-shadow:
        inset 0 2px 0 rgba(255,255,255,0.08),
        inset 0 -2px 0 rgba(0,0,0,0.4),
        0 2px 0 #1a1e22,
        0 4px 0 #15191d,
        0 6px 0 #101417,
        0 10px 20px rgba(0,0,0,0.5),
        0 20px 40px rgba(0,0,0,0.3);
}

.elevation-2 {
    box-shadow:
        0 2px 0 #1a1e22,
        0 4px 0 #14181c,
        0 6px 0 #0f1316,
        0 18px 28px rgba(0,0,0,0.55);
}

.elevation-1 {
    box-shadow:
        0 2px 0 #1a1e22,
        0 4px 0 #15191d,
        0 10px 20px rgba(0,0,0,0.35);
}

.elevation-05 {
    box-shadow:
        0 1px 0 #14181c,
        0 2px 0 #0f1316,
        0 6px 12px rgba(0,0,0,0.35);
}
```

Usage:
- `elevation-3` for hero/banners.
- `elevation-2` for primary plates.
- `elevation-1` for secondary plates.
- `elevation-05` for compact elements or nested plates.

## 5) Plate Component

Purpose: Core container for all sections and panels.
When to use: All sections, cards, and modal containers.

CSS reference:
```css
.cipher-plate {
    position: relative;
    background: linear-gradient(160deg, #4f555b 0%, #2a2f35 55%, #1a1e22 100%);
    border-top: 1px solid #5e646a;
    border-left: 1px solid #2f343a;
    border-right: 1px solid #2f343a;
    border-bottom: 1px solid #0e1114;
    border-radius: 8px;
}

.cipher-plate.steel-surface,
.steel-surface.cipher-plate {
    background: linear-gradient(145deg, #4f555b 0%, #2a2f35 55%, #1a1e22 100%);
    border: 1px solid #2f343a;
}

.cipher-plate-sm {
    position: relative;
    padding: 12px 16px;
    background: linear-gradient(160deg, #4f555b 0%, #2a2f35 60%, #1a1e22 100%);
    border-top: 1px solid #5e646a;
    border-left: 1px solid #2f343a;
    border-right: 1px solid #2f343a;
    border-bottom: 1px solid #0e1114;
    border-radius: 6px;
}

.rivet {
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    z-index: 2;
    background: radial-gradient(circle at 35% 35%, #6a7076 0%, #454a50 40%, #2a2f34 75%, #14181c 100%);
    box-shadow:
        inset 0 1px 1px rgba(0,0,0,0.6),
        inset 0 -1px 1px rgba(255,255,255,0.06),
        0 1px 2px rgba(0,0,0,0.5);
}

.rivet.tl { top: 8px; left: 8px; }
.rivet.tr { top: 8px; right: 8px; }
.rivet.bl { bottom: 8px; left: 8px; }
.rivet.br { bottom: 8px; right: 8px; }

.module-card .rivet,
.cipher-plate .rivet {
    width: 7px;
    height: 7px;
}

.module-card .rivet.tl, .cipher-plate .rivet.tl { top: 10px; left: 10px; }
.module-card .rivet.tr, .cipher-plate .rivet.tr { top: 10px; right: 10px; }
.module-card .rivet.bl, .cipher-plate .rivet.bl { bottom: 10px; left: 10px; }
.module-card .rivet.br, .cipher-plate .rivet.br { bottom: 10px; right: 10px; }
```

HTML example:
```html
<section class="cipher-plate elevation-2">
  <div class="rivet tl"></div><div class="rivet tr"></div>
  <div class="rivet bl"></div><div class="rivet br"></div>
  <h2 class="cipher-section-title">Operations</h2>
  <p class="cipher-body">Plan efficient routes with day splitting.</p>
</section>
```

Do not override:
- Plate gradients, borders, or rivet sizing.

## 6) Button Component

Purpose: Consistent steel hardware buttons.
When to use: All interactive actions, primary to secondary.

CSS reference:
```css
.cipher-btn,
button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 48px;
    padding: 0 24px;
    font-weight: 600;
    font-size: 0.95rem;
    letter-spacing: 0.5px;
    background: linear-gradient(145deg, #3a4048, #2b3036);
    border: 2px solid #c47a2c;
    border-radius: 8px;
    color: #e6e6e6;
    box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.08),
        inset 0 -3px 6px rgba(0,0,0,0.6),
        0 6px 12px rgba(0,0,0,0.45);
    position: relative;
    transition: all 0.2s ease;
    text-decoration: none;
    gap: var(--cipher-space-xs);
}

.cipher-btn:hover,
button:hover {
    background: linear-gradient(145deg, #343a41, #252a30);
    border-color: #c47a2c;
    box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.08),
        inset 0 -3px 6px rgba(0,0,0,0.6),
        0 8px 14px rgba(0,0,0,0.6);
    transform: translateY(-1px);
}

.cipher-btn:active,
button:active {
    transform: translateY(1px);
    box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.08),
        inset 0 -2px 4px rgba(0,0,0,0.7),
        0 4px 8px rgba(0,0,0,0.6);
}

.cipher-btn .rivet,
button .rivet {
    width: 6px;
    height: 6px;
    background: #1a1d21;
    border-radius: 50%;
    position: absolute;
    box-shadow: none;
}

.cipher-btn--primary {
    border-color: var(--cipher-accent);
}

.cipher-btn--small {
    min-height: 40px;
    padding: 0 18px;
}
```

HTML example:
```html
<button class="cipher-btn cipher-btn--primary">
  <div class="rivet tl"></div><div class="rivet tr"></div>
  <div class="rivet bl"></div><div class="rivet br"></div>
  New Job
</button>
```

Do not override:
- No transparent buttons.
- No wrapper badges or extra gradients.
- Never drop the base `.cipher-btn` class.

## 7) Form Inputs

Purpose: Unified input styling with copper focus.
When to use: All text inputs, selects, and textareas.

CSS reference:
```css
.cipher-input,
.form-cipher-input,
.form-input,
input[type="text"],
input[type="email"],
input[type="password"],
input[type="number"],
input[type="tel"],
select,
textarea,
.route-input,
.distance-input,
.notes-input,
.primary-select,
.destination-address-input,
.filter-input {
    background: #11161c;
    border: 1px solid #2a3138;
    color: #e6edf3;
    border-radius: 6px;
    padding: 10px 12px;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.6);
    font-family: var(--cipher-font-primary);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    width: 100%;
}

.cipher-input:focus,
.form-cipher-input:focus,
.form-input:focus,
input:focus,
select:focus,
textarea:focus,
.route-input:focus,
.distance-input:focus,
.notes-input:focus,
.primary-select:focus,
.destination-address-input:focus,
.filter-input:focus {
    border-color: #c47b36;
    outline: none;
    box-shadow: 0 0 0 2px rgba(196, 123, 54, 0.15);
}

.cipher-input.is-invalid,
.form-input.is-invalid,
input.is-invalid,
select.is-invalid,
textarea.is-invalid {
    border-color: var(--cipher-danger);
    box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.18);
}

.cipher-input.is-valid,
.form-input.is-valid,
input.is-valid,
select.is-valid,
textarea.is-valid {
    border-color: var(--cipher-success);
    box-shadow: 0 0 0 2px rgba(39, 174, 96, 0.18);
}
```

Autocomplete override (Google Places):
```css
.pac-container {
    background: #1a2026 !important;
    border: 1px solid #2f3740 !important;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6) !important;
}

.pac-item {
    padding: 10px 12px !important;
    font-size: 14px !important;
    color: #e6edf3 !important;
}

.pac-item:hover { background: #252c34 !important; }
.pac-item-query { font-weight: 600 !important; color: #ffffff !important; }
```

HTML example:
```html
<label class="cipher-label" for="claim">Claim ID</label>
<input id="claim" class="cipher-input" type="text" placeholder="Enter claim ID" />
```

## 8) Navigation

Purpose: Single header structure across the app.
When to use: Every page uses this exact nav order and structure.

CSS reference:
```css
.cipher-header,
.command-header,
.page-header,
.top-nav,
header {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    z-index: var(--cipher-z-header) !important;
    background: rgba(15, 15, 15, 0.95);
    backdrop-filter: none;
    border-bottom: 1px solid rgba(184, 115, 51, 0.25);
    box-shadow: var(--cipher-shadow-md);
    padding: var(--cipher-space-sm) 0 !important;
}

.header-content {
    width: 100%;
    padding: 0 var(--cipher-space-lg);
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: var(--cipher-space-lg);
    min-height: 60px;
}

.nav-links {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--cipher-space-sm);
    flex-wrap: wrap;
    justify-self: center;
}

.nav-links a {
    color: var(--cipher-text-secondary);
    text-decoration: none;
    padding: var(--cipher-space-xs) var(--cipher-space-md);
    border-radius: var(--cipher-radius-md);
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    font-size: 0.95rem;
    font-weight: var(--cipher-font-weight-medium);
    border: 1px solid transparent;
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: none;
    white-space: nowrap;
}

.nav-links a.active {
    color: var(--cipher-accent);
    background: rgba(184, 115, 51, 0.15);
    border-color: rgba(184, 115, 51, 0.4);
    font-weight: var(--cipher-font-weight-bold);
    box-shadow: 0 2px 8px rgba(184, 115, 51, 0.15);
}
```

HTML structure (exact order):
```html
<header class="cipher-header">
  <div class="header-content">
    <div class="app-brand">
      <span class="logo">🎤</span>
      <span>Claim Cipher</span>
    </div>
    <div class="nav-links">
      <a href="command-center.html">🎯 Dashboard</a>
      <a href="route-cypher.html">🗺️ Routes</a>
      <a href="mileage-cypher.html">🧮 Mileage</a>
      <a href="my-routes.html">📍 My Routes</a>
      <a href="jobs-studio.html" class="active">💼 Jobs</a>
      <a href="total-loss-forms.html">🚗 Forms</a>
      <a href="firms-directory.html">🏢 Firms</a>
      <a href="settings-booth.html">⚙️ Settings</a>
      <a href="functionality-test.html">🧪 Tests</a>
    </div>
    <div class="user-section">
      <div class="user-info">
        <div class="user-name" id="userName">Professional User</div>
        <div class="user-role">Claims Specialist</div>
      </div>
      <button class="logout-btn cipher-btn cipher-btn--danger" onclick="handleLogout()">Logout</button>
    </div>
  </div>
</header>
```

## 9) Modal System

Purpose: Steel-plate modals for billing, legal, and route views.
When to use: All overlays use `.cipher-modal` or `.modal` with plate content.

CSS reference (standard cipher modal):
```css
.cipher-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--cipher-z-modal, 1100);
    backdrop-filter: none;
}

.cipher-modal-content {
    background: linear-gradient(160deg, #3a3f44 0%, #2a2f33 40%, #1e2226 100%);
    border: 1px solid #15191d;
    border-top-color: #5e646a;
    border-radius: 8px;
    min-width: 400px;
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.06),
        0 4px 0 #15191d,
        0 8px 0 #101417,
        0 12px 24px rgba(0,0,0,0.65),
        0 24px 48px rgba(0,0,0,0.35);
}

.cipher-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--cipher-space-lg, 2rem);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.cipher-modal-body { padding: var(--cipher-space-lg, 2rem); }

.cipher-modal-footer {
    display: flex;
    gap: var(--cipher-space-md, 1.5rem);
    padding: var(--cipher-space-lg, 2rem);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    justify-content: flex-end;
}
```

Map container rules (route visualization):
```css
.modal-map-container {
    height: 100%;
    min-height: 400px;
    background: #161b20;
    border: 1px solid #2f343a;
    border-radius: 6px;
    overflow: hidden;
    position: relative;
}

.modal-map {
    width: 100%;
    height: 100%;
    min-height: 400px;
    border-radius: inherit;
}
```

HTML example:
```html
<div class="cipher-modal">
  <div class="cipher-modal-content cipher-plate">
    <div class="cipher-modal-header">
      <h3 class="cipher-section-title">Billing Summary</h3>
      <button class="cipher-btn cipher-btn--small">Close</button>
    </div>
    <div class="cipher-modal-body">...</div>
    <div class="cipher-modal-footer">...</div>
  </div>
</div>
```

## 10) Layout Shell

Purpose: Consistent content spacing under the fixed header.
When to use: Every page wraps content with these rules.

CSS reference:
```css
.main-content,
.page-content,
.dashboard-container {
    margin-top: 80px;
    margin-left: auto;
    margin-right: auto;
}

main,
.cipher-main-content,
.main-content,
.page-content,
.dashboard-container {
    padding-top: 28px;
}

.main-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
}

.cipher-grid {
    display: grid;
    gap: var(--cipher-space-lg);
}

.cipher-grid--2 { grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); }
.cipher-grid--3 { grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); }
.cipher-grid--4 { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
```

Responsive rules:
```css
@media (max-width: 768px) {
    .header-content {
        grid-template-columns: 1fr;
        grid-template-rows: auto auto auto;
        gap: var(--cipher-space-sm);
        padding: 0 var(--cipher-space-md);
        text-align: center;
    }

    .main-content,
    .dashboard-container {
        margin-top: 160px;
    }

    .cipher-grid--2,
    .cipher-grid--3,
    .cipher-grid--4 {
        grid-template-columns: 1fr;
    }
}
```

## 11) Rule Enforcement & Constraints

Allowed overrides:
- Layout-only adjustments inside page layout files, using system classes and variables.
- Content-only changes in HTML.

Forbidden patterns:
- Page-specific colors, shadows, or fonts.
- Custom button classes that do not include `.cipher-btn`.
- Custom section containers that do not include `.cipher-plate`.
- Overriding system variables locally.

CSS load order rules:
1. universal-system.css
2. industrial-plates.css
3. Page layout CSS (layout only)

Do not use as sources of truth:
- main.css
- cipher-core.css
- visual-consistency-fix.css
- universal-header-fixes.css

## 12) CSS Tokens / Variables

Purpose: One token set for all styles.
When to use: Always reference tokens; never hardcode values.

Full token reference:
```css
:root {
    /* Cipher Color Palette */
    --cipher-bg-primary: #0a0a0a;
    --cipher-bg-secondary: #1a1a1a;
    --cipher-bg-accent: #2d1810;
    --cipher-accent: #B87333;
    --cipher-accent-dark: #96572a;
    --cipher-gold: #B87333;
    --cipher-gold-dark: #96572a;
    --cipher-electric-blue: #B87333;
    --cipher-electric-blue-dark: #96572a;
    --cipher-focus: rgba(184, 115, 51, 0.4);
    --cipher-text-primary: #ffffff;
    --cipher-text-secondary: #cccccc;
    --cipher-text-muted: #999999;
    --cipher-danger: #e74c3c;
    --cipher-success: #27ae60;
    --cipher-warning: #f39c12;

    /* Typography System */
    --cipher-font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --cipher-font-weight-normal: 400;
    --cipher-font-weight-medium: 500;
    --cipher-font-weight-bold: 700;
    --font-hero: 1.75rem;
    --font-section: 1.4rem;
    --font-subsection: 1.1rem;
    --font-body: 0.95rem;
    --tracking-tight: 0.02em;
    --tracking-wide: 0.08em;

    /* Spacing System */
    --cipher-space-xs: 0.5rem;
    --cipher-space-sm: 1rem;
    --cipher-space-md: 1.5rem;
    --cipher-space-lg: 2rem;
    --cipher-space-xl: 2.5rem;
    --cipher-space-xxl: 3rem;

    /* Border Radius System */
    --cipher-radius-sm: 8px;
    --cipher-radius-md: 12px;
    --cipher-radius-lg: 16px;
    --cipher-radius-xl: 20px;
    --cipher-radius-xxl: 25px;

    /* Shadow System */
    --cipher-shadow-sm: 0 2px 10px rgba(0, 0, 0, 0.1);
    --cipher-shadow-md: 0 8px 32px rgba(0, 0, 0, 0.3);
    --cipher-shadow-lg: 0 20px 40px rgba(0, 0, 0, 0.4);
    --cipher-shadow-glow: none;

    /* Z-Index System */
    --cipher-z-header: 1000;
    --cipher-z-sidebar: 900;
    --cipher-z-modal: 1100;
    --cipher-z-tooltip: 1200;
}
```
