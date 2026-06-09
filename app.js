const STORAGE_KEY = "bicycle-trainer-records";
const KAKAO_MAP_KEY = "bicycle-trainer-kakao-map-key";
const LEGACY_NAVER_MAP_KEY = "bicycle-trainer-naver-map-key";
const OPENAI_API_KEY = "bicycle-trainer-openai-api-key";
const PROFILE_KEY = "bicycle-trainer-profile";
const WEIGHT_HISTORY_KEY = "bicycle-trainer-weight-history";
const APP_VERSION_CODE = 4;
const APP_VERSION_NAME = "1.0.3";
const APP_VERSION_URL = "https://wony67.github.io/BicycleTrainer/version.json";
const APP_DOWNLOAD_PAGE_URL = "https://wony67.github.io/BicycleTrainer/download/";
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDH56iQLm6_ItENRTIwI2-GRT8Pp16e7L4",
  authDomain: "bicycle-trainer-c027e.firebaseapp.com",
  projectId: "bicycle-trainer-c027e",
  storageBucket: "bicycle-trainer-c027e.firebasestorage.app",
  messagingSenderId: "771348409840",
  appId: "1:771348409840:web:9f7a6fcfcc00bd0b734135",
  measurementId: "G-EXJ0GCK1R5",
};

const state = {
  records: loadRecords(),
  profile: loadProfile(),
  weightHistory: loadWeightHistory(),
  riding: false,
  startedAt: 0,
  elapsedTimer: null,
  watchId: null,
  lastPosition: null,
  distanceKm: 0,
  currentSpeed: 0,
  installPrompt: null,
  routePoints: [],
  map: null,
  mapMarker: null,
  mapAccuracy: null,
  mapRoute: null,
  destinationMarker: null,
  destinationLine: null,
  mapResizeObserver: null,
  mapProvider: null,
  kakaoMapLoading: false,
  kakaoPlaces: null,
  updateRegistration: null,
  waitingWorker: null,
  nativeUpdateInfo: null,
  firebaseReady: false,
  firebaseAuth: null,
  firebaseDb: null,
  cloudUser: null,
  reloadingForUpdate: false,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  updateBanner: $("#updateBanner"),
  updateTitle: $("#updateBanner strong"),
  updateText: $("#updateBanner span"),
  updateNow: $("#updateNow"),
  installApp: $("#installApp"),
  gpsCheck: $("#gpsCheck"),
  gpsStatus: $("#gpsStatus"),
  rideToggle: $("#rideToggle"),
  elapsed: $("#elapsed"),
  distance: $("#distance"),
  avgSpeed: $("#avgSpeed"),
  speed: $("#speed"),
  recordsList: $("#recordsList"),
  manualRideForm: $("#manualRideForm"),
  clearRecords: $("#clearRecords"),
  mapLocateMe: $("#mapLocateMe"),
  routeMap: $("#routeMap"),
  mapStatus: $("#mapStatus"),
  coords: $("#coords"),
  routeForm: $("#routeForm"),
  routeAdvice: $("#routeAdvice"),
  routeResults: $("#routeResults"),
  destination: $("#destination"),
  routeDistance: $("#routeDistance"),
  coachForm: $("#coachForm"),
  coachMessage: $("#coachMessage"),
  workoutPlan: $("#workoutPlan"),
  totalDistance: $("#totalDistance"),
  totalTime: $("#totalTime"),
  bestDistance: $("#bestDistance"),
  weeklyCount: $("#weeklyCount"),
  distanceChart: $("#distanceChart"),
  settingsForm: $("#settingsForm"),
  profileForm: $("#profileForm"),
  profileName: $("#profileName"),
  profileHeight: $("#profileHeight"),
  profileWeight: $("#profileWeight"),
  profileGoal: $("#profileGoal"),
  weightHistoryList: $("#weightHistoryList"),
  kakaoMapKey: $("#kakaoMapKey"),
  openAiKey: $("#openAiKey"),
  settingsStatus: $("#settingsStatus"),
  firebaseLogin: $("#firebaseLogin"),
  firebaseLogout: $("#firebaseLogout"),
  cloudBackup: $("#cloudBackup"),
  cloudRestore: $("#cloudRestore"),
  cloudStatus: $("#cloudStatus"),
  clearKakaoKey: $("#clearKakaoKey"),
  clearOpenAiKey: $("#clearOpenAiKey"),
};

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {};
  } catch {
    return {};
  }
}

