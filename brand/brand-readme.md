# Claim Cipher Brand Assets

## Folder Structure

| Folder | Purpose |
|--------|---------|
| `/source` | Master files (Figma exports, AI, PSD). Never edit exports directly. |
| `/exports/png/symbol` | Icon-only mark (no wordmark). Square aspect ratio. |
| `/exports/png/lockups` | Full logo with wordmark. Horizontal and stacked variants. |
| `/exports/png/banners` | Pre-sized banners for GitHub, social, marketing. |
| `/exports/png/favicons` | Favicon sizes (16, 32, 48, 180, 192, 512). |
| `/exports/svg` | Vector versions for web and print. Prefer over PNG when possible. |

## When to Use What

| Asset | Use Case |
|-------|----------|
| **Symbol only** | Favicons, app icons, small UI elements, loading states |
| **Full logo (horizontal)** | Navigation bars, email signatures, documentation headers |
| **Full logo (stacked)** | Login screens, hero sections, splash screens |
| **Lockups** | Marketing materials, presentations, co-branded assets |
| **Banners** | GitHub repo header, social media covers, video thumbnails |

## Context Guide

| Context | Recommended Asset |
|---------|-------------------|
| Login screen | Stacked full logo (PNG or SVG) |
| Hero/landing page | Stacked full logo or horizontal lockup |
| GitHub banner | Pre-made banner from `/banners` |
| Marketing video | Full logo intro, symbol for watermark |
| Favicon | Symbol from `/favicons` (multiple sizes) |
| Nav bar | Horizontal full logo or symbol + text |

## Export Rules

1. **Always export from source** — Never upscale an existing PNG
2. **Maintain aspect ratio** — Do not stretch or distort
3. **Use appropriate format** — SVG for web, PNG for fixed-size contexts
4. **Include padding** — Logos need breathing room (min 10% of width)
5. **Dark/light variants** — Export both if background varies

## Naming Convention

```
[type]-[variant]-[size].[ext]

Examples:
  symbol-dark-512.png
  logo-horizontal-light.svg
  logo-stacked-dark-1200.png
  banner-github-1280x640.png
  favicon-32.png
```

| Prefix | Meaning |
|--------|---------|
| `symbol-` | Icon only, no wordmark |
| `logo-` | Full logo with wordmark |
| `banner-` | Pre-sized banner for specific platform |
| `favicon-` | Browser/app icon |

| Variant | Meaning |
|---------|---------|
| `-dark` | For light backgrounds |
| `-light` | For dark backgrounds |
| `-horizontal` | Wide aspect ratio |
| `-stacked` | Square/tall aspect ratio |

---

Questions? Check `/source` for editable masters.
