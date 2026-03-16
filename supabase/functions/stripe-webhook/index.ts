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

      // Send welcome email via Resend
      if (userId) {
        const { data: profile } = await admin
          .from("profiles")
          .select("email, full_name, welcome_email_sent")
          .eq("user_id", userId)
          .single();

        if (profile && !profile.welcome_email_sent && profile.email) {
          const resendKey = Deno.env.get("RESEND_API_KEY");
          if (resendKey) {
            const firstName = profile.full_name?.split(' ')[0] || 'there';
            const emailRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${resendKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "Claim Cipher <support@claimcipherhq.com>",
                to: [profile.email],
                subject: "Welcome to Claim Cipher\u2122 \u2014 You're In",
                html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0e0f11;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">
    <div style="border-top:3px solid #e8952a;background:#161a1d;padding:32px 28px;">
      <div style="font-family:monospace;font-size:11px;letter-spacing:0.2em;color:#e8952a;text-transform:uppercase;margin-bottom:4px;">
        CLAIM CIPHER\u2122
      </div>
      <div style="font-size:24px;font-weight:700;color:#edeae4;letter-spacing:0.04em;margin-bottom:24px;">
        YOU'RE IN, ${firstName.toUpperCase()}.
      </div>
      <div style="font-size:15px;color:#b8bdc2;margin-bottom:24px;font-weight:300;">
        Your Claim Cipher\u2122 account is active. Built for independent appraisers who are serious about their workflow.
      </div>
      <div style="font-size:15px;color:#b8bdc2;margin-bottom:28px;font-weight:300;">
        Log in and start with Route Cipher \u2014 sequence your stops, calculate your mileage, and generate your first report.
      </div>
      <div style="margin:28px 0;">
        <a href="https://claimcipherhq.com/login" style="display:inline-block;background:#e8952a;color:#0e0f11;font-family:monospace;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;padding:14px 32px;font-weight:700;">
          ENTER CLAIM CIPHER\u2122 \u2192
        </a>
      </div>
      <div style="font-size:13px;color:#4a5058;margin-top:24px;">
        Questions? Reply to this email. Built by an independent appraiser \u2014 I actually pick up.
      </div>
    </div>
    <div style="padding:20px 28px;text-align:center;">
      <div style="font-family:monospace;font-size:10px;letter-spacing:0.14em;color:#4a5058;text-transform:uppercase;">
        Claim Cipher\u2122 \u2014 claimcipherhq.com
      </div>
      <div style="font-size:11px;color:#4a5058;margin-top:6px;">
        Do not reply to this email.
      </div>
    </div>
  </div>
</body>
</html>`
              }),
            });

            if (emailRes.ok) {
              // Mark welcome email as sent
              await admin
                .from("profiles")
                .update({ welcome_email_sent: true })
                .eq("user_id", userId);
              console.log(`Welcome email sent to ${profile.email}`);
            } else {
              const err = await emailRes.text();
              console.error("Welcome email error:", err);
            }
          }
        }
      }
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