function loadWeightHistory() {
  try {
    return JSON.parse(localStorage.getItem(WEIGHT_HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
}

function saveProfile() {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(state.profile));
}

function saveWeightHistory() {
  localStorage.setItem(WEIGHT_HISTORY_KEY, JSON.stringify(state.weightHistory));
}

function getKakaoMapKey() {
  return localStorage.getItem(KAKAO_MAP_KEY) || "";
}

function getOpenAiKey() {
  return localStorage.getItem(OPENAI_API_KEY) || "";
}

function saveOpenAiKeyFromInput() {
  if (!elements.openAiKey) return;
  const key = elements.openAiKey.value.trim();
  if (!key) return;
  localStorage.setItem(OPENAI_API_KEY, key);
  setSettingsStatus("OpenAI 키를 저장했습니다. 앱을 다시 열어도 이 기기에 유지됩니다.");
}

function setSettingsStatus(message) {
  if (elements.settingsStatus) elements.settingsStatus.textContent = message;
}

function setCloudStatus(message) {
  if (elements.cloudStatus) elements.cloudStatus.textContent = message;
}

function renderCloudControls() {
  const signedIn = Boolean(state.cloudUser);
  if (elements.firebaseLogin) elements.firebaseLogin.hidden = signedIn;
  if (elements.firebaseLogout) elements.firebaseLogout.hidden = !signedIn;
  if (elements.cloudBackup) elements.cloudBackup.disabled = !signedIn;
  if (elements.cloudRestore) elements.cloudRestore.disabled = !signedIn;

  if (!state.firebaseReady) {
    setCloudStatus("Firebase SDK를 불러오지 못했습니다. 네트워크 연결을 확인하세요.");
    return;
  }

  if (signedIn) {
    const label = state.cloudUser.displayName || state.cloudUser.email || "로그인 사용자";
    setCloudStatus(`${label} 계정으로 연결되었습니다. API 키는 클라우드에 저장하지 않습니다.`);
    return;
  }

  setCloudStatus("Google 로그인 후 주행기록, 프로필, 몸무게 히스토리를 클라우드에 백업할 수 있습니다.");
}

function renderSettings() {
  const key = getKakaoMapKey();
  const openAiKey = getOpenAiKey();
  if (elements.kakaoMapKey) elements.kakaoMapKey.value = key;
  if (elements.openAiKey) elements.openAiKey.value = openAiKey;
  setSettingsStatus(
    [
      openAiKey ? "OpenAI 키 저장됨: AI 코치가 실제 API를 사용합니다." : "OpenAI 키 없음: 로컬 규칙 기반 코치를 사용합니다.",
      key ? "카카오맵 키 저장됨: 경로 탭에서 카카오맵을 우선 사용합니다." : "카카오맵 키 없음: OpenStreetMap을 사용합니다.",
      "API 키는 이 기기의 브라우저에만 저장됩니다.",
    ].join(" "),
  );
  renderCloudControls();
}

function renderProfile() {
  if (elements.profileName) elements.profileName.value = state.profile.name || "";
  if (elements.profileHeight) elements.profileHeight.value = state.profile.heightCm || "";
  if (elements.profileWeight) elements.profileWeight.value = state.profile.weightKg || "";
  if (elements.profileGoal) elements.profileGoal.value = state.profile.goal || "endurance";
  renderWeightHistory();
}

function renderWeightHistory() {
  if (!elements.weightHistoryList) return;

  if (!state.weightHistory.length) {
    elements.weightHistoryList.innerHTML = `<div class="record-item"><strong>아직 몸무게 기록이 없습니다</strong><span>프로필 저장 시 몸무게 변화가 기록됩니다.</span></div>`;
    return;
  }

  elements.weightHistoryList.innerHTML = state.weightHistory
    .slice(0, 8)
    .map(
      (entry) => `
        <article class="record-item">
          <strong>${entry.weightKg.toFixed(1)} kg</strong>
          <span>${formatDate(entry.date)}</span>
        </article>
      `,
    )
    .join("");
}

function addWeightHistory(weightKg) {
  if (!weightKg) return;
  const latest = state.weightHistory[0];
  if (latest && Math.abs(latest.weightKg - weightKg) < 0.05) return;

  state.weightHistory = [
    { date: new Date().toISOString(), weightKg: Number(weightKg.toFixed(1)) },
    ...state.weightHistory,
  ].slice(0, 120);
  saveWeightHistory();
}

function getWeightTrend() {
  if (state.weightHistory.length < 2) return null;
  const latest = state.weightHistory[0];
  const previous = state.weightHistory.find((entry) => entry.date !== latest.date) || state.weightHistory[1];
  const diff = Number((latest.weightKg - previous.weightKg).toFixed(1));
  if (Math.abs(diff) < 0.1) return { diff, label: "stable" };
  return { diff, label: diff > 0 ? "up" : "down" };
}

function getProfileGoalLabel(goal) {
  const labels = {
    endurance: "지구력 향상",
    fatloss: "체중 감량",
    speed: "속도 향상",
    health: "건강 유지",
  };
  return labels[goal] || "지구력 향상";
}

function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}

function haversineKm(a, b) {
  const radius = 6371;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

function setGpsStatus(message) {
  elements.gpsStatus.textContent = message;
}

function setMapStatus(message, status = "") {
  if (!elements.mapStatus) return;
  elements.mapStatus.textContent = message;
  elements.mapStatus.classList.toggle("ready", status === "ready");
  elements.mapStatus.classList.toggle("error", status === "error");
}

function isNativeApp() {
  return Boolean(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.getPlatform?.() === "android");
}

function setUpdateBannerText(title, message, buttonText) {
  if (elements.updateTitle) elements.updateTitle.textContent = title;
  if (elements.updateText) elements.updateText.textContent = message;
  if (elements.updateNow) elements.updateNow.textContent = buttonText;
}

function showUpdateBanner(registration) {
  state.updateRegistration = registration;
  state.waitingWorker = registration.waiting;
  if (!state.waitingWorker || !elements.updateBanner) return;
  setUpdateBannerText("새 버전 사용 가능", "최신 웹앱 파일을 적용하려면 업데이트하세요.", "업데이트 적용");
  elements.updateBanner.hidden = false;
}

function showNativeUpdateBanner(updateInfo) {
  state.nativeUpdateInfo = updateInfo;
  if (!elements.updateBanner) return;
  const versionName = updateInfo.versionName ? ` ${updateInfo.versionName}` : "";
  setUpdateBannerText("앱 업데이트 사용 가능", `새 Android 앱${versionName}을 다운로드할 수 있습니다.`, "APK 다운로드");
  elements.updateBanner.hidden = false;
}

function hideUpdateBanner() {
  if (elements.updateBanner) elements.updateBanner.hidden = true;
}

function watchInstallingWorker(registration) {
  const worker = registration.installing;
  if (!worker) return;

  worker.addEventListener("statechange", () => {
    if (worker.state === "installed" && navigator.serviceWorker.controller) {
      showUpdateBanner(registration);
    }
  });
}

function setupAppUpdates(registration) {
  if (isNativeApp()) return;
  state.updateRegistration = registration;

  if (registration.waiting) {
    showUpdateBanner(registration);
  }

  registration.addEventListener("updatefound", () => watchInstallingWorker(registration));

  window.addEventListener("focus", () => {
    registration.update().catch(() => {});
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      registration.update().catch(() => {});
    }
  });

  setInterval(() => {
    registration.update().catch(() => {});
  }, 30 * 60 * 1000);
}

function applyAppUpdate() {
  if (isNativeApp()) {
    const url = state.nativeUpdateInfo?.downloadPageUrl || state.nativeUpdateInfo?.apkUrl || APP_DOWNLOAD_PAGE_URL;
    window.open(url, "_blank", "noopener");
    return;
  }

  if (!state.waitingWorker) return;
  hideUpdateBanner();
  state.waitingWorker.postMessage({ type: "SKIP_WAITING" });
}

async function checkNativeAppUpdate() {
  if (!isNativeApp()) return;

  try {
    const response = await fetch(`${APP_VERSION_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return;
    const updateInfo = await response.json();
    if (Number(updateInfo.versionCode) > APP_VERSION_CODE) {
      showNativeUpdateBanner(updateInfo);
    }
  } catch {
    // Native update checks should never block app startup.
  }
}

if ("serviceWorker" in navigator && !isNativeApp()) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (state.reloadingForUpdate) return;
    state.reloadingForUpdate = true;
    window.location.reload();
  });
}

function isSecureGpsContext() {
  return window.isSecureContext || ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

function getGpsErrorMessage(error) {
  if (!isSecureGpsContext()) return "HTTPS 필요";
  if (!error) return "GPS 오류";
  if (error.code === error.PERMISSION_DENIED) return "권한 거부됨";
  if (error.code === error.POSITION_UNAVAILABLE) return "신호 없음";
  if (error.code === error.TIMEOUT) return "GPS 대기 중";
  return "GPS 오류";
}

function updatePosition(position) {
  const current = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
  const latLng = [current.latitude, current.longitude];

  if (state.riding && state.lastPosition) {
    const nextDistance = haversineKm(state.lastPosition, current);
    if (nextDistance < 0.2) {
      state.distanceKm += nextDistance;
      state.routePoints.push(latLng);
    }
  } else if (state.riding && !state.routePoints.length) {
    state.routePoints.push(latLng);
  }

  state.currentSpeed = Math.max(0, (position.coords.speed || 0) * 3.6);
  state.lastPosition = current;
  elements.coords.textContent = `${current.latitude.toFixed(5)}, ${current.longitude.toFixed(5)}`;
  setGpsStatus("GPS 수신");
  syncMapPosition(latLng, position.coords.accuracy);
  updateRideMetrics();
}

function initRouteMap() {
  if (state.map || !elements.routeMap) return Boolean(state.map);
  const kakaoKey = getKakaoMapKey();
  if (kakaoKey) return initKakaoRouteMap(kakaoKey);
  return initLeafletRouteMap();
}

function initLeafletRouteMap() {
  if (!window.L) {
    setMapStatus("지도 라이브러리를 불러오지 못했습니다. 네트워크 연결 후 새로고침하세요.", "error");
    return false;
  }

  const defaultCenter = [37.5665, 126.978];
  state.mapProvider = "leaflet";
  state.map = L.map(elements.routeMap, {
    zoomControl: true,
    attributionControl: true,
  }).setView(defaultCenter, 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(state.map);

  state.mapRoute = L.polyline([], {
    color: "#0e7c66",
    weight: 5,
    opacity: 0.9,
  }).addTo(state.map);

  if ("ResizeObserver" in window) {
    state.mapResizeObserver = new ResizeObserver(() => invalidateMapSize());
    state.mapResizeObserver.observe(elements.routeMap);
  }

  setMapStatus("지도가 준비되었습니다. 현재 위치를 누르면 내 위치로 이동합니다.", "ready");
  invalidateMapSize();
  return true;
}

function initKakaoRouteMap(kakaoKey) {
  if (!window.kakao?.maps) {
    loadKakaoMapScript(kakaoKey);
    return false;
  }

  const defaultCenter = new kakao.maps.LatLng(37.5665, 126.978);
  state.mapProvider = "kakao";
  state.map = new kakao.maps.Map(elements.routeMap, {
    center: defaultCenter,
    level: 5,
  });

  state.mapRoute = new kakao.maps.Polyline({
    map: state.map,
    path: [],
    strokeColor: "#0e7c66",
    strokeOpacity: 0.9,
    strokeWeight: 5,
  });
  state.kakaoPlaces = window.kakao.maps.services ? new kakao.maps.services.Places(state.map) : null;

  if ("ResizeObserver" in window) {
    state.mapResizeObserver = new ResizeObserver(() => invalidateMapSize());
    state.mapResizeObserver.observe(elements.routeMap);
  }

  setMapStatus("카카오맵이 준비되었습니다. 현재 위치를 누르면 내 위치로 이동합니다.", "ready");
  invalidateMapSize();
  return true;
}

function loadKakaoMapScript(kakaoKey) {
  if (state.kakaoMapLoading) return;
  state.kakaoMapLoading = true;
  setMapStatus("카카오맵을 불러오는 중입니다.", "ready");

  const script = document.createElement("script");
  script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(kakaoKey)}&autoload=false&libraries=services`;
  script.async = true;
  script.onload = () => {
    window.kakao.maps.load(() => {
      state.kakaoMapLoading = false;
      initRouteMap();
      refreshRouteMap();
    });
  };
  script.onerror = () => {
    state.kakaoMapLoading = false;
    setMapStatus("카카오맵을 불러오지 못했습니다. JavaScript 키와 허용 도메인을 확인하세요.", "error");
  };
  document.head.appendChild(script);
}

function createLocationIcon() {
  return L.divIcon({
    className: "",
    html: '<div class="my-location-marker" aria-hidden="true"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function toProviderLatLng(latLng) {
  if (state.mapProvider === "kakao") return new kakao.maps.LatLng(latLng[0], latLng[1]);
  return latLng;
}

function invalidateMapSize() {
  if (!state.map) return;
  if (state.mapProvider === "kakao") {
    [0, 80, 250, 700, 1400].forEach((delay) => {
      setTimeout(() => {
        state.map.relayout();
      }, delay);
    });
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => state.map.invalidateSize({ pan: false }));
  });
  [80, 250, 700, 1400].forEach((delay) => {
    setTimeout(() => state.map.invalidateSize({ pan: false }), delay);
  });
}

function syncMapPosition(latLng, accuracy) {
  if (!initRouteMap()) return;
  if (!state.map) return;
  const providerLatLng = toProviderLatLng(latLng);

  if (!state.mapMarker) {
    if (state.mapProvider === "kakao") {
      state.mapMarker = new kakao.maps.Marker({
        position: providerLatLng,
        map: state.map,
        title: "내 위치",
      });
    } else {
      state.mapMarker = L.marker(latLng, {
        icon: createLocationIcon(),
        keyboard: false,
        title: "내 위치",
        zIndexOffset: 1000,
      }).addTo(state.map).bindPopup("내 위치");
    }
  } else {
    if (state.mapProvider === "kakao") state.mapMarker.setPosition(providerLatLng);
    else state.mapMarker.setLatLng(latLng);
  }

  if (!state.mapAccuracy) {
    if (state.mapProvider === "kakao") {
      state.mapAccuracy = new kakao.maps.Circle({
        map: state.map,
        center: providerLatLng,
        radius: accuracy || 30,
        strokeColor: "#2563eb",
        strokeOpacity: 0.9,
        strokeWeight: 1,
        fillColor: "#2563eb",
        fillOpacity: 0.12,
      });
    } else {
      state.mapAccuracy = L.circle(latLng, {
        radius: accuracy || 30,
        color: "#2563eb",
        fillColor: "#2563eb",
        fillOpacity: 0.12,
        weight: 1,
      }).addTo(state.map);
    }
  } else {
    if (state.mapProvider === "kakao") {
      state.mapAccuracy.setPosition(providerLatLng);
      state.mapAccuracy.setRadius(accuracy || 30);
    } else {
      state.mapAccuracy.setLatLng(latLng);
      state.mapAccuracy.setRadius(accuracy || 30);
    }
  }

  if (state.mapRoute) {
    if (state.mapProvider === "kakao") {
      state.mapRoute.setPath(state.routePoints.map(toProviderLatLng));
    } else {
      state.mapRoute.setLatLngs(state.routePoints);
    }
  }

  invalidateMapSize();
  if (state.mapProvider === "kakao") {
    state.map.setCenter(providerLatLng);
    state.map.setLevel(Math.min(state.map.getLevel(), 4));
  } else {
    state.map.setView(latLng, Math.max(state.map.getZoom(), 16), { animate: true });
  }
  setMapStatus("현재 위치가 지도에 표시되었습니다.", "ready");
}

function centerMapOnCurrentLocation() {
  refreshRouteMap();

  if (state.lastPosition) {
    const latLng = [state.lastPosition.latitude, state.lastPosition.longitude];
    syncMapPosition(latLng, state.mapAccuracy?.getRadius?.() || 30);
    return;
  }

  checkGpsOnce();
}

function clearDestinationGuide() {
  state.destinationMarker?.setMap?.(null);
  state.destinationLine?.setMap?.(null);
  state.destinationMarker = null;
  state.destinationLine = null;
}

function renderRouteResults(results) {
  if (!elements.routeResults) return;
  elements.routeResults.innerHTML = "";

  results.forEach((place) => {
    const button = document.createElement("button");
    button.className = "route-result";
    button.type = "button";
    button.innerHTML = `
      <strong>${escapeHtml(place.place_name || "목적지")}</strong>
      <span>${escapeHtml(place.road_address_name || place.address_name || "주소 정보 없음")}</span>
    `;
    button.addEventListener("click", () => selectDestination(place));
    elements.routeResults.appendChild(button);
  });
}

function searchDestination(keyword) {
  if (!keyword) return;
  if (!getKakaoMapKey()) {
    updateRouteAdvice(keyword, Number(elements.routeDistance?.value) || 0);
    setMapStatus("카카오맵 키를 설정하면 목적지 검색을 사용할 수 있습니다.", "error");
    return;
  }

  if (!initRouteMap()) return;
  if (!state.kakaoPlaces) {
    setMapStatus("카카오 장소 검색을 준비하는 중입니다. 잠시 후 다시 시도하세요.", "ready");
    return;
  }

  setMapStatus("목적지를 검색하는 중입니다.", "ready");
  const options = {
    size: 5,
  };
  if (state.lastPosition) {
    options.location = new kakao.maps.LatLng(state.lastPosition.latitude, state.lastPosition.longitude);
    options.radius = 20000;
    options.sort = kakao.maps.services.SortBy.DISTANCE;
  }

  state.kakaoPlaces.keywordSearch(keyword, (results, status) => {
    if (status === kakao.maps.services.Status.OK) {
      renderRouteResults(results);
      setMapStatus("검색 결과에서 목적지를 선택하세요.", "ready");
      return;
    }

    elements.routeResults.innerHTML = "";
    if (status === kakao.maps.services.Status.ZERO_RESULT) {
      setMapStatus("검색 결과가 없습니다. 목적지 이름을 조금 더 구체적으로 입력하세요.", "error");
      return;
    }
    setMapStatus("목적지 검색에 실패했습니다. 잠시 후 다시 시도하세요.", "error");
  }, options);
}

function selectDestination(place) {
  if (state.mapProvider !== "kakao" || !state.map) return;
  const destination = {
    latitude: Number(place.y),
    longitude: Number(place.x),
  };
  const destinationLatLng = new kakao.maps.LatLng(destination.latitude, destination.longitude);

  clearDestinationGuide();
  state.destinationMarker = new kakao.maps.Marker({
    position: destinationLatLng,
    map: state.map,
    title: place.place_name,
  });

  let distanceKm = Number(elements.routeDistance?.value) || 0;
  if (state.lastPosition) {
    const startLatLng = [state.lastPosition.latitude, state.lastPosition.longitude];
    const endLatLng = [destination.latitude, destination.longitude];
    distanceKm = haversineKm(state.lastPosition, destination);
    if (elements.routeDistance) elements.routeDistance.value = distanceKm.toFixed(1);
    state.destinationLine = new kakao.maps.Polyline({
      map: state.map,
      path: [toProviderLatLng(startLatLng), destinationLatLng],
      strokeColor: "#2563eb",
      strokeOpacity: 0.75,
      strokeStyle: "shortdash",
      strokeWeight: 4,
    });
  }

  if (elements.destination) elements.destination.value = place.place_name || "";
  state.map.setCenter(destinationLatLng);
  state.map.setLevel(Math.min(state.map.getLevel(), 5));
  updateRouteAdvice(place.place_name || "목적지", distanceKm, Boolean(state.lastPosition));
  setMapStatus("목적지를 지도에 표시했습니다.", "ready");
}

function updateRouteAdvice(destination, distance, isEstimated = false) {
  if (!distance) {
    elements.routeAdvice.textContent = `${destination} 목적지를 선택했습니다. GPS 위치가 잡히면 거리 안내를 계산할 수 있습니다.`;
    return;
  }

  const easyMinutes = Math.round((distance / 18) * 60);
  const tempoMinutes = Math.round((distance / 24) * 60);
  const prefix = isEstimated ? "직선거리 기준으로 " : "";
  elements.routeAdvice.textContent = `${destination}까지 ${prefix}약 ${distance.toFixed(1)} km입니다. 회복 주행은 ${easyMinutes}분, 템포 주행은 ${tempoMinutes}분 정도로 계획하세요.`;
}

function refreshRouteMap() {
  if (!initRouteMap()) return;
  if (!state.map) return;
  invalidateMapSize();
}

function resetRouteMap() {
  if (state.mapResizeObserver) {
    state.mapResizeObserver.disconnect();
    state.mapResizeObserver = null;
  }

  if (state.mapProvider === "leaflet" && state.map?.remove) {
    state.map.remove();
  }

  if (state.mapProvider === "kakao") {
    [state.mapMarker, state.mapAccuracy, state.mapRoute, state.destinationMarker, state.destinationLine].forEach((item) =>
      item?.setMap?.(null),
    );
  }

  state.map = null;
  state.mapMarker = null;
  state.mapAccuracy = null;
  state.mapRoute = null;
  state.destinationMarker = null;
  state.destinationLine = null;
  state.mapProvider = null;
  state.kakaoPlaces = null;
  if (elements.routeMap) elements.routeMap.innerHTML = "";
}

function checkGpsOnce() {
  if (!isSecureGpsContext()) {
    setGpsStatus("HTTPS 필요");
    elements.coords.textContent = "GPS는 HTTPS 또는 localhost에서만 동작합니다.";
    return;
  }

  if (!navigator.geolocation) {
    setGpsStatus("GPS 미지원");
    elements.coords.textContent = "이 브라우저는 위치 기능을 지원하지 않습니다.";
    return;
  }

  setGpsStatus("GPS 확인 중");
  navigator.geolocation.getCurrentPosition(
    updatePosition,
    (error) => {
      const message = getGpsErrorMessage(error);
      setGpsStatus(message);
      elements.coords.textContent =
        message === "권한 거부됨"
          ? "브라우저 설정에서 위치 권한을 허용해야 합니다."
          : "하늘이 잘 보이는 곳에서 다시 시도하세요.";
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
  );
}

function initializeGpsStatus() {
  if (!isSecureGpsContext()) {
    setGpsStatus("HTTPS 필요");
    return;
  }

  if (!navigator.geolocation) {
    setGpsStatus("GPS 미지원");
    return;
  }

  if (!navigator.permissions?.query) {
    setGpsStatus("GPS 준비");
    return;
  }

  navigator.permissions
    .query({ name: "geolocation" })
    .then((permission) => {
      const labels = {
        granted: "GPS 허용됨",
        prompt: "GPS 준비",
        denied: "권한 거부됨",
      };
      setGpsStatus(labels[permission.state] || "GPS 준비");
      permission.addEventListener("change", () => {
        setGpsStatus(labels[permission.state] || "GPS 준비");
      });
    })
    .catch(() => setGpsStatus("GPS 준비"));
}

function updateRideMetrics() {
  const elapsedMs = state.riding ? Date.now() - state.startedAt : 0;
  const elapsedHours = elapsedMs / 3600000;
  elements.elapsed.textContent = formatElapsed(elapsedMs);
  elements.distance.textContent = state.distanceKm.toFixed(2);
  elements.speed.textContent = state.currentSpeed.toFixed(1);
  elements.avgSpeed.textContent = elapsedHours > 0 ? (state.distanceKm / elapsedHours).toFixed(1) : "0.0";
}

function startRide() {
  if (!isSecureGpsContext()) {
    setGpsStatus("HTTPS 필요");
    return;
  }

  if (!navigator.geolocation) {
    setGpsStatus("GPS 미지원");
    return;
  }

  state.riding = true;
  state.startedAt = Date.now();
  state.distanceKm = 0;
  state.currentSpeed = 0;
  state.lastPosition = null;
  state.routePoints = [];
  if (state.mapRoute) {
    if (state.mapProvider === "kakao") state.mapRoute.setPath([]);
    else state.mapRoute.setLatLngs([]);
  }
  elements.rideToggle.textContent = "종료";
  setGpsStatus("GPS 연결 중");
  state.elapsedTimer = setInterval(updateRideMetrics, 1000);

  state.watchId = navigator.geolocation.watchPosition(
    updatePosition,
    (error) => {
      setGpsStatus(getGpsErrorMessage(error));
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
  );
}

function stopRide() {
  const elapsedMs = Date.now() - state.startedAt;
  const minutes = Math.max(1, Math.round(elapsedMs / 60000));
  const avgSpeed = state.distanceKm / (elapsedMs / 3600000 || 1);

  state.riding = false;
  clearInterval(state.elapsedTimer);
  if (state.watchId !== null) navigator.geolocation.clearWatch(state.watchId);

  elements.rideToggle.textContent = "시작";
  setGpsStatus("GPS 대기");

  addRecord({
    date: new Date().toISOString(),
    distanceKm: Number(state.distanceKm.toFixed(2)),
    minutes,
    avgSpeed: Number(avgSpeed.toFixed(1)),
    note: "GPS 주행",
  });

  state.distanceKm = 0;
  state.currentSpeed = 0;
  updateRideMetrics();
}

function addRecord(record) {
  if (!record.distanceKm || !record.minutes) return;
  state.records = [record, ...state.records].slice(0, 60);
  saveRecords();
  renderAll();
}

function renderRecords() {
  if (!state.records.length) {
    elements.recordsList.innerHTML = `<div class="record-item"><strong>아직 기록이 없습니다</strong><span>GPS 주행을 시작하거나 실내 주행을 수동으로 저장하세요.</span></div>`;
    return;
  }

  elements.recordsList.innerHTML = state.records
    .slice(0, 6)
    .map(
      (record) => `
        <article class="record-item">
          <strong>${record.distanceKm.toFixed(1)} km · ${record.minutes}분 · ${record.avgSpeed.toFixed(1)} km/h</strong>
          <span>${formatDate(record.date)}${record.note ? ` · ${record.note}` : ""}</span>
        </article>
      `,
    )
    .join("");
}

function renderAnalysis() {
  const totalDistance = state.records.reduce((sum, record) => sum + record.distanceKm, 0);
  const totalTime = state.records.reduce((sum, record) => sum + record.minutes, 0);
  const bestDistance = Math.max(0, ...state.records.map((record) => record.distanceKm));
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyCount = state.records.filter((record) => new Date(record.date).getTime() >= weekAgo).length;

  elements.totalDistance.textContent = totalDistance.toFixed(1);
  elements.totalTime.textContent = String(totalTime);
  elements.bestDistance.textContent = bestDistance.toFixed(1);
  elements.weeklyCount.textContent = String(weeklyCount);

  const recent = state.records.slice(0, 7).reverse();
  const maxDistance = Math.max(1, ...recent.map((record) => record.distanceKm));
  elements.distanceChart.innerHTML = recent.length
    ? recent
        .map((record) => {
          const height = Math.max(18, (record.distanceKm / maxDistance) * 150);
          return `<div class="bar" style="height: ${height}px">${record.distanceKm.toFixed(0)}</div>`;
        })
        .join("")
    : `<div class="record-item" style="grid-column: 1 / -1"><strong>분석 대기 중</strong><span>주행 기록이 쌓이면 그래프가 표시됩니다.</span></div>`;
}

function renderCoach() {
  const last = state.records[0];
  const totalDistance = state.records.reduce((sum, record) => sum + record.distanceKm, 0);
  const profileName = state.profile.name ? `${state.profile.name}님, ` : "";
  const goalLabel = getProfileGoalLabel(state.profile.goal);
  const weightTrend = getWeightTrend();
  const weightAdvice =
    weightTrend?.label === "down"
      ? ` 최근 몸무게가 ${Math.abs(weightTrend.diff).toFixed(1)} kg 내려갔습니다. 회복과 단백질 섭취를 함께 챙기세요.`
      : weightTrend?.label === "up"
        ? ` 최근 몸무게가 ${weightTrend.diff.toFixed(1)} kg 올랐습니다. 목표가 체중 감량이라면 저강도 유산소 시간을 조금 늘려보세요.`
        : weightTrend
          ? " 최근 몸무게는 안정적입니다. 훈련 강도를 서서히 올리기 좋습니다."
          : "";

  if (!last) {
    elements.coachMessage.textContent = `${profileName}첫 기록을 남기면 거리, 속도, 빈도를 보고 ${goalLabel} 목표에 맞춘 훈련을 제안합니다.${weightAdvice}`;
    renderWorkout(["20분 가볍게 페달링", "5분 스트레칭", "다음 라이딩에서 거리 기준 기록 만들기"]);
    return;
  }

  const message =
    last.avgSpeed >= 25
      ? `${profileName}최근 평균 ${last.avgSpeed.toFixed(1)} km/h로 좋은 페이스입니다. ${goalLabel} 목표를 유지하되, 오늘은 고강도보다 회복 주행을 섞어 누적 피로를 관리하세요.${weightAdvice}`
      : `${profileName}최근 ${last.distanceKm.toFixed(1)} km를 기록했습니다. 총 ${totalDistance.toFixed(1)} km가 쌓였고, ${goalLabel} 목표 기준 다음 목표는 같은 시간에 5% 더 멀리 가기입니다.${weightAdvice}`;
  elements.coachMessage.textContent = message;
}

function renderWorkout(items) {
  elements.workoutPlan.innerHTML = items
    .map((item, index) => `<article class="workout-item"><strong>${index + 1}. ${item}</strong><span>컨디션에 맞춰 강도를 조절하세요.</span></article>`)
    .join("");
}

function getLocalWorkoutPlan(condition, goal) {
  const plans = {
    endurance: ["10분 워밍업", "30분 일정 페이스 유지", "마지막 5분 가볍게 정리"],
    fatloss: ["8분 워밍업", "3분 빠르게 + 2분 천천히를 6회", "수분 보충 후 5분 쿨다운"],
    speed: ["12분 워밍업", "30초 전력 + 90초 회복을 8회", "케이던스 안정화 10분"],
    health: ["10분 워밍업", "20분 편안한 강도 유지", "호흡을 낮추며 5분 마무리"],
  };
  const tiredPlan = ["20분 저강도 회복 주행", "호흡이 편한 강도 유지", "운동 후 하체 스트레칭"];
  return condition === "tired" ? tiredPlan : plans[goal] || plans.endurance;
}

function getWeatherLabel(code) {
  if (code === 0) return "맑음";
  if ([1, 2, 3].includes(code)) return "구름";
  if ([45, 48].includes(code)) return "안개";
  if ([51, 53, 55, 56, 57].includes(code)) return "이슬비";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "비";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "눈";
  if ([95, 96, 99].includes(code)) return "뇌우";
  return "날씨 정보";
}

async function fetchTodayWeather() {
  if (!state.lastPosition) return null;

  const latitude = state.lastPosition.latitude.toFixed(4);
  const longitude = state.lastPosition.longitude.toFixed(4);
  const params = new URLSearchParams({
    latitude,
    longitude,
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
    timezone: "auto",
    forecast_days: "1",
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!response.ok) return null;
    const data = await response.json();
    const daily = data.daily || {};
    const code = daily.weather_code?.[0];
    return {
      source: "Open-Meteo",
      location: {
        latitude: Number(latitude),
        longitude: Number(longitude),
      },
      date: daily.time?.[0] || new Date().toISOString().slice(0, 10),
      condition: getWeatherLabel(code),
      weatherCode: code,
      maxTempC: daily.temperature_2m_max?.[0],
      minTempC: daily.temperature_2m_min?.[0],
      precipitationProbabilityMaxPct: daily.precipitation_probability_max?.[0],
      windSpeedMaxKmh: daily.wind_speed_10m_max?.[0],
    };
  } catch {
    return null;
  }
}

function getWeatherCoachNote(weather) {
  if (!weather) return "";
  const rain = weather.precipitationProbabilityMaxPct;
  const wind = weather.windSpeedMaxKmh;
  const tempMax = weather.maxTempC;
  const parts = [`오늘 현재 위치 예보는 ${weather.condition}`];
  if (Number.isFinite(tempMax)) parts.push(`최고 ${Math.round(tempMax)}도`);
  if (Number.isFinite(rain)) parts.push(`강수확률 ${Math.round(rain)}%`);
  if (Number.isFinite(wind)) parts.push(`최대풍속 ${Math.round(wind)}km/h`);
  return `${parts.join(", ")}입니다.`;
}

function applyWeatherCoachNote(weather) {
  const note = getWeatherCoachNote(weather);
  if (!note) return;
  elements.coachMessage.textContent = `${elements.coachMessage.textContent} ${note}`;
}

function initFirebase() {
  if (!window.firebase?.initializeApp) {
    renderCloudControls();
    return;
  }

  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    state.firebaseAuth = firebase.auth();
    state.firebaseDb = firebase.firestore();
    state.firebaseReady = true;
    state.firebaseAuth
      .getRedirectResult()
      .then((result) => {
        if (result.user) setCloudStatus("Google 로그인이 완료되었습니다.");
      })
      .catch((error) => {
        setCloudStatus(getFirebaseAuthErrorMessage(error));
      });
    state.firebaseAuth.onAuthStateChanged((user) => {
      state.cloudUser = user;
      renderCloudControls();
    });
  } catch (error) {
    state.firebaseReady = false;
    setCloudStatus(`Firebase 초기화 실패: ${error.message}`);
  }
}

function getFirebaseAuthErrorMessage(error) {
  const code = error?.code || "";
  const message = error?.message || "";

  if (code.includes("unauthorized-domain")) {
    return "Firebase 승인 도메인에 현재 주소가 없습니다. Authentication 설정에 wony67.github.io와 localhost를 추가하세요.";
  }

  if (code.includes("popup-blocked") || code.includes("popup-closed-by-user")) {
    return "로그인 팝업이 차단되었거나 닫혔습니다. 다시 누르면 리다이렉트 방식으로 시도합니다.";
  }

  if (code.includes("operation-not-allowed")) {
    return "Firebase Authentication에서 Google 로그인 제공업체를 활성화해야 합니다.";
  }

  if (code.includes("network-request-failed")) {
    return "네트워크 문제로 Firebase 로그인에 실패했습니다.";
  }

  if (message.includes("disallowed_useragent")) {
    return "Android 앱 WebView에서는 Google 웹 로그인이 제한될 수 있습니다. 네이티브 Google 로그인 연결이 필요합니다.";
  }

  return message ? `로그인 실패: ${message}` : "Google 로그인에 실패했습니다.";
}

function getCloudDocRef() {
  if (!state.cloudUser || !state.firebaseDb) return null;
  return state.firebaseDb.collection("users").doc(state.cloudUser.uid).collection("appState").doc("current");
}

function getCloudPayload() {
  return {
    versionCode: APP_VERSION_CODE,
    versionName: APP_VERSION_NAME,
    profile: state.profile,
    records: state.records,
    weightHistory: state.weightHistory,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
}

async function signInToCloud() {
  if (!state.firebaseAuth) {
    setCloudStatus("Firebase가 아직 준비되지 않았습니다.");
    return;
  }

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    if (isNativeApp()) {
      setCloudStatus("Android 앱에서는 Google 웹 로그인이 제한될 수 있습니다. 리다이렉트 로그인을 시도합니다.");
      await state.firebaseAuth.signInWithRedirect(provider);
      return;
    }

    await state.firebaseAuth.signInWithPopup(provider);
  } catch (error) {
    setCloudStatus(getFirebaseAuthErrorMessage(error));
    if (error?.code?.includes("popup-blocked") || error?.code?.includes("popup-closed-by-user")) {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await state.firebaseAuth.signInWithRedirect(provider);
    }
  }
}

async function signOutFromCloud() {
  if (!state.firebaseAuth) return;
  await state.firebaseAuth.signOut();
}

async function backupToCloud() {
  const docRef = getCloudDocRef();
  if (!docRef) return;

  try {
    await docRef.set(getCloudPayload(), { merge: true });
    setCloudStatus("클라우드 백업을 완료했습니다.");
  } catch (error) {
    setCloudStatus(`클라우드 백업 실패: ${error.message}`);
  }
}

async function restoreFromCloud() {
  const docRef = getCloudDocRef();
  if (!docRef) return;

  try {
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      setCloudStatus("복원할 클라우드 백업이 없습니다.");
      return;
    }

    const data = snapshot.data();
    state.profile = data.profile || {};
    state.records = Array.isArray(data.records) ? data.records : [];
    state.weightHistory = Array.isArray(data.weightHistory) ? data.weightHistory : [];
    saveProfile();
    saveRecords();
    saveWeightHistory();
    renderAll();
    renderProfile();
    renderSettings();
    setCloudStatus("클라우드 백업을 이 기기에 복원했습니다.");
  } catch (error) {
    setCloudStatus(`클라우드 복원 실패: ${error.message}`);
  }
}

function buildCoachContext(condition, goal, weather = null) {
  const recentRecords = state.records.slice(0, 8).map((record) => ({
    date: record.date,
    distanceKm: record.distanceKm,
    minutes: record.minutes,
    avgSpeed: record.avgSpeed,
    note: record.note,
  }));

  return {
    condition,
    selectedGoal: goal,
    profile: state.profile,
    currentLocation: state.lastPosition
      ? {
          latitude: Number(state.lastPosition.latitude.toFixed(5)),
          longitude: Number(state.lastPosition.longitude.toFixed(5)),
        }
      : null,
    todayWeather: weather,
    weightHistory: state.weightHistory.slice(0, 10),
    recentRecords,
    totals: {
      totalDistanceKm: Number(state.records.reduce((sum, record) => sum + record.distanceKm, 0).toFixed(1)),
      totalMinutes: state.records.reduce((sum, record) => sum + record.minutes, 0),
    },
  };
}

function extractOpenAiText(data) {
  if (data.output_text) return data.output_text.trim();
  const parts = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

async function requestAiCoach(condition, goal, weather = null) {
  const apiKey = getOpenAiKey();
  if (!apiKey) return null;

  const context = buildCoachContext(condition, goal, weather);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      instructions:
        "You are a Korean cycling coach for a personal bicycle trainer app. Give practical, safe, concise coaching. Do not provide medical diagnosis. Respond in Korean with one short paragraph and exactly three workout steps, one per line, prefixed with '1.', '2.', '3.'.",
      input: `라이더 데이터: ${JSON.stringify(context)}`,
      max_output_tokens: 450,
    }),
  });

  if (!response.ok) {
    let message = `OpenAI API 오류 ${response.status}`;
    try {
      const errorJson = await response.json();
      message = errorJson.error?.message || message;
    } catch {
      const errorText = await response.text().catch(() => "");
      message = errorText || message;
    }
    throw new Error(message);
  }

  return extractOpenAiText(await response.json());
}

