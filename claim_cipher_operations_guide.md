# Claim Cipher — Operations Guide

> Functional audit and video narration script for the Claim Cipher application.
> Generated 2026-03-05.

---

## Part 1 — Page-by-Page Element Audit

---

### 1. Login / Auth

**File:** `login-cypher.html` + `scripts/supabase-auth.js`
**PURPOSE:** Authenticate users, create accounts, reset passwords, or launch demo mode.

| # | Element | Action | Required | Status |
|---|---------|--------|----------|--------|
| 1 | Drop In / Sign Up tabs | Switch between login and signup panels | N | Working |
| 2 | Email input (login) | Enter email for sign-in | Y | Working |
| 3 | Password input (login) | Enter password for sign-in | Y | Working |
| 4 | Password visibility toggle (login) | Show/hide password text | N | Working |
| 5 | Remember Me checkbox | Toggles visual check state | N | **Stub** — value is never read by the sign-in flow |
| 6 | "Drop In" submit button | Signs in via Supabase Auth, redirects to Dashboard | Y | Working |
| 7 | "Forgot your cipher?" link | Opens password reset modal | N | Working |
| 8 | "Try Demo Mode" button (login) | Sets demo session flag, redirects to Dashboard | N | Working |
| 9 | Name input (signup) | Enter full name | Y | Working |
| 10 | Company input (signup) | Enter firm name | N | Working |
| 11 | License # input (signup) | Optional appraiser license | N | Working |
| 12 | Email input (signup) | Enter email for account creation | Y | Working |
| 13 | Password input (signup) | Create password | Y | Working |
| 14 | Password visibility toggle (signup) | Show/hide password text | N | Working |
| 15 | "I agree to Terms" checkbox | Must accept before signup | Y | Working |
| 16 | Terms of Service link | Opens Terms modal | N | Working |
| 17 | Privacy Policy link | Opens Privacy modal | N | Working |
| 18 | "Create Account" submit button | Creates account via Supabase Auth | Y | Working |
| 19 | "Try Demo Mode" button (signup) | Same as login demo button | N | Working |
| 20 | Password Reset modal — email input | Enter email for reset link | Y | Working |
| 21 | Password Reset modal — submit | Sends Supabase password reset email | Y | Working |
| 22 | Password Reset modal — close (×) | Closes modal | N | Working |
| 23 | Terms modal — close (×) | Closes Terms modal | N | Working |
| 24 | Privacy modal — close (×) | Closes Privacy modal | N | Working |

---

### 2. Dashboard (Command Center)

**File:** `command-center.html` + `scripts/command-center.js`
**PURPOSE:** Central hub showing stats, quick links to all modules, and a recent activity feed.

| # | Element | Action | Required | Status |
|---|---------|--------|----------|--------|
| 1 | Nav logo | Navigates to Dashboard | N | Working |
| 2 | Nav tabs (Dashboard, Routes, Mileage, My Routes, Total Loss, Settings) | Navigate to corresponding page | N | Working |
| 3 | `#userName` in nav | Displays user first name from Supabase profile | N | Working |
| 4 | "Claims Specialist" role text | Static text below user name | N | **Redundant** — hardcoded, never updated by billing tier |
| 5 | Logout button | Signs out via Supabase or clears demo session | N | Working |
| 6 | Live clock (`#clockTime`, `#clockDate`) | Ticks every second, shows current time and date | N | Working |
| 7 | Stat strip: Routes Calculated | Displays count from Supabase | N | Working |
| 8 | Stat strip: Miles Counted | Displays count from mileage logs | N | Working |
| 9 | Stat strip: Active Firms | Displays count of selected firms | N | Working |
| 10 | Stat strip: Total Loss Files | Displays TLS file count | N | Working |
| 11 | Route Cipher op-card | Link to route-cypher.html | N | Working |
| 12 | Mileage Cipher op-card | Link to mileage-cypher.html | N | Working |
| 13 | My Routes op-card | Link to my-routes.html | N | Working |
| 14 | Total Loss Studio op-card (wide banner) | Link to total-loss-studio.html | N | Working |
| 15 | Recent Activity feed (`#activityFeed`) | Renders recent user actions | N | Working |
| 16 | Quick Action: New Route | Link to route-cypher.html | N | Working |
| 17 | Quick Action: Upload Estimate | Link to total-loss-studio.html | N | Working |
| 18 | Quick Action: Log Mileage | Link to my-routes.html | N | Working |
| 19 | Quick Action: Export Billing | Link to mileage-cypher.html | N | Working |
| 20 | `.module-card` click listener (JS) | Listens for clicks on `.module-card` elements | — | **Broken** — HTML uses `.op-card`, not `.module-card`; listener never matches |
| 21 | Keyboard shortcuts (Ctrl+1–4, Ctrl+S, Ctrl+T, Ctrl+H) | Navigate to modules via keyboard | N | **Broken** — targets old page URLs (`jobs-studio.html`, `firms-directory.html`, `settings-booth.html`, `functionality-test.html`) that no longer exist |

