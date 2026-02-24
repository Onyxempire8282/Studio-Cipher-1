import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient, requireUser } from "../_shared/supabase.ts";
import { stripe } from "../_shared/stripe.ts";

const appUrl = Deno.env.get("APP_URL") || "";
const priceBasic = Deno.env.get("STRIPE_PRICE_BASIC") || "";
const pricePro = Deno.env.get("STRIPE_PRICE_PRO") || "";
const priceProSetup = Deno.env.get("STRIPE_PRICE_PRO_SETUP") || "";

function assertEnv() {
  if (!appUrl || !priceBasic || !pricePro || !priceProSetup) {
    throw new Error("Missing APP_URL or Stripe price env vars");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    assertEnv();

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = await requireUser(token);
    const { plan } = await req.json();

    if (plan !== "basic" && plan !== "pro") {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const lineItems = plan === "basic"
      ? [{ price: priceBasic, quantity: 1 }]
      : [
          { price: pricePro, quantity: 1 },
          { price: priceProSetup, quantity: 1 },
        ];

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: lineItems,
      success_url: `${appUrl}/billing-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing-cancel.html`,
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan,
        },
      },
      metadata: {
        user_id: user.id,
        plan,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
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
