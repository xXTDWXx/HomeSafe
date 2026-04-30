const state = {
  route: null,
  routes: [],
  routeLayer: null,
  routeLayers: [],
  selectedRouteIndex: 0,
  originMarker: null,
  destinationMarker: null,
  userMarker: null,
  accuracyCircle: null,
  tripActive: false,
  hasDeviation: false,
  watchId: null,
  hasLiveFix: false,
  isSyncingStartRoute: false,
  deviationGraceUntil: 0,
  safetyCountdownTimer: null,
  safetySecondsLeft: 0,
  lastPosition: null,
  hasAutoLocated: false,
  deviationThresholdMeters: 85,
  safetyCheckSeconds: 60,
  arrivalThresholdMeters: 45,
  shareLiveOnlyDuringTrip: true,
  selectedPlaces: {
    origin: null,
    destination: null,
  },
  autocompleteTimers: {},
  contacts: [
    { id: 1, name: "Emma", phone: "+32 470 11 22 33", level: "best" },
    { id: 2, name: "Noor", phone: "+32 471 44 55 66", level: "friend" },
    { id: 3, name: "Mama", phone: "+32 472 77 88 99", level: "guardian" },
  ],
  mockContacts: [
    { name: "Lotte", phone: "+32 473 21 21 21" },
    { name: "Sara", phone: "+32 474 31 31 31" },
    { name: "Papa", phone: "+32 475 41 41 41" },
    { name: "Zus", phone: "+32 476 51 51 51" },
  ],
};

const els = {
  originInput: document.querySelector("#originInput"),
  originStatus: document.querySelector("#originStatus"),
  destinationInput: document.querySelector("#destinationInput"),
  originSuggestions: document.querySelector("#originSuggestions"),
  destinationSuggestions: document.querySelector("#destinationSuggestions"),
  planRouteButton: document.querySelector("#planRouteButton"),
  startTripButton: document.querySelector("#startTripButton"),
  stopTripButton: document.querySelector("#stopTripButton"),
  panicButton: document.querySelector("#panicButton"),
  safeButton: document.querySelector("#safeButton"),
  simulateDeviationButton: document.querySelector("#simulateDeviationButton"),
  locateButton: document.querySelector("#locateButton"),
  fitRouteButton: document.querySelector("#fitRouteButton"),
  addContactButton: document.querySelector("#addContactButton"),
  clearAlertsButton: document.querySelector("#clearAlertsButton"),
  routeOptionsCard: document.querySelector("#routeOptionsCard"),
  routeOptions: document.querySelector("#routeOptions"),
  routeOptionsCount: document.querySelector("#routeOptionsCount"),
  routeTab: document.querySelector("#routeTab"),
  navigationInfo: document.querySelector("#navigationInfo"),
  routeMetrics: document.querySelector("#routeMetrics"),
  routeStatus: document.querySelector("#routeStatus"),
  tripPill: document.querySelector("#tripPill"),
  safetyTimer: document.querySelector("#safetyTimer"),
  contactList: document.querySelector("#contactList"),
  alertFeed: document.querySelector("#alertFeed"),
  contactDialog: document.querySelector("#contactDialog"),
  contactSelect: document.querySelector("#contactSelect"),
  contactLevelSelect: document.querySelector("#contactLevelSelect"),
  confirmContactButton: document.querySelector("#confirmContactButton"),
  deviationInput: document.querySelector("#deviationInput"),
  deviationValue: document.querySelector("#deviationValue"),
  safetyCheckInput: document.querySelector("#safetyCheckInput"),
  safetyCheckValue: document.querySelector("#safetyCheckValue"),
  privacyLiveOnlyInput: document.querySelector("#privacyLiveOnlyInput"),
  navButtons: document.querySelectorAll("[data-tab]"),
  tabPanels: document.querySelectorAll("[data-tab-panel]"),
};

const levelCopy = {
  friend: {
    label: "Vriend(in)",
    badge: "friend",
    permissions: "Ziet route en krijgt melding bij afwijking.",
  },
  best: {
    label: "Beste vriend(in)",
    badge: "best",
    permissions: "Ziet route, live locatie en alle veiligheidsmeldingen.",
  },
  family: {
    label: "Familie",
    badge: "family",
    permissions: "Krijgt check-ins, aankomst en noodmeldingen.",
  },
  guardian: {
    label: "Ouder/voogd",
    badge: "guardian",
    permissions: "Krijgt altijd escalaties en noodmeldingen.",
  },
};