function getAiCoachErrorMessage(error) {
  const message = error?.message || "";
  const lower = message.toLowerCase();

  if (lower.includes("401") || lower.includes("incorrect api key") || lower.includes("invalid api key")) {
    return "OpenAI 키가 올바르지 않습니다. 설정 탭에서 키를 다시 확인하세요.";
  }

  if (lower.includes("quota") || lower.includes("billing") || lower.includes("429")) {
    return "OpenAI 사용량 한도 또는 결제 설정 문제로 호출에 실패했습니다.";
  }

  if (lower.includes("model") || lower.includes("does not exist") || lower.includes("access")) {
    return "현재 API 키가 요청한 모델을 사용할 수 없습니다.";
  }

  if (error instanceof TypeError || lower.includes("failed to fetch") || lower.includes("network")) {
    return "네트워크 또는 브라우저 보안 정책 때문에 OpenAI 호출에 실패했습니다.";
  }

  return message ? `OpenAI 호출 실패: ${message}` : "OpenAI 호출에 실패했습니다.";
}

function applyCoachText(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const steps = lines.filter((line) => /^\d+\./.test(line)).map((line) => line.replace(/^\d+\.\s*/, ""));
  const message = lines.filter((line) => !/^\d+\./.test(line)).join(" ");

  if (message) elements.coachMessage.textContent = message;
  if (steps.length) renderWorkout(steps.slice(0, 3));
}

