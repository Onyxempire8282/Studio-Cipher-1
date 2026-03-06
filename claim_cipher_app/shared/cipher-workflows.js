/**
 * Claim Cipher Workflow Knowledge Base
 * Powers the Echo help assistant with structured workflow data.
 */
const claimCipherWorkflows = [
  {
    title: "Route Cipher \u2013 Running a Route",
    entry_point: "Route Cipher page",
    keywords: ["route", "optimize", "stops", "directions"],
    steps: [
      "Enter your starting address",
      "Add inspection stops (up to 15)",
      "Configure route options (day splitting, return to start, avoid highways)",
      "Click Optimize Route",
      "Review the optimized route in the Route Map",
      "Save route to My Routes"
    ],
    system_behavior: [
      "Uses Google Maps API for optimization",
      "Supports up to 15 stops per route",
      "Optional intelligent day splitting for large stop counts",
      "Optional return-to-start routing"
    ],
    outputs: ["Saved route in My Routes", "Distance and drive time calculation", "Mileage available for logging"]
  },
  {
    title: "Mileage Cipher \u2013 Logging Mileage",
    entry_point: "Mileage Cipher page",
    keywords: ["mileage", "log", "calculate", "billing", "session", "miles"],
    steps: [
      "Select your insurance firm from the dropdown",
      "Enter your starting location",
      "Enter the inspection destination address",
      "Verify the auto-calculated distance",
      "Toggle round trip if billing both directions",
      "Click Calculate Mileage to log the entry"
    ],
    system_behavior: [
      "Uses Google Maps API when available \u2014 manual entry allowed if Maps is unavailable",
      "Firm billing rates and free miles applied automatically",
      "Session log stores your last 7 entries",
      "Session total updates with each logged entry"
    ],
    outputs: ["Billable mileage calculation", "Copyable billing formula text", "Running session total"]
  },
  {
    title: "My Routes \u2013 Managing Routes",
    entry_point: "My Routes page",
    keywords: ["export", "csv", "close route", "void", "manage"],
    steps: [
      "View all saved routes",
      "Filter by date range or status (Open, Closed, Void)",
      "Close a route to finalize and log its mileage",
      "Export closed routes as a mileage CSV",
      "Void a closed route if it needs to be excluded",
      "Delete an open route if it was created by mistake"
    ],
    system_behavior: [
      "Closed routes cannot be deleted \u2014 void them instead",
      "Voided routes remain visible for audit history",
      "CSV export generates IRS-ready mileage logs",
      "Footer stats update automatically after any action"
    ],
    outputs: ["Mileage CSV export", "Tax-compliant mileage records"]
  },
  {
    title: "Total Loss Studio \u2013 Processing CCC Estimates",
    entry_point: "Total Loss Studio page",
    keywords: ["total loss", "ccc", "estimate", "bcif", "claim summary", "upload", "pdf"],
    steps: [
      "Upload a CCC ONE estimate PDF via drag-and-drop or Browse Files",
      "Click Process Estimate",
      "Review the parsed claim and vehicle information in the Summary View",
      "Adjust vehicle options checkboxes as needed",
      "Set condition ratings and edit damage narratives",
      "Download the BCIF Form or Claim Summary document"
    ],
    system_behavior: [
      "Processing pipeline takes approximately 4 seconds",
      "Automatically extracts claim number, VIN, vehicle info, and options",
      "All summary fields are editable before download",
      "Recent estimates are saved for quick reload"
    ],
    outputs: ["Filled BCIF DOCX form", "Professional claim summary document"]
  },
  {
    title: "Settings \u2013 Account Configuration",
    entry_point: "Settings page",
    keywords: ["settings", "firms", "rates", "address", "profile", "password"],
    steps: [
      "Enter your profile information and save",
      "Set your home address \u2014 it auto-fills Route and Mileage tools",
      "Add insurance firms from the firm list",
      "Set free miles and rate per mile for each firm",
      "Click Save Firms to push changes to your account"
    ],
    system_behavior: [
      "Home address syncs automatically to Route Cipher and Mileage Cipher",
      "Saved firms populate the Mileage Cipher dropdown",
      "Firm rates directly affect all billable mileage calculations"
    ],
    outputs: ["Saved user profile", "Configured firm billing rates", "Home address synced across tools"]
  }
];