---

### 3. Route Cipher

**File:** `route-cypher.html` + `scripts/route-cipher.js`
**PURPOSE:** Build multi-stop routes, optimize with Google Maps, visualize on map, and save to My Routes.

| # | Element | Action | Required | Status |
|---|---------|--------|----------|--------|
| 1 | Starting Location input (`#startLocation`) | Enter home base / starting address (auto-saved) | Y | Working |
| 2 | Destination address inputs (dynamic list) | Enter each stop address | Y | Working |
| 3 | "Add Stop" button (`#addDestination`) | Adds a new destination input row (max 15) | N | Working |
| 4 | Remove (✕) button per destination | Removes that destination row | N | Working |
| 5 | Stop count badge (`#stopCountBadge`) | Shows current stop count in header | N | Working |
| 6 | Stop limit bar (`#limitFill`) | Visual fill bar 0–15 | N | Working |
| 7 | Intelligent Day Splitting toggle (`#daySplit`) | Enables automatic multi-day splitting | N | Working |
| 8 | Return to Start toggle (`#returnStart`) | Adds return leg to starting location | N | Working |
| 9 | Avoid Highways toggle (`#avoidHighways`) | Routes via local roads only | N | Working |
| 10 | "Optimize Route" button (`#optimizeRoute`) | Runs Google Maps optimization | Y | Working |
| 11 | "Clear Saved Routes" button | Clears stored route data from localStorage | N | Working |
| 12 | Route Preview map (`#routeMap`) | Live Google Maps render of current route | N | Working |
| 13 | Route Summary panel (sumStops, sumDistance, sumTime, sumDays, sumSplit, sumReturn) | Live stats from current inputs/result | N | Working |
| 14 | Saved Starts panel — Home Office row | Hover effect only, displays "Use →" | N | **Stub** — no click handler wired; clicking does nothing |
| 15 | Saved Starts panel — Field Office row | Hover effect only, displays "Use →" | N | **Stub** — no click handler wired; clicking does nothing |
| 16 | Results section (`#routeResults`) — shown after optimization | Displays route analysis with day breakdown | N | Working |
| 17 | Copy button (`#copyRoute`) | Copies route text to clipboard | N | Working |
| 18 | Mileage button (`#exportMiles`) | Exports mileage data | N | Working |
| 19 | "Save to My Routes" button (`#saveToMyRoutes`) | Opens Save Route modal | N | Working |
| 20 | Google Calendar export (`#exportGoogleCal`) | Calendar export (disabled until times set) | N | Working |
| 21 | Apple Calendar export (`#exportAppleCal`) | Calendar export (disabled until times set) | N | Working |
| 22 | Mobile Cipher button (`#exportMobileCipher`) | Mobile-friendly export | N | Working |
| 23 | Fixed footer: "Clear All" button | Same as Clear Saved Routes | N | Working |
| 24 | Fixed footer: "Save Draft" button | Opens save modal without optimization | N | Working |
| 25 | Fixed footer: "Optimize Route →" button | Triggers #optimizeRoute click | N | Working |
| 26 | **Route Map Modal** — Day tabs (`#dayTabs`) | Switch between multi-day route views | N | Working |
| 27 | Route Map Modal — Map/Satellite toggle buttons | Toggle map type | N | **Stub** — buttons rendered but no event handlers attached |
| 28 | Route Map Modal — Efficiency badge | Displays route efficiency percentage | N | Working |
| 29 | Route Map Modal — Stop sequence timeline (`#modalTimeline`) | Lists stops in order with distances | N | Working |
| 30 | Route Map Modal — "Edit Day" button | Opens edit mode for the active day's route | N | Working |
| 31 | Route Map Modal — "Save Route" button | Opens save day modal (`showSaveDayModal()`) | N | Working |
| 32 | Route Map Modal — "Export Schedule →" button | Fires `showSaveDayModal()` | N | **Redundant** — calls the exact same function as "Save Route" |
| 33 | Route Map Modal — Close (✕) button | Closes the modal | N | Working |
| 34 | **Cluster Override Modal** — "Split Into Separate Days" | Splits clustered stops into different days | N | Working |
| 35 | Cluster Override Modal — "Keep Together" | Keeps clustered stops on same day | N | Working |
| 36 | **Save Route Modal** — Route Date input | Optional date for the saved route | N | Working |
| 37 | Save Route Modal — Summary preview | Shows start, end, total miles | N | Working |
| 38 | Save Route Modal — "Save Route" confirm | Saves route to Supabase via RouteService | Y | Working |
| 39 | Save Route Modal — Cancel | Closes modal | N | Working |
| 40 | Hidden defaults (optimizeEnabled, splitEnabled, maxLegMiles, etc.) | Hidden inputs read by JS for optimization config | N | Working |

