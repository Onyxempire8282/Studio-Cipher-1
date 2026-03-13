/* ── settings-page.js ──
 * Page controller for settings.html.
 * Binds forms, renders firm list, handles modals.
 */

// ── PRESET FIRMS LIST (Source: FIRM_MASTERSHEET) ──
// 19 Nationwide Daily Auto · 9 Nationwide CAT · 15 Regional = 43 total
const PRESET_FIRMS = [

  // ── NATIONWIDE DAILY AUTO (A-Z) ──────────────────────────────
  { firm_id: 'acd',                name: 'AutoClaims Direct (ACD)',                firm_category: 'daily_auto',   coverage: 'nationwide', website: 'https://www.acdcorp.com',                    contact_name: 'Emily Makley',                  contact_email: 'emakley@acdcorp.com' },
  { firm_id: 'claim_solution',     name: 'Claim Solution Inc.',                    firm_category: 'daily_auto',   coverage: 'nationwide', website: 'https://www.claimsolution.com',              contact_name: 'Dale Mason',                    contact_email: 'dmason@claimsolution.com' },
  { firm_id: 'condition_now',      name: 'Condition Now',                          firm_category: 'daily_auto',   coverage: 'nationwide', website: 'https://www.conditionnow.com',               contact_name: 'Thomas Allen',                  contact_email: 'tomallen@conditionnow.com' },
  { firm_id: 'dekra',              name: 'DEKRA Services Inc.',                    firm_category: 'daily_auto',   coverage: 'nationwide', website: 'https://www.dekra.us/en/home-page/',         contact_name: 'Jeff Dickson',                  contact_email: 'jeffrey.dickson@dekra.com' },
  { firm_id: 'doan',               name: 'The Doan Group',                         firm_category: 'daily_auto',   coverage: 'nationwide', website: 'https://www.doan.com',                       contact_name: 'Amanda Williams',               contact_email: 'amanda.williams@doan.com' },
  { firm_id: 'engle_martin',       name: 'Engle Martin and Associates',            firm_category: 'daily_auto',   coverage: 'nationwide', website: 'https://www.englemartin.com',                contact_name: 'Lee Maddox',                    contact_email: 'lmaddox@englemartin.com' },
  { firm_id: 'franklin',           name: 'Franklin Insurance Adjusters, Inc.',     firm_category: 'daily_auto',   coverage: 'nationwide', website: 'https://www.fia.team',                       contact_name: 'Sal Gaetano',                   contact_email: 'sal@fia.team' },
  { firm_id: 'ias',                name: 'IAS (Independent Appraisal Services)',   firm_category: 'daily_auto',   coverage: 'nationwide', website: 'https://www.iasclaimsgroup.com',             contact_name: 'Ron Ragland',                   contact_email: 'ron.ragland@iasclaimsgroup.com',   notes: 'Recommend working a few months before onboarding' },
  { firm_id: 'kirks',              name: "Kirk's Appraisal Service",               firm_category: 'daily_auto',   coverage: 'nationwide', website: 'https://www.kirksappraisal.com',             contact_name: 'Mike Torgerson / Kirk Applegate', contact_email: 'recruiting@kirksappraisal.com' },
  { firm_id: 'legacy_claims',      name: 'Legacy Claims Services',                firm_category: 'daily_auto',   coverage: 'nationwide', website: 'https://legacyclaimsservices.com',            contact_name: 'Mark Petty',                    contact_email: 'mark@legacyclaimsservices.com' },
  { firm_id: 'primeco',            name: 'Primecoclaims Group',                   firm_category: 'daily_auto',   coverage: 'nationwide', website: 'https://primecoclaims.com',                  contact_name: 'Ericka Eubanks',                contact_email: 'eeubanks@primecoclaims.com' },
  { firm_id: 'sca',                name: 'SCA Claims',                            firm_category: 'daily_auto',   coverage: 'nationwide', website: 'https://www.sca-appraisal.com',              contact_name: 'Whitney Hurwitz',               contact_email: 'whurwitz@sca-appraisal.com' },
  { firm_id: 'sedgwick',           name: 'Sedgwick (formerly Nationwide Appraisals)', firm_category: 'daily_auto', coverage: 'nationwide', website: 'https://www.sedgwick.com/autoappraisals',   contact_name: 'Lina Tomassini',                contact_email: 'eilyn.tomassini@sedgwick.com' },
  { firm_id: 'thebest',            name: 'TheBest Claims Solutions (formerly TheBestIRS)', firm_category: 'catastrophic', coverage: 'nationwide', website: 'https://www.thebestirs.com',        contact_name: 'Tom Bielicki',                  contact_email: 'https://thebestclaims.com/website/s/join-our-roster-as' },
  { firm_id: 'vehicle_inspection', name: 'Vehicle Inspection Solutions',           firm_category: 'daily_auto',   coverage: 'nationwide', website: 'https://www.visclaims.com',                  contact_name: 'Larry Akopyan',                 contact_email: 'info@visclaims.com' },

  // ── NATIONWIDE CATASTROPHIC (A-Z) ────────────────────────────
  { firm_id: '300_llc',            name: '300 LLC',                               firm_category: 'catastrophic', coverage: 'nationwide', website: 'https://the300advantage.com',                contact_name: 'Ryan Hampton',                  contact_email: 'ryan@the300advantage.com',         notes: 'High emphasis on Colorado' },
  { firm_id: 'alacrity',           name: 'Alacrity Solutions',                    firm_category: 'catastrophic', coverage: 'nationwide', website: 'https://www.alacritysolutions.com',          contact_name: 'Jaclyn Klapperich',             contact_email: 'resourcemanagement@alacritysolutions.com' },
  { firm_id: 'anchor_claims',      name: 'Anchor Claim Services',                firm_category: 'catastrophic', coverage: 'nationwide', website: 'https://www.anchor-claims.com',              contact_name: 'Brian Jordan',                  contact_email: 'auto@anchorclaimservices.com',     notes: 'Daily Auto in Southeast Region' },
  { firm_id: 'cnc',                name: 'CNC Catastrophe & National Claims',    firm_category: 'catastrophic', coverage: 'nationwide', website: 'https://adjustingexpectations.com',           contact_name: 'Kim Robbins / Ferrita Dixon',   contact_email: 'fernitadixon@cnc-resource.com' },
  { firm_id: 'eberl',              name: 'Eberl',                                firm_category: 'catastrophic', coverage: 'nationwide', website: 'https://www.eberls.com',                     contact_name: '',                              contact_email: 'pmorris@eberls.com' },
  { firm_id: 'hi_tech_pdr',        name: 'Hi-Tech PDR',                          firm_category: 'catastrophic', coverage: 'nationwide', website: 'https://hi-techdentremoval.com',              contact_name: 'Paul Tsupin',                   contact_email: 'paul@hi-techpdr.com' },
  { firm_id: 'legion_claims',      name: 'Legion Claims Solutions, LLC',         firm_category: 'catastrophic', coverage: 'nationwide', website: 'https://www.legionclaims.com',               contact_name: 'Heather Johnson',               contact_email: 'info@legionclaims.com' },
  { firm_id: 'mid_america',        name: 'Mid-America Catastrophe Services',     firm_category: 'catastrophic', coverage: 'nationwide', website: 'https://midamcat.com',                       contact_name: 'Phillip Piper',                 contact_email: 'phillip.piper@midamcat.com' },
  { firm_id: 'nexterra',           name: 'Nexterra',                             firm_category: 'catastrophic', coverage: 'nationwide', website: 'https://nexterras.com',                      contact_name: 'Jeremy Shaw',                   contact_email: 'jshaw@nexterras.com' },
  { firm_id: 'qa_claims',          name: 'QA Claims',                            firm_category: 'catastrophic', coverage: 'nationwide', website: 'https://www.qaclaims.com',                   contact_name: 'Ryan Roberts',                  contact_email: 'ryan@qaclaims.com' },
  { firm_id: 'rocky_mountain',     name: 'Rocky Mountain CAT Corp.',             firm_category: 'catastrophic', coverage: 'nationwide', website: 'https://www.rockymountaincat.com',            contact_name: 'Jim Farley',                    contact_email: 'jimfarley@rockymountaincat.com' },
  { firm_id: 'solutionworks',      name: 'SolutionWorks',                        firm_category: 'catastrophic', coverage: 'nationwide', website: 'https://getsw.com',                          contact_name: 'James Hastings',                contact_email: 'jhastings@getsw.com' },
  { firm_id: 'us_adjusting',       name: 'U.S. Adjusting Services',              firm_category: 'catastrophic', coverage: 'nationwide', website: 'https://www.usadjustingservices.net',         contact_name: 'Nicci Young',                   contact_email: 'nyoung@usadj.net' },

  // ── REGIONAL (A-Z) ──────────────────────────────────────────
  { firm_id: 'autocrat',           name: 'Autocrat Appraisal',                   firm_category: 'regional', coverage: 'Texas',                                              website: '',                                           contact_name: 'Darrell Barnett',               contact_email: 'dbarnett393@gmail.com' },
  { firm_id: 'bbe_appraisal',      name: 'B&E Appraisal Service',                firm_category: 'regional', coverage: 'Arizona',                                            website: 'https://www.bandeappraisal.com',             contact_name: 'Rob Ortega',                    contact_email: 'rortega@bandeappraisal.com' },
  { firm_id: 'cal_west',           name: 'Cal West Appraisal Services',          firm_category: 'regional', coverage: 'CA, OR, NV, AZ',                                     website: 'https://www.calwestas.com',                  contact_name: 'Brian Hall',                    contact_email: 'Assignments@calwestas.com' },
  { firm_id: 'cgia',               name: 'CGIA Solutions',                       firm_category: 'regional', coverage: 'Texas',                                              website: 'https://cgiasolutions.com',                  contact_name: 'Chris Cole',                    contact_email: 'chris@cgiasolutions.com' },
  { firm_id: 'complete_claims',    name: 'Complete Claims Service',              firm_category: 'regional', coverage: 'East Coast (NY,NJ,PA,MD,VA,NC,SC,GA,FL,MS,AL,TN,MO)', website: 'https://www.completeclaims.com',             contact_name: 'Leo Papa',                      contact_email: 'admin@completeclaims.com' },
  { firm_id: 'frontline',          name: 'Frontline Appraisals LLC',             firm_category: 'regional', coverage: 'VA,WV,DC,MD,NC,OH,IN,KY,TN,PA,SC,MI,DE',            website: 'https://frontlineadjusting.com',              contact_name: 'Dan Read',                      contact_email: 'dan.read@frontlineadjusting.com' },
  { firm_id: 'mcanally',           name: 'McAnally Appraisal Services',          firm_category: 'regional', coverage: 'Texas & Georgia',                                    website: 'https://masclaims.com',                      contact_name: 'Sarah Grimes',                  contact_email: 'sarahg@masclaims.com' },
  { firm_id: 'metro_appraisal',    name: 'Metro Appraisal Company',              firm_category: 'regional', coverage: 'Entire Southeast',                                   website: '',                                           contact_name: 'Alvin Ray',                     contact_email: 'alvin@metroapprco.com' },
  { firm_id: 'professional_auto',  name: 'Professional Auto Appraisals',         firm_category: 'regional', coverage: 'Alabama / Florida',                                  website: '',                                           contact_name: 'Jason Shufford Jr.',             contact_email: 'jshuffordjrc2@gmail.com' },
  { firm_id: 'quality_claim',      name: 'Quality Claim Services, Inc',          firm_category: 'regional', coverage: 'NC, SC',                                             website: 'https://qualityclaimservices.com',            contact_name: 'Carrie Byers',                  contact_email: 'carrie.byers@qualityclaims.net' },
  { firm_id: 'quality_estimates',  name: 'Quality Estimates',                    firm_category: 'regional', coverage: 'CA',                                                 website: 'https://www.qualityestimatellc.com',         contact_name: 'Michael Peters',                contact_email: 'mpeters@Qestimates.com' },
  { firm_id: 'rapid_appraisal',    name: 'Rapid Appraisal Services',             firm_category: 'regional', coverage: 'Texas, New Mexico, Louisiana',                       website: 'https://rasofhouston.com',                   contact_name: 'Shawn Parsons',                 contact_email: 'shawn.parsons@rasofhouston.com' },
  { firm_id: 'snb_appraisal',      name: 'SNB Appraisal Services',              firm_category: 'regional', coverage: 'NY - Bronx, Westchester, Queens, Brooklyn, Long Island', website: '',                                        contact_name: 'Henry Ness',                    contact_email: 'snbappraisal@gmail.com' },
  { firm_id: 'ss_appraisal',       name: 'S&S Appraisal Services, LLC',         firm_category: 'regional', coverage: 'East Coast Area surrounding VA',                     website: '',                                           contact_name: 'Stewart Young',                 contact_email: 'ssassignments@hotmail.com' },
  { firm_id: 'viking_auto',        name: 'Viking Auto Appraisal',               firm_category: 'regional', coverage: 'Massachusetts',                                      website: '',                                           contact_name: 'Paul McKeen',                   contact_email: 'PMcKeen@VikingAutoAppraisal.com' },
];

