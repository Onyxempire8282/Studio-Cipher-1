import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient, requireUser } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = await requireUser(token);
    const admin = createAdminClient();

    const { data: profile, error } = await admin
      .from("profiles")
      .select(
        "subscription_tier,subscription_status,current_period_end,dispatch_enabled,email,stripe_customer_id"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!profile) {
      const { data: inserted, error: insertError } = await admin
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email,
          subscription_tier: "none",
          subscription_status: "inactive",
          dispatch_enabled: false,
        })
        .select(
          "subscription_tier,subscription_status,current_period_end,dispatch_enabled,email,stripe_customer_id"
        )
        .single();

      if (insertError) {
        throw insertError;
      }

      return new Response(JSON.stringify({
        tier: inserted.subscription_tier,
        status: inserted.subscription_status,
        current_period_end: inserted.current_period_end,
        dispatch_enabled: inserted.dispatch_enabled,
        stripe_customer_id: inserted.stripe_customer_id,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      tier: profile.subscription_tier || "none",
      status: profile.subscription_status || "inactive",
      current_period_end: profile.current_period_end,
      dispatch_enabled: !!profile.dispatch_enabled,
      stripe_customer_id: profile.stripe_customer_id,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