---

### 4. Mileage Cipher

**File:** `mileage-cypher.html` + `scripts/mileage-cypher-combined.js`
**PURPOSE:** Calculate billable mileage for insurance claims with firm-specific rates and free-mile deductions.

| # | Element | Action | Required | Status |
|---|---------|--------|----------|--------|
| 1 | Header badges: Session Miles, Entries, Billed | Live session stats | N | Working |
| 2 | Firm Select dropdown (`#firmSelect`) | Choose insurance firm (loads rate + free miles) | Y | Working |
| 3 | Rate strip: Rate per Mile, Free Miles, This Session | Displays firm billing parameters | N | Working |
| 4 | "Manage firms in Settings" link | Navigates to settings.html | N | Working |
| 5 | Starting Location input (`#pointA`) | Enter starting address (auto-saved as home base) | Y | Working |
| 6 | Destination input (`#pointB`) | Enter destination address | Y | Working |
| 7 | Distance input (`#distanceMiles`) | Auto-filled by Google Maps or manual entry | Y | Working |
| 8 | Distance status indicator (`#distDot`, `#distanceStatus`) | Shows auto-calculating / ready state | N | Working |
| 9 | Billing preview: Billable Amount, formula, free miles note | Live billing math display | N | Working |
| 10 | "Copy Math" button (`#copyMathBtn`) | Copies billing formula to clipboard | N | Working |
| 11 | Round Trip toggle (`#roundTrip`) | Doubles distance for billing | N | Working |
| 12 | Auto-Calculate toggle (`#autoCalculateToggle`) | Enable/disable auto-calc on input | N | Working |
| 13 | Note field (`#noteField`) | Optional note for the mileage entry | N | Working |
| 14 | Session Log panel (`#sessionLogList`) | Displays last 7 calculation entries | N | Working |
| 15 | "CLEAR SESSION" button (`#clearSessionBtn`) | Clears all session log entries (with confirmation) | N | Working |
| 16 | Session Total display (`#sessionTotal`) | Running total of session miles | N | Working |
| 17 | Footer: "Clear Entry" button | Resets current calculation form | N | Working |
| 18 | Footer: "Calculate Mileage" button (`#calculateBtn`) | Performs calculation and shows billing modal | Y | Working |
| 19 | **Billing Modal** — Breakdown display | Shows detailed billing breakdown | N | Working |
| 20 | Billing Modal — Total display | Shows total billable amount | N | Working |
| 21 | Billing Modal — "Copy for Billing" button (`#copyBtn`) | Copies billing text to clipboard | N | Working |
| 22 | Billing Modal — "New Calculation" button (`#newCalculation`) | Resets form for new entry | N | Working |
| 23 | Billing Modal — Close (×) button | Closes billing modal | N | Working |
| 24 | **Route Import Modal** — Import button | Imports distance from Route Cipher data | N | Working |
| 25 | Route Import Modal — Cancel button | Closes import modal | N | Working |
| 26 | Maps Unavailable notice | Shown when Google Maps API is not configured | N | Working |

---

### 5. My Routes

**File:** `my-routes.html` + `scripts/my-routes.js`
**PURPOSE:** Manage the lifecycle of saved routes — activate, close (log mileage), void, delete, and export CSV.