function renderAll() {
  renderRecords();
  renderAnalysis();
  renderCoach();
}

function switchView(viewName) {
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === `view-${viewName}`));
  $$(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewName));
  if (viewName === "route") {
    requestAnimationFrame(() => {
      requestAnimationFrame(refreshRouteMap);
    });
  }
}

function isStandaloneApp() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
}

function updateInstallButton() {
  if (!elements.installApp) return;
  elements.installApp.hidden = false;
  if (isStandaloneApp()) {
    elements.installApp.textContent = "설치됨";
    elements.installApp.disabled = true;
    return;
  }
  elements.installApp.disabled = false;
  elements.installApp.textContent = state.installPrompt ? "설치" : "설치 안내";
}

function showInstallGuide() {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const guide = isIos
    ? "iPhone에서는 Safari 하단 공유 버튼을 누른 뒤 '홈 화면에 추가'를 선택하세요."
    : "Android Chrome에서는 주소창 옆 메뉴를 열고 '앱 설치' 또는 '홈 화면에 추가'를 선택하세요. 설치 버튼은 HTTPS GitHub Pages 주소에서 가장 잘 표시됩니다.";
  window.alert(guide);
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  state.installPrompt = event;
  updateInstallButton();
});

window.addEventListener("appinstalled", () => {
  state.installPrompt = null;
  updateInstallButton();
  setGpsStatus("앱 설치됨");
});

