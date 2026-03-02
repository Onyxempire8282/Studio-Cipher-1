(function() {
  'use strict';

  const state = {
    tier: 'none',
    status: 'inactive',
    current_period_end: null,
    dispatch_enabled: false,
    stripe_customer_id: null,
  };

  function getSupabaseBaseUrl() {
    return window.SUPABASE_CONFIG?.url || '';
  }

  function getSupabaseClient() {
    if (!window.SupabaseAuth || !window.SupabaseAuth.init) {
      return null;
    }
    return window.SupabaseAuth.init();
  }

  async function getSession() {
    const client = getSupabaseClient();
    if (!client || !client.auth || !client.auth.getSession) {
      return null;
    }
    const { data, error } = await client.auth.getSession();
    if (error) {
      return null;
    }
    return data?.session || null;
  }

  async function callFunction(name, body, token) {
    const baseUrl = getSupabaseBaseUrl();
    if (!baseUrl) {
      throw new Error('Supabase not configured');
    }

    if (!token) {
      throw new Error('No active session');
    }

    const anonKey = window.SUPABASE_CONFIG?.anonKey || '';
    const response = await fetch(`${baseUrl}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
      },
      body: body ? JSON.stringify(body) : '{}',
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  function applyRoleFromBilling(data) {
    if (typeof window.applyBillingRole === 'function') {
      window.applyBillingRole(data);
    }
  }

  function applyBillingState(data) {
    state.tier = data.tier || 'none';
    state.status = data.status || 'inactive';
    state.current_period_end = data.current_period_end || null;
    state.dispatch_enabled = !!data.dispatch_enabled;
    state.stripe_customer_id = data.stripe_customer_id || null;

    applyRoleFromBilling({ ...state });
    window.dispatchEvent(new CustomEvent('billing:updated', { detail: { ...state } }));
  }

  async function fetchBillingStatus() {
    const session = await getSession();
    if (!session) {
      return { tier: 'none', status: 'inactive' };
    }

    const baseUrl = getSupabaseBaseUrl();
    if (!baseUrl) {
      return { tier: 'none', status: 'inactive' };
    }

    const anonKey = window.SUPABASE_CONFIG?.anonKey || '';
    const response = await fetch(`${baseUrl}/functions/v1/billing-status`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      return { tier: 'none', status: 'inactive' };
    }

    const data = await response.json();
    if (!response.ok) {
      return { tier: 'none', status: 'inactive' };
    }

    return data || { tier: 'none', status: 'inactive' };
  }

  async function loadBillingStatus() {
    // Demo mode bypass — skip billing API call entirely
    if (sessionStorage.getItem('demo_mode') === 'true') {
      applyBillingState({ tier: 'demo', status: 'active', dispatch_enabled: true });
      return;
    }

    try {
      const data = await fetchBillingStatus();
      applyBillingState(data);
    } catch (error) {
      applyBillingState({ tier: 'none', status: 'inactive' });
    }
  }

  async function startCheckout(plan) {
    try {
      const session = await getSession();
      if (!session) {
        return null;
      }
      const data = await callFunction('create-checkout-session', { plan }, session.access_token);
      return data.url || null;
    } catch (error) {
      return null;
    }
  }

  async function openBillingPortal() {
    try {
      const session = await getSession();
      if (!session) {
        return null;
      }
      const data = await callFunction('create-portal-session', {}, session.access_token);
      return data.url || null;
    } catch (error) {
      return null;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadBillingStatus();
  });

  window.CipherBilling = {
    startCheckout,
    openBillingPortal,
  };
})();
