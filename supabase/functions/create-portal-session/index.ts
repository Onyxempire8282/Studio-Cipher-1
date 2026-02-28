import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient, requireUser } from "../_shared/supabase.ts";
import { stripe } from "../_shared/stripe.ts";

const appUrl = Deno.env.get("APP_URL") || "";

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

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("user_id,email,stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    let stripeCustomerId = profile?.stripe_customer_id || null;
    const email = profile?.email || user.email || null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: email || undefined,
        metadata: { user_id: user.id },
      });
      stripeCustomerId = customer.id;

      const { error: upsertError } = await admin
        .from("profiles")
        .upsert({
          user_id: user.id,
          email: email,
          stripe_customer_id: stripeCustomerId,
        }, { onConflict: "user_id" });

      if (upsertError) {
        throw upsertError;
      }
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${appUrl}/command-center.html`,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
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