elements.installApp?.addEventListener("click", async () => {
  if (!state.installPrompt) {
    showInstallGuide();
    return;
  }
  const promptEvent = state.installPrompt;
  state.installPrompt = null;
  updateInstallButton();
  await promptEvent.prompt();
});

elements.updateNow?.addEventListener("click", applyAppUpdate);

elements.rideToggle.addEventListener("click", () => {
  if (state.riding) stopRide();
  else startRide();
});

elements.gpsCheck?.addEventListener("click", checkGpsOnce);

elements.manualRideForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const distanceKm = Number($("#manualDistance").value);
  const minutes = Number($("#manualMinutes").value);
  const note = $("#manualNote").value.trim() || "실내 주행";
  if (!distanceKm || !minutes) return;
  addRecord({
    date: new Date().toISOString(),
    distanceKm,
    minutes,
    avgSpeed: Number((distanceKm / (minutes / 60)).toFixed(1)),
    note,
  });
  event.currentTarget.reset();
});

elements.clearRecords.addEventListener("click", () => {
  state.records = [];
  saveRecords();
  renderAll();
});

elements.mapLocateMe?.addEventListener("click", centerMapOnCurrentLocation);

elements.profileForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = elements.profileName.value.trim();
  const heightCm = Number(elements.profileHeight.value);
  const weightKg = Number(elements.profileWeight.value);
  const goal = elements.profileGoal.value;

  state.profile = {
    name,
    heightCm: heightCm ? Number(heightCm.toFixed(1)) : "",
    weightKg: weightKg ? Number(weightKg.toFixed(1)) : "",
    goal,
    updatedAt: new Date().toISOString(),
  };

  if (weightKg) addWeightHistory(weightKg);
  saveProfile();
  renderProfile();
  renderCoach();
});

