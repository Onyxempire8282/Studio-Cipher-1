/* ── settings-page.js ──
 * Page controller for settings.html.
 * Binds forms, renders firm list, handles modals.
 */

// ── PRESET FIRMS LIST ──
const PRESET_FIRMS = [
  { firm_id: 'sedgwick',       name: 'Sedgwick',                    firm_category: 'daily_auto' },
  { firm_id: 'claim_solution', name: 'Claim Solution Inc.',         firm_category: 'daily_auto' },
  { firm_id: 'qa_claims',      name: 'QA Claims',                   firm_category: 'catastrophic' },
  { firm_id: 'acd',            name: 'AutoClaims Direct (ACD)',     firm_category: 'daily_auto' },
  { firm_id: 'sca',            name: 'SCA Claims',                  firm_category: 'daily_auto' },
  { firm_id: 'thebest',        name: 'TheBest Claims Solutions',    firm_category: 'catastrophic' },
  { firm_id: 'eberl',          name: 'Eberl',                       firm_category: 'catastrophic' },
  { firm_id: 'doan',           name: 'The Doan Group',              firm_category: 'daily_auto' },
  { firm_id: 'kirks',          name: "Kirk's Appraisal Service",    firm_category: 'daily_auto' },
  { firm_id: 'alacrity',       name: 'Alacrity Solutions',          firm_category: 'catastrophic' },
  { firm_id: 'nexterra',       name: 'Nexterra',                    firm_category: 'catastrophic' },
  { firm_id: 'metro',          name: 'Metro Appraisal Company',     firm_category: 'regional' },
  { firm_id: 'hancock',        name: 'Hancock Claims Consultants',  firm_category: 'catastrophic' },
  { firm_id: 'engle_martin',   name: 'Engle Martin & Associates',   firm_category: 'heavy' },
  { firm_id: 'pilot_cat',      name: 'Pilot Catastrophe Services',  firm_category: 'catastrophic' },
  { firm_id: 'mclarens',       name: 'McLarens',                    firm_category: 'property' },
  { firm_id: 'globe_midwest',  name: 'Globe Midwest Adjusters',     firm_category: 'regional' },
  { firm_id: 'custard',        name: 'Custard Insurance Adjusters', firm_category: 'daily_auto' },
];

// ── STATE ──
let userFirms = [];
let pendingFirms = [];
let currentFirmForModal = null;

// ── INIT ──
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadAllSettings();
    bindProfileForm();
    bindAddressForm();
    bindFirmsList();
    bindPasswordForm();
    bindSidebarNav();
  } catch (err) {
    console.error('Settings init error:', err);
    showToast('Failed to load settings', 'error');
  }
});

// ── LOAD ALL SETTINGS ──
async function loadAllSettings() {
  const profile = await SettingsService.loadProfile();
  populateProfileForm(profile);
  populateAddressForm(profile);

  userFirms = await SettingsService.loadUserFirms();
  pendingFirms = [...userFirms];
  renderFirmsList();
  updateSelectedCount();
}

// ── PROFILE FORM ──
function populateProfileForm(profile) {
  if (!profile) return;
  setValue('firstName',     profile.first_name);
  setValue('lastName',      profile.last_name);
  setValue('companyName',   profile.company);
  setValue('licenseNumber', profile.license_number);
  setValue('phoneNumber',   profile.phone);
  setValue('emailAddress',  profile.email);
}

function bindProfileForm() {
  document.getElementById('saveProfileBtn')
    ?.addEventListener('click', async () => {
      const btn = document.getElementById('saveProfileBtn');
      setLoading(btn, true);
      try {
        await SettingsService.saveProfile({
          first_name:     getVal('firstName'),
          last_name:      getVal('lastName'),
          company:        getVal('companyName'),
          license_number: getVal('licenseNumber'),
          phone:          getVal('phoneNumber')
        });
        showToast('Profile saved', 'success');
        updateSectionBadge('profileSection', 'SAVED');
      } catch (err) {
        showToast('Failed to save profile', 'error');
        console.error(err);
      } finally {
        setLoading(btn, false);
      }
    });

  document.getElementById('cancelProfileBtn')
    ?.addEventListener('click', async () => {
      const profile = await SettingsService.loadProfile();
      populateProfileForm(profile);
    });
}

