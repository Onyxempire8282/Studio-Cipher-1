const hubs = window.CIPHER_HUBS || [];
const STORE_KEYS = {
  verified: "cipher_hubs_verified_locations",
  favorites: "cipher_hubs_favorites",
  recent: "cipher_hubs_recent",
  route: "cipher_hubs_route"
};

const $ = (id) => document.getElementById(id);
const searchInput = $("searchInput");
const results = $("results");
const stats = $("stats");
const template = $("hubTemplate");
const routeList = $("routeList");
const routeCount = $("routeCount");

const load = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};

const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));

let verified = load(STORE_KEYS.verified, {});
let favorites = load(STORE_KEYS.favorites, []);
let recent = load(STORE_KEYS.recent, []);
let route = load(STORE_KEYS.route, []);
let activeFilter = "all";

function normalize(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function hubSearchText(hub) {
  return normalize([
    hub.id, hub.olt, hub.hub, hub.hubNumber, hub.address,
    hub.development, hub.cabinet, hub.pairs, hub.siteTitle
  ].join(" "));
}

function hydrateHub(hub) {
  const saved = verified[hub.id];
  return saved ? { ...hub, ...saved, verified: true } : hub;
}

function mapsQueryFor(hub) {
  const h = hydrateHub(hub);
  if (h.lat && h.lng) return `${h.lat},${h.lng}`;
  return h.mapsQuery || `${h.address} ${h.siteTitle} North Carolina`;
}

function googleMapsUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function directionsUrl(stops) {
  const cleanStops = stops.map(s => s.query).filter(Boolean);
  if (cleanStops.length === 1) {
    return googleMapsUrl(cleanStops[0]);
  }
  const destination = cleanStops[cleanStops.length - 1];
  const waypoints = cleanStops.slice(0, -1).join("|");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
}

function addRecent(id) {
  recent = [id, ...recent.filter(x => x !== id)].slice(0, 25);
  save(STORE_KEYS.recent, recent);
}

function addRouteStop(label, query) {
  route.push({ label, query });
  save(STORE_KEYS.route, route);
  renderRoute();
}

function renderRoute() {
  routeCount.textContent = `${route.length} ${route.length === 1 ? "stop" : "stops"}`;
  routeList.innerHTML = "";
  route.forEach((stop, index) => {
    const li = document.createElement("li");
    li.textContent = stop.label;
    li.title = stop.query;
    li.addEventListener("click", () => {
      route.splice(index, 1);
      save(STORE_KEYS.route, route);
      renderRoute();
    });
    routeList.appendChild(li);
  });
}

function badge(text, cls = "") {
  const span = document.createElement("span");
  span.className = `badge ${cls}`;
  span.textContent = text;
  return span;
}

function renderHub(hub) {
  const h = hydrateHub(hub);
  const node = template.content.cloneNode(true);
  const card = node.querySelector(".hub-card");
  const title = node.querySelector("h2");
  const subline = node.querySelector(".subline");
  const address = node.querySelector(".address");
  const meta = node.querySelector(".meta");
  const status = node.querySelector(".status-row");
  const favBtn = node.querySelector(".favorite");

  title.textContent = `${h.olt} - ${h.hub}`;
  subline.textContent = h.id;
  address.textContent = h.address || "No address description listed.";

  const metaItems = [
    ["Development", h.development],
    ["Cabinet", h.cabinet],
    ["Pairs", h.pairs],
    ["OLT note", h.siteTitle]
  ].filter(([, value]) => value);

  metaItems.forEach(([label, value]) => {
    const span = document.createElement("span");
    span.innerHTML = `<strong>${label}:</strong> ${value}`;
    meta.appendChild(span);
  });

  status.appendChild(h.verified ? badge("GPS verified", "good") : badge("Estimated from sheet", "warn"));
  if (recent.includes(h.id)) status.appendChild(badge("Recent", "blue"));
  if (favorites.includes(h.id)) status.appendChild(badge("Favorite", "blue"));

  favBtn.textContent = favorites.includes(h.id) ? "★" : "☆";
  favBtn.classList.toggle("on", favorites.includes(h.id));
  favBtn.addEventListener("click", () => {
    favorites = favorites.includes(h.id) ? favorites.filter(x => x !== h.id) : [h.id, ...favorites];
    save(STORE_KEYS.favorites, favorites);
    render();
  });

  node.querySelector(".navigate").addEventListener("click", () => {
    addRecent(h.id);
    window.open(googleMapsUrl(mapsQueryFor(h)), "_blank");
    render();
  });

  node.querySelector(".add-stop").addEventListener("click", () => {
    addRecent(h.id);
    addRouteStop(`${h.olt} ${h.hub}`, mapsQueryFor(h));
    render();
  });

  node.querySelector(".save-location").addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("GPS is not available on this device/browser.");
      return;
    }

    const confirmSave = confirm(`Save your current GPS location as the verified pin for ${h.olt} ${h.hub}? Stand at the cabinet before saving.`);
    if (!confirmSave) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        verified[h.id] = {
          lat: Number(pos.coords.latitude.toFixed(7)),
          lng: Number(pos.coords.longitude.toFixed(7)),
          accuracy: Math.round(pos.coords.accuracy || 0),
          verified: true,
          verifiedAt: new Date().toISOString()
        };
        save(STORE_KEYS.verified, verified);
        addRecent(h.id);
        alert(`Saved ${h.olt} ${h.hub}. Accuracy: about ${verified[h.id].accuracy} meters.`);
        render();
      },
      (err) => alert(`Could not get GPS location: ${err.message}`),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });

  return card;
}

