/**
 * api/subscribe.js
 * Vercel Serverless Function — Claim Cipher email capture
 *
 * Flow:
 *   1. Validate the email from the request body
 *   2. GET /audiences → find the first audience ID dynamically
 *   3. POST /audiences/{id}/contacts → add the contact
 *
 * Environment variable required (set in Vercel project settings):
 *   RESEND_API_KEY → your Resend API key (re_xxxxxxxxxxxxxxxx)
 */

const RESEND_BASE = 'https://api.resend.com';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://app.claimcipherhq.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[subscribe] RESEND_API_KEY environment variable is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { email } = req.body || {};

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const emailTrimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(emailTrimmed)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const resendHeaders = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  async function resendFetch(path, options = {}) {
    const response = await fetch(`${RESEND_BASE}${path}`, {
      headers: resendHeaders,
      ...options,
    });
    const data = await response.json();
    return { status: response.status, data };
  }

  let audienceId;

  try {
    const { status, data } = await resendFetch('/audiences');

    if (status !== 200 || !data?.data?.length) {
      console.error('[subscribe] Failed to fetch audiences:', status, data);
      return res.status(200).json({
        success: false,
        message: 'Audience lookup failed',
      });
    }

    audienceId = data.data[0].id;

  } catch (err) {
    console.error('[subscribe] Audiences fetch threw:', err);
    return res.status(200).json({
      success: false,
      message: 'Network error on audience lookup',
    });
  }

  try {
    const { status, data } = await resendFetch(
      `/audiences/${audienceId}/contacts`,
      {
        method: 'POST',
        body: JSON.stringify({
          email: emailTrimmed,
          unsubscribed: false,
        }),
      }
    );

    if (status === 200 || status === 201) {
      return res.status(200).json({ success: true });
    }

    if (status === 409) {
      return res.status(200).json({ success: true, note: 'Already subscribed' });
    }

    console.error('[subscribe] Failed to add contact:', status, data);
    return res.status(200).json({
      success: false,
      message: 'Contact add failed',
    });

  } catch (err) {
    console.error('[subscribe] Contact add threw:', err);
    return res.status(200).json({
      success: false,
      message: 'Network error on contact add',
    });
  }
}
