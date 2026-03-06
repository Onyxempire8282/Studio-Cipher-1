/* ── settings-service.js ──
 * Supabase reads and writes for the settings page.
 * Uses the existing supabase-auth.js client pattern.
 */

const SettingsService = (() => {

  function getClient() {
    return window.SupabaseAuth.init();
  }

  async function getUserId() {
    const sb = getClient();
    const { data: { user } } = await sb.auth.getUser();
    return user?.id;
  }

  // ── PROFILE ──
  // The profiles table has both "id" and "user_id" columns.
  // Some rows have user_id = auth.uid() but id ≠ auth.uid().
  // All queries use user_id for reliable matching.

  async function loadProfile() {
    const sb = getClient();
    const userId = await getUserId();
    if (!userId) throw new Error('Not authenticated');

    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async function saveProfile(fields) {
    const sb = getClient();
    const userId = await getUserId();
    if (!userId) throw new Error('Not authenticated');

    const payload = {
      first_name:     fields.first_name,
      last_name:      fields.last_name,
      company:        fields.company,
      license_number: fields.license_number,
      phone:          fields.phone
    };

    const { error } = await sb
      .from('profiles')
      .update(payload)
      .eq('user_id', userId);
    if (error) throw error;
  }

  // ── ADDRESS ──

  async function saveAddress(fields) {
    const sb = getClient();
    const userId = await getUserId();
    if (!userId) throw new Error('Not authenticated');

    const { error } = await sb
      .from('profiles')
      .update({
        street_address: fields.street_address,
        city:           fields.city,
        state:          fields.state,
        zip:            fields.zip
      })
      .eq('user_id', userId);
    if (error) throw error;
  }

  // ── FIRMS ──

  async function loadUserFirms() {
    const sb = getClient();
    const userId = await getUserId();
    const { data, error } = await sb
      .from('user_firms')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function saveFirm(firm) {
    const sb = getClient();
    const userId = await getUserId();
    const { error } = await sb
      .from('user_firms')
      .upsert({
        user_id:            userId,
        firm_id:            firm.firm_id,
        name:               firm.name,
        free_miles:         firm.free_miles || 0,
        rate_per_mile:      firm.rate_per_mile || 0,
        round_trip_default: firm.round_trip_default || false,
        is_custom:          firm.is_custom || false,
        firm_category:      firm.firm_category || null,
        updated_at:         new Date().toISOString()
      }, {
        onConflict: 'user_id,firm_id'
      });
    if (error) throw error;
  }

  async function deleteFirm(firmId) {
    const sb = getClient();
    const userId = await getUserId();
    const { error } = await sb
      .from('user_firms')
      .delete()
      .eq('user_id', userId)
      .eq('firm_id', firmId);
    if (error) throw error;
  }

  // ── EMAIL ──

  async function changeEmail(newEmail) {
    const sb = getClient();
    const { error } = await sb.auth.updateUser({
      email: newEmail
    });
    if (error) throw error;
    // Also update the profiles table email column
    const userId = await getUserId();
    await sb.from('profiles').update({ email: newEmail }).eq('user_id', userId);
  }

  // ── PASSWORD ──

  async function changePassword(newPassword) {
    const sb = getClient();
    const { error } = await sb.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
  }

  // ── SYNC TO FIRMSTORE ──

  async function syncToFirmStore() {
    if (!window.FirmStore) return;
    // Re-fetch from Supabase to update cache
    await window.FirmStore.getAll();
  }

  // ── DELETE ACCOUNT ──

  async function deleteAccount() {
    const sb = getClient();
    const userId = await getUserId();
    if (!userId) throw new Error('Not authenticated');

    // Delete user firms
    const { error: firmsErr } = await sb
      .from('user_firms')
      .delete()
      .eq('user_id', userId);
    if (firmsErr) console.error('Failed to delete firms:', firmsErr);

    // Delete user profile
    const { error: profileErr } = await sb
      .from('profiles')
      .delete()
      .eq('user_id', userId);
    if (profileErr) console.error('Failed to delete profile:', profileErr);

    // Sign out (clears Supabase session)
    await sb.auth.signOut();

    // Clear all local data
    localStorage.clear();
    sessionStorage.clear();
  }

  return {
    loadProfile,
    saveProfile,
    saveAddress,
    changeEmail,
    loadUserFirms,
    saveFirm,
    deleteFirm,
    changePassword,
    syncToFirmStore,
    deleteAccount
  };
})();

window.SettingsService = SettingsService;
