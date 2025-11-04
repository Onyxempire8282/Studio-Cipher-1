// Supabase Setup Helper for Jobs Studio
// This script helps users quickly configure Supabase credentials

class SupabaseSetupHelper {
  constructor() {
    this.initialized = false;
  }

  // Check if Supabase is configured
  isConfigured() {
    const url = localStorage.getItem("supabase_url");
    const key = localStorage.getItem("supabase_anon_key");
    return !!(url && key);
  }

  // Get current configuration
  getConfig() {
    return {
      url: localStorage.getItem("supabase_url"),
      key: localStorage.getItem("supabase_anon_key")
        ? "***configured***"
        : null,
      configured: this.isConfigured(),
    };
  }

  // Save Supabase configuration
  saveConfig(url, anonKey) {
    if (!url || !anonKey) {
      console.error("❌ Both URL and anon key are required");
      return false;
    }

    // Basic validation
    if (!url.includes("supabase.co")) {
      console.error("❌ Invalid Supabase URL format");
      return false;
    }

    try {
      localStorage.setItem("supabase_url", url);
      localStorage.setItem("supabase_anon_key", anonKey);
      console.log("✅ Supabase configuration saved successfully!");
      console.log("🔄 Please refresh the page to apply changes.");
      return true;
    } catch (error) {
      console.error("❌ Failed to save configuration:", error);
      return false;
    }
  }

  // Clear configuration
  clearConfig() {
    localStorage.removeItem("supabase_url");
    localStorage.removeItem("supabase_anon_key");
    console.log("🗑️ Supabase configuration cleared");
    console.log("🔄 Please refresh the page to use demo mode.");
  }

  // Quick setup wizard (call from browser console)
  quickSetup() {
    console.log("🚀 Supabase Quick Setup Wizard\n");
    console.log("Please have your Supabase credentials ready:");
    console.log("1. Project URL (e.g., https://xxxxx.supabase.co)");
    console.log("2. Anon/Public API Key\n");
    console.log('Run: supabaseHelper.saveConfig("YOUR_URL", "YOUR_KEY")');
    console.log("Or continue with the prompts below:\n");

    // Note: prompt() doesn't work well in modern browsers for security
    // So we'll just show instructions
    console.log("Example:");
    console.log("supabaseHelper.saveConfig(");
    console.log('  "https://abcdefgh.supabase.co",');
    console.log('  "your-anon-key-here"');
    console.log(");\n");

    return this.getConfig();
  }

  // Test connection
  async testConnection() {
    if (!this.isConfigured()) {
      console.error(
        "❌ Supabase not configured. Run supabaseHelper.quickSetup() first."
      );
      return false;
    }

    try {
      const url = localStorage.getItem("supabase_url");
      const key = localStorage.getItem("supabase_anon_key");

      console.log("🔍 Testing Supabase connection...");

      const client = window.supabase.createClient(url, key);

      // Try a simple query
      const { data, error } = await client
        .from("claims")
        .select("count", { count: "exact", head: true });

      if (error) {
        console.error("❌ Connection test failed:", error.message);
        console.log("💡 Make sure:");
        console.log("  1. The claims table exists in your database");
        console.log("  2. RLS policies are configured correctly");
        console.log("  3. Your API key has the correct permissions");
        return false;
      }

      console.log("✅ Connection successful!");
      console.log("📊 Claims table is accessible");
      return true;
    } catch (error) {
      console.error("❌ Connection test error:", error);
      return false;
    }
  }

  // Show setup instructions
  showInstructions() {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║           SUPABASE JOBS STUDIO SETUP GUIDE                ║
╚════════════════════════════════════════════════════════════╝

📋 STEP 1: Get Your Credentials
   1. Go to https://supabase.com
   2. Sign in and select your project
   3. Click Settings → API
   4. Copy your Project URL and anon public key

📊 STEP 2: Create the Claims Table
   Run the SQL from SUPABASE_JOBS_SETUP.md in your
   Supabase SQL Editor to create the claims table.

⚙️ STEP 3: Configure in Browser
   Run this command in the browser console:
   
   supabaseHelper.saveConfig(
     "https://xxxxx.supabase.co",
     "your-anon-key-here"
   );

✅ STEP 4: Test Connection
   supabaseHelper.testConnection();

🔄 STEP 5: Refresh Page
   Reload the Jobs Studio page to start using Supabase!

═══════════════════════════════════════════════════════════

📚 For detailed instructions, see:
   claim_cipher_app/SUPABASE_JOBS_SETUP.md

💬 Need help? Check the browser console for error messages.
        `);
  }

  // Get status report
  getStatus() {
    const config = this.getConfig();

    console.log("\n📊 Supabase Configuration Status\n");
    console.log(`URL Configured: ${config.url ? "✅ Yes" : "❌ No"}`);
    console.log(`API Key Configured: ${config.key ? "✅ Yes" : "❌ No"}`);
    console.log(
      `Overall Status: ${
        config.configured ? "✅ Ready" : "⚠️ Not Configured"
      }\n`
    );

    if (config.url) {
      console.log(`Supabase URL: ${config.url}`);
    }

    if (!config.configured) {
      console.log("\n💡 Run supabaseHelper.showInstructions() for setup help.");
    } else {
      console.log(
        "\n💡 Run supabaseHelper.testConnection() to verify connection."
      );
    }

    return config;
  }
}

// Create global instance
window.supabaseHelper = new SupabaseSetupHelper();

// Auto-show status on load
console.log("🔧 Supabase Setup Helper loaded!");
console.log('📝 Type "supabaseHelper.showInstructions()" for setup guide');
console.log('📊 Type "supabaseHelper.getStatus()" for current status\n');

// Export for module usage
if (typeof module !== "undefined" && module.exports) {
  module.exports = SupabaseSetupHelper;
}