const settingsStorageKey = "thuisveilig-settings";

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(settingsStorageKey) || "{}");
    if (Number.isFinite(saved.deviationThresholdMeters)) {
      state.deviationThresholdMeters = saved.deviationThresholdMeters;
    }
    if (Number.isFinite(saved.safetyCheckSeconds)) {
      state.safetyCheckSeconds = saved.safetyCheckSeconds;
    }
    if (typeof saved.shareLiveOnlyDuringTrip === "boolean") {
      state.shareLiveOnlyDuringTrip = saved.shareLiveOnlyDuringTrip;
    }
  } catch {
    localStorage.removeItem(settingsStorageKey);
  }
}

function saveSettings() {
  localStorage.setItem(settingsStorageKey, JSON.stringify({
    deviationThresholdMeters: state.deviationThresholdMeters,
    safetyCheckSeconds: state.safetyCheckSeconds,
    shareLiveOnlyDuringTrip: state.shareLiveOnlyDuringTrip,
  }));
}

function renderSettings() {
  const safetyDescription = document.querySelector("#settingsTab .setting-row:nth-child(2) .contact-meta");
  if (safetyDescription) {
    safetyDescription.textContent = 'Tijd om "Ik ben veilig" te drukken na een afwijking.';
  }
  els.deviationInput.value = String(state.deviationThresholdMeters);
  els.deviationValue.textContent = `${state.deviationThresholdMeters} m`;
  els.safetyCheckInput.value = String(state.safetyCheckSeconds);
  els.safetyCheckValue.textContent = `${state.safetyCheckSeconds} s`;
  els.privacyLiveOnlyInput.checked = state.shareLiveOnlyDuringTrip;
}

const map = L.map("map", { zoomControl: false }).setView([50.8467, 4.3525], 14);
L.control.zoom({ position: "bottomleft" }).addTo(map);
L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap &copy; CARTO",
}).addTo(map);

const markerIcons = {
  origin: L.divIcon({
    className: "route-pin route-pin-origin",
    html: '<span data-label="A"></span>',
    iconSize: [34, 42],
    iconAnchor: [17, 38],
    popupAnchor: [0, -36],
  }),
  destination: L.divIcon({
    className: "route-pin route-pin-destination",
    html: '<span data-label="B"></span>',
    iconSize: [34, 42],
    iconAnchor: [17, 38],
    popupAnchor: [0, -36],
  }),
};

function setRouteStatus(message, type = "idle") {
  els.routeStatus.classList.toggle("is-live", type === "live");
  els.routeStatus.classList.toggle("is-alert", type === "alert");
  els.routeStatus.querySelector("span:last-child").textContent = message;
}

function getAlertRecipients(kind) {
  return state.contacts.filter((contact) => {
    if (kind === "panic") return true;
    if (kind === "deviation") return ["friend", "best", "guardian"].includes(contact.level);
    if (kind === "safe") return ["friend", "best", "family", "guardian"].includes(contact.level);
    return ["best", "family", "guardian"].includes(contact.level);
  });
}

function addAlert(title, message, kind = "info", recipientKind = "safe") {
  const recipients = getAlertRecipients(recipientKind).map((contact) => contact.name).join(", ") || "Geen contacten";
  if (!els.alertFeed) {
    console.info(`${title}: ${message} Naar: ${recipients}`);
    return;
  }
  const item = document.createElement("article");
  item.className = `alert-item ${kind}`;
  item.innerHTML = `
    <div>
      <p class="alert-title">${title}</p>
      <p class="alert-meta">${message}</p>
      <p class="alert-meta">Naar: ${recipients}</p>
    </div>
    <span class="level-badge">${new Date().toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}</span>
  `;
  els.alertFeed.prepend(item);
}

function parseCoordinateInput(value) {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return [lat, lon];
}

function renderContacts() {
  els.contactList.innerHTML = "";
  state.contacts.forEach((contact) => {
    const config = levelCopy[contact.level];
    const item = document.createElement("article");
    item.className = "contact-item";
    item.innerHTML = `
      <div>
        <p class="contact-name">${contact.name}</p>
        <p class="contact-meta">${contact.phone}</p>
        <p class="contact-meta">${config.permissions}</p>
      </div>
      <span class="level-badge ${config.badge}">${config.label}</span>
    `;
    els.contactList.appendChild(item);
  });
}

function renderMockContactOptions() {
  els.contactSelect.innerHTML = "";
  const usedPhones = new Set(state.contacts.map((contact) => contact.phone));
  state.mockContacts
    .filter((contact) => !usedPhones.has(contact.phone))
    .forEach((contact) => {
      const option = document.createElement("option");
      option.value = contact.phone;
      option.textContent = `${contact.name} - ${contact.phone}`;
      els.contactSelect.appendChild(option);
    });
}