// ── ADDRESS FORM ──
function populateAddressForm(profile) {
  if (!profile) return;
  setValue('streetAddress', profile.street_address);
  setValue('cityField',     profile.city);
  setValue('stateField',    profile.state);
  setValue('zipField',      profile.zip);
}

function bindAddressForm() {
  document.getElementById('saveAddressBtn')
    ?.addEventListener('click', async () => {
      const btn = document.getElementById('saveAddressBtn');
      setLoading(btn, true);
      try {
        await SettingsService.saveAddress({
          street_address: getVal('streetAddress'),
          city:           getVal('cityField'),
          state:          getVal('stateField'),
          zip:            getVal('zipField')
        });
        showToast('Address saved', 'success');
      } catch (err) {
        showToast('Failed to save address', 'error');
        console.error(err);
      } finally {
        setLoading(btn, false);
      }
    });

  document.getElementById('cancelAddressBtn')
    ?.addEventListener('click', async () => {
      const profile = await SettingsService.loadProfile();
      populateAddressForm(profile);
    });
}

// ── FIRMS LIST ──
function renderFirmsList(filter, search) {
  filter = filter || getCurrentFilter();
  search = search || getCurrentSearch();

  const list = document.getElementById('firmsList');
  if (!list) return;

  const selectedIds = new Set(pendingFirms.map(f => f.firm_id));

  // Custom firms not in presets
  const presetIds = new Set(PRESET_FIRMS.map(f => f.firm_id));
  const customFirms = pendingFirms.filter(f => !presetIds.has(f.firm_id));

  // Combine preset + custom
  const allFirms = [
    ...PRESET_FIRMS,
    ...customFirms.map(f => ({
      firm_id: f.firm_id,
      name: f.name,
      firm_category: f.firm_category || 'custom',
      is_custom: true
    }))
  ];

  // Apply category filter
  let filtered = allFirms;
  if (filter !== 'all') {
    filtered = allFirms.filter(f => f.firm_category === filter);
  }

  // Apply search filter
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(f => f.name.toLowerCase().includes(q));
  }

  list.innerHTML = '';

  filtered.forEach(firm => {
    const isSelected = selectedIds.has(firm.firm_id);
    const existingData = pendingFirms.find(f => f.firm_id === firm.firm_id);

    const rateDisplay = existingData
      ? `$${existingData.rate_per_mile}/mi · ${existingData.free_miles} free`
      : 'No rates set';

    const item = document.createElement('div');
    item.className = 'firm-item' + (isSelected ? ' firm-item--selected' : '');
    item.dataset.firmId = firm.firm_id;
    item.innerHTML = `
      <div class="firm-checkbox${isSelected ? ' firm-checkbox--checked' : ''}">
        <span class="firm-checkbox-check">\u2713</span>
      </div>
      <div class="firm-info">
        <div class="firm-name">${firm.name}${
          firm.is_custom
            ? '<span class="firm-custom-tag">CUSTOM</span>'
            : ''
        }</div>
        <div class="firm-meta">${isSelected ? rateDisplay : categoryLabel(firm.firm_category)}</div>
      </div>
      <span class="firm-tag">${categoryLabel(firm.firm_category)}</span>
    `;

    item.addEventListener('click', () => {
      if (isSelected) {
        pendingFirms = pendingFirms.filter(f => f.firm_id !== firm.firm_id);
        renderFirmsList();
        updateSelectedCount();
      } else {
        currentFirmForModal = {
          firm_id:       firm.firm_id,
          name:          firm.name,
          firm_category: firm.firm_category,
          is_custom:     firm.is_custom || false
        };
        openRateModal(firm, existingData);
      }
    });

    list.appendChild(item);
  });
}

// ── RATE MODAL ──
function openRateModal(firm, existingData) {
  const modal = document.getElementById('rateModal');
  if (!modal) return;

  document.getElementById('rateModalFirmName').textContent = firm.name;
  document.getElementById('rateModalFreeMiles').value = existingData?.free_miles ?? '';
  document.getElementById('rateModalRatePerMile').value = existingData?.rate_per_mile ?? '';
  document.getElementById('rateModalRoundTrip').checked = existingData?.round_trip_default ?? false;

  modal.classList.add('active');
  document.getElementById('rateModalFreeMiles').focus();
}

