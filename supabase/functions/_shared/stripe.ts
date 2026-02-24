import Stripe from "npm:stripe@12.18.0";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});