| # | Element | Action | Required | Status |
|---|---------|--------|----------|--------|
| 1 | Header badges: Total Routes, Closed, Open, Total Miles | Summary stats from all routes | N | Working |
| 2 | Filter: From Date (`#dateFromFilter`) | Date range start filter | N | Working |
| 3 | Filter: To Date (`#dateToFilter`) | Date range end filter | N | Working |
| 4 | Status pills: All, Open, Closed, Void | Client-side status filter | N | Working |
| 5 | "Clear" filter button (`#clearFilters`) | Resets all filters and reloads | N | Working |
| 6 | "Apply Filter" button (`#applyFilters`) | Re-fetches routes with date filters | N | Working |
| 7 | Routes count label (`#routeCount`) | Shows filtered count | N | Working |
| 8 | "Export Mileage CSV" button (`#exportCsvBtn`) | Opens export modal | N | Working |
| 9 | Route cards — rendered dynamically | Each card shows date, addresses, miles, status badge | N | Working |
| 10 | Route card: "Close Route" button (open routes) | Opens Close Route confirmation modal | N | Working |
| 11 | Route card: "Delete" button (open routes) | Deletes route with confirmation | N | Working |
| 12 | Route card: "Activate" button (draft routes) | Activates a draft route | N | Working |
| 13 | Route card: "Logged" badge (closed routes) | Disabled button showing route is closed | N | Working |
| 14 | Route card: "Void" button (closed routes) | Opens Void Log confirmation modal | N | Working |
| 15 | Totals strip: Total Routes, Total Miles, Closed/Export Ready, Avg Miles/Route | Aggregate stats | N | Working |
| 16 | `handleEditRoute()` function in JS | Implemented — stores edit payload and redirects to Route Cipher | — | **Stub** — no Edit button is rendered in route card UI |
| 17 | **Close Route Modal** — route summary | Shows date, addresses, miles | N | Working |
| 18 | Close Route Modal — "Close Route & Log Mileage" | Closes route and creates mileage log | Y | Working |
| 19 | Close Route Modal — Cancel | Closes modal | N | Working |
| 20 | **Void Log Modal** (dynamic) — route summary | Shows date, addresses, miles | N | Working |
| 21 | Void Log Modal — "Void Log" | Voids the mileage log (excluded from exports) | N | Working |
| 22 | Void Log Modal — Cancel | Closes modal | N | Working |
| 23 | **Export Modal** — From Date (`#exportDateFrom`) | Export date range start | N | Working |
| 24 | Export Modal — To Date (`#exportDateTo`) | Export date range end | N | Working |
| 25 | Export Modal — Preview summary (`#exportSummary`) | Shows route count and total miles for range | N | Working |
| 26 | Export Modal — "Download CSV" (`#confirmExportBtn`) | Generates and downloads CSV file | Y | Working |
| 27 | Export Modal — Cancel | Closes modal | N | Working |

---

### 6. Total Loss Studio

**File:** `total-loss-studio.html` + `modules/total-loss-v2/total-loss-studio.js`
**PURPOSE:** Upload CCC estimates, auto-parse vehicle and claim data, generate BCIF forms and claim summaries.

| # | Element | Action | Required | Status |
|---|---------|--------|----------|--------|
| 1 | Drop zone (`#dropzone`) | Drag-and-drop or click to select PDF | Y | Working |
| 2 | "Browse Files" button (`#browseBtn`) | Opens native file picker | Y | Working |
| 3 | File info display (name, size) | Shows selected file details | N | Working |
| 4 | "Process Estimate →" button (`#proceedBtn`) | Triggers PDF extraction and parsing pipeline | Y | Working |
| 5 | "Remove file" button (`#cancelBtn`) | Clears selected file, resets drop zone | N | Working |
| 6 | Specs row: Accepted Source, Output, Processing time | Static informational labels | N | Working |
| 7 | Recent Estimates strip (`#historyItems`) | Intended to show recent estimate history | N | **Stub** — renders empty container, never populated |
| 8 | Processing animation (stages 0–4) | Animated progress indicator during parsing | N | Working |
| 9 | **Summary View** — Carrier input (`#sv-carrier`) | Editable carrier name (syncs to state) | N | Working |
| 10 | Summary View — Claim Number input (`#sv-claimNumber`) | Editable claim number | N | Working |
| 11 | Summary View — Adjuster input (`#sv-adjuster`) | Editable adjuster name | N | Working |
| 12 | Summary View — Year / Make / Model inputs | Editable vehicle info | N | Working |
| 13 | Summary View — VIN input (`#sv-vin`) | Editable VIN | N | Working |
| 14 | Summary View — Additional Notes input | Editable notes field | N | Working |
| 15 | Summary View — Options checkboxes | Toggle vehicle options for BCIF form | N | Working |
| 16 | Summary View — Condition rating rows | Granular condition slider/selectors | N | Working |
| 17 | Summary View — Damage assessment textareas (structural, body panels, restraints, interior) | Editable damage descriptions | N | Working |
| 18 | Summary View — Individual clear buttons per damage field | Clears one damage field | N | Working |
| 19 | Summary View — "Clear All" damage button (`#damageClearAllBtn`) | Clears all damage fields | N | Working |
| 20 | Summary View — "Re-parse" damage button (`#damageReParseBtn`) | Re-populates damage from parsed estimate | N | Working |
| 21 | Summary View — Accordion sections | Expand/collapse summary sections | N | Working |
| 22 | "Download BCIF Form" button (`#sv-download`) | Generates and downloads BCIF DOCX | Y | Working |
| 23 | "Download Claim Summary" button (`#tls-download-summary`) | Generates and downloads Claim Summary DOCX | N | Working |
| 24 | "Reset" button (`#sv-reset`) | Clears all state and returns to drop zone | N | Working |