function closeRateModal() {
  document.getElementById('rateModal')?.classList.remove('active');
  currentFirmForModal = null;
}

function bindRateModal() {
  document.getElementById('rateModalSaveBtn')
    ?.addEventListener('click', () => {
      const freeMiles = parseInt(document.getElementById('rateModalFreeMiles').value) || 0;
      const ratePerMile = parseFloat(document.getElementById('rateModalRatePerMile').value) || 0;
      const roundTrip = document.getElementById('rateModalRoundTrip')?.checked || false;

      if (!currentFirmForModal) return;

      const firmData = {
        ...currentFirmForModal,
        free_miles:         freeMiles,
        rate_per_mile:      ratePerMile,
        round_trip_default: roundTrip
      };

      const existing = pendingFirms.findIndex(f => f.firm_id === currentFirmForModal.firm_id);
      if (existing >= 0) {
        pendingFirms[existing] = firmData;
      } else {
        pendingFirms.push(firmData);
      }

      closeRateModal();
      renderFirmsList();
      updateSelectedCount();
    });

  document.getElementById('rateModalCancelBtn')
    ?.addEventListener('click', closeRateModal);

  document.getElementById('rateModalSkipBtn')
    ?.addEventListener('click', () => {
      if (!currentFirmForModal) return;
      pendingFirms.push({
        ...currentFirmForModal,
        free_miles:         0,
        rate_per_mile:      0,
        round_trip_default: false
      });
      closeRateModal();
      renderFirmsList();
      updateSelectedCount();
    });

  document.getElementById('rateModal')
    ?.addEventListener('click', (e) => {
      if (e.target.id === 'rateModal') closeRateModal();
    });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeRateModal();
      closeCustomFirmModal();
    }
  });
}

// ── SAVE FIRMS ──
function bindFirmsList() {
  bindRateModal();
  bindFirmSearch();
  bindFirmFilters();
  bindCustomFirmModal();

  document.getElementById('addCustomFirmBtn')
    ?.addEventListener('click', () => openCustomFirmModal());

  document.getElementById('clearFirmsBtn')
    ?.addEventListener('click', () => {
      pendingFirms = [];
      renderFirmsList();
      updateSelectedCount();
    });

  document.getElementById('saveFirmsBtn')
    ?.addEventListener('click', async () => {
      const btn = document.getElementById('saveFirmsBtn');
      setLoading(btn, true);
      try {
        const currentSaved = await SettingsService.loadUserFirms();
        const savedIds = new Set(currentSaved.map(f => f.firm_id));
        const pendingIds = new Set(pendingFirms.map(f => f.firm_id));

        // Delete deselected firms
        for (const f of currentSaved) {
          if (!pendingIds.has(f.firm_id)) {
            await SettingsService.deleteFirm(f.firm_id);
          }
        }

        // Upsert selected firms
        for (const f of pendingFirms) {
          await SettingsService.saveFirm(f);
        }

        // Sync to FirmStore so Mileage Cipher updates
        await SettingsService.syncToFirmStore();

        userFirms = [...pendingFirms];
        showToast('Firms saved', 'success');
        updateSelectedCount();
      } catch (err) {
        showToast('Failed to save firms', 'error');
        console.error(err);
      } finally {
        setLoading(btn, false);
      }
    });
}

// ── FIRM SEARCH ──
function bindFirmSearch() {
  document.getElementById('firmSearch')
    ?.addEventListener('input', (e) => {
      renderFirmsList(getCurrentFilter(), e.target.value);
    });
}

// ── FIRM FILTER CHIPS ──
function bindFirmFilters() {
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderFirmsList(chip.dataset.filter, getCurrentSearch());
    });
  });
}

// ── CUSTOM FIRM MODAL ──
function openCustomFirmModal() {
  const modal = document.getElementById('customFirmModal');
  if (!modal) return;
  document.getElementById('customFirmName').value = '';
  document.getElementById('customFirmCategory').value = 'daily_auto';
  modal.classList.add('active');
  document.getElementById('customFirmName').focus();
}

function closeCustomFirmModal() {
  document.getElementById('customFirmModal')?.classList.remove('active');
}

