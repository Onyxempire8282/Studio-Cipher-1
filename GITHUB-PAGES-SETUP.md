# 🚀 GitHub Pages Setup Guide

## Step-by-Step Deployment Process

### ✅ COMPLETED: Infrastructure Setup
- [x] Created production API configuration
- [x] Set up GitHub Actions workflow  
- [x] Updated HTML files for production
- [x] Added deployment documentation

### 🔑 STEP 1: Create Domain-Restricted API Key

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/apis/credentials
   - Sign in with your Google account

2. **Create/Select Project:**
   - Create new project OR select existing project
   - Project name suggestion: "Claim Cipher Production"

3. **Enable Required APIs:**
   - Go to "APIs & Services" → "Library"
   - Enable these APIs:
     - ✅ Maps JavaScript API
     - ✅ Places API
     - ✅ Geocoding API (optional, for address lookup)

4. **Create API Key:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - **IMPORTANT:** Don't use your existing key!

5. **Restrict the API Key:**
   ```
   Click on your new API key → "Restrict Key"
   
   Application restrictions:
   ☑️ HTTP referrers (web sites)
   
   Website restrictions - Add these:
   *.github.io/*
   onyxempire8282.github.io/*
   localhost/*
   127.0.0.1/*
   
   API restrictions:
   ☑️ Restrict key
   Select APIs:
   ✅ Maps JavaScript API
   ✅ Places API
   ✅ Geocoding API
   ```

6. **Set Quotas (Cost Control):**
   ```
   Go to "APIs & Services" → "Quotas"
   Set daily limits:
   - Maps JavaScript API: 1,000 requests/day
   - Places API: 500 requests/day
   - Geocoding API: 500 requests/day
   ```

### 🔒 STEP 2: Add GitHub Secret

1. **Go to your GitHub repository:**
   - https://github.com/Onyxempire8282/Studio-Cipher-1

2. **Add Repository Secret:**
   ```
   Settings → Secrets and variables → Actions
   
   Click "New repository secret"
   Name: GOOGLE_MAPS_API_KEY_RESTRICTED
   Secret: [paste your new restricted API key]
   ```

### 📄 STEP 3: Enable GitHub Pages

1. **Enable Pages:**
   ```
   Repository → Settings → Pages
   
   Source: Deploy from a branch
   Branch: main
   Folder: / (root)
   
   ✅ Save
   ```

2. **Your site will be available at:**
   ```
   https://onyxempire8282.github.io/Studio-Cipher-1/
   ```

### 🚀 STEP 4: Deploy

The GitHub Actions workflow will automatically deploy when you push to main.

**Deployment URL:**
```
https://onyxempire8282.github.io/Studio-Cipher-1/total-loss-forms.html
https://onyxempire8282.github.io/Studio-Cipher-1/mileage-cypher.html
https://onyxempire8282.github.io/Studio-Cipher-1/route-cypher.html
```

### 💰 STEP 5: Monitor Usage & Costs

1. **Set up Billing Alerts:**
   ```
   Google Cloud Console → Billing → Budgets & alerts
   Create alert for $10/month
   ```

2. **Monitor API Usage:**
   ```
   APIs & Services → Dashboard
   Check daily usage of your APIs
   ```

### 🔧 For Local Development

If you want to work locally, you can switch back to development mode:

```bash
# Copy your local key back for development
cp claim_cipher_app/config/api-config-template.js claim_cipher_app/config/api-config.js

# Edit api-config.js and replace YOUR_API_KEY_HERE with your local key
# This file is gitignored and won't be committed
```

### 🛡️ Security Features

✅ **Domain restrictions** prevent unauthorized use  
✅ **API quotas** prevent cost overruns  
✅ **No keys in public code** - all secrets are in GitHub Secrets  
✅ **Automatic deployment** - push to main = instant deployment  
✅ **Free hosting** on GitHub Pages  

### ⚠️ Important Notes

- **Never commit API keys** - they're now in GitHub Secrets
- **Domain restrictions** only allow your GitHub Pages domain
- **Quotas prevent** unexpected charges
- **Monitor usage** in Google Cloud Console
- **GitHub Pages is free** for public repositories

Your Claim Cipher app will be live and accessible to users worldwide!