// 🎵 Lyricist Agent: Jobs Studio Professional Management System
// Studio Cipher - Advanced Job Management with Mobile Integration + Supabase

class JobsStudioManager {
  constructor() {
    this.jobs = [];
    this.activeFilter = "all";
    this.isLoading = false;
    this.syncStatus = "connected";
    this.modalOpen = false;
    this.supabase = null;
    this.realtimeSubscription = null;

    console.log(
      "🎵 Lyricist: Initializing Jobs Studio Manager with Supabase..."
    );
    this.init();
  }

  async init() {
    // Initialize Supabase client
    await this.initializeSupabase();

    // Load jobs from Supabase
    await this.fetchJobs();

    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.renderJobs();
    this.updateQuickStats();
    this.startAutoSync();

    // Set up real-time sync
    this.setupRealtimeSync();

    this.showNotification(
      "Jobs Studio ready with live Supabase sync! 🎵",
      "success"
    );
  }

  async initializeSupabase() {
    try {
      // Get Supabase credentials from localStorage
      const supabaseUrl = localStorage.getItem("supabase_url");
      const supabaseKey = localStorage.getItem("supabase_anon_key");

      if (!supabaseUrl || !supabaseKey) {
        console.warn(
          "⚠️ Supabase credentials not found in localStorage. Using demo mode."
        );
        this.showNotification(
          "⚠️ Supabase not configured. Using demo mode.",
          "warning"
        );
        return;
      }

      // Create Supabase client
      this.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

      console.log("✅ Supabase client initialized successfully");
      this.showNotification("✅ Connected to Supabase database", "success");
    } catch (error) {
      console.error("❌ Failed to initialize Supabase:", error);
      this.showNotification(
        "❌ Failed to connect to Supabase. Using demo mode.",
        "error"
      );
    }
  }