---

### 7. Settings

**File:** `settings.html` + `scripts/settings-page.js` + `scripts/settings-manager.js`
**PURPOSE:** Manage user profile, home address, firm assignments, password, and account.

| # | Element | Action | Required | Status |
|---|---------|--------|----------|--------|
| 1 | Sidebar: Profile link | Scrolls to Profile section | N | Working |
| 2 | Sidebar: My Firms link | Scrolls to Firms section | N | Working |
| 3 | Sidebar: Password link | Scrolls to Password section | N | Working |
| 4 | Sidebar: Account link | Scrolls to Account (Danger Zone) section | N | Working |
| 5 | First Name input (`#firstName`) | Edit first name | N | Working |
| 6 | Last Name input (`#lastName`) | Edit last name | N | Working |
| 7 | Company Name input (`#companyName`) | Edit business name | N | Working |
| 8 | License # input (`#licenseNumber`) | Edit appraiser license | N | Working |
| 9 | Phone Number input (`#phoneNumber`) | Edit phone | N | Working |
| 10 | Email input (`#emailAddress`) | Display/edit email | N | Working |
| 11 | "Update Email" button (`#updateEmailBtn`) | Sends Supabase email change confirmation | N | Working |
| 12 | "Save Profile" button (`#saveProfileBtn`) | Saves profile to Supabase | Y | Working |
| 13 | "Cancel" profile button (`#cancelProfileBtn`) | Reloads profile data from server | N | Working |
| 14 | Street Address input (`#streetAddress`) | Edit home address | N | Working |
| 15 | City input (`#cityField`) | Edit city | N | Working |
| 16 | State input (`#stateField`) | Edit state (2 char) | N | Working |
| 17 | ZIP input (`#zipField`) | Edit ZIP code | N | Working |
| 18 | "Save Address" button (`#saveAddressBtn`) | Saves address to Supabase + syncs to localStorage | Y | Working |
| 19 | "Cancel" address button (`#cancelAddressBtn`) | Reloads address from server | N | Working |
| 20 | Firm search input (`#firmSearch`) | Filter firms list by name | N | Working |
| 21 | Firm category chips: All, Daily Auto, CAT, Regional | Filter firms by category | N | Working |
| 22 | Firm list (`#firmsList`) | Clickable list of preset + custom firms | N | Working |
| 23 | Firm item click — if unselected | Opens Rate Modal to set rates before adding | N | Working |
| 24 | Firm item click — if selected | Deselects (removes) the firm | N | Working |
| 25 | Selected count label (`#selectedCount`) | Shows "X firms selected" | N | Working |
| 26 | "Clear all" firms link (`#clearFirmsBtn`) | Deselects all firms | N | Working |
| 27 | "Add firm not on list" button (`#addCustomFirmBtn`) | Opens Custom Firm modal | N | Working |
| 28 | "Save Firms" button (`#saveFirmsBtn`) | Saves firm assignments to Supabase + syncs FirmStore | Y | Working |
| 29 | **Rate Modal** — Free Miles input | Set free miles for firm | N | Working |
| 30 | Rate Modal — Rate Per Mile input | Set $/mile for firm | N | Working |
| 31 | Rate Modal — Round Trip default checkbox | Toggle round-trip default | N | Working |
| 32 | Rate Modal — "Add Firm" button | Adds firm with rates to pending list | N | Working |
| 33 | Rate Modal — "Skip for now" | Adds firm with $0 rates | N | Working |
| 34 | Rate Modal — "Cancel" | Closes modal without adding | N | Working |
| 35 | **Custom Firm Modal** — Firm Name input | Enter custom firm name | Y | Working |
| 36 | Custom Firm Modal — Category select | Choose category | N | Working |
| 37 | Custom Firm Modal — "Next: Set Rates" | Closes custom modal, opens Rate Modal | N | Working |
| 38 | Custom Firm Modal — "Cancel" | Closes modal | N | Working |
| 39 | Current Password input (`#currentPassword`) | Enter current password | Y | Working |
| 40 | New Password input (`#newPassword`) | Enter new password (8+ chars) | Y | Working |
| 41 | Confirm Password input (`#confirmPassword`) | Confirm new password | Y | Working |
| 42 | Password strength bars | Visual strength indicator | N | Working |
| 43 | "Update Password" button (`#updatePasswordBtn`) | Changes password via Supabase | Y | Working |
| 44 | Delete Account button (`#deleteAccountBtn`) | Intended to delete user account | Y | **Broken** — no event listener wired in settings-page.js |
| 45 | `settings-manager.js` — entire class | Targets IDs: `saveSettingsBtn`, `resetToDefaultsBtn`, `exportDataBtn`, `importDataBtn`, `clearCacheBtn`, `resetAllBtn`, `calendarSystem`, `territoryType`, `homeBaseLocation` | — | **Broken / Orphaned** — none of these IDs exist in the current settings.html; the class instantiates but all listeners are no-ops |

