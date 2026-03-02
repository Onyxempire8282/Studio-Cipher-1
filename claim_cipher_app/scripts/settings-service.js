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
  // SELECT uses user_id (works per billing-guard)
  // UPDATE uses id (PK = auth UUID, matches RLS: auth.uid() = id)

  async function loadProfile() {
    const sb = getClient();
    const userId = await getUserId();
    const { data, error } = await sb
      .from('profiles')
      .select(`
        first_name, last_name, company,
        license_number, phone, email,
        street_address, city, state, zip
      `)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.error('loadProfile error:', error);
      return null;
    }
    return data;
  }

  async function saveProfile(fields) {
    const sb = getClient();
    const userId = await getUserId();
    const { error } = await sb
      .from('profiles')
      .update({
        first_name:     fields.first_name,
        last_name:      fields.last_name,
        company:        fields.company,
        license_number: fields.license_number,
        phone:          fields.phone
      })
      .eq('id', userId);
    if (error) throw error;
  }

  // ── ADDRESS ──

  async function saveAddress(fields) {
    const sb = getClient();
    const userId = await getUserId();
    const { error } = await sb
      .from('profiles')
      .update({
        street_address: fields.street_address,
        city:           fields.city,
        state:          fields.state,
        zip:            fields.zip
      })
      .eq('id', userId);
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

  return {
    loadProfile,
    saveProfile,
    saveAddress,
    loadUserFirms,
    saveFirm,
    deleteFirm,
    changeEmail,
    changePassword,
    syncToFirmStore
  };
})();

window.SettingsService = SettingsService;