// ── STATE ──
let userFirms = [];
let pendingFirms = [];
let currentFirmForModal = null;
const IS_DEMO = sessionStorage.getItem('demo_mode') === 'true';

// ── INIT ──
document.addEventListener('DOMContentLoaded', async () => {
  // Always bind UI handlers first so buttons work regardless of data load
  bindProfileForm();
  bindAddressForm();
  bindFirmsList();
  bindPasswordForm();
  bindSidebarNav();
  bindDeleteAccount();

  // Demo mode: skip Supabase entirely, render locked preset directory
  if (IS_DEMO) {
    renderDemoFirmsList();
    return;
  }

  // Load data — profile and firms independently so one failure doesn't block the other
  try {
    const profile = await SettingsService.loadProfile();
    console.log('loadProfile returned:', profile);
    if (profile) {
      populateProfileForm(profile);
      populateAddressForm(profile);
    }
  } catch (err) {
    console.error('Profile load error:', err);
    showToast('Failed to load profile: ' + (err.message || err), 'error');
  }

  try {
    userFirms = await SettingsService.loadUserFirms();
    pendingFirms = [...userFirms];
    renderFirmsList();
    updateSelectedCount();
  } catch (err) {
    console.error('Firms load error:', err);
    showToast('Failed to load firms', 'error');
  }
});

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
        const fn = getVal('firstName');
        const navName = document.getElementById('userName');
        if (navName && fn) navName.textContent = fn.toUpperCase();
      } catch (err) {
        showToast(err.message || 'Failed to save profile', 'error');
        console.error('saveProfile error:', err);
      } finally {
        setLoading(btn, false);
      }
    });

  document.getElementById('cancelProfileBtn')
    ?.addEventListener('click', async () => {
      const profile = await SettingsService.loadProfile();
      populateProfileForm(profile);
    });

  // Dedicated email update — separate from profile save
  document.getElementById('updateEmailBtn')
    ?.addEventListener('click', async () => {
      const newEmail = getVal('emailAddress');
      if (!newEmail) {
        showToast('Enter an email address', 'error');
        return;
      }
      const btn = document.getElementById('updateEmailBtn');
      setLoading(btn, true);
      try {
        await SettingsService.changeEmail(newEmail);
        showToast('Confirmation link sent to ' + newEmail, 'success');
        document.getElementById('emailHint').textContent =
          'Check ' + newEmail + ' for the confirmation link';
      } catch (err) {
        showToast(err.message || 'Failed to update email', 'error');
        console.error('changeEmail error:', err);
      } finally {
        setLoading(btn, false);
      }
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
        const street = getVal('streetAddress');
        const city   = getVal('cityField');
        const state  = getVal('stateField');
        const zip    = getVal('zipField');

        await SettingsService.saveAddress({
          street_address: street,
          city:           city,
          state:          state,
          zip:            zip
        });

        // Sync to localStorage so Mileage Cipher + Route Cipher use it as home base
        const fullAddress = [street, city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
        if (fullAddress) {
          syncHomeAddress(fullAddress);
        }

        showToast('Address saved', 'success');
      } catch (err) {
        showToast(err.message || 'Failed to save address', 'error');
        console.error('saveAddress error:', err);
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
        <div class="firm-meta">${isSelected ? rateDisplay : (firm.firm_category === 'regional' && firm.coverage ? firm.coverage : categoryLabel(firm.firm_category))}</div>
      </div>
      <span class="firm-tag">${categoryLabel(firm.firm_category)}</span>
    `;

    item.addEventListener('click', () => {
      if (isSelected) {
        openFirmDetail(firm, existingData);
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

// ── DEMO FIRMS (read-only directory) ──
const DEMO_PREVIEW_COUNT = 6;

function injectDemoFirmsBanner() {
  const section = document.getElementById('firmsSection');
  if (!section || document.getElementById('demoFirmsBanner')) return;
  const header = section.querySelector('.section-header');
  if (!header) return;

  const banner = document.createElement('div');
  banner.id = 'demoFirmsBanner';
  banner.className = 'demo-firms-banner';
  banner.innerHTML =
    '<span>Demo Mode \u2014 Access 40+ insurance firms nationwide for less than $1 each</span>'
    + '<span style="margin:0 6px;opacity:0.5;">|</span>'
    + '<a href="login-cypher.html?tab=signup" class="demo-firms-banner-link">Get Started for $39.99/mo \u2192</a>';
  header.insertAdjacentElement('afterend', banner);
}

function renderDemoFirmsList(filter, search) {
  filter = filter || getCurrentFilter();
  search = search || getCurrentSearch();

  const list = document.getElementById('firmsList');
  if (!list) return;

  injectDemoFirmsBanner();

  let filtered = PRESET_FIRMS;
  if (filter !== 'all') {
    filtered = filtered.filter(f => f.firm_category === filter);
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(f => f.name.toLowerCase().includes(q));
  }

  list.innerHTML = '';

  filtered.forEach((firm, i) => {
    const isLocked = i >= DEMO_PREVIEW_COUNT;
    const item = document.createElement('div');
    item.className = 'firm-item' + (isLocked ? ' firm-item--demo-locked' : ' firm-item--demo-preview');

    if (isLocked) {
      item.innerHTML = `
        <div class="firm-lock-overlay" title="Subscribe to unlock">
          <span class="firm-lock-icon">\u{1F512}</span>
          <span class="firm-lock-label">Subscribe to unlock</span>
        </div>
        <div class="firm-checkbox firm-checkbox--disabled" title="Available with full access">
          <span class="firm-checkbox-check">\u2713</span>
        </div>
        <div class="firm-info">
          <div class="firm-name">${firm.name}</div>
          <div class="firm-meta">${firm.firm_category === 'regional' && firm.coverage ? firm.coverage : categoryLabel(firm.firm_category)}</div>
        </div>
        <span class="firm-tag">${categoryLabel(firm.firm_category)}</span>
      `;
    } else {
      item.innerHTML = `
        <div class="firm-checkbox firm-checkbox--disabled" title="Available with full access">
          <span class="firm-checkbox-check">\u2713</span>
        </div>
        <div class="firm-info">
          <div class="firm-name">${firm.name}</div>
          <div class="firm-meta">${firm.firm_category === 'regional' && firm.coverage ? firm.coverage : categoryLabel(firm.firm_category)}</div>
        </div>
        <span class="firm-tag">${categoryLabel(firm.firm_category)}</span>
      `;
    }

    list.appendChild(item);
  });

  // Update count to show directory size
  const el = document.getElementById('selectedCount');
  if (el) el.textContent = PRESET_FIRMS.length + ' firms nationwide';

  // Disable action buttons in demo
  ['saveFirmsBtn', 'clearFirmsBtn', 'addCustomFirmBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = true;
      btn.style.cursor = 'not-allowed';
      btn.title = 'Available with full access';
    }
  });
}

// ── FIRM DETAIL PANEL ──
var _detailFirm = null;
var _detailData = null;

function openFirmDetail(firm, existingData) {
  _detailFirm = firm;
  _detailData = existingData;

  const modal = document.getElementById('firmDetailModal');
  if (!modal) return;

  document.getElementById('firmDetailName').textContent = firm.name;
  document.getElementById('firmDetailCategory').textContent = categoryLabel(firm.firm_category);
  document.getElementById('firmDetailCoverage').textContent = firm.coverage || '—';

  // Website
  const websiteEl = document.getElementById('firmDetailWebsite');
  if (firm.website) {
    websiteEl.innerHTML = '<a href="' + firm.website + '" target="_blank" rel="noopener">' + firm.website.replace(/^https?:\/\//, '') + '</a>';
  } else {
    websiteEl.textContent = '—';
  }

  // Contact
  document.getElementById('firmDetailContact').textContent = firm.contact_name || '—';

  // Email
  const emailEl = document.getElementById('firmDetailEmail');
  if (firm.contact_email && !firm.contact_email.startsWith('http')) {
    emailEl.innerHTML = '<a href="mailto:' + firm.contact_email + '">' + firm.contact_email + '</a>';
  } else if (firm.contact_email) {
    emailEl.innerHTML = '<a href="' + firm.contact_email + '" target="_blank" rel="noopener">Apply Online</a>';
  } else {
    emailEl.textContent = '—';
  }

  // Rates
  document.getElementById('firmDetailFreeMiles').textContent = existingData?.free_miles ?? '—';
  document.getElementById('firmDetailRate').textContent = existingData?.rate_per_mile ? '$' + existingData.rate_per_mile : '—';
  document.getElementById('firmDetailRoundTrip').textContent = existingData?.round_trip_default ? 'Yes' : 'No';

  modal.classList.add('active');
}

function closeFirmDetail() {
  document.getElementById('firmDetailModal')?.classList.remove('active');
  _detailFirm = null;
  _detailData = null;
}

function bindFirmDetailModal() {
  document.getElementById('firmDetailCloseBtn')
    ?.addEventListener('click', closeFirmDetail);

  document.getElementById('firmDetailRemoveBtn')
    ?.addEventListener('click', () => {
      if (!_detailFirm) return;
      pendingFirms = pendingFirms.filter(f => f.firm_id !== _detailFirm.firm_id);
      closeFirmDetail();
      renderFirmsList();
      updateSelectedCount();
    });

  document.getElementById('firmDetailEditBtn')
    ?.addEventListener('click', () => {
      if (!_detailFirm) return;
      const firm = _detailFirm;
      const data = _detailData;
      closeFirmDetail();
      currentFirmForModal = {
        firm_id:       firm.firm_id,
        name:          firm.name,
        firm_category: firm.firm_category,
        is_custom:     firm.is_custom || false
      };
      openRateModal(firm, data);
    });

  document.getElementById('firmDetailModal')
    ?.addEventListener('click', (e) => {
      if (e.target.id === 'firmDetailModal') closeFirmDetail();
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
      closeFirmDetail();
      closeCustomFirmModal();
    }
  });
}

// ── SAVE FIRMS ──
function bindFirmsList() {
  bindRateModal();
  bindFirmDetailModal();
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
      const renderer = IS_DEMO ? renderDemoFirmsList : renderFirmsList;
      renderer(getCurrentFilter(), e.target.value);
    });
}

// ── FIRM FILTER CHIPS ──
function bindFirmFilters() {
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const renderer = IS_DEMO ? renderDemoFirmsList : renderFirmsList;
      renderer(chip.dataset.filter, getCurrentSearch());
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

// ── DELETE ACCOUNT ──
function bindDeleteAccount() {
  document.getElementById('deleteAccountBtn')
    ?.addEventListener('click', () => {
      showConfirmModal(
        'Permanently delete your account? This cannot be undone.',
        async () => {
          try {
            await SettingsService.deleteAccount();
            window.location.replace('login-cypher.html');
          } catch (err) {
            showToast(err.message || 'Failed to delete account', 'error');
            console.error('deleteAccount error:', err);
          }
        }
      );
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

// ── HOME ADDRESS SYNC ──
// Writes the formatted address to localStorage so Mileage Cipher and Route Cipher
// can read it as the default starting location / home base.
function syncHomeAddress(fullAddress) {
  try {
    // Mileage Cipher reads homeLocation from mileage_cypher_settings_v2
    const mcKey = 'mileage_cypher_settings_v2';
    const mcSettings = JSON.parse(localStorage.getItem(mcKey) || '{}');
    mcSettings.homeLocation = fullAddress;
    localStorage.setItem(mcKey, JSON.stringify(mcSettings));

    // Also store in a shared key for Route Cipher
    localStorage.setItem('cipher_home_address', fullAddress);
    console.log('Home address synced to localStorage:', fullAddress);
  } catch (e) {
    console.error('Failed to sync home address:', e);
  }
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
    catastrophic: 'CAT',
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