async function geocode(query) {
  const coordinates = parseCoordinateInput(query);
  if (coordinates) return coordinates;
  if (!query.trim()) throw new Error("Vul een adres in of gebruik je huidige locatie.");

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "be,nl,fr,de,lu");

  const response = await fetch(url);
  if (!response.ok) throw new Error("Adres kon niet opgezocht worden.");
  const results = await response.json();
  if (!results.length) throw new Error(`Geen locatie gevonden voor "${query}".`);
  return [Number(results[0].lat), Number(results[0].lon)];
}

async function searchPlaces(query) {
  if (query.trim().length < 3) return [];
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");
  url.searchParams.set("countrycodes", "be,nl,fr,de,lu");

  const response = await fetch(url);
  if (!response.ok) return [];
  return response.json();
}

function placeToLocation(place) {
  return {
    label: place.display_name,
    lat: Number(place.lat),
    lon: Number(place.lon),
  };
}

function getSelectedCoordinates(field) {
  const selected = state.selectedPlaces[field];
  return selected ? [selected.lat, selected.lon] : null;
}

async function resolveLocation(field) {
  if (field === "origin") {
    if (state.lastPosition) return state.lastPosition;
    const livePosition = await requestCurrentPosition();
    return livePosition;
  }
  const input = els.destinationInput;
  return getSelectedCoordinates(field) || geocode(input.value);
}

function requestCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS is niet beschikbaar op dit toestel."));
      return;
    }
    if (els.originStatus) els.originStatus.textContent = "Huidige locatie wordt opgehaald...";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = [position.coords.latitude, position.coords.longitude];
        setCurrentLocation(coords, position.coords.accuracy);
        resolve(coords);
      },
      () => reject(new Error("Geef locatietoegang om je route vanaf je huidige locatie te starten.")),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );
  });
}

function setCurrentLocation(coords, accuracy = 0) {
  state.lastPosition = coords;
  state.selectedPlaces.origin = {
    label: "Mijn huidige locatie",
    lat: coords[0],
    lon: coords[1],
  };
  if (els.originInput) els.originInput.value = "Mijn huidige locatie";
  if (els.originStatus) {
    els.originStatus.textContent = accuracy
      ? `Huidige locatie actief · nauwkeurigheid ${Math.round(accuracy)} m`
      : "Huidige locatie actief";
  }
}