---

## Part 2 — Core Workflow Walkthroughs

---

### Workflow 1: Running a Route

**Route Cipher → Optimize → Save → My Routes**

Welcome to Route Cipher. This is where you plan and optimize your daily inspection routes.

Start by entering your home address in the "Starting Location" field at the top. This address is saved between sessions, so you only need to enter it once. If you've set a home address in Settings, it will auto-fill here.

Next, add your inspection stops. Type each destination address into the destination fields. Click "Add Stop" to add more — you can add up to 15 stops per route. Each destination has a small "X" button to remove it if you make a mistake.

Before optimizing, check the Route Options panel on the left side. You can toggle "Intelligent Day Splitting" on if you have a lot of stops and want the system to automatically split them across multiple days. Turn on "Return to Start" if you need a round-trip back to your home address. If you prefer back roads, flip on "Avoid Highways."

The right side shows a live Route Summary: how many stops you have, and later, estimated distance and drive time. Below that is a Route Preview map that will display your route after optimization.

When your stops are ready, click the "Optimize Route" button. The system sends your addresses to Google Maps, calculates the most efficient order, and renders the optimized route on the map. If day splitting is enabled and your stops exceed the daily limit, a Route Map Modal opens showing each day as a separate tab. You can click the day tabs to view each day's stops and map.

Inside the Route Map Modal, you'll see the stop sequence on the left and the map on the right. The footer shows total distance, drive time, number of days, and stop count. Click "Save Route" to save this route to My Routes. You'll be prompted for an optional date — enter the date you plan to drive this route, then confirm.

After saving, you'll see a confirmation asking if you want to jump over to My Routes. That's where you manage the route going forward — closing it when you've completed your inspections to log the mileage for tax purposes.

You can also use the fixed footer bar at the bottom of the page for quick access to "Clear All," "Save Draft," or "Optimize Route" without scrolling.

---

### Workflow 2: Logging Mileage

**Mileage Cipher → Calculate → Billing Modal → Session Log**

Mileage Cipher is your calculator for billable mileage on individual claim inspections.

First, select an insurance firm from the dropdown at the top. If you don't see your firms listed, click the "Manage firms in Settings" link to add them. Once selected, the Rate Strip below the dropdown shows the firm's rate per mile, free miles (deductible distance not billed), and your running session total.

Enter your starting address in the "Starting Location" field. If you've set a home address in Settings, it auto-fills here. Then enter the claim inspection address in the "Destination" field. If Google Maps is available, the distance will auto-calculate in the "Distance (Miles)" field and the status dot will turn green. If Maps is unavailable, you'll see a notice at the top of the page — just type the distance manually.

The billing preview below the distance field updates in real time. It shows the billable amount after subtracting free miles, along with the calculation formula. For example: "32.5mi - 10 free = 22.5 x $0.67."

Under Logging Options, toggle "Round Trip" if you're billing the return trip as well (it doubles the distance). "Auto-Calculate" is on by default — it recalculates as you type. You can add an optional note describing the trip purpose.

When ready, click "Calculate Mileage" in the footer. The Billing Modal opens with a full breakdown. Use "Copy for Billing" to copy the billing text to your clipboard for pasting into your billing system. Click "New Calculation" to reset and enter the next trip.

Every calculation is logged in the Session Log panel on the right. It shows your last 7 entries with destination, miles, and billable amount. The session total is displayed at the bottom. Use "Clear Session" at the top of the log to start fresh. The "Clear Entry" button in the footer resets only the current form without affecting the session log.