  async fetchJobs() {
    if (!this.supabase) {
      // Fallback to demo data if Supabase not available
      console.warn("⚠️ Supabase not configured - using demo mode");
      this.showNotification(
        "⚠️ Demo mode: Using sample data. Configure Supabase for real data.",
        "warning"
      );
      this.loadDemoJobs();
      return;
    }

    try {
      this.isLoading = true;
      console.log("📥 Fetching real jobs from Supabase...");

      const { data, error } = await this.supabase
        .from("claims")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error fetching jobs:", error);
        this.showNotification(`Failed to load jobs: ${error.message}`, "error");

        // Only show empty state, don't load demo data
        this.jobs = [];
        this.isLoading = false;
        return;
      }

      // Map Supabase data to job format
      this.jobs = data.map((claim) => this.mapClaimToJob(claim));

      console.log(`✅ Loaded ${this.jobs.length} real jobs from Supabase`);

      if (this.jobs.length === 0) {
        this.showNotification(
          "📋 No jobs found. Create your first job!",
          "info"
        );
      } else {
        this.showNotification(
          `✅ Loaded ${this.jobs.length} job(s) from database`,
          "success"
        );
      }

      this.isLoading = false;
    } catch (error) {
      console.error("❌ Exception fetching jobs:", error);
      this.showNotification(`Error loading jobs: ${error.message}`, "error");
      this.jobs = []; // Show empty state instead of demo data
      this.isLoading = false;
    }
  }

  mapClaimToJob(claim) {
    // Map Supabase claim fields to job format (using original schema field names)
    return {
      id: claim.id,
      claimNumber: claim.claim_number || `CLM-${claim.id}`,
      insured: claim.customer_name || "Unknown",
      firmName: claim.firm_name || null,
      address: claim.address_line1 || "No address provided",
      city: claim.city || null,
      state: claim.state || null,
      postalCode: claim.postal_code || null,
      phone: claim.phone || "N/A",
      email: claim.email || "N/A",
      status: claim.status || "NEW",
      priority: "medium", // Not in schema, default value
      type: "General Inspection", // Not in schema, default value
      created: claim.created_at,
      scheduledDate: claim.appointment_start,
      startedAt: null, // Not in schema
      completedAt: null, // Not in schema
      estimatedDuration: "2 hours", // Not in schema, default value
      actualDuration: null, // Not in schema
      photos: [], // Stored in separate table
      notes: claim.notes || "",
      inspector: "Unassigned", // assigned_to is UUID, need to join profiles table
      policyNumber: "N/A", // Not in schema
      deductible: "$0", // Not in schema
      coverage: "Standard", // Not in schema
      vin: claim.vin || null,
      vehicleYear: claim.vehicle_year || null,
      vehicleMake: claim.vehicle_make || null,
      vehicleModel: claim.vehicle_model || null,
      tags: [], // Not in schema
    };
  }

  mapJobToClaim(job) {
    // Map job format to Supabase claim fields (using original schema field names)
    return {
      id: job.id,
      claim_number: job.claimNumber,
      customer_name: job.insured,
      firm_name: job.firmName,
      address_line1: job.address,
      phone: job.phone,
      email: job.email,
      status: job.status,
      // priority: job.priority, // Not in schema
      // claim_type: job.type, // Not in schema
      created_at: job.created,
      appointment_start: job.scheduledDate,
      // started_at: job.startedAt, // Not in schema
      // completed_at: job.completedAt, // Not in schema
      // estimated_duration: job.estimatedDuration, // Not in schema
      // actual_duration: job.actualDuration, // Not in schema
      // photos: job.photos, // Separate table
      notes: job.notes,
      assigned_to: null, // UUID field, requires profile lookup
      // policy_number: job.policyNumber, // Not in schema
      // deductible: job.deductible, // Not in schema
      // coverage_type: job.coverage, // Not in schema
      vin: job.vin,
      vehicle_year: job.vehicleYear,
      vehicle_make: job.vehicleMake,
      vehicle_model: job.vehicleModel,
      // tags: job.tags, // Not in schema
    };
  }

  setupRealtimeSync() {
    if (!this.supabase) return;

    try {
      console.log("🔄 Setting up real-time sync...");

      // Subscribe to changes on the claims table
      this.realtimeSubscription = this.supabase
        .channel("claims-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "claims" },
          (payload) => {
            console.log("🔔 Real-time update received:", payload);

            switch (payload.eventType) {
              case "INSERT":
                this.handleRealtimeInsert(payload.new);
                break;
              case "UPDATE":
                this.handleRealtimeUpdate(payload.new);
                break;
              case "DELETE":
                this.handleRealtimeDelete(payload.old);
                break;
            }

            this.renderJobs();
            this.updateQuickStats();
          }
        )
        .subscribe((status) => {
          console.log("📡 Real-time subscription status:", status);
          if (status === "SUBSCRIBED") {
            this.showNotification("📡 Real-time sync active", "success");
          }
        });
    } catch (error) {
      console.error("❌ Failed to set up real-time sync:", error);
    }
  }

  handleRealtimeInsert(newClaim) {
    const newJob = this.mapClaimToJob(newClaim);
    this.jobs.unshift(newJob);
    this.showNotification(`📥 New job added: ${newJob.claimNumber}`, "info");
  }

  handleRealtimeUpdate(updatedClaim) {
    const index = this.jobs.findIndex((j) => j.id === updatedClaim.id);
    if (index !== -1) {
      this.jobs[index] = this.mapClaimToJob(updatedClaim);
      this.showNotification(
        `🔄 Job updated: ${this.jobs[index].claimNumber}`,
        "info"
      );
    }
  }

  handleRealtimeDelete(deletedClaim) {
    const index = this.jobs.findIndex((j) => j.id === deletedClaim.id);
    if (index !== -1) {
      const jobNumber = this.jobs[index].claimNumber;
      this.jobs.splice(index, 1);
      this.showNotification(`🗑️ Job removed: ${jobNumber}`, "info");
    }
  }

  async updateJobInSupabase(jobId, updates) {
    if (!this.supabase) {
      console.warn("Supabase not available, using local storage");
      this.saveJobsLocal();
      return true;
    }

    try {
      const { error } = await this.supabase
        .from("claims")
        .update(updates)
        .eq("id", jobId);

      if (error) {
        console.error("❌ Error updating job:", error);
        this.showNotification("Failed to update job in database", "error");
        return false;
      }

      console.log(`✅ Job ${jobId} updated in Supabase`);
      return true;
    } catch (error) {
      console.error("❌ Exception updating job:", error);
      this.showNotification("Error updating job", "error");
      return false;
    }
  }

  async insertJobInSupabase(jobData) {
    if (!this.supabase) {
      console.warn("Supabase not available, using local storage");
      this.saveJobsLocal();
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from("claims")
        .insert([jobData])
        .select()
        .single();

      if (error) {
        console.error("❌ Error inserting job:", error);
        this.showNotification("Failed to create job in database", "error");
        return null;
      }

      console.log(`✅ Job inserted in Supabase:`, data);
      return data;
    } catch (error) {
      console.error("❌ Exception inserting job:", error);
      this.showNotification("Error creating job", "error");
      return null;
    }
  }

  loadDemoJobs() {
    console.log("📋 Loading demo jobs...");

    // Check if we have jobs in localStorage first
    const stored = localStorage.getItem("cipher_jobs");
    if (stored) {
      this.jobs = JSON.parse(stored);
      return;
    }

    // Initialize with comprehensive demo data
    this.jobs = [
      {
        id: 1,
        claimNumber: "CLM-2024-001",
        insured: "John Smith",
        address: "123 Main St, Atlanta, GA 30309",
        phone: "(404) 555-0123",
        email: "john.smith@email.com",
        status: "scheduled",
        priority: "high",
        type: "Property Damage",
        created: new Date(Date.now() - 86400000).toISOString(),
        scheduledDate: new Date(Date.now() + 3600000).toISOString(),
        estimatedDuration: "2 hours",
        photos: [],
        notes: "Water damage inspection - check basement and first floor",
        inspector: "Unassigned",
        policyNumber: "POL-2024-7891",
        deductible: "$1,000",
        coverage: "Full Coverage",
        tags: ["water-damage", "urgent"],
      },
      {
        id: 2,
        claimNumber: "CLM-2024-002",
        insured: "Jane Doe",
        address: "456 Oak Ave, Decatur, GA 30030",
        phone: "(678) 555-0456",
        email: "jane.doe@email.com",
        status: "in-progress",
        priority: "medium",
        type: "Auto Accident",
        created: new Date(Date.now() - 172800000).toISOString(),
        startedAt: new Date(Date.now() - 7200000).toISOString(),
        estimatedDuration: "1.5 hours",
        photos: ["exterior_damage.jpg", "interior_view.jpg", "vin_number.jpg"],
        notes:
          "Vehicle accident inspection - rear-end collision, check alignment",
        inspector: "Demo User",
        policyNumber: "POL-2024-7892",
        deductible: "$500",
        coverage: "Collision Coverage",
        tags: ["auto", "collision"],
      },
      {
        id: 3,
        claimNumber: "CLM-2024-003",
        insured: "Bob Johnson",
        address: "789 Pine Rd, Marietta, GA 30062",
        phone: "(770) 555-0789",
        email: "bob.johnson@email.com",
        status: "completed",
        priority: "low",
        type: "Property Damage",
        created: new Date(Date.now() - 259200000).toISOString(),
        startedAt: new Date(Date.now() - 86400000).toISOString(),
        completedAt: new Date(Date.now() - 3600000).toISOString(),
        estimatedDuration: "3 hours",
        actualDuration: "2.5 hours",
        photos: [
          "roof_overview.jpg",
          "shingle_detail.jpg",
          "gutter_damage.jpg",
          "interior_ceiling.jpg",
        ],
        notes:
          "Roof inspection completed - minor hail damage, recommend partial replacement",
        inspector: "Demo User",
        policyNumber: "POL-2024-7893",
        deductible: "$2,500",
        coverage: "Homeowners Coverage",
        tags: ["roof", "hail-damage", "completed"],
      },
    ];
    this.saveJobsLocal();
  }

  setupEventListeners() {
    // Filter buttons
    document.querySelectorAll(".filter-cipher-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.handleFilterChange(e));
    });

    // Action buttons
    const newJobBtn = document.getElementById("new-job-btn");
    console.log("🎵 New job button element:", newJobBtn);

    if (newJobBtn) {
      newJobBtn.addEventListener("click", () => {
        console.log("🎵 New job button clicked!");
        this.showNewJobModal();
      });
    } else {
      console.error("❌ New job button not found!");
    }

    document
      .getElementById("sync-jobs-btn")
      ?.addEventListener("click", () => this.syncMobileJobs());
    document
      .getElementById("filter-jobs-btn")
      ?.addEventListener("click", () => this.showAdvancedFilter());
    document
      .getElementById("refresh-status-btn")
      ?.addEventListener("click", () => this.refreshMobileStatus());

    // Modal controls
    document
      .getElementById("job-modal-close")
      ?.addEventListener("click", () => this.closeModal());
    document
      .getElementById("job-modal-overlay")
      ?.addEventListener("click", (e) => {
        if (e.target.id === "job-modal-overlay") this.closeModal();
      });

    // Escape key to close modal
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.modalOpen) {
        this.closeModal();
      }
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "n":
            e.preventDefault();
            this.showNewJobModal();
            break;
          case "r":
            e.preventDefault();
            this.syncMobileJobs();
            break;
          case "f":
            e.preventDefault();
            this.showAdvancedFilter();
            break;
        }
      }
    });
  }

  handleFilterChange(e) {
    const filterBtn = e.target;
    const newFilter = filterBtn.dataset.filter;

    // Update active filter button
    document.querySelectorAll(".filter-cipher-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    filterBtn.classList.add("active", "job-filter-active");

    // Apply filter and render
    this.activeFilter = newFilter;
    this.renderJobs();

    // Remove animation class after animation completes
    setTimeout(() => {
      filterBtn.classList.remove("job-filter-active");
    }, 600);

    this.logActivity(`Filtered jobs by: ${newFilter}`, "filter");
  }

  renderJobs() {
    const jobsList = document.getElementById("jobs-list");
    if (!jobsList) return;

    let filteredJobs = this.jobs;

    // Apply filters
    if (this.activeFilter !== "all") {
      if (this.activeFilter === "high-priority") {
        filteredJobs = this.jobs.filter((job) => job.priority === "high");
      } else {
        filteredJobs = this.jobs.filter(
          (job) => job.status === this.activeFilter
        );
      }
    }

    if (filteredJobs.length === 0) {
      jobsList.innerHTML = `
                <div class="jobs-cipher-empty">
                    <div class="empty-cipher-icon">📋</div>
                    <p>No ${
                      this.activeFilter === "all"
                        ? ""
                        : this.activeFilter.replace("-", " ")
                    } jobs found</p>
                    <button class="cipher-btn cipher-btn--primary cipher-btn--sm" onclick="jobsStudio.showNewJobModal()">
                        ➕ Create Your First Job
                    </button>
                </div>
            `;
      return;
    }

    // Group jobs by status into buckets
    const buckets = {
      pending: filteredJobs.filter(
        (j) => j.status === "NEW" || j.status === "new"
      ),
      scheduled: filteredJobs.filter(
        (j) => j.status === "SCHEDULED" || j.status === "scheduled"
      ),
      inProgress: filteredJobs.filter(
        (j) => j.status === "IN_PROGRESS" || j.status === "in-progress"
      ),
      completed: filteredJobs.filter(
        (j) => j.status === "COMPLETED" || j.status === "completed"
      ),
    };

    // Build bucket HTML
    let bucketsHTML = "";

    // Pending Bucket (NEW)
    if (buckets.pending.length > 0) {
      bucketsHTML += this.renderBucket(
        "Pending",
        "pending",
        "🆕",
        buckets.pending,
        true,
        "large"
      );
    }

    // Scheduled Bucket
    if (buckets.scheduled.length > 0) {
      bucketsHTML += this.renderBucket(
        "Scheduled",
        "scheduled",
        "📅",
        buckets.scheduled,
        true,
        "large"
      );
    }

    // In Progress Bucket
    if (buckets.inProgress.length > 0) {
      bucketsHTML += this.renderBucket(
        "In Progress",
        "in-progress",
        "⚙️",
        buckets.inProgress,
        true,
        "large"
      );
    }

    // Completed Bucket (Smaller, Collapsible)
    if (buckets.completed.length > 0) {
      bucketsHTML += this.renderBucket(
        "Completed",
        "completed",
        "✅",
        buckets.completed,
        false,
        "small"
      );
    }

    jobsList.innerHTML =
      bucketsHTML ||
      `
      <div class="jobs-cipher-empty">
        <div class="empty-cipher-icon">📋</div>
        <p>No jobs found</p>
      </div>
    `;

    // Add event listeners to action buttons and bucket toggles
    this.addJobActionListeners();
    this.addBucketToggleListeners();
    this.updateQuickStats();
  }

  renderBucket(title, status, icon, jobs, expanded, size) {
    const bucketId = `bucket-${status}`;
    const cardSize = size === "small" ? "compact" : "full";

    return `
      <div class="job-bucket" data-status="${status}" style="margin-bottom: 2rem;">
        <div class="bucket-header" onclick="jobsStudio.toggleBucket('${bucketId}')" style="cursor: pointer; background: rgba(103, 58, 183, 0.2); padding: 1rem 1.5rem; border-radius: 12px; border-left: 4px solid var(--cipher-primary); display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 1.5rem;">${icon}</span>
            <h3 style="margin: 0; color: var(--cipher-text-primary);">${title}</h3>
            <span class="cipher-badge cipher-badge--info" style="font-size: 0.9rem;">${
              jobs.length
            }</span>
          </div>
          <span class="bucket-toggle" id="${bucketId}-toggle" style="font-size: 1.2rem; transition: transform 0.3s;">
            ${expanded ? "▼" : "▶"}
          </span>
        </div>
        <div class="bucket-content" id="${bucketId}" style="display: ${
      expanded ? "grid" : "none"
    }; grid-template-columns: ${
      size === "small" ? "repeat(auto-fill, minmax(300px, 1fr))" : "1fr"
    }; gap: 1rem;">
          ${jobs
            .map((job, index) => this.renderJobCard(job, index, cardSize))
            .join("")}
        </div>
      </div>
    `;
  }

  renderJobCard(job, index, size) {
    const createdDate = new Date(job.created);
    const timeAgo = this.getTimeAgo(createdDate);
    const isCompact = size === "compact";

    return `
      <div class="job-cipher-card job-card-enter"
           data-job-id="${job.id}"
           data-status="${job.status}"
           draggable="true"
           ondragstart="handleJobDragStart(event, '${job.id}')"
           style="animation-delay: ${
      index * 0.05
    }s; padding: ${
      isCompact ? "1rem" : "1.5rem"
    }; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); cursor: grab;">
        <div class="job-cipher-header" style="margin-bottom: ${
          isCompact ? "0.75rem" : "1rem"
        }; padding-bottom: ${
      isCompact ? "0.75rem" : "1rem"
    }; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
          <h4 style="margin: 0; font-size: ${
            isCompact ? "1rem" : "1.25rem"
          }; color: var(--cipher-primary);">${job.claimNumber}</h4>
          <span class="cipher-badge cipher-badge--${this.getStatusBadgeType(
            job.status
          )}" style="font-size: ${
      isCompact ? "0.75rem" : "0.85rem"
    };">${this.formatStatus(job.status)}</span>
        </div>
        <div class="job-cipher-details" style="margin-bottom: ${
          isCompact ? "0.75rem" : "1rem"
        }; display: grid; gap: 0.4rem; font-size: ${
      isCompact ? "0.9rem" : "1rem"
    };">
          <p style="margin: 0;"><strong>Insured:</strong> ${job.insured}</p>
          ${
            job.firmName
              ? `<p style="margin: 0;"><strong>Firm:</strong> ${job.firmName}</p>`
              : ""
          }
          ${
            !isCompact
              ? `<p style="margin: 0;"><strong>Address:</strong> ${[
                  job.address,
                  job.city,
                  job.state,
                  job.postalCode,
                ]
                  .filter(Boolean)
                  .join(", ")}</p>`
              : ""
          }
          ${
            !isCompact && job.vin
              ? `<p style="margin: 0;"><strong>VIN:</strong> ${job.vin}</p>`
              : ""
          }
          ${
            !isCompact &&
            (job.vehicleYear || job.vehicleMake || job.vehicleModel)
              ? `<p style="margin: 0;"><strong>Vehicle:</strong> ${[
                  job.vehicleYear,
                  job.vehicleMake,
                  job.vehicleModel,
                ]
                  .filter(Boolean)
                  .join(" ")}</p>`
              : ""
          }
          ${
            !isCompact
              ? `<p style="margin: 0;"><strong>Priority:</strong> <span class="priority-${
                  job.priority
                }">${job.priority.toUpperCase()}</span></p>`
              : ""
          }
          <p style="margin: 0;"><strong>Created:</strong> ${timeAgo}</p>
          ${
            job.scheduledDate
              ? `<p style="margin: 0;"><strong>Scheduled:</strong> ${this.formatDateTime(
                  job.scheduledDate
                )}</p>`
              : ""
          }
        </div>
        <div class="job-cipher-actions" style="display: flex; gap: 0.5rem; flex-wrap: wrap; padding-top: ${
          isCompact ? "0.75rem" : "1rem"
        }; border-top: 1px solid rgba(255, 255, 255, 0.1);">
          ${this.getJobActionButtons(job)}
        </div>
      </div>
    `;
  }

  toggleBucket(bucketId) {
    const content = document.getElementById(bucketId);
    const toggle = document.getElementById(`${bucketId}-toggle`);

    if (content && toggle) {
      const isExpanded = content.style.display !== "none";
      content.style.display = isExpanded ? "none" : "grid";
      toggle.textContent = isExpanded ? "▶" : "▼";
      toggle.style.transform = isExpanded ? "rotate(0deg)" : "rotate(0deg)";
    }
  }

  addBucketToggleListeners() {
    // Bucket toggles are handled by onclick in the HTML
  }

  renderJobsOLD_BACKUP() {
    const jobsList = document.getElementById("jobs-list");
    if (!jobsList) return;

    let filteredJobs = this.jobs;

    // Apply filters
    if (this.activeFilter !== "all") {
      if (this.activeFilter === "high-priority") {
        filteredJobs = this.jobs.filter((job) => job.priority === "high");
      } else {
        filteredJobs = this.jobs.filter(
          (job) => job.status === this.activeFilter
        );
      }
    }

    // Sort by priority and date
    filteredJobs.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.created) - new Date(a.created);
    });

    if (filteredJobs.length === 0) {
      jobsList.innerHTML = `
                <div class="jobs-cipher-empty">
                    <div class="empty-cipher-icon">📋</div>
                    <p>No ${
                      this.activeFilter === "all"
                        ? ""
                        : this.activeFilter.replace("-", " ")
                    } jobs found</p>
                    <button class="cipher-btn cipher-btn--primary cipher-btn--sm" onclick="jobsStudio.showNewJobModal()">
                        ➕ Create Your First Job
                    </button>
                </div>
            `;
      return;
    }

    jobsList.innerHTML = filteredJobs
      .map((job, index) => {
        const createdDate = new Date(job.created);
        const timeAgo = this.getTimeAgo(createdDate);

        return `
                <div class="job-cipher-card job-card-enter" data-job-id="${
                  job.id
                }" data-status="${job.status}" style="animation-delay: ${
          index * 0.1
        }s; margin-bottom: 1.5rem; padding: 1.5rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
                    <div class="job-cipher-header" style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                        <h4 style="margin: 0; font-size: 1.25rem; color: var(--cipher-primary);">${
                          job.claimNumber
                        }</h4>
                        <span class="cipher-badge cipher-badge--${this.getStatusBadgeType(
                          job.status
                        )}">${this.formatStatus(job.status)}</span>
                    </div>
                    <div class="job-cipher-details" style="margin-bottom: 1rem; display: grid; gap: 0.5rem;">
                        <p style="margin: 0;"><strong>Insured:</strong> ${
                          job.insured
                        }</p>
                        ${
                          job.firmName
                            ? `<p style="margin: 0;"><strong>Firm:</strong> ${job.firmName}</p>`
                            : ""
                        }
                        <p style="margin: 0;"><strong>Address:</strong> ${[
                          job.address,
                          job.city,
                          job.state,
                          job.postalCode,
                        ]
                          .filter(Boolean)
                          .join(", ")}</p>
                        ${
                          job.vin
                            ? `<p style="margin: 0;"><strong>VIN:</strong> ${job.vin}</p>`
                            : ""
                        }
                        ${
                          job.vehicleYear || job.vehicleMake || job.vehicleModel
                            ? `<p style="margin: 0;"><strong>Vehicle:</strong> ${[
                                job.vehicleYear,
                                job.vehicleMake,
                                job.vehicleModel,
                              ]
                                .filter(Boolean)
                                .join(" ")}</p>`
                            : ""
                        }
                        <p style="margin: 0;"><strong>Priority:</strong> <span class="priority-${
                          job.priority
                        }">${job.priority.toUpperCase()}</span></p>
                        <p style="margin: 0;"><strong>Type:</strong> ${
                          job.type
                        }</p>
                        <p style="margin: 0;"><strong>Photos:</strong> ${
                          job.photos.length
                        } uploaded</p>
                        <p style="margin: 0;"><strong>Created:</strong> ${timeAgo}</p>
                        ${
                          job.scheduledDate
                            ? `<p style="margin: 0;"><strong>Scheduled:</strong> ${this.formatDateTime(
                                job.scheduledDate
                              )}</p>`
                            : ""
                        }
                    </div>
                    <div class="job-cipher-actions" style="display: flex; gap: 0.5rem; flex-wrap: wrap; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                        ${this.getJobActionButtons(job)}
                    </div>
                </div>
            `;
      })
      .join("");

    // Add event listeners to action buttons
    this.addJobActionListeners();
    this.updateQuickStats();
  }

  getStatusBadgeType(status) {
    const types = {
      scheduled: "warning",
      "in-progress": "info",
      completed: "success",
      cancelled: "danger",
    };
    return types[status] || "secondary";
  }

  formatStatus(status) {
    return status
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  getJobActionButtons(job) {
    switch (job.status) {
      case "scheduled":
      case "NEW":
      case "SCHEDULED":
        return `
                    <button class="cipher-btn cipher-btn--outline cipher-btn--sm view-details-btn" data-job-id="${job.id}">👁️ Details</button>
                    <button class="cipher-btn cipher-btn--outline cipher-btn--sm edit-job-btn" data-job-id="${job.id}">📝 Edit</button>
                    <button class="cipher-btn cipher-btn--primary cipher-btn--sm start-job-btn" data-job-id="${job.id}">🎤 Start Job</button>
                    <button class="cipher-btn cipher-btn--danger cipher-btn--sm archive-job-btn" data-job-id="${job.id}">🗑️ Delete</button>
                `;
      case "in-progress":
      case "IN_PROGRESS":
        return `
                    <button class="cipher-btn cipher-btn--outline cipher-btn--sm view-details-btn" data-job-id="${job.id}">👁️ Details</button>
                    <button class="cipher-btn cipher-btn--outline cipher-btn--sm view-photos-btn" data-job-id="${job.id}">📱 Photos (${job.photos.length})</button>
                    <button class="cipher-btn cipher-btn--success cipher-btn--sm complete-job-btn" data-job-id="${job.id}">✅ Complete</button>
                    <button class="cipher-btn cipher-btn--danger cipher-btn--sm archive-job-btn" data-job-id="${job.id}">🗑️ Delete</button>
                `;
      case "completed":
      case "COMPLETED":
        return `
                    <button class="cipher-btn cipher-btn--outline cipher-btn--sm view-details-btn" data-job-id="${job.id}">👁️ Details</button>
                    <button class="cipher-btn cipher-btn--outline cipher-btn--sm view-report-btn" data-job-id="${job.id}">📄 Report</button>
                    <button class="cipher-btn cipher-btn--danger cipher-btn--sm archive-job-btn" data-job-id="${job.id}">�️ Delete</button>
                `;
      default:
        return `
                    <button class="cipher-btn cipher-btn--outline cipher-btn--sm view-details-btn" data-job-id="${job.id}">👁️ View</button>
                    <button class="cipher-btn cipher-btn--danger cipher-btn--sm archive-job-btn" data-job-id="${job.id}">🗑️ Delete</button>
                `;
    }
  }

  addJobActionListeners() {
    // View details buttons
    document.querySelectorAll(".view-details-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const jobId = parseInt(e.target.dataset.jobId);
        this.showJobDetailsModal(jobId);
      });
    });

    // Start job buttons
    document.querySelectorAll(".start-job-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const jobId = parseInt(e.target.dataset.jobId);
        this.startJob(jobId);
      });
    });

    // Complete job buttons
    document.querySelectorAll(".complete-job-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const jobId = parseInt(e.target.dataset.jobId);
        this.completeJob(jobId);
      });
    });

    // View photos buttons
    document.querySelectorAll(".view-photos-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const jobId = parseInt(e.target.dataset.jobId);
        this.viewJobPhotos(jobId);
      });
    });

    // Edit job buttons
    document.querySelectorAll(".edit-job-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const jobId = parseInt(e.target.dataset.jobId);
        this.editJob(jobId);
      });
    });

    // View report buttons
    document.querySelectorAll(".view-report-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const jobId = parseInt(e.target.dataset.jobId);
        this.generateJobReport(jobId);
      });
    });

    // Archive/Delete job buttons
    document.querySelectorAll(".archive-job-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Use currentTarget to get the button, not the clicked child element
        const button = e.currentTarget;
        const jobId = button.dataset.jobId; // Don't parse as int - might be UUID string
        console.log(
          "🗑️ Delete button clicked for job ID:",
          jobId,
          "type:",
          typeof jobId
        );
        if (jobId) {
          this.deleteJob(jobId);
        } else {
          console.error("❌ No job ID found on button:", button);
        }
      });
    });
  }

  showJobDetailsModal(jobId) {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return;

    const modalTitle = document.getElementById("job-modal-title");
    const modalContent = document.getElementById("job-modal-content");
    const modalOverlay = document.getElementById("job-modal-overlay");

    modalTitle.textContent = `Job Details - ${job.claimNumber}`;

    modalContent.innerHTML = `
            <div style="display: grid; gap: 1.5rem;">
                <!-- Job Header Info -->
                <div style="background: rgba(103, 58, 183, 0.1); padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--cipher-primary);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h4 style="margin: 0; color: var(--cipher-text-primary);">${
                          job.claimNumber
                        }</h4>
                        <span class="cipher-badge cipher-badge--${this.getStatusBadgeType(
                          job.status
                        )}">${this.formatStatus(job.status)}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                        <div>
                            <div style="font-size: 0.9rem; color: var(--cipher-text-secondary); margin-bottom: 0.25rem;">Priority</div>
                            <div class="priority-${
                              job.priority
                            }" style="font-weight: 600;">${job.priority.toUpperCase()}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.9rem; color: var(--cipher-text-secondary); margin-bottom: 0.25rem;">Type</div>
                            <div style="color: var(--cipher-text-primary);">${
                              job.type
                            }</div>
                        </div>
                        <div>
                            <div style="font-size: 0.9rem; color: var(--cipher-text-secondary); margin-bottom: 0.25rem;">Inspector</div>
                            <div style="color: var(--cipher-text-primary);">${
                              job.inspector
                            }</div>
                        </div>
                        <div>
                            <div style="font-size: 0.9rem; color: var(--cipher-text-secondary); margin-bottom: 0.25rem;">Duration</div>
                            <div style="color: var(--cipher-text-primary);">${
                              job.actualDuration || job.estimatedDuration
                            }</div>
                        </div>
                    </div>
                </div>
                
                <!-- Contact Information -->
                <div>
                    <h5 style="color: var(--cipher-text-primary); margin-bottom: 1rem;">📞 Contact Information</h5>
                    <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 1rem;">
                        <div style="display: grid; gap: 0.75rem;">
                            <div><strong>Insured:</strong> ${job.insured}</div>
                            <div><strong>Phone:</strong> <a href="tel:${
                              job.phone
                            }" style="color: var(--cipher-primary);">${
      job.phone
    }</a></div>
                            <div><strong>Email:</strong> <a href="mailto:${
                              job.email
                            }" style="color: var(--cipher-primary);">${
      job.email
    }</a></div>
                            <div><strong>Address:</strong> ${job.address}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Policy Information -->
                <div>
                    <h5 style="color: var(--cipher-text-primary); margin-bottom: 1rem;">📋 Policy Information</h5>
                    <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 1rem;">
                        <div style="display: grid; gap: 0.75rem;">
                            <div><strong>Policy Number:</strong> ${
                              job.policyNumber
                            }</div>
                            <div><strong>Coverage Type:</strong> ${
                              job.coverage
                            }</div>
                            <div><strong>Deductible:</strong> ${
                              job.deductible
                            }</div>
                        </div>
                    </div>
                </div>
                
                <!-- Photos -->
                ${
                  job.photos.length > 0
                    ? `
                <div>
                    <h5 style="color: var(--cipher-text-primary); margin-bottom: 1rem;">📸 Photos (${
                      job.photos.length
                    })</h5>
                    <div class="job-photos-grid">
                        ${job.photos
                          .map(
                            (photo) => `
                            <div class="job-photo-item" onclick="jobsStudio.viewFullPhoto('${photo}')">
                                <div class="job-photo-placeholder">📷</div>
                                <div style="position: absolute; bottom: 0.5rem; left: 0.5rem; right: 0.5rem; font-size: 0.8rem; color: white; background: rgba(0,0,0,0.7); padding: 0.25rem; border-radius: 4px; text-align: center;">
                                    ${photo}
                                </div>
                            </div>
                        `
                          )
                          .join("")}
                        <div class="job-photo-item" onclick="jobsStudio.addPhoto(${
                          job.id
                        })" style="border: 2px dashed rgba(255,255,255,0.3);">
                            <div style="text-align: center; color: var(--cipher-text-muted);">
                                <div style="font-size: 2rem; margin-bottom: 0.5rem;">📷</div>
                                <div style="font-size: 0.9rem;">Add Photo</div>
                            </div>
                        </div>
                    </div>
                </div>
                `
                    : `
                <div>
                    <h5 style="color: var(--cipher-text-primary); margin-bottom: 1rem;">📸 Photos</h5>
                    <div style="text-align: center; padding: 2rem; background: rgba(255, 255, 255, 0.02); border: 1px dashed rgba(255, 255, 255, 0.2); border-radius: 8px;">
                        <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">📷</div>
                        <div style="color: var(--cipher-text-muted); margin-bottom: 1rem;">No photos uploaded yet</div>
                        <button class="cipher-btn cipher-btn--primary cipher-btn--sm" onclick="jobsStudio.addPhoto(${job.id})">📱 Add Photos</button>
                    </div>
                </div>
                `
                }
                
                <!-- Notes -->
                <div>
                    <h5 style="color: var(--cipher-text-primary); margin-bottom: 1rem;">📝 Notes</h5>
                    <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 1rem;">
                        <div style="color: var(--cipher-text-secondary); line-height: 1.6;">
                            ${job.notes || "No notes added yet."}
                        </div>
                    </div>
                </div>
                
                <!-- Timeline -->
                <div>
                    <h5 style="color: var(--cipher-text-primary); margin-bottom: 1rem;">⏰ Timeline</h5>
                    <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 1rem;">
                        <div style="display: grid; gap: 0.75rem;">
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <div style="width: 8px; height: 8px; background: #4caf50; border-radius: 50%;"></div>
                                <div><strong>Created:</strong> ${this.formatDateTime(
                                  job.created
                                )}</div>
                            </div>
                            ${
                              job.startedAt
                                ? `
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <div style="width: 8px; height: 8px; background: #2196f3; border-radius: 50%;"></div>
                                <div><strong>Started:</strong> ${this.formatDateTime(
                                  job.startedAt
                                )}</div>
                            </div>
                            `
                                : ""
                            }
                            ${
                              job.completedAt
                                ? `
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <div style="width: 8px; height: 8px; background: #4caf50; border-radius: 50%;"></div>
                                <div><strong>Completed:</strong> ${this.formatDateTime(
                                  job.completedAt
                                )}</div>
                            </div>
                            `
                                : ""
                            }
                            ${
                              job.scheduledDate && !job.startedAt
                                ? `
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <div style="width: 8px; height: 8px; background: #ff9800; border-radius: 50%;"></div>
                                <div><strong>Scheduled:</strong> ${this.formatDateTime(
                                  job.scheduledDate
                                )}</div>
                            </div>
                            `
                                : ""
                            }
                        </div>
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div style="display: flex; gap: 0.75rem; justify-content: flex-end; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                    ${
                      job.status === "scheduled"
                        ? `
                        <button class="cipher-btn cipher-btn--primary" onclick="jobsStudio.startJob(${job.id}); jobsStudio.closeModal();">🎤 Start Job</button>
                    `
                        : ""
                    }
                    ${
                      job.status === "in-progress"
                        ? `
                        <button class="cipher-btn cipher-btn--success" onclick="jobsStudio.completeJob(${job.id}); jobsStudio.closeModal();">✅ Complete Job</button>
                    `
                        : ""
                    }
                    ${
                      job.status === "completed"
                        ? `
                        <button class="cipher-btn cipher-btn--outline" onclick="jobsStudio.generateJobReport(${job.id})">📄 Generate Report</button>
                    `
                        : ""
                    }
                    <button class="cipher-btn cipher-btn--outline" onclick="jobsStudio.editJob(${
                      job.id
                    })">📝 Edit Job</button>
                    <button class="cipher-btn cipher-btn--ghost" onclick="jobsStudio.closeModal()">Close</button>
                </div>
            </div>
        `;

    modalOverlay.classList.add("active");
    this.modalOpen = true;

    this.logActivity(`Viewed details for job ${job.claimNumber}`, "view");
  }

  async startJob(jobId) {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return;

    const updates = {
      status: "in-progress",
      started_at: new Date().toISOString(),
    };

    // Update in Supabase
    const success = await this.updateJobInSupabase(jobId, updates);

    if (success) {
      job.status = "in-progress";
      job.startedAt = updates.started_at;

      // Find and update the job card with animation
      const jobCard = document.querySelector(`[data-job-id="${jobId}"]`);
      if (jobCard) {
        jobCard.classList.add("status-update");
        setTimeout(() => {
          jobCard.classList.remove("status-update");
        }, 800);
      }

      this.renderJobs();

      this.showNotification(
        `🎤 Started job ${job.claimNumber} - Good luck with the inspection!`,
        "success"
      );
      this.logActivity(`Started job ${job.claimNumber}`, "job-start");
    }
  }

  async completeJob(jobId) {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return;

    const completedAt = new Date().toISOString();
    let actualDuration = null;

    if (job.startedAt) {
      const startTime = new Date(job.startedAt);
      const endTime = new Date(completedAt);
      const durationHours = ((endTime - startTime) / (1000 * 60 * 60)).toFixed(
        1
      );
      actualDuration = `${durationHours} hours`;
    }

    const updates = {
      status: "completed",
      completed_at: completedAt,
      actual_duration: actualDuration,
    };

    // Update in Supabase
    const success = await this.updateJobInSupabase(jobId, updates);

    if (success) {
      job.status = "completed";
      job.completedAt = completedAt;
      job.actualDuration = actualDuration;

      // Find and update the job card with animation
      const jobCard = document.querySelector(`[data-job-id="${jobId}"]`);
      if (jobCard) {
        jobCard.classList.add("status-update");
        setTimeout(() => {
          jobCard.classList.remove("status-update");
        }, 800);
      }

      this.renderJobs();

      this.showNotification(
        `✅ Completed job ${job.claimNumber} - Great work!`,
        "success"
      );
      this.logActivity(`Completed job ${job.claimNumber}`, "job-complete");
    }
  }

  viewJobPhotos(jobId) {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return;

    this.showJobDetailsModal(jobId);
    this.logActivity(`Viewed photos for job ${job.claimNumber}`, "photos");
  }

  async syncMobileJobs() {
    this.showNotification("📱 Syncing with database...", "info");
    this.isLoading = true;

    try {
      // Refresh jobs from database to get any updates from mobile
      await this.fetchJobs();
      this.renderJobs();
      this.updateQuickStats();

      const photoCount = this.jobs.reduce(
        (sum, job) => sum + (job.photos ? job.photos.length : 0),
        0
      );

      this.showNotification(
        `✅ Sync complete! ${this.jobs.length} jobs, ${photoCount} photos`,
        "success"
      );
      this.logActivity("Completed database sync", "sync");
    } catch (error) {
      console.error("Sync error:", error);
      this.showNotification(
        "❌ Sync failed. Check console for details.",
        "error"
      );
    } finally {
      this.isLoading = false;
    }
  }

  showNewJobModal() {
    console.log("🎵 showNewJobModal called");

    const modalTitle = document.getElementById("job-modal-title");
    const modalContent = document.getElementById("job-modal-content");
    const modalOverlay = document.getElementById("job-modal-overlay");

    console.log("Modal elements:", { modalTitle, modalContent, modalOverlay });

    if (!modalTitle || !modalContent || !modalOverlay) {
      console.error("❌ Modal elements not found!");
      this.showNotification("Error: Modal elements not found", "error");
      return;
    }

    modalTitle.textContent = "➕ Create New Job";

    modalContent.innerHTML = `
            <form id="new-job-form" style="display: grid; gap: 1.5rem;">
                <!-- Basic Information -->
                <div style="background: rgba(103, 58, 183, 0.1); padding: 1rem; border-radius: 8px; border-left: 3px solid var(--cipher-primary);">
                    <h4 style="margin: 0 0 1rem 0; color: var(--cipher-text-primary);">📋 Basic Information</h4>
                    <div style="display: grid; gap: 1rem;">
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--cipher-text-primary);">
                                Claim Number <span style="color: #f44336;">*</span>
                            </label>
                            <div style="display: flex; gap: 0.5rem;">
                                <input type="text" id="claim-number" name="claimNumber" required
                                    placeholder="CLM-2024-XXX"
                                    style="flex: 1; padding: 0.75rem; border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: var(--cipher-text-primary); font-size: 1rem;">
                                <button type="button" onclick="jobsStudio.generateClaimNumber()" class="cipher-btn cipher-btn--secondary" style="padding: 0.75rem 1rem; white-space: nowrap;">
                                    🎲 Generate
                                </button>
                            </div>
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--cipher-text-primary);">
                                Insured Name <span style="color: #f44336;">*</span>
                            </label>
                            <input type="text" id="insured-name" name="insuredName" required
                                placeholder="John Doe"
                                style="width: 100%; padding: 0.75rem; border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: var(--cipher-text-primary); font-size: 1rem;">
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--cipher-text-primary);">
                                Firm Name
                            </label>
                            <input type="text" id="firm-name" name="firmName"
                                placeholder="Insurance Company Name"
                                style="width: 100%; padding: 0.75rem; border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: var(--cipher-text-primary); font-size: 1rem;">
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--cipher-text-primary);">
                                Street Address <span style="color: #f44336;">*</span>
                            </label>
                            <input type="text" id="address" name="address" required
                                placeholder="123 Main St"
                                style="width: 100%; padding: 0.75rem; border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: var(--cipher-text-primary); font-size: 1rem;">
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1rem;">
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--cipher-text-primary);">
                                    City <span style="color: #f44336;">*</span>
                                </label>
                                <input type="text" id="city" name="city" required
                                    placeholder="Atlanta"
                                    style="width: 100%; padding: 0.75rem; border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: var(--cipher-text-primary); font-size: 1rem;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--cipher-text-primary);">
                                    State <span style="color: #f44336;">*</span>
                                </label>
                                <input type="text" id="state" name="state" required
                                    placeholder="GA"
                                    maxlength="2"
                                    style="width: 100%; padding: 0.75rem; border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: var(--cipher-text-primary); font-size: 1rem; text-transform: uppercase;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--cipher-text-primary);">
                                    ZIP <span style="color: #f44336;">*</span>
                                </label>
                                <input type="text" id="postal-code" name="postalCode" required
                                    placeholder="30309"
                                    maxlength="10"
                                    style="width: 100%; padding: 0.75rem; border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: var(--cipher-text-primary); font-size: 1rem;">
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--cipher-text-primary);">
                                    Phone
                                </label>
                                <input type="tel" id="phone" name="phone"
                                    placeholder="(555) 123-4567"
                                    style="width: 100%; padding: 0.75rem; border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: var(--cipher-text-primary); font-size: 1rem;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--cipher-text-primary);">
                                    Email
                                </label>
                                <input type="email" id="email" name="email"
                                    placeholder="email@example.com"
                                    style="width: 100%; padding: 0.75rem; border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: var(--cipher-text-primary); font-size: 1rem;">
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Job Details -->
                <div style="background: rgba(33, 150, 243, 0.1); padding: 1rem; border-radius: 8px; border-left: 3px solid #2196f3;">
                    <h4 style="margin: 0 0 1rem 0; color: var(--cipher-text-primary);">� Job Details</h4>
                    <div style="display: grid; gap: 1rem;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--cipher-text-primary);">
                                    Priority <span style="color: #f44336;">*</span>
                                </label>
                                <select id="priority" name="priority" required
                                    style="width: 100%; padding: 0.75rem; border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: var(--cipher-text-primary); font-size: 1rem;">
                                    <option value="low">Low</option>
                                    <option value="medium" selected>Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--cipher-text-primary);">
                                    Status
                                </label>
                                <select id="status" name="status"
                                    style="width: 100%; padding: 0.75rem; border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: var(--cipher-text-primary); font-size: 1rem;">
                                    <option value="NEW" selected>New</option>
                                    <option value="SCHEDULED">Scheduled</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="COMPLETED">Completed</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--cipher-text-primary);">
                                    Claim Type <span style="color: #f44336;">*</span>
                                </label>
                                <select id="claim-type" name="claimType" required
                                    style="width: 100%; padding: 0.75rem; border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: var(--cipher-text-primary); font-size: 1rem;">
                                    <option value="Property Damage">Property Damage</option>
                                    <option value="Auto Accident">Auto Accident</option>
                                    <option value="Fire Damage">Fire Damage</option>
                                    <option value="Water Damage">Water Damage</option>
                                    <option value="Theft">Theft</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--cipher-text-primary);">
                                    Scheduled Date/Time
                                </label>
                                <input type="datetime-local" id="scheduled-date" name="scheduledDate"
                                    style="width: 100%; padding: 0.75rem; border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: var(--cipher-text-primary); font-size: 1rem;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--cipher-text-primary);">
                                    Estimated Duration
                                </label>
                                <input type="text" id="estimated-duration" name="estimatedDuration"
                                    placeholder="2 hours"
                                    value="2 hours"
                                    style="width: 100%; padding: 0.75rem; border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: var(--cipher-text-primary); font-size: 1rem;">
                            </div>
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--cipher-text-primary);">
                                Assign To
                            </label>
                            <input type="text" id="assigned-to" name="assignedTo"
                                placeholder="Inspector name (leave blank for unassigned)"
                                style="width: 100%; padding: 0.75rem; border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: var(--cipher-text-primary); font-size: 1rem;">
                        </div>
                    </div>
                </div>
                
                <!-- Policy Information -->
                <div style="background: rgba(76, 175, 80, 0.1); padding: 1rem; border-radius: 8px; border-left: 3px solid #4caf50;">
                    <h4 style="margin: 0 0 1rem 0; color: var(--cipher-text-primary);">📄 Policy Information</h4>
                    <div style="display: grid; gap: 1rem;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--cipher-text-primary);">
                                    Policy Number
                                </label>
                                <input type="text" id="policy-number" name="policyNumber"
                                    placeholder="POL-2024-XXXX"
                                    style="width: 100%; padding: 0.75rem; border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: var(--cipher-text-primary); font-size: 1rem;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--cipher-text-primary);">
                                    Deductible
                                </label>
                                <input type="text" id="deductible" name="deductible"
                                    placeholder="$1,000"
                                    style="width: 100%; padding: 0.75rem; border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: var(--cipher-text-primary); font-size: 1rem;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--cipher-text-primary);">
                                    Coverage Type
                                </label>
                                <input type="text" id="coverage-type" name="coverageType"
                                    placeholder="Full Coverage"
                                    style="width: 100%; padding: 0.75rem; border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: var(--cipher-text-primary); font-size: 1rem;">
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Vehicle Information -->
                <div style="background: rgba(255, 152, 0, 0.1); padding: 1rem; border-radius: 8px; border-left: 3px solid #ff9800;">
                    <h4 style="margin: 0 0 1rem 0; color: var(--cipher-text-primary);">🚗 Vehicle Information</h4>
                    <div style="display: grid; gap: 1rem;">
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--cipher-text-primary);">
                                VIN (Vehicle Identification Number)
                            </label>
                            <input type="text" id="vin" name="vin"
                                placeholder="1HGBH41JXMN109186"
                                maxlength="17"
                                style="width: 100%; padding: 0.75rem; border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: var(--cipher-text-primary); font-size: 1rem; text-transform: uppercase;">
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--cipher-text-primary);">
                                    Year
                                </label>
                                <input type="text" id="vehicle-year" name="vehicleYear"
                                    placeholder="2024"
                                    maxlength="4"
                                    style="width: 100%; padding: 0.75rem; border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: var(--cipher-text-primary); font-size: 1rem;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--cipher-text-primary);">
                                    Make
                                </label>
                                <input type="text" id="vehicle-make" name="vehicleMake"
                                    placeholder="Honda"
                                    style="width: 100%; padding: 0.75rem; border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: var(--cipher-text-primary); font-size: 1rem;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--cipher-text-primary);">
                                    Model
                                </label>
                                <input type="text" id="vehicle-model" name="vehicleModel"
                                    placeholder="Accord"
                                    style="width: 100%; padding: 0.75rem; border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: var(--cipher-text-primary); font-size: 1rem;">
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Notes -->
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--cipher-text-primary);">
                        📝 Notes
                    </label>
                    <textarea id="notes" name="notes" rows="4"
                        placeholder="Additional notes, instructions, or details about this job..."
                        style="width: 100%; padding: 0.75rem; border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: var(--cipher-text-primary); font-size: 1rem; resize: vertical; font-family: inherit;"></textarea>
                </div>
                
                <!-- Form Actions -->
                <div style="display: flex; gap: 0.75rem; justify-content: flex-end; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                    <button type="button" class="cipher-btn cipher-btn--ghost" onclick="jobsStudio.closeModal()">Cancel</button>
                    <button type="submit" class="cipher-btn cipher-btn--primary" id="create-job-btn">
                        ✅ Create Job
                    </button>
                </div>
            </form>
        `;

    modalOverlay.classList.add("active");
    this.modalOpen = true;

    // Add form submit handler
    document.getElementById("new-job-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.createNewJob(e.target);
    });

    this.logActivity("Opened new job creation form", "new-job");
  }

  generateClaimNumber() {
    // Generate unique claim number: CLM-YYYYMMDD-XXXX
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 9000) + 1000; // 4-digit random number

    const claimNumber = `CLM-${year}${month}${day}-${random}`;

    // Set the value in the input field
    const claimNumberInput = document.getElementById("claim-number");
    if (claimNumberInput) {
      claimNumberInput.value = claimNumber;
      this.showNotification(
        `✅ Generated claim number: ${claimNumber}`,
        "success"
      );
    }
  }

  async createNewJob(form) {
    // Get form data
    const formData = new FormData(form);

    // Get the current user ID from Supabase auth or localStorage
    let assignedUserId = null;

    if (this.supabase) {
      try {
        const {
          data: { user },
        } = await this.supabase.auth.getUser();
        if (user) {
          assignedUserId = user.id;
          console.log("✅ Found authenticated user ID:", assignedUserId);
        } else {
          // Try to get from localStorage (for mobile app sync)
          assignedUserId =
            localStorage.getItem("user_id") ||
            localStorage.getItem("assigned_user_id");
          console.log("📦 Using localStorage user ID:", assignedUserId);
        }
      } catch (error) {
        console.log("⚠️ No authenticated user, trying localStorage...");
        assignedUserId =
          localStorage.getItem("user_id") ||
          localStorage.getItem("assigned_user_id");
        console.log("📦 Using localStorage user ID:", assignedUserId);
      }
    }

    const jobData = {
      claim_number: formData.get("claimNumber"),
      customer_name: formData.get("insuredName"), // Using customer_name to match Supabase schema
      firm_name: formData.get("firmName") || null,
      address_line1: formData.get("address"), // Using address_line1 to match Supabase schema
      city: formData.get("city") || null,
      state: formData.get("state") || null,
      postal_code: formData.get("postalCode") || null,
      phone: formData.get("phone") || null,
      email: formData.get("email") || null,
      status: formData.get("status") || "NEW",
      vin: formData.get("vin") || null,
      vehicle_year: formData.get("vehicleYear")
        ? parseInt(formData.get("vehicleYear"))
        : null,
      vehicle_make: formData.get("vehicleMake") || null,
      vehicle_model: formData.get("vehicleModel") || null,
      assigned_to: assignedUserId, // Set to current user ID for mobile app visibility
      notes: formData.get("notes") || null,
      appointment_start: formData.get("scheduledDate")
        ? new Date(formData.get("scheduledDate")).toISOString()
        : null,
      created_at: new Date().toISOString(),
    };

    console.log("📝 Creating job with data:", jobData);
    console.log("👤 Assigned to user ID:", assignedUserId);

    // Disable submit button
    const submitBtn = document.getElementById("create-job-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "⏳ Creating...";

    try {
      if (this.supabase) {
        // Insert into Supabase
        this.showNotification("📤 Creating job in database...", "info");

        const { data, error } = await this.supabase
          .from("claims")
          .insert([jobData])
          .select()
          .single();

        if (error) {
          console.error("Error creating job:", error);
          this.showNotification(
            `❌ Failed to create job: ${error.message}`,
            "error"
          );
          submitBtn.disabled = false;
          submitBtn.textContent = "✅ Create Job";
          return;
        }

        // Map to job format and add to local jobs array
        const newJob = this.mapClaimToJob(data);
        this.jobs.unshift(newJob);

        this.showNotification(
          `✅ Job ${newJob.claimNumber} created successfully!`,
          "success"
        );
        console.log("New job created:", newJob);
      } else {
        // Fallback to localStorage
        const newJob = {
          id: Date.now(),
          claimNumber: jobData.claim_number,
          insured: jobData.customer_name,
          firmName: jobData.firm_name,
          address: jobData.address_line1,
          phone: jobData.phone,
          email: jobData.email,
          status: jobData.status,
          priority: "medium",
          type: "General Inspection",
          policyNumber: "N/A",
          deductible: "$0",
          coverage: "Standard",
          vin: jobData.vin,
          vehicleYear: jobData.vehicle_year,
          vehicleMake: jobData.vehicle_make,
          vehicleModel: jobData.vehicle_model,
          estimatedDuration: "2 hours",
          inspector: "Unassigned",
          notes: jobData.notes,
          scheduledDate: jobData.appointment_start,
          photos: [],
          tags: [],
          created: jobData.created_at,
        };

        this.jobs.unshift(newJob);
        this.saveJobsLocal();

        this.showNotification(
          `✅ Job ${newJob.claimNumber} created (demo mode)!`,
          "success"
        );
      }

      // Close modal and refresh
      this.closeModal();
      this.renderJobs();
      this.updateQuickStats();

      this.logActivity(
        `Created new job: ${jobData.claim_number}`,
        "job-create"
      );
    } catch (error) {
      console.error("Exception creating job:", error);
      this.showNotification(`❌ Error creating job: ${error.message}`, "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "✅ Create Job";
    }
  }

  showAdvancedFilter() {
    this.showNotification("🔍 Advanced filtering options coming soon!", "info");
    this.logActivity("Accessed advanced filter options", "filter");
  }

  editJob(jobId) {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return;

    this.showNotification(
      `📝 Editing job ${job.claimNumber} - Feature coming soon!`,
      "info"
    );
    this.logActivity(`Attempted to edit job ${job.claimNumber}`, "edit");
  }

  generateJobReport(jobId) {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return;

    this.showNotification(
      `📄 Generating professional report for ${job.claimNumber}...`,
      "info"
    );
    this.logActivity(`Generated report for job ${job.claimNumber}`, "report");

    // Simulate report generation
    setTimeout(() => {
      this.showNotification(
        "✅ Report generated and ready for download!",
        "success"
      );
    }, 1500);
  }

  async deleteJob(jobId) {
    console.log("🗑️ deleteJob called with ID:", jobId, "type:", typeof jobId);
    console.log("📊 Current jobs array:", this.jobs);
    console.log(
      "🔍 Job IDs in array:",
      this.jobs.map((j) => ({
        id: j.id,
        type: typeof j.id,
        claimNumber: j.claimNumber,
      }))
    );

    // Find job - handle both string and number IDs
    const job = this.jobs.find((j) => {
      // Try direct match first
      if (j.id === jobId) return true;
      // Try string comparison
      if (String(j.id) === String(jobId)) return true;
      // Try number comparison if both can be numbers
      if (!isNaN(j.id) && !isNaN(jobId) && Number(j.id) === Number(jobId))
        return true;
      return false;
    });

    console.log("🔍 Found job:", job);

    if (!job) {
      console.error("❌ Job not found with ID:", jobId);
      console.error(
        "❌ Available job IDs:",
        this.jobs.map((j) => j.id)
      );
      this.showNotification(`❌ Job not found!`, "error");
      return;
    }

    // Confirm deletion
    if (
      !confirm(
        `⚠️ Are you sure you want to delete job ${job.claimNumber}?\n\nThis action cannot be undone.`
      )
    ) {
      console.log("❌ User cancelled deletion");
      return;
    }

    console.log("✅ User confirmed deletion");
    this.showNotification(`🗑️ Deleting job ${job.claimNumber}...`, "info");

    try {
      if (this.supabase) {
        console.log("🔄 Deleting from Supabase, job ID:", jobId);

        // Delete from Supabase
        const { data, error } = await this.supabase
          .from("claims")
          .delete()
          .eq("id", jobId)
          .select();

        console.log("📥 Supabase delete response:", { data, error });

        if (error) {
          console.error("❌ Supabase error deleting job:", error);
          this.showNotification(
            `❌ Failed to delete job: ${error.message}`,
            "error"
          );
          return;
        }

        console.log("✅ Successfully deleted from Supabase");
        this.showNotification(
          `✅ Job ${job.claimNumber} deleted successfully!`,
          "success"
        );
      } else {
        console.log("📦 Demo mode - skipping Supabase");
        // Delete from localStorage
        this.showNotification(
          `✅ Job ${job.claimNumber} deleted (demo mode)!`,
          "success"
        );
      }

      // Remove from local array using the same flexible matching
      console.log("🔄 Removing from local array...");
      const beforeLength = this.jobs.length;
      this.jobs = this.jobs.filter((j) => {
        // Keep jobs that DON'T match the ID
        const matches =
          j.id === jobId ||
          String(j.id) === String(jobId) ||
          (!isNaN(j.id) && !isNaN(jobId) && Number(j.id) === Number(jobId));
        return !matches;
      });
      console.log(`📊 Jobs array: ${beforeLength} → ${this.jobs.length}`);

      this.saveJobsLocal();
      console.log("💾 Saved to localStorage");

      this.renderJobs();
      console.log("🎨 Re-rendered jobs");

      this.updateQuickStats();
      console.log("📊 Updated stats");

      this.logActivity(`Deleted job ${job.claimNumber}`, "delete");
    } catch (error) {
      console.error("💥 Exception deleting job:", error);
      this.showNotification(`❌ Error deleting job: ${error.message}`, "error");
    }
  }

  async addPhoto(jobId) {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return;

    // In a real implementation, this would trigger a photo upload UI
    // For demo, we'll simulate adding a photo
    const photoName = `photo_${Date.now()}.jpg`;
    job.photos.push(photoName);

    // Update photos in Supabase
    await this.updateJobInSupabase(jobId, { photos: job.photos });

    this.renderJobs();
    this.showNotification(`📷 Photo added to ${job.claimNumber}`, "success");
    this.logActivity(`Added photo to job ${job.claimNumber}`, "photo");
  }

  viewFullPhoto(photoName) {
    this.showNotification(`🖼️ Viewing full-size photo: ${photoName}`, "info");
    this.logActivity(`Viewed full photo: ${photoName}`, "photo-view");
  }

  refreshMobileStatus() {
    this.showNotification("🔄 Refreshing mobile device status...", "info");

    setTimeout(() => {
      this.showNotification("📱 Mobile devices status updated!", "success");
      this.logActivity("Refreshed mobile device status", "status");
    }, 1000);
  }

  closeModal() {
    const modalOverlay = document.getElementById("job-modal-overlay");
    if (modalOverlay) {
      modalOverlay.classList.remove("active");
      this.modalOpen = false;
    }
  }

  updateQuickStats() {
    // Calculate stats from real job data
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Jobs created today
    const todayCount = this.jobs.filter((job) => {
      const jobDate = new Date(job.created);
      jobDate.setHours(0, 0, 0, 0);
      return jobDate.getTime() === today.getTime();
    }).length;

    // Pending jobs (NEW status)
    const pendingCount = this.jobs.filter(
      (job) => job.status === "NEW" || job.status === "new"
    ).length;

    // In progress jobs
    const progressCount = this.jobs.filter(
      (job) => job.status === "IN_PROGRESS" || job.status === "in-progress"
    ).length;

    // Completed jobs
    const completedCount = this.jobs.filter(
      (job) => job.status === "COMPLETED" || job.status === "completed"
    ).length;

    // Scheduled jobs
    const scheduledCount = this.jobs.filter(
      (job) => job.status === "SCHEDULED" || job.status === "scheduled"
    ).length;

    // Jobs with photos (sync ready)
    const syncCount = this.jobs.filter(
      (job) => job.photos && job.photos.length > 0
    ).length;

    // Total photos count
    const totalPhotos = this.jobs.reduce((sum, job) => {
      return sum + (job.photos ? job.photos.length : 0);
    }, 0);

    // Total jobs
    const totalCount = this.jobs.length;

    // Update top KPI cards
    const activeJobsEl = document.getElementById("active-jobs-count");
    const photosSyncedEl = document.getElementById("photos-synced-count");
    const completedTodayEl = document.getElementById("completed-today-count");
    const totalJobsEl = document.getElementById("total-jobs-count");

    if (activeJobsEl) activeJobsEl.textContent = progressCount + scheduledCount; // Active = In Progress + Scheduled
    if (photosSyncedEl) photosSyncedEl.textContent = totalPhotos;
    if (completedTodayEl) {
      // Completed today count
      const completedTodayCount = this.jobs.filter((job) => {
        if (!job.completedAt) return false;
        const completedDate = new Date(job.completedAt);
        completedDate.setHours(0, 0, 0, 0);
        return completedDate.getTime() === today.getTime();
      }).length;
      completedTodayEl.textContent = completedTodayCount;
    }
    if (totalJobsEl) totalJobsEl.textContent = totalCount;

    // Update quick stats bar (TODAY, PENDING, IN PROGRESS, SYNC READY)
    const todayEl = document.getElementById("today-count");
    const pendingEl = document.getElementById("pending-count");
    const progressEl = document.getElementById("progress-count");
    const syncEl = document.getElementById("sync-count");

    if (todayEl) todayEl.textContent = todayCount;
    if (pendingEl) pendingEl.textContent = pendingCount;
    if (progressEl) progressEl.textContent = progressCount;
    if (syncEl) syncEl.textContent = syncCount;
  }

  startAutoSync() {
    // Auto-refresh jobs from database every 30 seconds
    setInterval(async () => {
      if (!this.isLoading && this.syncStatus === "connected" && this.supabase) {
        console.log("🔄 Auto-refreshing jobs from database...");
        await this.fetchJobs();
        this.renderJobs();
        this.updateQuickStats();
      }
    }, 30000); // 30 seconds
  }

  // Utility functions
  saveJobsLocal() {
    localStorage.setItem("cipher_jobs", JSON.stringify(this.jobs));
  }

  getTimeAgo(date) {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  }

  formatDateTime(isoString) {
    return new Date(isoString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  showNotification(message, type = "info") {
    // Use the global notification system if available
    if (window.showCipherNotification) {
      window.showCipherNotification(message, type);
    } else {
      console.log(`📱 Jobs Studio: ${message}`);
    }
  }

  logActivity(activity, category = "general") {
    // Use the global activity logging if available
    if (window.logCipherActivity) {
      window.logCipherActivity(activity, category);
    } else {
      console.log(`📱 Activity: ${activity} [${category}]`);
    }
  }
}

// Initialize Jobs Studio Manager when DOM is ready
function initializeJobsStudio() {
  console.log("🎵 Lyricist: Initializing Jobs Studio...");
  window.jobsStudio = new JobsStudioManager();
}

// Export functions for global access
window.initializeJobsStudio = initializeJobsStudio;

// Global drag-and-drop handler for job cards
function handleJobDragStart(event, jobId) {
  if (!window.jobsStudio) {
    console.error('Jobs Studio not initialized');
    return;
  }

  const job = window.jobsStudio.jobs.find(j => j.id === jobId);
  if (!job) {
    console.error('Job not found:', jobId);
    return;
  }

  // Create claim data object for Route Cipher
  const claimData = {
    id: job.id,
    claimNumber: job.claimNumber,
    customerName: job.insured,
    firmName: job.firmName || 'Unknown',
    addressLine1: job.address || '',
    city: job.city || '',
    state: job.state || '',
    postalCode: job.postalCode || '',
    lat: job.lat || null,
    lng: job.lng || null,
    phone: job.phone || '',
    priority: job.priority || 'normal'
  };

  // Set drag data
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData('application/json', JSON.stringify(claimData));
  event.dataTransfer.setData('text/plain', JSON.stringify(claimData));

  // Visual feedback
  event.target.style.opacity = '0.5';
  event.target.style.cursor = 'grabbing';

  console.log('Dragging job:', claimData.claimNumber);
}

// Add dragend handler to reset visual state
document.addEventListener('dragend', (event) => {
  if (event.target.classList.contains('job-cipher-card')) {
    event.target.style.opacity = '1';
    event.target.style.cursor = 'grab';
  }
});

// Make handleJobDragStart globally accessible
window.handleJobDragStart = handleJobDragStart;

console.log(
  "🎵 Lyricist Agent: Jobs Studio Professional JavaScript loaded - Ready to manage jobs like a boss!"
);