function filteredHubs() {
  const q = normalize(searchInput.value);
  let list = hubs;

  if (activeFilter === "verified") list = list.filter(h => verified[h.id]);
  if (activeFilter === "favorites") list = list.filter(h => favorites.includes(h.id));
  if (activeFilter === "recent") {
    const map = new Map(hubs.map(h => [h.id, h]));
    list = recent.map(id => map.get(id)).filter(Boolean);
  }

  if (!q) return list.slice(0, activeFilter === "all" ? 40 : 100);

  const parts = q.split(" ").filter(Boolean);
  return list
    .map(h => {
      const text = hubSearchText(h);
      let score = 0;
      for (const part of parts) if (text.includes(part)) score += 1;
      if (normalize(h.id) === q || normalize(`${h.olt} ${h.hubNumber}`) === q) score += 10;
      if (normalize(h.olt) === q) score += 4;
      return { h, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || a.h.id.localeCompare(b.h.id))
    .map(x => x.h)
    .slice(0, 80);
}

function render() {
  const list = filteredHubs();
  results.innerHTML = "";
  const verifiedCount = Object.keys(verified).length;
  stats.textContent = `${hubs.length} hubs loaded • ${verifiedCount} GPS verified • showing ${list.length}`;

  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "hub-card";
    empty.innerHTML = "<h2>No hubs found</h2><p class='subline'>Try the OLT code, hub number, road name, or development.</p>";
    results.appendChild(empty);
    return;
  }

  list.forEach(h => results.appendChild(renderHub(h)));
}

searchInput.addEventListener("input", render);
$("clearBtn").addEventListener("click", () => {
  searchInput.value = "";
  searchInput.focus();
  render();
});

document.querySelectorAll("[data-filter]").forEach(btn => {
  btn.addEventListener("click", () => {
    activeFilter = btn.dataset.filter;
    render();
  });
});

$("addAddressBtn").addEventListener("click", () => {
  const address = prompt("Enter address or location to add to route:");
  if (!address) return;
  addRouteStop(address, address);
});

$("openRouteBtn").addEventListener("click", () => {
  if (!route.length) {
    alert("Add at least one stop first.");
    return;
  }
  window.open(directionsUrl(route), "_blank");
});

$("clearRouteBtn").addEventListener("click", () => {
  if (!route.length || confirm("Clear route pad?")) {
    route = [];
    save(STORE_KEYS.route, route);
    renderRoute();
  }
});

let deferredPrompt;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  $("installBtn").classList.remove("hidden");
});

$("installBtn").addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  $("installBtn").classList.add("hidden");
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}

renderRoute();
render();