---

### Workflow 3: Viewing and Managing Saved Routes

**My Routes → Filter → Close → Export CSV → Delete**

My Routes is your route lifecycle manager. Routes appear here after you save them from Route Cipher.

The page loads all your routes from the server and displays header badges showing total routes, closed count, open count, and total miles. Each route appears as a card showing the date, start/end addresses, number of stops, total miles, and a status badge (Open, Closed, or Void).

Use the filter bar at the top to narrow your view. Set a date range with the From and To date fields, then click "Apply Filter." Or use the status pills — click "Open" to see only active routes, "Closed" for finalized routes, or "Void" for voided entries. Click "All" or use the "Clear" button to reset.

For open routes, you'll see two action buttons: "Close Route" and "Delete."

Closing a route creates a finalized mileage log for tax and billing purposes. Click "Close Route" to open a confirmation modal showing the route summary. Confirm to lock the route and create the mileage log. Once closed, the route shows a "Logged" badge and the miles count toward your export totals.

If you closed a route by mistake, click the "Void" button on a closed route. This opens a confirmation modal — voiding removes the entry from exports and totals but keeps it visible for audit purposes. Voided routes show a "Void" badge.

To export your mileage logs, click "Export Mileage CSV" in the routes header. The export modal opens with date range fields auto-set to your earliest and latest closed routes. Adjust the range as needed — the preview updates to show how many routes and total miles will be included. Click "Download CSV" to generate an IRS-ready mileage log file with columns for date, route reference, addresses, miles, stops, and business purpose.

To delete a route permanently, click "Delete" on an open route and confirm the action. Closed routes cannot be deleted — they must be voided instead.

---

### Workflow 4: Processing a Total Loss Estimate

**Total Loss Studio → Upload PDF → Verify Summary → Download BCIF + Claim Summary**

Total Loss Studio processes CCC ONE estimate PDFs and generates two professional documents: a BCIF (Basis for Claim Inspection Form) and a Claim Summary.

Start by uploading an estimate. Either drag a PDF file onto the drop zone or click "Browse Files" to select one from your computer. The accepted format is PDF from CCC ONE. Once selected, you'll see the file name and size displayed with a "Process Estimate" button and a "Remove file" option.

Click "Process Estimate" to start the pipeline. A processing animation shows five stages: extracting text, parsing CCC data, building the claim summary, generating the BCIF token map, and rendering the summary view. This takes about 4 seconds.

When processing completes, you'll see the Summary View — a detailed breakdown of everything the system parsed from your estimate. At the top, the claim number and vehicle information are displayed.

The summary has collapsible accordion sections. Review each one:

- **Claim Details:** Carrier, claim number, and adjuster fields. All are editable — if the parser missed something, type it in directly.
- **Vehicle Information:** Year, make, model, and VIN. Edit as needed.
- **Vehicle Options:** Checkboxes for features detected from the estimate (power windows, A/C, etc.). Toggle any the parser missed or incorrectly identified.
- **Condition Rating:** Granular sliders for each condition category. Adjust to match your inspection findings.
- **Damage Assessment:** Four text areas covering structural, body panels, restraints, and interior damage. The parser pre-fills these from the estimate data. Edit freely, or click "Re-parse" to restore the original parsed values. "Clear All" empties all four fields.
- **Additional Notes:** A free-text field for any notes you want on the form.

When you're satisfied with the data, use the two download buttons at the bottom:

- **"Download BCIF Form"** generates a DOCX file pre-filled with your data, ready to submit.
- **"Download Claim Summary"** generates a professional narrative summary document.

Click "Reset" to clear everything and start over with a new estimate.

---

### Workflow 5: Settings and Profile

**Profile Fields → My Firms → Password → Address**

The Settings page is organized into sections with a sidebar for quick navigation. Click any sidebar link to scroll to that section.

**Profile Information:** Enter your first name, last name, business name, appraiser license number, phone, and email. Click "Save Profile" to save to your account. The first name you enter will appear in the nav bar across all pages. To change your login email, enter the new address and click "Update Email" — a confirmation link will be sent to the new address. Click "Cancel" to discard changes and reload from the server.

**Home Address:** Enter your street address, city, state, and ZIP. Click "Save Address" to save. This address is automatically synced to Route Cipher and Mileage Cipher as your default starting location, so you don't have to re-enter it every time.

**My Firms:** This is where you manage which insurance firms you work with and their billing rates. The firm list shows 43 preset firms across three categories: Daily Auto, Catastrophic (CAT), and Regional. Use the category chips to filter, or type in the search box to find a specific firm.

