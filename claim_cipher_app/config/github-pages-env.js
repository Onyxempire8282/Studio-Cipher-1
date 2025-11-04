/**
 * GitHub Pages Environment Configuration
 * This file helps detect if we're running on GitHub Pages or locally
 */

window.GITHUB_PAGES_ENV = {
  isGitHubPages: window.location.hostname.includes("github.io"),
  isDevelopment:
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "",

  getBasePath: function () {
    if (this.isGitHubPages) {
      // On GitHub Pages, usually /repo-name/
      return window.location.pathname.split("/").slice(0, 2).join("/") + "/";
    }
    return "/";
  },

  log: function () {
    console.log(
      "🌍 Environment:",
      this.isGitHubPages ? "GitHub Pages" : "Development"
    );
    console.log("📂 Base Path:", this.getBasePath());
  },
};

// Log environment on load
window.GITHUB_PAGES_ENV.log();
