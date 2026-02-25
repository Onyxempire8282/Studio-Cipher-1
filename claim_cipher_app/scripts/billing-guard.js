(function() {
  "use strict";

  function hasAccess(profile) {
    if (!profile) return false;
    if (profile.role === "admin") return true;
    if (profile.subscription_tier === "basic") return true;
    if (profile.subscription_tier === "pro") return true;
    return false;
  }

  async function checkAccess() {
    const client = window.SupabaseAuth && window.SupabaseAuth.init
      ? window.SupabaseAuth.init()
      : null;

    if (!client || !client.auth || !client.auth.getUser) {
      return { allowed: false };
    }

    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData || !userData.user) {
      return { allowed: false };
    }

    const userId = userData.user.id || null;
    if (!userId) {
      return { allowed: false };
    }

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("role, subscription_tier")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      return { allowed: false };
    }

    // Admins bypass billing entirely
    if (profile && profile.role === "admin") {
      return { allowed: true, profile };
    }

    const allowed = hasAccess(profile);
    return { allowed, profile };
  }

  window.BillingGuard = {
    checkAccess,
    hasAccess,
  };
})();
