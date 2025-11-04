# 🗺️ Google Maps API Setup

## 🔒 Security Notice

The actual API key file (`google-config.js`) is **NOT** committed to GitHub for security reasons. It's listed in `.gitignore`.

---

## 🚀 Setup Instructions

### **Step 1: Get Your API Key**

1. Go to [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/)
2. Create a new project (or use existing)
3. Enable these APIs:
   - Maps JavaScript API
   - Directions API
   - Distance Matrix API
   - Geocoding API
   - Places API
4. Create an API key (APIs & Services → Credentials → Create Credentials)
5. **Optional:** Restrict the key to your domain for security

---

### **Step 2: Create Your Config File**

```bash
# In the claim_cipher_app/scripts/ directory
cp google-config.example.js google-config.js
```

---

### **Step 3: Add Your API Key**

Open `google-config.js` and replace:

```javascript
apiKey: 'YOUR_ACTUAL_GOOGLE_MAPS_API_KEY_HERE',
```

With your actual API key:

```javascript
apiKey: 'AIzaSyC-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
```

---

### **Step 4: Test It**

1. Refresh `route-cypher.html`
2. You should see in console: `🗺️ Loading Google Maps API...`
3. Then: `🔒 Security Agent: Google Maps API loaded successfully`
4. Map should render! ✅

---

## 🛡️ Security Best Practices

### **For Development:**

- ✅ Use a development API key with domain restrictions
- ✅ Never commit `google-config.js` to GitHub
- ✅ Keep your API key private

### **For Production:**

- ✅ Use HTTP referrer restrictions (e.g., `*.yourdomain.com/*`)
- ✅ Enable billing alerts to prevent overages
- ✅ Monitor API usage regularly
- ✅ Use environment variables in deployment

---

## 🔄 Without API Key (Fallback Mode)

The app works fine without Google Maps API! It uses:

- ✅ Mathematical distance calculations (Haversine formula)
- ✅ Geographical route optimization
- ✅ All features except visual map rendering

You'll see: `🗺️ Google Maps API key not configured, using fallback mode`

---

## 📝 Files

- `google-config.example.js` ← Template (committed to GitHub)
- `google-config.js` ← Your actual config (NOT committed, in .gitignore)

---

## ✅ Verification

Check if your setup is working:

```javascript
// Open browser console and run:
console.log(
  window.GOOGLE_MAPS_CONFIG?.apiKey
    ? "✅ API Key configured"
    : "❌ API Key missing"
);
console.log(
  typeof google !== "undefined"
    ? "✅ Google Maps loaded"
    : "⏳ Google Maps not loaded yet"
);
```

---

## 🆘 Troubleshooting

### Map not loading?

- Check browser console for errors
- Verify API key is correct
- Ensure all required APIs are enabled in Google Cloud
- Check API key restrictions aren't blocking your domain

### "Authentication failed" error?

- API key is invalid or restricted
- APIs not enabled in Google Cloud Console
- Billing not set up (Google requires billing even for free tier)

---

**Need help?** Check the [Google Maps Platform documentation](https://developers.google.com/maps/documentation)