elements.settingsForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const openAiKey = elements.openAiKey.value.trim();
  const key = elements.kakaoMapKey.value.trim();
  if (openAiKey) {
    localStorage.setItem(OPENAI_API_KEY, openAiKey);
  }

  if (key) {
    localStorage.setItem(KAKAO_MAP_KEY, key);
    localStorage.removeItem(LEGACY_NAVER_MAP_KEY);
    resetRouteMap();
    setSettingsStatus("카카오맵 키를 저장했습니다. 경로 탭에서 카카오맵을 불러옵니다.");
  } else {
    localStorage.removeItem(KAKAO_MAP_KEY);
    resetRouteMap();
    setSettingsStatus("카카오맵 키를 비웠습니다. OpenStreetMap을 사용합니다.");
  }
  renderSettings();
});

elements.openAiKey?.addEventListener("change", saveOpenAiKeyFromInput);
elements.openAiKey?.addEventListener("blur", saveOpenAiKeyFromInput);

elements.clearOpenAiKey?.addEventListener("click", () => {
  localStorage.removeItem(OPENAI_API_KEY);
  if (elements.openAiKey) elements.openAiKey.value = "";
  renderSettings();
  setSettingsStatus("OpenAI 키를 삭제했습니다. 로컬 규칙 기반 코치를 사용합니다.");
});

