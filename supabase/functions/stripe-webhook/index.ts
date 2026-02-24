import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { stripe } from "../_shared/stripe.ts";

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const priceBasic = Deno.env.get("STRIPE_PRICE_BASIC") || "";
const pricePro = Deno.env.get("STRIPE_PRICE_PRO") || "";

function mapTier(subscription: any) {
  const priceIds = subscription.items.data.map((item) => item.price.id);
  if (priceIds.includes(pricePro)) return "pro";
  if (priceIds.includes(priceBasic)) return "basic";
  return "none";
}

function normalizeStatus(status: string, currentPeriodEnd: number | null, tier: string) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (status === "canceled" && currentPeriodEnd && currentPeriodEnd < nowSeconds) {
    return { tier: "none", status: "inactive" };
  }
  return { tier, status };
}

function isDispatchEnabled(tier: string, status: string, currentPeriodEnd: number | null) {
  if (tier !== "pro") return false;
  if (status !== "active" && status !== "trialing") return false;
  if (currentPeriodEnd && currentPeriodEnd < Math.floor(Date.now() / 1000)) return false;
  return true;
}

async function upsertBillingEvent(admin: ReturnType<typeof createAdminClient>, event: any, userId?: string | null) {
  const payload = event.data?.object || {};
  await admin.from("billing_events").upsert({
    user_id: userId || null,
    event_type: event.type,
    stripe_event_id: event.id,
    payload,
  }, { onConflict: "stripe_event_id" });
}

async function updateProfileFromSubscription(admin: ReturnType<typeof createAdminClient>, subscription: any, stripeCustomerId: string) {
  const tier = mapTier(subscription);
  const normalized = normalizeStatus(subscription.status, subscription.current_period_end, tier);
  const dispatchEnabled = isDispatchEnabled(normalized.tier, normalized.status, subscription.current_period_end);

  const { data: profileData } = await admin
    .from("profiles")
    .select("id,user_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  let userId: string | null = profileData?.user_id || null;

  if (!userId && subscription.metadata?.user_id) {
    userId = subscription.metadata.user_id;
  }

  if (!userId) {
    console.error("updateProfileFromSubscription: could not resolve user_id for customer", stripeCustomerId);
    return { userId: null };
  }

  const updatePayload = {
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: subscription.id,
    subscription_tier: normalized.tier,
    subscription_status: normalized.status,
    current_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    dispatch_enabled: dispatchEnabled,
  };

  const { error } = await admin
    .from("profiles")
    .update(updatePayload)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return { userId };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("Webhook handler initialized");

  try {
    if (!webhookSecret) {
      throw new Error("Missing STRIPE_WEBHOOK_SECRET env var");
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("Missing signature");
    }

    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );
    console.log("Event type:", event.type);
    const admin = createAdminClient();

    let userId: string | null = null;

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;

      if (!session.subscription) {
        await upsertBillingEvent(admin, event, null);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      const stripeCustomerId = subscription.customer as string;
      const result = await updateProfileFromSubscription(admin, subscription, stripeCustomerId);
      userId = result.userId;
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as any;
      const stripeCustomerId = subscription.customer as string;
      const result = await updateProfileFromSubscription(admin, subscription, stripeCustomerId);
      userId = result.userId;
    }

    if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      // No subscription retrieval here to avoid webhook delays.
    }

    await upsertBillingEvent(admin, event, userId);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