function bindCustomFirmModal() {
  document.getElementById('customFirmSaveBtn')
    ?.addEventListener('click', () => {
      const name = document.getElementById('customFirmName').value.trim();
      if (!name) return;

      const category = document.getElementById('customFirmCategory').value || 'daily_auto';
      const firmId = 'custom_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_');

      const customFirm = {
        firm_id:       firmId,
        name:          name,
        firm_category: category,
        is_custom:     true
      };

      closeCustomFirmModal();
      currentFirmForModal = customFirm;
      openRateModal(customFirm, null);
    });

  document.getElementById('customFirmCancelBtn')
    ?.addEventListener('click', closeCustomFirmModal);

  document.getElementById('customFirmModal')
    ?.addEventListener('click', (e) => {
      if (e.target.id === 'customFirmModal') closeCustomFirmModal();
    });
}

// ── PASSWORD FORM ──
function bindPasswordForm() {
  document.getElementById('updatePasswordBtn')
    ?.addEventListener('click', async () => {
      const current = getVal('currentPassword');
      const newPass = getVal('newPassword');
      const confirm = getVal('confirmPassword');

      if (!current || !newPass || !confirm) {
        showToast('Fill in all password fields', 'error');
        return;
      }
      if (newPass !== confirm) {
        showToast('Passwords do not match', 'error');
        return;
      }
      if (newPass.length < 8) {
        showToast('Password must be 8+ characters', 'error');
        return;
      }

      const btn = document.getElementById('updatePasswordBtn');
      setLoading(btn, true);
      try {
        await SettingsService.changePassword(newPass);
        showToast('Password updated', 'success');
        setValue('currentPassword', '');
        setValue('newPassword', '');
        setValue('confirmPassword', '');
        resetStrengthBars();
      } catch (err) {
        showToast(err.message || 'Failed to update password', 'error');
      } finally {
        setLoading(btn, false);
      }
    });

  document.getElementById('newPassword')
    ?.addEventListener('input', (e) => {
      updateStrengthBars(e.target.value);
    });
}

// ── SIDEBAR NAV ──
function bindSidebarNav() {
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.dataset.section;
      if (target) {
        document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
      }
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });
}

// ── HELPERS ──
function getVal(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}

function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn._origLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Saving...';
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.label || btn._origLabel || 'Save';
  }
}

function updateSelectedCount() {
  const count = pendingFirms.length;
  const el = document.getElementById('selectedCount');
  if (el) el.textContent = count + ' firm' + (count !== 1 ? 's' : '') + ' selected';
}

function updateSectionBadge(sectionId, text) {
  const badge = document.querySelector('#' + sectionId + ' .section-badge');
  if (badge) badge.textContent = text;
}

function getCurrentFilter() {
  return document.querySelector('.filter-chip.active')?.dataset.filter || 'all';
}

function getCurrentSearch() {
  return document.getElementById('firmSearch')?.value || '';
}

function categoryLabel(cat) {
  var labels = {
    daily_auto:   'Daily Auto',
    heavy:        'Heavy',
    catastrophic: 'CAT',
    property:     'Property',
    nationwide:   'Nationwide',
    regional:     'Regional',
    custom:       'Custom'
  };
  return labels[cat] || cat || '\u2014';
}

function updateStrengthBars(password) {
  var strength = 0;
  if (password.length >= 8)        strength++;
  if (/[A-Z]/.test(password))      strength++;
  if (/[0-9]/.test(password))      strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  document.querySelectorAll('.strength-bar').forEach(function(bar, i) {
    bar.classList.toggle('filled', i < strength);
  });
}

function resetStrengthBars() {
  document.querySelectorAll('.strength-bar').forEach(function(bar) {
    bar.classList.remove('filled');
  });
}

function showToast(message, type) {
  type = type || 'success';
  var existing = document.getElementById('settingsToast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.id = 'settingsToast';
  toast.className = 'settings-toast settings-toast--' + type;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(function() {
    toast.classList.add('visible');
  });

  setTimeout(function() {
    toast.classList.remove('visible');
    setTimeout(function() { toast.remove(); }, 300);
  }, 2500);
}

window.SettingsPage = {
  renderFirmsList: renderFirmsList,
  updateSelectedCount: updateSelectedCount
};