elements.clearKakaoKey?.addEventListener("click", () => {
  localStorage.removeItem(KAKAO_MAP_KEY);
  localStorage.removeItem(LEGACY_NAVER_MAP_KEY);
  resetRouteMap();
  renderSettings();
  setSettingsStatus("카카오맵 키를 삭제했습니다. OpenStreetMap을 사용합니다.");
});

elements.firebaseLogin?.addEventListener("click", signInToCloud);
elements.firebaseLogout?.addEventListener("click", signOutFromCloud);
elements.cloudBackup?.addEventListener("click", backupToCloud);
elements.cloudRestore?.addEventListener("click", restoreFromCloud);

elements.routeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const destination = elements.destination.value.trim();
  const distance = Number(elements.routeDistance.value);
  if (destination) {
    searchDestination(destination);
    return;
  }
  if (distance) updateRouteAdvice("목적지", distance);
});

elements.coachForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const condition = $("#condition").value;
  const goal = $("#goal").value;
  const localPlan = getLocalWorkoutPlan(condition, goal);

  elements.coachMessage.textContent = state.lastPosition
    ? "현재 위치의 오늘 예보와 최근 기록을 확인하는 중입니다."
    : "최근 기록과 프로필을 분석하는 중입니다. GPS 위치가 잡히면 오늘 예보도 함께 반영합니다.";
  const weather = await fetchTodayWeather();

  if (!getOpenAiKey()) {
    renderWorkout(localPlan);
    renderCoach();
    applyWeatherCoachNote(weather);
    return;
  }

  elements.coachMessage.textContent = weather
    ? "AI 코치가 오늘 예보와 최근 기록을 함께 분석하는 중입니다."
    : "AI 코치가 최근 기록과 프로필을 분석하는 중입니다.";
  renderWorkout(["최근 기록 정리", "목표와 컨디션 분석", "맞춤 훈련 생성"]);

  try {
    const aiText = await requestAiCoach(condition, goal, weather);
    if (aiText) applyCoachText(aiText);
    else renderWorkout(localPlan);
  } catch (error) {
    elements.coachMessage.textContent = `${getAiCoachErrorMessage(error)} 로컬 코칭으로 대신 제안합니다.`;
    renderWorkout(localPlan);
  }
});

$$(".tab").forEach((tab) => {
  tab.addEventListener("click", () => switchView(tab.dataset.view));
});

if ("serviceWorker" in navigator && !isNativeApp()) {
  navigator.serviceWorker.register("service-worker.js").then(setupAppUpdates).catch(() => {});
}

window.addEventListener("resize", refreshRouteMap);
window.addEventListener("orientationchange", refreshRouteMap);

initFirebase();
renderAll();
renderSettings();
renderProfile();
updateRideMetrics();
updateInstallButton();
checkNativeAppUpdate();
initializeGpsStatus();