async function fetchOsrmRoutes(coordinates, alternatives = "false") {
  const path = coordinates.map(([lat, lon]) => `${lon},${lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/foot/${path}?overview=full&geometries=geojson&steps=true&alternatives=${alternatives}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Route kon niet berekend worden.");
  const data = await response.json();
  if (!data.routes?.length) throw new Error("Geen wandelroute gevonden.");
  return data.routes;
}

function routeSignature(route) {
  return `${Math.round(route.distance / 25)}-${Math.round(route.duration / 30)}`;
}

function getRouteViaLabel(route) {
  const names = [];
  route.legs?.forEach((leg) => {
    leg.steps?.forEach((step) => {
      const name = step.name?.trim();
      if (name && !names.includes(name) && !/^(walking|footway)$/i.test(name)) {
        names.push(name);
      }
    });
  });

  if (!names.length) return "via rustigste wandelroute";
  return `via ${names.slice(0, 3).join(", ")}`;
}

function makeViaPoints(origin, destination) {
  const midLat = (origin[0] + destination[0]) / 2;
  const midLon = (origin[1] + destination[1]) / 2;
  const dx = destination[1] - origin[1];
  const dy = destination[0] - origin[0];
  const length = Math.hypot(dx, dy) || 1;
  const perpLat = -dx / length;
  const perpLon = dy / length;
  return [0.004, -0.004, 0.007].map((offset) => [
    midLat + perpLat * offset,
    midLon + perpLon * offset,
  ]);
}

async function getRoutes(origin, destination) {
  const collected = [];
  const seen = new Set();
  const addRoutes = (routes) => {
    routes.forEach((route) => {
      const signature = routeSignature(route);
      if (!seen.has(signature) && collected.length < 3) {
        collected.push(route);
        seen.add(signature);
      }
    });
  };

  addRoutes(await fetchOsrmRoutes([origin, destination], "3"));

  for (const viaPoint of makeViaPoints(origin, destination)) {
    if (collected.length >= 3) break;
    try {
      addRoutes(await fetchOsrmRoutes([origin, viaPoint, destination]));
    } catch {
      // Some generated via points may not snap well to the walking network.
    }
  }

  if (!collected.length) throw new Error("Geen wandelroute gevonden.");
  return collected.slice(0, 3);
}

async function planRoute() {
  els.planRouteButton.disabled = true;
  els.planRouteButton.textContent = "Route zoeken...";
  setRouteStatus("Route wordt berekend");

  try {
    const [origin, destination] = await Promise.all([resolveLocation("origin"), resolveLocation("destination")]);
    const routes = await getRoutes(origin, destination);
    state.routes = routes.map((route, index) => ({
      id: index,
      origin,
      destination,
      coordinates: route.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
      distance: route.distance,
      duration: route.duration,
      via: getRouteViaLabel(route),
    }));
    state.selectedRouteIndex = 0;
    state.route = state.routes[0];
    drawRoutes();
    renderRouteOptions();
    addAlert("Routes berekend", "Kies een route en druk op Vertrekken.", "safe", "safe");
  } catch (error) {
    console.error(error);
    els.routeTab.classList.remove("has-routes");
    addAlert("Route mislukt", error.message, "danger", "safe");
    setRouteStatus("Route kon niet berekend worden", "alert");
  } finally {
    els.planRouteButton.disabled = false;
    els.planRouteButton.textContent = "Route berekenen";
  }
}

function drawRoutes() {
  if (!state.route) return;
  state.routeLayers.forEach((layer) => map.removeLayer(layer));
  state.routeLayers = [];
  state.routeLayer = null;
  if (state.originMarker) map.removeLayer(state.originMarker);
  if (state.destinationMarker) map.removeLayer(state.destinationMarker);
  if (state.userMarker) map.removeLayer(state.userMarker);
  if (state.accuracyCircle) map.removeLayer(state.accuracyCircle);

  state.routes.forEach((route, index) => {
    const isSelected = index === state.selectedRouteIndex;
    const layer = L.polyline(route.coordinates, {
      color: isSelected ? "#45d6b6" : "#7f8d88",
      weight: isSelected ? 8 : 5,
      opacity: isSelected ? 0.95 : 0.44,
    }).addTo(map);
    layer.on("click", () => selectRoute(index));
    state.routeLayers.push(layer);
    if (isSelected) state.routeLayer = layer;
  });
  state.originMarker = L.marker(state.route.origin, { icon: markerIcons.origin }).addTo(map).bindPopup("Vertrekpunt");
  state.destinationMarker = L.marker(state.route.destination, { icon: markerIcons.destination }).addTo(map).bindPopup("Bestemming");
  state.userMarker = L.circleMarker(state.route.origin, {
    radius: 9,
    color: "#ffffff",
    weight: 3,
    fillColor: "#cc5a2e",
    fillOpacity: 1,
  }).addTo(map).bindPopup("Jouw locatie");

  fitRoute();
  updateSelectedRouteMetrics();
  setRouteStatus("Route klaar om te delen");
}

function selectRoute(index) {
  state.selectedRouteIndex = index;
  state.route = state.routes[index];
  updateRouteLayerStyles();
  renderRouteOptions();
  updateSelectedRouteMetrics();
  fitRoute();
}

function updateSelectedRouteMetrics() {
  const km = (state.route.distance / 1000).toFixed(1).replace(".", ",");
  const minutes = Math.max(1, Math.round(state.route.duration / 60));
  els.routeMetrics.innerHTML = `<span>Afstand: ${km} km</span><span>Te voet: ${minutes} min</span>`;
}

function updateRouteLayerStyles() {
  state.routeLayers.forEach((layer, index) => {
    const isSelected = index === state.selectedRouteIndex;
    layer.setStyle({
      color: isSelected ? "#45d6b6" : "#7f8d88",
      weight: isSelected ? 8 : 5,
      opacity: isSelected ? 0.95 : 0.44,
    });
    if (isSelected) {
      state.routeLayer = layer;
      layer.bringToFront();
    }
  });
}

function renderRouteOptions() {
  if (!els.routeOptions || !els.routeOptionsCard) return;
  els.routeOptions.innerHTML = "";
  els.routeOptionsCount.textContent = `${state.routes.length} optie${state.routes.length === 1 ? "" : "s"}`;
  state.routes.forEach((route, index) => {
    const km = (route.distance / 1000).toFixed(1).replace(".", ",");
    const minutes = Math.max(1, Math.round(route.duration / 60));
    const button = document.createElement("button");
    button.type = "button";
    button.className = `route-option ${index === state.selectedRouteIndex ? "is-selected" : ""}`;
    button.innerHTML = `
      <div>
        <p class="route-option-title">${route.via}</p>
        <p class="route-option-meta">${km} km · ongeveer ${minutes} min wandelen</p>
      </div>
    `;
    button.addEventListener("click", () => selectRoute(index));
    els.routeOptions.appendChild(button);
  });
  els.routeOptionsCard.hidden = false;
  els.routeTab.classList.add("has-routes");
}

function fitRoute() {
  if (state.routeLayer) {
    map.fitBounds(state.routeLayer.getBounds(), { padding: [38, 38] });
  }
}

function startTrip() {
  if (!state.route) {
    addAlert("Plan eerst een route", "Kies je vertrekpunt en bestemming voordat je vertrekt.", "warning", "safe");
    return;
  }
  if (state.tripActive) {
    stopTrip();
    return;
  }

  if (!navigator.geolocation) {
    addAlert("GPS niet beschikbaar", "Deze browser ondersteunt geen live locatie. Je kunt wel routes berekenen.", "warning", "safe");
    return;
  }

  state.tripActive = true;
  state.hasDeviation = false;
  state.hasLiveFix = false;
  state.isSyncingStartRoute = false;
  state.deviationGraceUntil = Date.now() + 20000;
  els.tripPill.textContent = "Live";
  els.tripPill.classList.add("active");
  els.startTripButton.textContent = "Stop rit";
  document.body.classList.add("is-navigating");
  document.documentElement.classList.add("is-navigating");
  switchTab("route");
  window.setTimeout(() => {
    map.invalidateSize();
    fitRoute();
  }, 120);
  setRouteStatus("GPS wordt gestart", "live");
  els.navigationInfo.textContent = "GPS wordt gestart...";
  addAlert("Rit gestart", "Je route is actief. Je toestel vraagt nu locatietoegang.", "safe", "safe");

  state.watchId = navigator.geolocation.watchPosition(
    handleLivePosition,
    handleLocationError,
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 }
  );
}

async function handleLivePosition(position) {
  const coords = [position.coords.latitude, position.coords.longitude];
  state.lastPosition = coords;

  if (!state.hasLiveFix) {
    state.hasLiveFix = true;
    setRouteStatus("Route wordt afgestemd op je GPS", "live");
    els.navigationInfo.textContent = "Route wordt afgestemd op je huidige locatie...";
    await syncRouteToLiveStart(coords);
  }

  updateUserPosition(coords, position.coords.accuracy);
  updateRouteLayerStyles();
  map.setView(coords, Math.max(map.getZoom(), 17), { animate: true });

  const distanceFromRoute = distanceToRoute(coords, state.route.coordinates);
  const distanceToDestination = haversineMeters(coords, state.route.destination);
  els.routeMetrics.innerHTML = `
    <span>Afstand route: ${Math.round(distanceFromRoute)} m</span>
    <span>Nog: ${Math.round(distanceToDestination)} m</span>
  `;
  els.navigationInfo.textContent = `${Math.round(distanceToDestination)} m tot bestemming · nauwkeurigheid ${Math.round(position.coords.accuracy || 0)} m`;

  if (distanceToDestination <= state.arrivalThresholdMeters) {
    completeTrip();
    return;
  }

  if (
    !state.isSyncingStartRoute
    && Date.now() > state.deviationGraceUntil
    && distanceFromRoute > state.deviationThresholdMeters
    && !state.hasDeviation
  ) {
    state.hasDeviation = true;
    setRouteStatus("Afwijking gedetecteerd", "alert");
    addAlert("Je bent afgeweken van je route", `Bevestig binnen ${state.safetyCheckSeconds} seconden dat je veilig bent.`, "warning", "deviation");
    startSafetyCountdown(state.safetyCheckSeconds);
  }
}

async function syncRouteToLiveStart(coords) {
  if (!state.route || state.isSyncingStartRoute) return;
  const distanceFromPlannedRoute = distanceToRoute(coords, state.route.coordinates);
  const distanceFromOrigin = haversineMeters(coords, state.route.origin);

  if (distanceFromPlannedRoute <= state.deviationThresholdMeters || distanceFromOrigin <= state.deviationThresholdMeters) {
    return;
  }

  state.isSyncingStartRoute = true;
  try {
    const destination = state.route.destination;
    const routes = await getRoutes(coords, destination);
    state.routes = routes.map((route, index) => ({
      id: index,
      origin: coords,
      destination,
      coordinates: route.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
      distance: route.distance,
      duration: route.duration,
      via: getRouteViaLabel(route),
    }));
    state.selectedRouteIndex = 0;
    state.route = state.routes[0];
    state.deviationGraceUntil = Date.now() + 5000;
    drawRoutes();
    renderRouteOptions();
    setRouteStatus("Route volgt je live locatie", "live");
  } catch (error) {
    console.error(error);
    setRouteStatus("Route behouden", "live");
    els.navigationInfo.textContent = "Kon route niet automatisch aanpassen. Ik volg wel je GPS.";
  } finally {
    state.isSyncingStartRoute = false;
  }
}

function handleLocationError(error) {
  const secureHint = window.isSecureContext
    ? "Controleer of Safari locatietoegang heeft."
    : "iPhone Safari laat GPS meestal alleen toe via HTTPS. Routeberekening werkt wel, live GPS vraagt straks een app-build of HTTPS-link.";
  addAlert("Live locatie kon niet starten", `${error.message || "Geen locatietoegang."} ${secureHint}`, "warning", "safe");
  setRouteStatus("Live GPS niet beschikbaar", "alert");
  els.navigationInfo.textContent = `GPS niet beschikbaar. ${secureHint}`;
}

function updateUserPosition(position, accuracy = 0) {
  state.userMarker.setLatLng(position);
  if (state.accuracyCircle) map.removeLayer(state.accuracyCircle);
  if (accuracy) {
    state.accuracyCircle = L.circle(position, {
      radius: accuracy,
      color: "#187c69",
      fillColor: "#187c69",
      fillOpacity: 0.08,
      weight: 1,
    }).addTo(map);
  }
  if (["best", "guardian"].some((level) => state.contacts.some((contact) => contact.level === level))) {
    state.userMarker.setPopupContent(
      state.shareLiveOnlyDuringTrip
        ? "Live locatie gedeeld tijdens deze actieve rit."
        : "Live locatie delen staat ruimer ingesteld."
    );
  }
  if (state.routeLayer) {
    state.routeLayer.bringToFront();
  }
  if (state.userMarker) {
    state.userMarker.bringToFront();
  }
}

function completeTrip() {
  stopTrip(false);
  state.tripActive = false;
  els.tripPill.textContent = "Aangekomen";
  els.tripPill.classList.remove("active");
  setRouteStatus("Je bent aangekomen", "live");
  addAlert("Je bent aangekomen", "De route is veilig afgerond.", "safe", "safe");
}

function stopTrip(sendAlert = true) {
  if (state.watchId !== null) navigator.geolocation.clearWatch(state.watchId);
  state.watchId = null;
  state.tripActive = false;
  state.hasDeviation = false;
  state.hasLiveFix = false;
  state.isSyncingStartRoute = false;
  state.deviationGraceUntil = 0;
  els.tripPill.textContent = "Niet actief";
  els.tripPill.classList.remove("active");
  els.startTripButton.textContent = "Vertrekken";
  document.body.classList.remove("is-navigating");
  document.documentElement.classList.remove("is-navigating");
  window.setTimeout(() => {
    map.invalidateSize();
    fitRoute();
  }, 80);
  if (sendAlert) {
    setRouteStatus("Rit gestopt");
    addAlert("Rit gestopt", "Live locatie delen is gestopt.", "safe", "safe");
  }
  clearSafetyCountdown();
}

function simulateDeviation() {
  if (!state.tripActive || !state.route || state.hasDeviation) {
    addAlert("Afwijking kan nog niet", "Start een route voordat je een afwijking simuleert.", "warning", "safe");
    return;
  }
  state.hasDeviation = true;
  const current = state.userMarker.getLatLng();
  const deviated = [current.lat + 0.0042, current.lng - 0.0036];
  updateUserPosition(deviated);
  setRouteStatus("Afwijking gedetecteerd", "alert");
  addAlert("Je bent afgeweken van je route", "Je krijgt 20 seconden om te bevestigen dat je veilig bent.", "warning", "deviation");
  startSafetyCountdown(20);
}

function startSafetyCountdown(seconds) {
  clearSafetyCountdown();
  state.safetySecondsLeft = seconds;
  updateSafetyTimer();
  state.safetyCountdownTimer = window.setInterval(() => {
    state.safetySecondsLeft -= 1;
    updateSafetyTimer();
    if (state.safetySecondsLeft <= 0) {
      clearSafetyCountdown();
      triggerEscalation();
    }
  }, 1000);
}

function updateSafetyTimer() {
  els.safetyTimer.textContent = state.safetySecondsLeft > 0
    ? `Safety check: ${state.safetySecondsLeft}s`
    : "Geen timer";
}

function clearSafetyCountdown() {
  if (state.safetyCountdownTimer) window.clearInterval(state.safetyCountdownTimer);
  state.safetyCountdownTimer = null;
  state.safetySecondsLeft = 0;
  updateSafetyTimer();
}

function markSafe() {
  if (!state.tripActive && !state.hasDeviation) {
    addAlert("Status gedeeld", "Je geeft aan dat je veilig bent.", "safe", "safe");
    return;
  }
  clearSafetyCountdown();
  state.hasDeviation = false;
  setRouteStatus("Je geeft aan dat je veilig bent", "live");
  addAlert("Je geeft aan dat je veilig bent", "De eerdere waarschuwing is bevestigd als veilig.", "safe", "safe");
}

function triggerPanic() {
  setRouteStatus("Onveilige situatie uitgestuurd", "alert");
  addAlert("Onveilige situatie", "Je hebt de noodknop gebruikt. Alle gekoppelde contacten worden gewaarschuwd.", "danger", "panic");
}

function triggerEscalation() {
  setRouteStatus("Onveilige situatie automatisch gemeld", "alert");
  addAlert("Onveilige situatie", "Er is niet op tijd gereageerd na de route-afwijking.", "danger", "panic");
}

function locateUser() {
  if (!navigator.geolocation) {
    addAlert("Locatie niet beschikbaar", "Deze browser ondersteunt geen live locatie.", "warning", "safe");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const coords = [position.coords.latitude, position.coords.longitude];
      setCurrentLocation(coords, position.coords.accuracy);
      closeSuggestions("origin");
      map.setView(coords, 16);
      L.circle(coords, {
        radius: position.coords.accuracy || 35,
        color: "#187c69",
        fillColor: "#187c69",
        fillOpacity: 0.12,
      }).addTo(map);
      addAlert("Huidige locatie gezet", "Je vertrekpunt is bijgewerkt met je toestelpositie.", "safe", "safe");
    },
    () => addAlert("Locatie geweigerd", "Geef locatietoegang om je vertrekpunt automatisch te vullen.", "warning", "safe"),
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

function autoLocateStart() {
  if (state.hasAutoLocated || state.selectedPlaces.origin) return;
  if (!navigator.geolocation) return;
  state.hasAutoLocated = true;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const coords = [position.coords.latitude, position.coords.longitude];
      setCurrentLocation(coords, position.coords.accuracy);
      map.setView(coords, 16);
      L.circle(coords, {
        radius: position.coords.accuracy || 35,
        color: "#187c69",
        fillColor: "#187c69",
        fillOpacity: 0.12,
      }).addTo(map);
      setRouteStatus("Huidige locatie als vertrekpunt");
    },
    () => {
      if (els.originStatus) els.originStatus.textContent = "Locatietoegang nodig voor vertrekpunt";
      setRouteStatus("Locatietoegang nodig voor vertrekpunt", "alert");
    },
    { enableHighAccuracy: true, timeout: 9000, maximumAge: 30000 }
  );
}

function addSelectedContact() {
  const selected = state.mockContacts.find((contact) => contact.phone === els.contactSelect.value);
  if (!selected) return;
  state.contacts.push({
    id: Date.now(),
    name: selected.name,
    phone: selected.phone,
    level: els.contactLevelSelect.value,
  });
  renderContacts();
  renderMockContactOptions();
  addAlert("Contact toegevoegd", `${selected.name} is toegevoegd als ${levelCopy[els.contactLevelSelect.value].label}.`, "safe", "safe");
}

async function pickNativeContact() {
  if (!("contacts" in navigator) || !("ContactsManager" in window)) {
    addAlert("Contacten niet beschikbaar", "Deze browser geeft geen webtoegang tot telefooncontacten. In Chrome/Android kan dit wel; op iPhone lossen we dit voor productie native op.", "warning", "safe");
    renderMockContactOptions();
    els.contactDialog.showModal();
    return;
  }

  try {
    const contacts = await navigator.contacts.select(["name", "tel"], { multiple: false });
    const picked = contacts[0];
    if (!picked) return;
    const name = picked.name?.[0] || "Nieuw contact";
    const phone = picked.tel?.[0] || "";
    if (!phone) {
      addAlert("Geen telefoonnummer", "Kies een contact met een telefoonnummer.", "warning", "safe");
      return;
    }

    if (!state.mockContacts.some((contact) => contact.phone === phone) && !state.contacts.some((contact) => contact.phone === phone)) {
      state.mockContacts.unshift({ name, phone });
    }
    renderMockContactOptions();
    els.contactSelect.value = phone;
    els.contactDialog.showModal();
  } catch (error) {
    addAlert("Contact kiezen geannuleerd", error.message || "Er is geen contact toegevoegd.", "warning", "safe");
  }
}

function bindAutocomplete(field, input, container) {
  input.addEventListener("input", () => {
    state.selectedPlaces[field] = null;
    window.clearTimeout(state.autocompleteTimers[field]);
    state.autocompleteTimers[field] = window.setTimeout(async () => {
      const places = await searchPlaces(input.value);
      renderSuggestions(field, places);
    }, 280);
  });

  input.addEventListener("focus", async () => {
    if (input.value.trim().length >= 3 && !state.selectedPlaces[field]) {
      renderSuggestions(field, await searchPlaces(input.value));
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSuggestions(field);
  });

  container.addEventListener("pointerdown", (event) => {
    event.preventDefault();
  });
}

function renderSuggestions(field, places) {
  const container = field === "origin" ? els.originSuggestions : els.destinationSuggestions;
  const input = field === "origin" ? els.originInput : els.destinationInput;
  container.innerHTML = "";

  if (!places.length) {
    closeSuggestions(field);
    return;
  }

  places.forEach((place) => {
    const location = placeToLocation(place);
    const parts = location.label.split(",").map((part) => part.trim());
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggestion-button";
    button.setAttribute("role", "option");

    const main = document.createElement("span");
    main.className = "suggestion-main";
    main.textContent = parts.slice(0, 2).join(", ");

    const sub = document.createElement("span");
    sub.className = "suggestion-sub";
    sub.textContent = parts.slice(2).join(", ") || location.label;

    button.append(main, sub);
    button.addEventListener("click", () => selectSuggestion(field, location));
    container.appendChild(button);
  });

  container.classList.add("is-open");
  input.closest(".address-field")?.classList.add("has-suggestions");
}

function selectSuggestion(field, location) {
  state.selectedPlaces[field] = location;
  const input = field === "origin" ? els.originInput : els.destinationInput;
  input.value = location.label;
  closeSuggestions(field);
}

function closeSuggestions(field) {
  const container = field === "origin" ? els.originSuggestions : els.destinationSuggestions;
  const input = field === "origin" ? els.originInput : els.destinationInput;
  if (!container) return;
  container.classList.remove("is-open");
  container.innerHTML = "";
  input?.closest(".address-field")?.classList.remove("has-suggestions");
}

function closeAllSuggestions() {
  closeSuggestions("origin");
  closeSuggestions("destination");
}

function switchTab(tab) {
  els.navButtons.forEach((button) => {
    const isActive = button.dataset.tab === tab;
    button.classList.toggle("is-active", isActive);
    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  els.tabPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.tabPanel === tab);
  });

  closeAllSuggestions();

  if (tab === "route") {
    window.setTimeout(() => {
      map.invalidateSize();
      fitRoute();
    }, 80);
  }
}

function bindEvents() {
  els.planRouteButton.addEventListener("click", planRoute);
  els.startTripButton.addEventListener("click", startTrip);
  els.panicButton.addEventListener("click", triggerPanic);
  els.safeButton.addEventListener("click", markSafe);
  els.simulateDeviationButton.addEventListener("click", simulateDeviation);
  els.locateButton.addEventListener("click", locateUser);
  els.fitRouteButton.addEventListener("click", fitRoute);
  els.stopTripButton.addEventListener("click", () => stopTrip());
  els.clearAlertsButton?.addEventListener("click", () => {
    if (els.alertFeed) els.alertFeed.innerHTML = "";
  });
  els.addContactButton.addEventListener("click", pickNativeContact);
  els.confirmContactButton.addEventListener("click", addSelectedContact);
  els.deviationInput.addEventListener("input", () => {
    state.deviationThresholdMeters = Number(els.deviationInput.value);
    renderSettings();
    saveSettings();
  });
  els.safetyCheckInput.addEventListener("input", () => {
    state.safetyCheckSeconds = Number(els.safetyCheckInput.value);
    renderSettings();
    saveSettings();
  });
  els.privacyLiveOnlyInput.addEventListener("change", () => {
    state.shareLiveOnlyDuringTrip = els.privacyLiveOnlyInput.checked;
    renderSettings();
    saveSettings();
    addAlert(
      "Privacy bijgewerkt",
      state.shareLiveOnlyDuringTrip
        ? "Live locatie wordt alleen gedeeld tijdens een actieve rit."
        : "Je laat toe dat live delen later ook buiten een actieve rit kan worden gebruikt.",
      "safe",
      "safe"
    );
  });
  els.navButtons.forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });
  bindAutocomplete("destination", els.destinationInput, els.destinationSuggestions);
  document.addEventListener("click", closeAllSuggestions);
}

loadSettings();
renderSettings();
renderContacts();
renderMockContactOptions();
bindEvents();
setRouteStatus("Huidige locatie wordt opgehaald");
autoLocateStart();

function haversineMeters(a, b) {
  const radius = 6371000;
  const toRad = (degrees) => degrees * Math.PI / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function toXY(point, origin) {
  const radius = 6371000;
  const toRad = (degrees) => degrees * Math.PI / 180;
  const lat = toRad(point[0]);
  const lon = toRad(point[1]);
  const originLat = toRad(origin[0]);
  const originLon = toRad(origin[1]);
  return {
    x: (lon - originLon) * Math.cos((lat + originLat) / 2) * radius,
    y: (lat - originLat) * radius,
  };
}

function pointToSegmentDistanceMeters(point, start, end) {
  const p = toXY(point, point);
  const a = toXY(start, point);
  const b = toXY(end, point);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return haversineMeters(point, start);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  const projection = { x: a.x + t * dx, y: a.y + t * dy };
  return Math.hypot(p.x - projection.x, p.y - projection.y);
}

function distanceToRoute(point, routeCoordinates) {
  let shortest = Infinity;
  for (let index = 0; index < routeCoordinates.length - 1; index += 1) {
    const distance = pointToSegmentDistanceMeters(point, routeCoordinates[index], routeCoordinates[index + 1]);
    if (distance < shortest) shortest = distance;
  }
  return shortest;
}