Click a firm to add it. A Rate Modal opens where you set the free miles and rate per mile for that firm, plus an optional round-trip default. Click "Add Firm" to confirm, or "Skip for now" to add with $0 rates. To add a firm not on the list, click "Add firm not on list" — enter the name, choose a category, then set rates.

To remove a firm, click it again in the list — it deselects immediately. Use "Clear all" to remove all firms at once. When you're done, click "Save Firms" to push your selections to the server. Your firms will then appear in Mileage Cipher's dropdown.

**Change Password:** Enter your current password, then your new password (minimum 8 characters), and confirm it. A strength meter shows four bars that fill as you add length, uppercase, numbers, and special characters. Click "Update Password" to save.

**Danger Zone (Account):** The Delete Account button is displayed but currently not functional — clicking it does nothing.

---

## Part 3 — Redundancy Report

---

### Broken / Dead

| Item | Location | Issue |
|------|----------|-------|
| Delete Account button (`#deleteAccountBtn`) | `settings.html:228` | Button is rendered in the Danger Zone section but no event listener is wired in `settings-page.js`. Clicking does nothing. |
| `settings-manager.js` — entire class | `scripts/settings-manager.js` | The `SettingsManager` class instantiates on load and targets element IDs that do not exist in the current `settings.html`: `saveSettingsBtn`, `resetToDefaultsBtn`, `exportDataBtn`, `importDataBtn`, `clearCacheBtn`, `resetAllBtn`, `calendarSystem`, `territoryType`, `homeBaseLocation`. All listeners bind to null and are no-ops. The class is fully orphaned. |
| `cipher-core.js` `initializeCipherUserContext()` | `scripts/cipher-core.js:5–31` | Targets `#user-name`, `#user-role`, `#user-avatar` — none of these IDs exist in the current nav HTML (which uses `#userName` and has no role/avatar elements). Also references an undefined `userType` variable on line 11. |
| `cipher-core.js` `applyBillingRole()` | `scripts/cipher-core.js:33–50` | Targets `#user-role` which does not exist in any current page HTML. The function executes without effect. |
| `command-center.js` `.module-card` click listener | `scripts/command-center.js:27` | Queries `.module-card` elements but the Dashboard HTML uses `.op-card`. The listener never matches any elements. |
| `command-center.js` keyboard shortcuts | `scripts/command-center.js:51–64` | Ctrl+3 navigates to `jobs-studio.html`, Ctrl+4 to `firms-directory.html`, Ctrl+S to `settings-booth.html`, Ctrl+T to `functionality-test.html` — none of these pages exist in the current app. |

### Stubs / Placeholders

| Item | Location | Issue |
|------|----------|-------|
| Saved Starts panel (Home Office / Field Office) | `route-cypher.html:286–302` | Two rows with hover effects and "Use →" text but no click handlers. They look interactive but do nothing when clicked. |
| Map / Satellite toggle buttons | `route-cypher.html:371–372` | Two buttons in the Route Map Modal map controls area. They are rendered but have no event handlers — clicking them does nothing. |
| Recent Estimates strip (`#historyItems`) | `total-loss-studio.js` (renderDropZone) | The "Recent" history section renders an empty `#historyItems` container. No code ever populates it with data. |
| Remember Me checkbox | `login-cypher.html:77–85` | Visual-only toggle. The hidden `#remember-cipher` checkbox value is toggled by `toggleRemember()` but is never read by the sign-in handler. |
| `handleEditRoute()` | `scripts/my-routes.js:460–476` | Full implementation exists — stores edit payload to localStorage and redirects to Route Cipher. However, no "Edit" button is rendered in `renderRouteActions()`, so the function is unreachable from the UI. |

### Redundant / Confusing

| Item | Location | Issue |
|------|----------|-------|
| "Export Schedule →" button vs "Save Route" button | `route-cypher.html:408–409` | Both buttons in the Route Map Modal footer call the same function: `window.routeCipher.showSaveDayModal()`. Having two buttons that do the same thing is confusing — users expect "Export Schedule" to produce a calendar export, not a save dialog. |
| `settings-manager.js` functions (export, import, clearCache, resetAll) | `scripts/settings-manager.js:193–298` | Four data management functions exist in the orphaned `SettingsManager` class. They are unreachable since no buttons in `settings.html` target them. |
| Nav user role "Claims Specialist" | All page HTML nav sections | Hardcoded text that appears below the user name. It never changes based on billing tier (basic/pro/demo) despite `applyBillingRole()` existing in `cipher-core.js`. |
