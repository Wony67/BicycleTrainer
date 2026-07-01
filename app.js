const STORAGE_KEY = "bicycle-trainer-records";
const KAKAO_MAP_KEY = "bicycle-trainer-kakao-map-key";
const LEGACY_NAVER_MAP_KEY = "bicycle-trainer-naver-map-key";
const OPENAI_API_KEY = "bicycle-trainer-openai-api-key";
const PROFILE_KEY = "bicycle-trainer-profile";
const WEIGHT_HISTORY_KEY = "bicycle-trainer-weight-history";
const COACH_INTENSITY_KEY = "bicycle-trainer-coach-intensity";
const APP_VERSION_CODE = 18;
const APP_VERSION_NAME = "1.0.17";
const APP_VERSION_URL = "https://wony67.github.io/BicycleTrainer/version.json";
const APP_DOWNLOAD_PAGE_URL = "https://wony67.github.io/BicycleTrainer/download/";
const FIRST_RUN_SETUP_KEY = "bicycle-trainer-first-run-setup-dismissed";
const STATIONARY_RADIUS_KM = 0.1;
const STATIONARY_LIMIT_MS = 20 * 60 * 1000;
const MIN_SAVE_DISTANCE_KM = 0.5;
const MIN_SAVE_AVG_SPEED_KMH = 3;
const PROFILE_GOALS = ["endurance", "fatloss", "speed", "health"];
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
  coachIntensity: loadCoachIntensity(),
  riding: false,
  startedAt: 0,
  elapsedTimer: null,
  watchId: null,
  lastPosition: null,
  stationaryAnchor: null,
  stationarySince: 0,
  distanceKm: 0,
  currentSpeed: 0,
  installPrompt: null,
  routePoints: [],
  nativeBackgroundRide: false,
  map: null,
  mapMarker: null,
  mapAccuracy: null,
  mapRoute: null,
  recordStartMarker: null,
  recordEndMarker: null,
  destinationMarker: null,
  destinationLine: null,
  routeDestination: null,
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
  recordDeleteMode: false,
  selectedRecordIds: new Set(),
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  updateBanner: $("#updateBanner"),
  updateTitle: $("#updateBanner strong"),
  updateText: $("#updateBanner span"),
  updateNow: $("#updateNow"),
  firstRunSetup: $("#firstRunSetup"),
  closeFirstRunSetup: $("#closeFirstRunSetup"),
  openBatterySettings: $("#openBatterySettings"),
  dismissFirstRunSetup: $("#dismissFirstRunSetup"),
  showPermissionGuide: $("#showPermissionGuide"),
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
  recordDeleteActions: $("#recordDeleteActions"),
  recordDeleteCount: $("#recordDeleteCount"),
  deleteSelectedRecords: $("#deleteSelectedRecords"),
  cancelRecordDelete: $("#cancelRecordDelete"),
  mapLocateMe: $("#mapLocateMe"),
  routeMap: $("#routeMap"),
  mapStatus: $("#mapStatus"),
  coords: $("#coords"),
  routeForm: $("#routeForm"),
  routeAdvice: $("#routeAdvice"),
  routeResults: $("#routeResults"),
  routeNavigate: $("#routeNavigate"),
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
  coachIntensity: $("#coachIntensity"),
  settingsStatus: $("#settingsStatus"),
  firebaseLogin: $("#firebaseLogin"),
  firebaseLogout: $("#firebaseLogout"),
  cloudBackup: $("#cloudBackup"),
  cloudRestore: $("#cloudRestore"),
  seedSampleRecords: $("#seedSampleRecords"),
  showCoachJson: $("#showCoachJson"),
  cloudStatus: $("#cloudStatus"),
  clearKakaoKey: $("#clearKakaoKey"),
  clearOpenAiKey: $("#clearOpenAiKey"),
};

function loadRecords() {
  try {
    return (JSON.parse(localStorage.getItem(STORAGE_KEY)) || []).map(normalizeRecord);
  } catch {
    return [];
  }
}

function createRecordId(record = {}) {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  const seed = [record.date, record.distanceKm, record.minutes, record.avgSpeed, record.note].filter(Boolean).join("-");
  return `record-${Date.now()}-${Math.abs(hashString(seed))}`;
}

function hashString(value) {
  return [...String(value)].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) | 0, 0);
}

function normalizeRecord(record) {
  const distanceKm = Number(record?.distanceKm);
  const minutes = Number(record?.minutes);
  const avgSpeed = Number(record?.avgSpeed);
  return {
    ...record,
    id: record?.id || createRecordId(record),
    date: record?.date || new Date().toISOString(),
    distanceKm: Number.isFinite(distanceKm) ? distanceKm : 0,
    minutes: Number.isFinite(minutes) ? minutes : 0,
    avgSpeed: Number.isFinite(avgSpeed) ? avgSpeed : 0,
    note: record?.note || "",
    path: normalizeRecordPath(record?.path || record?.routePath || []),
  };
}

function normalizeWeightHistoryEntry(entry) {
  const weightKg = Number(entry?.weightKg);
  if (!Number.isFinite(weightKg)) return null;
  return {
    date: entry?.date || new Date().toISOString(),
    weightKg: Number(weightKg.toFixed(1)),
  };
}

function normalizeWeightHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.map(normalizeWeightHistoryEntry).filter(Boolean);
}

function normalizeProfile(profile = {}) {
  if (!profile || typeof profile !== "object") return {};

  const heightCm = Number(profile.heightCm ?? profile.height ?? profile.height_cm);
  const weightKg = Number(profile.weightKg ?? profile.weight ?? profile.weight_kg);
  const goal = PROFILE_GOALS.includes(profile.goal) ? profile.goal : "endurance";

  return {
    name: String(profile.name || "").trim(),
    heightCm: Number.isFinite(heightCm) && heightCm > 0 ? Number(heightCm.toFixed(1)) : "",
    weightKg: Number.isFinite(weightKg) && weightKg > 0 ? Number(weightKg.toFixed(1)) : "",
    goal,
    updatedAt: profile.updatedAt || "",
  };
}

function normalizeRecordPath(path) {
  if (!Array.isArray(path)) return [];
  return path
    .map((point) => {
      const latitude = Array.isArray(point) ? point[0] : point?.latitude;
      const longitude = Array.isArray(point) ? point[1] : point?.longitude;
      if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return null;
      return [Number(Number(latitude).toFixed(6)), Number(Number(longitude).toFixed(6))];
    })
    .filter(Boolean);
}

function compressRecordPath(path) {
  const normalized = normalizeRecordPath(path);
  if (normalized.length <= 800) return normalized;
  const step = Math.ceil(normalized.length / 800);
  return normalized.filter((_, index) => index % step === 0 || index === normalized.length - 1);
}

function getRecordCoachingQuality(record) {
  const distanceKm = Number(record?.distanceKm) || 0;
  const minutes = Number(record?.minutes) || 0;
  const avgSpeed = Number(record?.avgSpeed) || 0;
  const excludedReasons = [];
  let dataQuality = "good";

  if (distanceKm < 0.5) excludedReasons.push("distance_under_0_5km");
  if (minutes < 5) excludedReasons.push("duration_under_5_minutes");
  if (avgSpeed > 60) excludedReasons.push("speed_over_60kmh");

  if (excludedReasons.length) {
    dataQuality = "poor";
  } else if (avgSpeed < 3) {
    dataQuality = "suspicious";
    excludedReasons.push("speed_under_3kmh");
  } else if (avgSpeed > 45) {
    dataQuality = "suspicious";
    excludedReasons.push("speed_over_45kmh");
  }

  return {
    dataQuality,
    isValidForCoaching: dataQuality === "good",
    excludedReason: excludedReasons.length ? excludedReasons.join(",") : null,
  };
}

function getValidCoachRecords() {
  return state.records
    .map(normalizeRecord)
    .filter((record) => getRecordCoachingQuality(record).isValidForCoaching);
}

function summarizeRecordForCoach(record) {
  const path = normalizeRecordPath(record?.path || []);
  const quality = getRecordCoachingQuality(record);
  return {
    rideId: record?.id || "",
    rideStartedAt: record?.date || "",
    distanceKilometers: Number(record?.distanceKm) || 0,
    durationMinutes: Number(record?.minutes) || 0,
    averageSpeedKmh: Number(record?.avgSpeed) || 0,
    distanceKm: Number(record?.distanceKm) || 0,
    minutes: Number(record?.minutes) || 0,
    avgSpeed: Number(record?.avgSpeed) || 0,
    riderNote: record?.note || "",
    hasRoutePath: path.length > 1,
    routePathPointCount: path.length,
    isValidForCoaching: quality.isValidForCoaching,
    dataQuality: quality.dataQuality,
    excludedReason: quality.excludedReason,
  };
}

function loadProfile() {
  try {
    return normalizeProfile(JSON.parse(localStorage.getItem(PROFILE_KEY)) || {});
  } catch {
    return {};
  }
}

function loadWeightHistory() {
  try {
    return normalizeWeightHistory(JSON.parse(localStorage.getItem(WEIGHT_HISTORY_KEY)) || []);
  } catch {
    return [];
  }
}

function loadCoachIntensity() {
  const value = localStorage.getItem(COACH_INTENSITY_KEY);
  return ["gentle", "balanced", "strict"].includes(value) ? value : "balanced";
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
}

function saveProfile() {
  state.profile = normalizeProfile(state.profile);
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

function getApiKeysForCloudBackup() {
  const keys = {};
  const openAiKey = getOpenAiKey();
  const kakaoMapKey = getKakaoMapKey();
  if (openAiKey) keys.openAiKey = openAiKey;
  if (kakaoMapKey) keys.kakaoMapKey = kakaoMapKey;
  return keys;
}

function hasCloudApiKeys(keys) {
  return Boolean(keys && Object.keys(keys).length);
}

function assertCloudCryptoSupported() {
  if (!window.crypto?.subtle || !window.crypto?.getRandomValues) {
    throw new Error("이 환경에서는 API 키 암호화를 사용할 수 없습니다.");
  }
}

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function deriveCloudApiKey(pin, salt, iterations) {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function requestCloudApiPin(action) {
  return new Promise((resolve, reject) => {
    const overlay = document.createElement("div");
    overlay.className = "pin-modal-backdrop";
    overlay.innerHTML = `
      <div class="pin-modal" role="dialog" aria-modal="true" aria-labelledby="pinModalTitle">
        <h2 id="pinModalTitle">API 키 ${action} PIN</h2>
        <p>PIN을 잊으면 암호화된 API 키는 복원할 수 없습니다.</p>
        <input class="pin-modal-input" type="password" inputmode="numeric" autocomplete="off" placeholder="4자리 이상" />
        <div class="pin-modal-actions">
          <button class="ghost pin-cancel" type="button">취소</button>
          <button class="pin-confirm" type="button">확인</button>
        </div>
      </div>
    `;

    const input = overlay.querySelector(".pin-modal-input");
    const cancel = overlay.querySelector(".pin-cancel");
    const confirm = overlay.querySelector(".pin-confirm");

    const close = () => overlay.remove();
    const submit = () => {
      const pin = input.value.trim();
      if (pin.length < 4) {
        reject(new Error("PIN은 4자리 이상으로 입력해 주세요."));
        close();
        return;
      }
      resolve(pin);
      close();
    };

    cancel.addEventListener("click", () => {
      resolve(null);
      close();
    });
    confirm.addEventListener("click", submit);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") submit();
      if (event.key === "Escape") {
        resolve(null);
        close();
      }
    });

    document.body.appendChild(overlay);
    input.focus();
  });
}

function showJsonModal(title, payload) {
  const overlay = document.createElement("div");
  overlay.className = "json-modal-backdrop";
  const jsonText = JSON.stringify(payload, null, 2);
  overlay.innerHTML = `
    <div class="json-modal" role="dialog" aria-modal="true" aria-labelledby="jsonModalTitle">
      <h2 id="jsonModalTitle">${title}</h2>
      <textarea class="json-modal-output" readonly spellcheck="false"></textarea>
      <div class="json-modal-actions">
        <button class="json-copy" type="button">복사</button>
        <button class="ghost json-close" type="button">닫기</button>
      </div>
    </div>
  `;

  const textarea = overlay.querySelector(".json-modal-output");
  const close = () => overlay.remove();
  textarea.value = jsonText;
  overlay.querySelector(".json-close").addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  overlay.querySelector(".json-copy").addEventListener("click", async () => {
    await navigator.clipboard?.writeText(jsonText).catch(() => {});
    textarea.select();
  });
  document.body.appendChild(overlay);
}

async function encryptCloudApiKeys(keys, pin) {
  assertCloudCryptoSupported();
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const iterations = 150000;
  const key = await deriveCloudApiKey(pin, salt, iterations);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(keys)));

  return {
    version: 1,
    algorithm: "PBKDF2-SHA256/AES-GCM",
    iterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted)),
    keys: Object.keys(keys),
    updatedAt: new Date().toISOString(),
  };
}

async function decryptCloudApiKeys(encryptedKeys, pin) {
  assertCloudCryptoSupported();
  if (!encryptedKeys?.salt || !encryptedKeys?.iv || !encryptedKeys?.data) {
    throw new Error("클라우드 API 키 백업 형식이 올바르지 않습니다.");
  }

  const salt = base64ToBytes(encryptedKeys.salt);
  const iv = base64ToBytes(encryptedKeys.iv);
  const data = base64ToBytes(encryptedKeys.data);
  const key = await deriveCloudApiKey(pin, salt, Number(encryptedKeys.iterations) || 150000);
  try {
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch {
    throw new Error("PIN이 맞지 않거나 API 키 백업을 복호화할 수 없습니다.");
  }
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

function isWonyUser(user = state.cloudUser) {
  return String(user?.email || "").trim().toLowerCase() === "wony607@gmail.com";
}

function renderCloudControls() {
  const signedIn = Boolean(state.cloudUser);
  const canUseWonyTools = signedIn && isWonyUser();
  if (elements.firebaseLogin) elements.firebaseLogin.hidden = signedIn;
  if (elements.firebaseLogout) elements.firebaseLogout.hidden = !signedIn;
  if (elements.cloudBackup) {
    elements.cloudBackup.hidden = !signedIn;
    elements.cloudBackup.disabled = !signedIn;
  }
  if (elements.cloudRestore) {
    elements.cloudRestore.hidden = !signedIn;
    elements.cloudRestore.disabled = !signedIn;
  }
  if (elements.seedSampleRecords) {
    elements.seedSampleRecords.hidden = !canUseWonyTools;
    elements.seedSampleRecords.disabled = !canUseWonyTools;
  }
  if (elements.showCoachJson) {
    elements.showCoachJson.hidden = !canUseWonyTools;
    elements.showCoachJson.disabled = !canUseWonyTools;
  }

  if (!state.firebaseReady) {
    setCloudStatus("Firebase SDK를 불러오지 못했습니다. 네트워크 연결을 확인하세요.");
    return;
  }

  if (signedIn) {
    const label = state.cloudUser.displayName || state.cloudUser.email || "로그인 사용자";
    setCloudStatus(`${label} 계정으로 연결되었습니다. API 키가 있으면 백업 시 PIN으로 암호화해 저장합니다.`);
    return;
  }

  setCloudStatus("Google 로그인 후 주행기록, 프로필, 몸무게 히스토리를 클라우드에 백업할 수 있습니다.");
}

function renderSettings() {
  const key = getKakaoMapKey();
  const openAiKey = getOpenAiKey();
  if (elements.kakaoMapKey) elements.kakaoMapKey.value = key;
  if (elements.openAiKey) elements.openAiKey.value = openAiKey;
  if (elements.coachIntensity) elements.coachIntensity.value = state.coachIntensity;
  if (elements.showPermissionGuide) elements.showPermissionGuide.hidden = !isNativeApp();
  setSettingsStatus(
    [
      openAiKey ? "OpenAI 키 저장됨: AI 코치가 실제 API를 사용합니다." : "OpenAI 키 없음: 로컬 규칙 기반 코치를 사용합니다.",
      key ? "카카오맵 키 저장됨: 경로 탭에서 카카오맵을 우선 사용합니다." : "카카오맵 키 없음: OpenStreetMap을 사용합니다.",
      "API 키는 클라우드 백업 시 PIN으로 암호화해 저장할 수 있습니다.",
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

  const items = normalizeWeightHistory(state.weightHistory);
  state.weightHistory = items;

  if (!items.length) {
    elements.weightHistoryList.innerHTML = `<div class="record-item"><strong>아직 몸무게 기록이 없습니다</strong><span>프로필 저장 시 몸무게 변화가 기록됩니다.</span></div>`;
    return;
  }

  elements.weightHistoryList.innerHTML = items
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
  state.weightHistory = normalizeWeightHistory(state.weightHistory);
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

function getNativeFirebaseAuthPlugin() {
  return window.Capacitor?.Plugins?.FirebaseAuthentication || null;
}

function getBatterySettingsPlugin() {
  return window.Capacitor?.Plugins?.BatterySettings || null;
}

function getBackgroundRidePlugin() {
  return window.Capacitor?.Plugins?.BackgroundRide || null;
}

function showFirstRunSetup() {
  if (elements.firstRunSetup) elements.firstRunSetup.hidden = false;
}

function hideFirstRunSetup({ remember = false } = {}) {
  if (remember) localStorage.setItem(FIRST_RUN_SETUP_KEY, "1");
  if (elements.firstRunSetup) elements.firstRunSetup.hidden = true;
}

async function checkBatteryOptimizationStatus({ rememberIfDone = false } = {}) {
  const batterySettings = getBatterySettingsPlugin();
  if (!batterySettings?.isIgnoringBatteryOptimizations) return null;

  try {
    const result = await batterySettings.isIgnoringBatteryOptimizations();
    const isDone = Boolean(result?.ignoring);
    if (isDone && rememberIfDone) hideFirstRunSetup({ remember: true });
    return isDone;
  } catch {
    return null;
  }
}

async function initializeFirstRunSetup() {
  if (!isNativeApp()) return;
  if (localStorage.getItem(FIRST_RUN_SETUP_KEY)) return;

  const isDone = await checkBatteryOptimizationStatus({ rememberIfDone: true });
  if (isDone) return;
  showFirstRunSetup();
}

async function openBatteryOptimizationSettings() {
  try {
    const batterySettings = getBatterySettingsPlugin();
    if (batterySettings?.openBatterySettings) {
      await batterySettings.openBatterySettings();
      setTimeout(() => {
        checkBatteryOptimizationStatus({ rememberIfDone: true });
      }, 1000);
      return;
    }
  } catch {
    // Fall through to the manual guide below.
  }

  window.alert("Android 설정 > 앱 > Bicycle Trainer > 배터리에서 '제한 없음'을 선택해 주세요.");
}

function handleBatterySettingsReturn() {
  if (!isNativeApp()) return;
  if (document.visibilityState && document.visibilityState !== "visible") return;
  checkBatteryOptimizationStatus({ rememberIfDone: true });
}

function handleNativeAppReturn() {
  handleBatterySettingsReturn();
  syncNativeBackgroundRideStatus();
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
  checkStationaryAutoStop(current);
}

function checkStationaryAutoStop(current) {
  if (!state.riding) return;
  const now = Date.now();

  if (!state.stationaryAnchor) {
    state.stationaryAnchor = current;
    state.stationarySince = now;
    return;
  }

  const distanceFromAnchor = haversineKm(state.stationaryAnchor, current);
  if (distanceFromAnchor <= STATIONARY_RADIUS_KM) {
    if (now - state.stationarySince >= STATIONARY_LIMIT_MS) {
      stopRide({ reason: "stationary" });
    }
    return;
  }

  state.stationaryAnchor = current;
  state.stationarySince = now;
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

function createRouteEndpointIcon(type) {
  return L.divIcon({
    className: "",
    html: `<div class="route-endpoint-marker ${type}" aria-hidden="true">${type === "start" ? "출" : "도"}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function createKakaoRouteEndpointOverlay(type, latLng) {
  const content = document.createElement("div");
  content.className = `route-endpoint-marker ${type}`;
  content.textContent = type === "start" ? "출" : "도";

  return new kakao.maps.CustomOverlay({
    content,
    position: toProviderLatLng(latLng),
    xAnchor: 0.5,
    yAnchor: 0.5,
    zIndex: 4,
  });
}

function clearRecordEndpointMarkers() {
  [state.recordStartMarker, state.recordEndMarker].forEach((marker) => {
    if (state.mapProvider === "kakao") marker?.setMap?.(null);
    else marker?.remove?.();
  });
  state.recordStartMarker = null;
  state.recordEndMarker = null;
}

function setRecordEndpointMarkers(path) {
  clearRecordEndpointMarkers();
  if (!state.map || !path?.length) return;

  const start = path[0];
  const end = path[path.length - 1];
  if (!start || !end) return;

  if (state.mapProvider === "kakao") {
    state.recordStartMarker = createKakaoRouteEndpointOverlay("start", start);
    state.recordEndMarker = createKakaoRouteEndpointOverlay("end", end);
    state.recordStartMarker.setMap(state.map);
    state.recordEndMarker.setMap(state.map);
    return;
  }

  state.recordStartMarker = L.marker(start, {
    icon: createRouteEndpointIcon("start"),
    keyboard: false,
    title: "출발지",
    zIndexOffset: 900,
  }).addTo(state.map).bindPopup("출발지");

  state.recordEndMarker = L.marker(end, {
    icon: createRouteEndpointIcon("end"),
    keyboard: false,
    title: "도착지",
    zIndexOffset: 900,
  }).addTo(state.map).bindPopup("도착지");
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
  clearRecordEndpointMarkers();
  state.destinationMarker?.setMap?.(null);
  state.destinationLine?.setMap?.(null);
  state.destinationMarker = null;
  state.destinationLine = null;
  state.routeDestination = null;
  updateRouteNavigateButton();
}

function formatKakaoRoutePoint(name, latitude, longitude) {
  return `${encodeURIComponent(name || "위치")},${Number(latitude).toFixed(6)},${Number(longitude).toFixed(6)}`;
}

function getKakaoNavigationUrl() {
  const destination = state.routeDestination;
  if (!destination) return "";

  if (state.lastPosition) {
    const start = formatKakaoRoutePoint("현재 위치", state.lastPosition.latitude, state.lastPosition.longitude);
    const end = formatKakaoRoutePoint(destination.name, destination.latitude, destination.longitude);
    return `https://map.kakao.com/link/by/bicycle/${start}/${end}`;
  }

  if (destination.id) {
    return `https://map.kakao.com/link/to/${encodeURIComponent(destination.id)}`;
  }

  const end = formatKakaoRoutePoint(destination.name, destination.latitude, destination.longitude);
  return `https://map.kakao.com/link/to/${end}`;
}

function updateRouteNavigateButton() {
  if (!elements.routeNavigate) return;
  const hasDestination = Boolean(state.routeDestination);
  elements.routeNavigate.disabled = !hasDestination;
  elements.routeNavigate.textContent = hasDestination ? "카카오맵 길찾기" : "목적지 선택 후 길찾기";
}

async function openKakaoNavigation() {
  const url = getKakaoNavigationUrl();
  if (!url) {
    setMapStatus("목적지를 먼저 선택하세요.", "error");
    return;
  }

  if (!state.riding) {
    await startRide();
  }
  window.open(url, "_blank", "noopener");
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
  clearDestinationGuide();
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
    id: place.id || "",
    name: place.place_name || "목적지",
    latitude: Number(place.y),
    longitude: Number(place.x),
  };
  state.routeDestination = destination;
  updateRouteNavigateButton();
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
    [
      state.mapMarker,
      state.mapAccuracy,
      state.mapRoute,
      state.recordStartMarker,
      state.recordEndMarker,
      state.destinationMarker,
      state.destinationLine,
    ].forEach((item) => item?.setMap?.(null));
  }

  state.map = null;
  state.mapMarker = null;
  state.mapAccuracy = null;
  state.mapRoute = null;
  state.recordStartMarker = null;
  state.recordEndMarker = null;
  state.destinationMarker = null;
  state.destinationLine = null;
  state.routeDestination = null;
  state.mapProvider = null;
  state.kakaoPlaces = null;
  if (elements.routeMap) elements.routeMap.innerHTML = "";
  updateRouteNavigateButton();
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

function normalizeBackgroundRideSnapshot(snapshot) {
  if (!snapshot) return null;
  const path = normalizeRecordPath(snapshot.points || snapshot.path || []);
  const distanceKm = Number(snapshot.distanceKm);
  const startedAt = Number(snapshot.startedAt);
  const currentSpeed = Number(snapshot.currentSpeed);
  return {
    running: Boolean(snapshot.running),
    autoStopped: Boolean(snapshot.autoStopped),
    stopReason: snapshot.stopReason || "",
    startedAt: Number.isFinite(startedAt) && startedAt > 0 ? startedAt : 0,
    distanceKm: Number.isFinite(distanceKm) ? distanceKm : 0,
    currentSpeed: Number.isFinite(currentSpeed) ? currentSpeed : 0,
    path,
  };
}

async function startNativeBackgroundRide() {
  if (!isNativeApp()) return null;
  const backgroundRide = getBackgroundRidePlugin();
  if (!backgroundRide?.startTracking) return null;

  try {
    const result = await backgroundRide.startTracking({ startedAt: state.startedAt });
    state.nativeBackgroundRide = Boolean(result?.started);
    if (state.nativeBackgroundRide) setMapStatus("백그라운드 주행기록이 켜졌습니다.", "ready");
    return result;
  } catch (error) {
    state.nativeBackgroundRide = false;
    setMapStatus(`백그라운드 기록을 시작하지 못했습니다: ${error.message || error}`, "error");
    return null;
  }
}

async function stopNativeBackgroundRide() {
  if (!isNativeApp()) return null;
  const backgroundRide = getBackgroundRidePlugin();
  if (!backgroundRide?.stopTracking) return null;

  try {
    const snapshot = await backgroundRide.stopTracking();
    state.nativeBackgroundRide = false;
    return normalizeBackgroundRideSnapshot(snapshot);
  } catch {
    state.nativeBackgroundRide = false;
    return null;
  }
}

async function syncNativeBackgroundRideStatus() {
  if (!state.riding || !isNativeApp()) return;
  const backgroundRide = getBackgroundRidePlugin();
  if (!backgroundRide?.getTrackingStatus) return;

  try {
    const snapshot = normalizeBackgroundRideSnapshot(await backgroundRide.getTrackingStatus());
    if (!snapshot) return;

    if (snapshot.distanceKm > state.distanceKm) state.distanceKm = snapshot.distanceKm;
    if (snapshot.currentSpeed >= 0) state.currentSpeed = snapshot.currentSpeed;
    if (snapshot.path.length > state.routePoints.length) state.routePoints = snapshot.path;
    updateRideMetrics();

    if (snapshot.autoStopped || (!snapshot.running && snapshot.path.length)) {
      stopRide({ reason: snapshot.stopReason || "stationary" });
    }
  } catch {
    // Foreground Web GPS remains active even when native status polling fails.
  }
}

function updateRideMetrics() {
  const elapsedMs = state.riding ? Date.now() - state.startedAt : 0;
  const elapsedHours = elapsedMs / 3600000;
  elements.elapsed.textContent = formatElapsed(elapsedMs);
  elements.distance.textContent = state.distanceKm.toFixed(2);
  elements.speed.textContent = state.currentSpeed.toFixed(1);
  elements.avgSpeed.textContent = elapsedHours > 0 ? (state.distanceKm / elapsedHours).toFixed(1) : "0.0";
}

async function startRide() {
  if (state.riding) return;

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
  state.stationaryAnchor = null;
  state.stationarySince = 0;
  state.routePoints = [];
  if (state.mapRoute) {
    if (state.mapProvider === "kakao") state.mapRoute.setPath([]);
    else state.mapRoute.setLatLngs([]);
  }
  elements.rideToggle.textContent = "종료";
  setGpsStatus("GPS 연결 중");
  state.elapsedTimer = setInterval(updateRideMetrics, 1000);

  startNativeBackgroundRide();

  state.watchId = navigator.geolocation.watchPosition(
    updatePosition,
    (error) => {
      setGpsStatus(getGpsErrorMessage(error));
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
  );
}

async function stopRide(options = {}) {
  const nativeSnapshot = await stopNativeBackgroundRide();
  const rideStartedAt = nativeSnapshot?.startedAt || state.startedAt;
  const ridePath = nativeSnapshot?.path?.length ? nativeSnapshot.path : state.routePoints;
  const rideDistanceKm = nativeSnapshot?.distanceKm > state.distanceKm ? nativeSnapshot.distanceKm : state.distanceKm;
  const elapsedMs = Date.now() - rideStartedAt;
  const minutes = Math.max(1, Math.round(elapsedMs / 60000));
  const avgSpeed = rideDistanceKm / (elapsedMs / 3600000 || 1);
  const distanceKm = Number(rideDistanceKm.toFixed(2));
  const avgSpeedKmh = Number(avgSpeed.toFixed(1));
  const shouldSave = !(distanceKm <= MIN_SAVE_DISTANCE_KM && avgSpeedKmh <= MIN_SAVE_AVG_SPEED_KMH);

  state.riding = false;
  clearInterval(state.elapsedTimer);
  if (state.watchId !== null) navigator.geolocation.clearWatch(state.watchId);
  state.watchId = null;

  elements.rideToggle.textContent = "시작";
  state.stationaryAnchor = null;
  state.stationarySince = 0;

  if (shouldSave) {
    addRecord({
      date: new Date().toISOString(),
      distanceKm,
      minutes,
      avgSpeed: avgSpeedKmh,
      note: options.reason === "stationary" ? "GPS 주행 · 자동 종료" : "GPS 주행",
      path: compressRecordPath(ridePath),
    });
    setGpsStatus(options.reason === "stationary" ? "자동 종료" : "GPS 대기");
  } else {
    setGpsStatus("기록 제외");
    setMapStatus("500m 이하이고 평균 3km/h 이하인 주행은 저장하지 않았습니다.", "ready");
    renderAll();
  }

  state.distanceKm = 0;
  state.currentSpeed = 0;
  updateRideMetrics();
}

function addRecord(record) {
  if (!record.distanceKm || !record.minutes) return;
  state.records = [normalizeRecord(record), ...state.records].slice(0, 60);
  saveRecords();
  renderAll();
}

function getSampleRouteRecords() {
  const now = Date.now();
  return [
    {
      id: "sample-route-anyangcheon-short",
      date: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      distanceKm: 4.8,
      minutes: 22,
      avgSpeed: 13.1,
      note: "테스트 주행 - 안양천 짧은 코스",
      path: [
        [37.475527, 126.88729],
        [37.47615, 126.89042],
        [37.47728, 126.89408],
        [37.47874, 126.89831],
        [37.48016, 126.90243],
        [37.48203, 126.90624],
        [37.48418, 126.90977],
        [37.48642, 126.91292],
        [37.48838, 126.91551],
      ],
    },
    {
      id: "sample-route-gasan-loop",
      date: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      distanceKm: 6.3,
      minutes: 29,
      avgSpeed: 13.0,
      note: "테스트 주행 - 가산 순환 코스",
      path: [
        [37.475527, 126.88729],
        [37.47816, 126.88792],
        [37.48142, 126.88964],
        [37.48331, 126.89318],
        [37.48248, 126.89745],
        [37.47984, 126.90062],
        [37.47668, 126.89941],
        [37.47462, 126.89578],
        [37.47389, 126.89112],
        [37.475527, 126.88729],
      ],
    },
    {
      id: "sample-route-hangang-bound",
      date: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(),
      distanceKm: 9.2,
      minutes: 41,
      avgSpeed: 13.5,
      note: "테스트 주행 - 한강 방향 코스",
      path: [
        [37.475527, 126.88729],
        [37.47918, 126.88931],
        [37.48354, 126.89182],
        [37.48797, 126.89536],
        [37.49244, 126.89958],
        [37.49662, 126.90417],
        [37.50073, 126.90945],
        [37.50518, 126.91512],
        [37.50964, 126.92073],
        [37.51422, 126.92658],
      ],
    },
  ].map(normalizeRecord);
}

async function seedSampleRouteRecords() {
  const sampleRecords = getSampleRouteRecords();
  const sampleIds = new Set(sampleRecords.map((record) => record.id));
  state.records = [...sampleRecords, ...state.records.filter((record) => !sampleIds.has(record.id))].slice(0, 60);
  saveRecords();
  renderAll();

  const docRef = getCloudDocRef();
  if (!docRef) {
    setCloudStatus("테스트 주행기록 3개를 이 기기에 추가했습니다.");
    return;
  }

  try {
    await docRef.set(
      {
        versionCode: APP_VERSION_CODE,
        versionName: APP_VERSION_NAME,
        records: getCloudRecords(),
        profile: state.profile,
        weightHistory: state.weightHistory,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    setCloudStatus("테스트 주행기록 3개를 현재 로그인 계정에 추가했습니다.");
  } catch (error) {
    setCloudStatus(`테스트 기록은 기기에 추가했지만 클라우드 저장에 실패했습니다: ${error.message}`);
  }
}

function getCoachDebugPayload() {
  const condition = elements.condition?.value || "normal";
  const goal = elements.goal?.value || state.profile.goal || "endurance";
  const coachContext = buildCoachContext(condition, goal, null);
  const coachEvaluation = evaluateCoachPattern(goal);
  return {
    generatedAt: new Date().toISOString(),
    viewer: {
      displayName: state.cloudUser?.displayName || "",
      email: state.cloudUser?.email || "",
      uid: state.cloudUser?.uid || "",
    },
    condition,
    goal,
    recentRecords: coachContext.recentRecords,
    coachContext,
    coachEvaluation,
  };
}

function showCoachJson() {
  if (!isWonyUser()) {
    setCloudStatus("Wony 계정에서만 코칭 JSON을 볼 수 있습니다.");
    return;
  }
  showJsonModal("코칭 JSON", getCoachDebugPayload());
}

function updateRecordDeleteControls() {
  const selectedCount = state.selectedRecordIds.size;
  if (elements.recordDeleteActions) elements.recordDeleteActions.hidden = !state.recordDeleteMode;
  if (elements.recordDeleteCount) elements.recordDeleteCount.textContent = `${selectedCount}개 선택됨`;
  if (elements.deleteSelectedRecords) elements.deleteSelectedRecords.disabled = selectedCount === 0;
  if (elements.clearRecords) elements.clearRecords.classList.toggle("active", state.recordDeleteMode);
}

function setRecordDeleteMode(enabled) {
  state.recordDeleteMode = enabled;
  state.selectedRecordIds.clear();
  updateRecordDeleteControls();
  renderRecords();
}

function deleteSelectedRecords() {
  if (!state.selectedRecordIds.size) return;
  const selectedCount = state.selectedRecordIds.size;
  const confirmed = window.confirm(`선택한 기록 ${selectedCount}개를 삭제할까요?`);
  if (!confirmed) return;

  state.records = state.records.filter((record) => !state.selectedRecordIds.has(record.id));
  state.selectedRecordIds.clear();
  state.recordDeleteMode = false;
  saveRecords();
  renderAll();
}

function drawRecordRoute(record) {
  if (!record?.path?.length) return;
  refreshRouteMap();
  if (!state.map) return;

  clearDestinationGuide();
  state.routePoints = normalizeRecordPath(record.path);
  if (!state.routePoints.length) return;

  if (state.mapRoute) {
    if (state.mapProvider === "kakao") {
      state.mapRoute.setPath(state.routePoints.map(toProviderLatLng));
      const bounds = new kakao.maps.LatLngBounds();
      state.routePoints.forEach((point) => bounds.extend(toProviderLatLng(point)));
      state.map.setBounds(bounds);
    } else {
      state.mapRoute.setLatLngs(state.routePoints);
      state.map.fitBounds(state.routePoints, { padding: [24, 24] });
    }
  }
  setRecordEndpointMarkers(state.routePoints);

  const routeDate = formatDate(record.date);
  setMapStatus(`${routeDate} 주행 경로를 표시했습니다.`, "ready");
  invalidateMapSize();
}

function showRecordRoute(recordId) {
  const record = state.records.find((item) => item.id === recordId);
  if (!record?.path?.length) return;
  switchView("route");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => drawRecordRoute(record));
  });
}

function renderRecords() {
  if (!state.records.length) {
    state.recordDeleteMode = false;
    state.selectedRecordIds.clear();
    updateRecordDeleteControls();
    elements.recordsList.innerHTML = `<div class="record-item"><strong>아직 기록이 없습니다</strong><span>GPS 주행을 시작하거나 실내 주행을 수동으로 저장하세요.</span></div>`;
    return;
  }

  updateRecordDeleteControls();
  const visibleRecords = state.recordDeleteMode ? state.records : state.records.slice(0, 6);
  elements.recordsList.innerHTML = visibleRecords
    .map(
      (record) => `
        <article class="record-item ${state.recordDeleteMode ? "selectable" : ""}">
          ${
            state.recordDeleteMode
              ? `<label class="record-select">
                  <input type="checkbox" data-record-id="${record.id}" ${state.selectedRecordIds.has(record.id) ? "checked" : ""} />
                  <span class="sr-only">기록 선택</span>
                </label>`
              : ""
          }
          <div class="record-content">
            <strong>${record.distanceKm.toFixed(1)} km · ${record.minutes}분 · ${record.avgSpeed.toFixed(1)} km/h</strong>
            <span>${formatDate(record.date)}${record.note ? ` · ${record.note}` : ""}</span>
            ${
              !state.recordDeleteMode && record.path?.length > 1
                ? `<button class="record-map-button" type="button" data-route-record-id="${record.id}">지도 보기</button>`
                : ""
            }
          </div>
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

function renderCoachLegacy() {
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

function renderWorkoutLegacy(items) {
  elements.workoutPlan.innerHTML = items
    .map((item, index) => `<article class="workout-item"><strong>${index + 1}. ${item}</strong><span>컨디션에 맞춰 강도를 조절하세요.</span></article>`)
    .join("");
}

function getLocalWorkoutPlanLegacy(condition, goal) {
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

function serializeRecordForCloud(record) {
  const normalized = normalizeRecord(record);
  return {
    ...normalized,
    path: normalized.path.map(([latitude, longitude]) => ({ latitude, longitude })),
  };
}

function getCloudRecords() {
  return state.records.map(serializeRecordForCloud);
}

function getCloudPayload() {
  return {
    versionCode: APP_VERSION_CODE,
    versionName: APP_VERSION_NAME,
    profile: state.profile,
    coachIntensity: state.coachIntensity,
    records: getCloudRecords(),
    weightHistory: state.weightHistory,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
}

async function signInToCloud() {
  if (!state.firebaseAuth) {
    setCloudStatus("Firebase가 아직 준비되지 않았습니다.");
    return;
  }

  if (isNativeApp()) {
    try {
      const nativeAuth = getNativeFirebaseAuthPlugin();
      if (!nativeAuth?.signInWithGoogle) {
        setCloudStatus("네이티브 Google 로그인 기능을 찾지 못했습니다. 앱을 업데이트해 주세요.");
        return;
      }

      setCloudStatus("Google 계정 연결 중입니다...");
      const result = await nativeAuth.signInWithGoogle();
      const idToken = result?.credential?.idToken;
      const accessToken = result?.credential?.accessToken || null;

      if (!idToken) {
        throw new Error("Google 인증 토큰을 받지 못했습니다. Firebase Android 앱 설정을 확인해 주세요.");
      }

      const credential = firebase.auth.GoogleAuthProvider.credential(idToken, accessToken);
      await state.firebaseAuth.signInWithCredential(credential);
      setCloudStatus("Google 로그인이 완료되었습니다.");
      return;
    } catch (error) {
      setCloudStatus(getFirebaseAuthErrorMessage(error));
      return;
    }
  }

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

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
  if (isNativeApp()) {
    await getNativeFirebaseAuthPlugin()?.signOut?.().catch(() => {});
  }
  await state.firebaseAuth.signOut();
}

async function backupToCloud() {
  const docRef = getCloudDocRef();
  if (!docRef) return;

  try {
    const payload = getCloudPayload();
    const apiKeys = getApiKeysForCloudBackup();
    let apiKeyMessage = "";

    if (hasCloudApiKeys(apiKeys)) {
      const pin = await requestCloudApiPin("백업");
      if (!pin) {
        setCloudStatus("PIN 입력이 취소되어 클라우드 백업을 중단했습니다.");
        return;
      }
      payload.encryptedApiKeys = await encryptCloudApiKeys(apiKeys, pin);
      apiKeyMessage = " API 키도 암호화해 저장했습니다.";
    } else {
      payload.encryptedApiKeys = firebase.firestore.FieldValue.delete();
    }

    await docRef.set(payload, { merge: true });
    setCloudStatus(`클라우드 백업을 완료했습니다.${apiKeyMessage}`);
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
    const nextProfile = normalizeProfile(data.profile || {});
    const nextCoachIntensity = ["gentle", "balanced", "strict"].includes(data.coachIntensity)
      ? data.coachIntensity
      : state.coachIntensity;
    const nextRecords = Array.isArray(data.records) ? data.records.map(normalizeRecord) : [];
    const nextWeightHistory = normalizeWeightHistory(data.weightHistory);
    let restoredApiKeys = null;
    let apiKeyMessage = "";

    if (data.encryptedApiKeys) {
      const pin = await requestCloudApiPin("복원");
      if (!pin) {
        setCloudStatus("PIN 입력이 취소되어 클라우드 복원을 중단했습니다.");
        return;
      }

      restoredApiKeys = await decryptCloudApiKeys(data.encryptedApiKeys, pin);
      apiKeyMessage = " API 키도 복원했습니다.";
    }

    state.profile = nextProfile;
    state.coachIntensity = nextCoachIntensity;
    state.records = nextRecords;
    state.weightHistory = nextWeightHistory;
    localStorage.setItem(COACH_INTENSITY_KEY, state.coachIntensity);
    if (restoredApiKeys?.openAiKey) localStorage.setItem(OPENAI_API_KEY, restoredApiKeys.openAiKey);
    if (restoredApiKeys?.kakaoMapKey) {
      localStorage.setItem(KAKAO_MAP_KEY, restoredApiKeys.kakaoMapKey);
      localStorage.removeItem(LEGACY_NAVER_MAP_KEY);
    }

    saveProfile();
    saveRecords();
    saveWeightHistory();
    if (apiKeyMessage) resetRouteMap();
    renderAll();
    renderProfile();
    renderSettings();
    setCloudStatus(`클라우드 백업을 이 기기에 복원했습니다.${apiKeyMessage}`);
  } catch (error) {
    setCloudStatus(`클라우드 복원 실패: ${error.message}`);
  }
}

function buildCoachContext(condition, goal, weather = null) {
  const recentRecords = getValidCoachRecords().slice(0, 8).map(summarizeRecordForCoach);

  return {
    condition,
    selectedGoal: goal,
    profile: state.profile,
    coachIntensity: state.coachIntensity,
    currentLocation: state.lastPosition
      ? {
          latitude: Number(state.lastPosition.latitude.toFixed(5)),
          longitude: Number(state.lastPosition.longitude.toFixed(5)),
        }
      : null,
    todayWeather: weather,
    weightHistory: state.weightHistory.slice(0, 10),
    summary: getCoachSummary(),
    recentRecords,
    coachStats: getCoachStats(),
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

async function requestAiCoachLegacy(condition, goal, weather = null) {
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
  const normalizedText = String(text || "")
    .replace(/\s+(?=[1-3]\.\s)/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const lines = normalizedText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const steps = lines.filter((line) => /^[1-3]\./.test(line)).map((line) => line.replace(/^[1-3]\.\s*/, ""));
  const message = lines.filter((line) => !/^[1-3]\./.test(line)).join(" ");

  if (message) renderCoachMessage(message);
  if (steps.length) renderWorkout(steps.slice(0, 3));
}

function splitCoachMessageParagraphs(message) {
  const sentences = String(message || "")
    .replace(/\s+/g, " ")
    .trim()
    .match(/[^.!?。！？]+[.!?。！？]?/g);
  if (!sentences) return [];

  const paragraphs = [];
  for (let index = 0; index < sentences.length; index += 2) {
    paragraphs.push(sentences.slice(index, index + 2).join(" ").trim());
  }
  return paragraphs.filter(Boolean);
}

function renderCoachMessage(message) {
  const paragraphs = splitCoachMessageParagraphs(message);
  if (!paragraphs.length) {
    elements.coachMessage.textContent = message;
    return;
  }
  elements.coachMessage.innerHTML = paragraphs
    .map((paragraph) => `<span class="coach-paragraph">${escapeHtml(paragraph)}</span>`)
    .join("");
}

function getCoachStatsLegacy() {
  const records = state.records;
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
  const recent = records.slice(0, 5);
  const thisWeek = records.filter((record) => new Date(record.date).getTime() >= weekAgo);
  const lastWeek = records.filter((record) => {
    const time = new Date(record.date).getTime();
    return time >= twoWeeksAgo && time < weekAgo;
  });
  const sumDistance = (items) => items.reduce((sum, record) => sum + record.distanceKm, 0);

  return {
    recent,
    last: records[0] || null,
    totalDistance: sumDistance(records),
    thisWeekDistance: sumDistance(thisWeek),
    lastWeekDistance: sumDistance(lastWeek),
    weeklyCount: thisWeek.length,
    recentAvgSpeed: recent.length ? recent.reduce((sum, record) => sum + record.avgSpeed, 0) / recent.length : 0,
    bestDistance: Math.max(0, ...records.map((record) => record.distanceKm)),
  };
}

function getCoachWeightSentence() {
  const weightTrend = getWeightTrend();
  if (!weightTrend) return "";
  if (weightTrend.label === "down") {
    return `몸무게는 최근 ${Math.abs(weightTrend.diff).toFixed(1)}kg 내려갔어요. 오늘은 욕심내기보다 리듬을 살리고, 끝나고 단백질과 수분을 챙기는 쪽이 좋겠습니다.`;
  }
  if (weightTrend.label === "up") {
    return `몸무게가 최근 ${weightTrend.diff.toFixed(1)}kg 올라왔어요. 체중 감량이 목표라면 강도를 확 올리기보다 숨이 차지 않는 시간을 조금 길게 가져가 봐요.`;
  }
  return "몸무게 흐름은 안정적이에요. 이런 날은 아주 작은 강도 상승을 넣기 좋습니다.";
}

function getLocalCoachMessageLegacy(condition, goal) {
  const stats = getCoachStats();
  const profileName = state.profile.name ? `${state.profile.name}님, ` : "";
  const goalLabel = getProfileGoalLabel(goal);
  const weightSentence = getCoachWeightSentence();

  if (!stats.last) {
    return `${profileName}아직 코치가 읽을 주행 패턴이 거의 없어요. 오늘은 잘 타는 것보다 첫 기준점을 만드는 날로 보면 됩니다. ${goalLabel} 목표는 기록이 2~3개 쌓이면 훨씬 정확하게 맞춰볼게요. ${weightSentence}`.trim();
  }

  const lastRide = `최근 주행은 ${stats.last.distanceKm.toFixed(1)}km, 평균 ${stats.last.avgSpeed.toFixed(1)}km/h였어요.`;
  const weeklySignal =
    stats.weeklyCount >= 3
      ? `이번 주에 ${stats.weeklyCount}번 탔으니 몸은 이미 자극을 꽤 받은 편입니다.`
      : stats.thisWeekDistance > stats.lastWeekDistance && stats.lastWeekDistance > 0
        ? "지난주보다 주간 거리가 늘고 있어서 흐름은 좋아요."
        : "이번 주는 아직 여유가 있으니 무리하지 않는 선에서 한 번 더 쌓아도 좋겠습니다.";

  if (condition === "tired") {
    return `${profileName}${lastRide} ${weeklySignal} 다만 오늘 컨디션을 피곤함으로 골랐으니, 훈련을 밀어붙이기보다 회복 주행으로 다리를 풀어주는 쪽이 더 영리합니다. ${weightSentence}`.trim();
  }

  if (goal === "speed") {
    return `${profileName}${lastRide} 속도 목표라면 오늘은 길게 고생하기보다 짧은 가속을 깔끔하게 넣는 날로 가죠. ${weeklySignal} 마지막까지 자세가 무너지지 않는지만 체크해 주세요. ${weightSentence}`.trim();
  }

  if (goal === "fatloss") {
    return `${profileName}${lastRide} 감량 목표에는 갑자기 빠른 주행보다 꾸준히 오래 버티는 시간이 더 잘 맞습니다. ${weeklySignal} 오늘은 대화가 가능한 강도로 시간을 채우는 쪽이 좋아요. ${weightSentence}`.trim();
  }

  if (goal === "health") {
    return `${profileName}${lastRide} 건강 유지 목적이면 오늘의 성공 기준은 기록 갱신이 아니라 끝났을 때 몸이 가벼운지입니다. ${weeklySignal} 호흡을 편하게 두고 리듬만 유지해 봐요. ${weightSentence}`.trim();
  }

  return `${profileName}${lastRide} 지구력 목표에는 화려한 한 번보다 반복 가능한 페이스가 더 중요합니다. ${weeklySignal} 오늘은 중간에 흔들리지 않는 속도를 찾는 데 집중해 봐요. ${weightSentence}`.trim();
}

function renderCoach() {
  const condition = elements.condition?.value || "normal";
  const goal = elements.goal?.value || state.profile.goal || "endurance";
  renderCoachMessage(getLocalCoachMessage(condition, goal));
  renderWorkout(getLocalWorkoutPlan(condition, goal));
}

function getWorkoutStepNote(item) {
  if (/회복|쿨다운|마무리|스트레칭/.test(item)) return "몸을 다시 편하게 만드는 구간입니다.";
  if (/전력|인터벌|빠르게|가속/.test(item)) return "자세가 흐트러지면 강도를 바로 낮추세요.";
  if (/워밍업/.test(item)) return "처음부터 밀지 말고 다리 온도를 올리세요.";
  return "호흡과 다리 느낌을 같이 확인하세요.";
}

function renderWorkout(items) {
  elements.workoutPlan.innerHTML = items
    .map((item, index) => `<article class="workout-item"><strong>${index + 1}. ${escapeHtml(item)}</strong><span>${escapeHtml(getWorkoutStepNote(item))}</span></article>`)
    .join("");
}

function getLocalWorkoutPlanLegacy2(condition, goal) {
  if (condition === "tired") {
    return ["10분 아주 가볍게 다리 풀기", "15분 대화 가능한 강도로 회복 주행", "5분 천천히 내려오며 하체 스트레칭"];
  }

  const plans = {
    endurance: ["10분 워밍업으로 호흡 안정", "25분 같은 페이스 유지", "마지막 5분은 조금 더 가볍게 정리"],
    fatloss: ["8분 워밍업", "30분 대화 가능한 강도로 꾸준히", "5분 쿨다운 후 수분 보충"],
    speed: ["12분 워밍업", "40초 빠르게 + 100초 회복을 6회", "10분 편한 페이스로 마무리"],
    health: ["10분 워밍업", "20분 편안한 강도 유지", "5분 호흡 낮추며 마무리"],
  };
  return plans[goal] || plans.endurance;
}

async function requestAiCoachLegacy2(condition, goal, weather = null) {
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
        "You are a warm but honest Korean cycling coach inside a personal bicycle trainer app. Sound like a real coach who read the rider's recent pattern, not like a generic fitness template. Mention one concrete signal from the data, explain today's best training choice in plain Korean, and keep safety conservative. Do not diagnose medical issues. Avoid stiff phrases like '분석 결과' or '권장합니다'. Respond with one natural paragraph, then exactly three workout steps. Each step must start with '1.', '2.', '3.' and include a clear duration or intensity.",
      input: `라이더 상태와 최근 주행 데이터: ${JSON.stringify(context)}`,
      max_output_tokens: 520,
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

function getCoachTarget(goal) {
  const targets = {
    endurance: { weeklyRides: 3, weeklyDistanceKm: 35, minAvgSpeed: 14, label: "지구력" },
    fatloss: { weeklyRides: 4, weeklyDistanceKm: 30, minAvgSpeed: 12, label: "체중 감량" },
    speed: { weeklyRides: 3, weeklyDistanceKm: 25, minAvgSpeed: 18, label: "속도 향상" },
    health: { weeklyRides: 3, weeklyDistanceKm: 18, minAvgSpeed: 10, label: "건강 유지" },
  };
  return targets[goal] || targets.endurance;
}

function roundCoachNumber(value, digits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Number(number.toFixed(digits));
}

function getRideWindowStats(records, startTime, endTime = Date.now()) {
  const items = records.filter((record) => {
    const time = new Date(record.date).getTime();
    return Number.isFinite(time) && time >= startTime && time < endTime;
  });
  const distanceKm = items.reduce((sum, record) => sum + (Number(record.distanceKm) || 0), 0);
  const durationMinutes = items.reduce((sum, record) => sum + (Number(record.minutes) || 0), 0);
  const weightedSpeedKmh = durationMinutes
    ? distanceKm / (durationMinutes / 60)
    : 0;

  return {
    records: items,
    rideCount: items.length,
    distanceKm,
    durationMinutes,
    averageSpeedKmh: weightedSpeedKmh,
  };
}

function getCoachSummary() {
  const validRecords = getValidCoachRecords();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const last7 = getRideWindowStats(validRecords, now - 7 * dayMs, now);
  const last14 = getRideWindowStats(validRecords, now - 14 * dayMs, now);
  const last30 = getRideWindowStats(validRecords, now - 30 * dayMs, now);
  const previous7 = getRideWindowStats(validRecords, now - 14 * dayMs, now - 7 * dayMs);
  const total = getRideWindowStats(validRecords, 0, now + dayMs);
  const recent = validRecords.slice(0, 6);
  const recentDistanceKm = recent.reduce((sum, record) => sum + (Number(record.distanceKm) || 0), 0);
  const recentDurationMinutes = recent.reduce((sum, record) => sum + (Number(record.minutes) || 0), 0);
  const recentAverageSpeedKmh = recentDurationMinutes ? recentDistanceKm / (recentDurationMinutes / 60) : 0;
  const lastRecordTime = validRecords[0] ? new Date(validRecords[0].date).getTime() : NaN;

  return {
    validRideCountTotal: total.rideCount,
    validRideDistanceTotalKm: roundCoachNumber(total.distanceKm),
    validRideDurationTotalMinutes: Math.round(total.durationMinutes),

    validRideCountLast7Days: last7.rideCount,
    validRideDistanceLast7DaysKm: roundCoachNumber(last7.distanceKm),
    validRideDurationLast7DaysMinutes: Math.round(last7.durationMinutes),
    validRideAverageSpeedLast7DaysKmh: roundCoachNumber(last7.averageSpeedKmh),

    validRideCountLast14Days: last14.rideCount,
    validRideDistanceLast14DaysKm: roundCoachNumber(last14.distanceKm),
    validRideDurationLast14DaysMinutes: Math.round(last14.durationMinutes),
    validRideAverageSpeedLast14DaysKmh: roundCoachNumber(last14.averageSpeedKmh),

    validRideCountLast30Days: last30.rideCount,
    validRideDistanceLast30DaysKm: roundCoachNumber(last30.distanceKm),
    validRideDurationLast30DaysMinutes: Math.round(last30.durationMinutes),
    validRideAverageSpeedLast30DaysKmh: roundCoachNumber(last30.averageSpeedKmh),

    validRideCountPrevious7Days: previous7.rideCount,
    validRideDistancePrevious7DaysKm: roundCoachNumber(previous7.distanceKm),
    validRideDurationPrevious7DaysMinutes: Math.round(previous7.durationMinutes),
    validRideAverageSpeedPrevious7DaysKmh: roundCoachNumber(previous7.averageSpeedKmh),

    validRideDistanceChangeVsPrevious7DaysKm: roundCoachNumber(last7.distanceKm - previous7.distanceKm),
    validRideCountChangeVsPrevious7Days: last7.rideCount - previous7.rideCount,
    validRideAverageSpeedChangeVsPrevious7DaysKmh: roundCoachNumber(last7.averageSpeedKmh - previous7.averageSpeedKmh),

    validRideActiveDaysLast30Days: new Set(last30.records.map((record) => new Date(record.date).toISOString().slice(0, 10))).size,
    daysSinceLastValidRide: Number.isFinite(lastRecordTime) ? Math.floor((now - lastRecordTime) / dayMs) : null,
    recentValidRideAverageSpeedKmh: roundCoachNumber(recentAverageSpeedKmh),
    bestValidRideDistanceKm: roundCoachNumber(Math.max(0, ...validRecords.map((record) => Number(record.distanceKm) || 0))),
  };
}

function getCoachStats() {
  const records = getValidCoachRecords();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * dayMs;
  const twoWeeksAgo = now - 14 * dayMs;
  const fourWeeksAgo = now - 28 * dayMs;
  const recentSource = records.slice(0, 6);
  const recent = recentSource.map(summarizeRecordForCoach);
  const thisWeek = records.filter((record) => new Date(record.date).getTime() >= weekAgo);
  const lastWeek = records.filter((record) => {
    const time = new Date(record.date).getTime();
    return time >= twoWeeksAgo && time < weekAgo;
  });
  const month = records.filter((record) => new Date(record.date).getTime() >= fourWeeksAgo);
  const sumDistance = (items) => items.reduce((sum, record) => sum + record.distanceKm, 0);
  const sumMinutes = (items) => items.reduce((sum, record) => sum + record.minutes, 0);
  const avgSpeed = (items) => (items.length ? items.reduce((sum, record) => sum + record.avgSpeed, 0) / items.length : 0);

  return {
    recent,
    last: records[0] ? summarizeRecordForCoach(records[0]) : null,
    totalDistance: sumDistance(records),
    totalMinutes: sumMinutes(records),
    thisWeekDistance: sumDistance(thisWeek),
    lastWeekDistance: sumDistance(lastWeek),
    thisWeekMinutes: sumMinutes(thisWeek),
    lastWeekMinutes: sumMinutes(lastWeek),
    weeklyCount: thisWeek.length,
    lastWeekCount: lastWeek.length,
    recentAvgSpeed: avgSpeed(recent),
    thisWeekAvgSpeed: avgSpeed(thisWeek),
    lastWeekAvgSpeed: avgSpeed(lastWeek),
    bestDistance: Math.max(0, ...records.map((record) => record.distanceKm)),
    activeDays: new Set(month.map((record) => new Date(record.date).toISOString().slice(0, 10))).size,
    daysSinceLastRide: records[0] ? Math.floor((now - new Date(records[0].date).getTime()) / dayMs) : null,
  };
}

function evaluateCoachPattern(goal) {
  const stats = getCoachStats();
  const target = getCoachTarget(goal);
  const distanceRatio = target.weeklyDistanceKm ? stats.thisWeekDistance / target.weeklyDistanceKm : 0;
  const frequencyRatio = target.weeklyRides ? stats.weeklyCount / target.weeklyRides : 0;
  const speedGap = stats.recentAvgSpeed - target.minAvgSpeed;
  const distanceDelta = stats.thisWeekDistance - stats.lastWeekDistance;
  const speedDelta = stats.thisWeekAvgSpeed - stats.lastWeekAvgSpeed;
  const issues = [];
  const praise = [];

  if (!stats.last) {
    issues.push("아직 판단할 기록이 부족합니다");
    return { stats, target, distanceRatio, frequencyRatio, speedGap, distanceDelta, speedDelta, issues, praise, tone: "start" };
  }

  if (stats.daysSinceLastRide !== null && stats.daysSinceLastRide >= 5) issues.push(`${stats.daysSinceLastRide}일째 주행 공백`);
  if (frequencyRatio < 0.5) issues.push("운동 주기가 목표보다 많이 부족함");
  if (distanceRatio < 0.5) issues.push("주간 주행량이 목표의 절반 이하");
  if (goal === "speed" && speedGap < -2) issues.push("속도 목표에 비해 최근 평균속도가 낮음");
  if (goal === "fatloss" && stats.thisWeekMinutes < 90) issues.push("감량 목표에 필요한 유산소 시간이 부족함");
  if (goal === "endurance" && stats.bestDistance < 10 && stats.totalDistance > 0) issues.push("지구력 목표에 비해 긴 주행 경험이 부족함");

  if (frequencyRatio >= 1) praise.push("운동 주기를 잘 지킴");
  if (distanceRatio >= 1) praise.push("이번 주 주행량 목표 달성");
  if (distanceDelta > 5) praise.push(`지난주보다 ${distanceDelta.toFixed(1)}km 더 탐`);
  if (speedDelta > 1) praise.push(`평균속도가 지난주보다 ${speedDelta.toFixed(1)}km/h 상승`);

  const tone = issues.length >= 2 ? "strict" : praise.length >= 2 ? "praise" : issues.length ? "nudge" : "steady";
  return { stats, target, distanceRatio, frequencyRatio, speedGap, distanceDelta, speedDelta, issues, praise, tone };
}

function getCoachMismatchComment(goal, evaluation) {
  const { stats } = evaluation;
  if (!stats.last) return "아직은 목표와 기록이 맞는지 판단하기보다, 기준 기록을 만드는 단계입니다.";
  if (goal === "speed" && evaluation.speedGap < -2) {
    return "지금 기록 패턴은 속도 향상 목표와 조금 안 맞아요. 그냥 오래 타는 기록보다 짧게라도 빠르게 밟는 구간이 필요합니다.";
  }
  if (goal === "fatloss" && stats.thisWeekMinutes < 90) {
    return "감량 목표라면 지금처럼 드문드문 타는 방식은 효과가 약합니다. 강도보다 주당 총 시간이 먼저예요.";
  }
  if (goal === "endurance" && stats.thisWeekDistance < evaluation.target.weeklyDistanceKm * 0.7) {
    return "지구력 목표인데 주간 거리가 아직 얕습니다. 긴 호흡의 꾸준한 주행을 조금 더 쌓아야 해요.";
  }
  if (goal === "health" && stats.weeklyCount === 0) {
    return "건강 유지 목표라도 완전히 쉬는 주가 길어지면 리듬이 끊깁니다. 짧게라도 다시 움직여야 합니다.";
  }
  return "목표와 기록의 방향은 크게 어긋나지 않습니다. 이제 핵심은 꾸준함과 아주 작은 상승폭이에요.";
}

function getCoachAccountabilityComment(evaluation) {
  if (evaluation.tone === "strict") {
    return `쓴소리 조금 할게요. ${evaluation.issues.join(", ")} 상태라서, 지금은 '운동하고 있다'고 보기엔 리듬이 약합니다. 오늘은 기분보다 약속을 지키는 쪽으로 가야 해요.`;
  }
  if (evaluation.tone === "praise") {
    return `좋습니다. ${evaluation.praise.join(", ")}이 보입니다. 이 정도면 그냥 한두 번 탄 게 아니라 흐름을 만들고 있는 거예요.`;
  }
  if (evaluation.tone === "nudge") {
    return `아쉬운 점은 ${evaluation.issues.join(", ")}입니다. 다만 지금 바로잡기 쉬운 단계라 오늘 한 번만 제대로 타도 흐름이 살아납니다.`;
  }
  if (evaluation.tone === "start") {
    return "아직 코치가 혼낼 만큼의 기록도, 칭찬할 만큼의 패턴도 부족합니다. 오늘 기록 하나를 먼저 만들죠.";
  }
  return "흐름은 무난합니다. 오늘은 무리해서 증명하기보다, 다음 주에도 반복 가능한 강도로 쌓는 게 좋습니다.";
}

function getLocalCoachMessage(condition, goal) {
  const evaluation = evaluateCoachPattern(goal);
  const stats = evaluation.stats;
  const profileName = state.profile.name ? `${state.profile.name}님, ` : "";
  const lastRide = stats.last
    ? `최근 주행은 ${stats.last.distanceKm.toFixed(1)}km, 평균 ${stats.last.avgSpeed.toFixed(1)}km/h였고 이번 주는 ${stats.weeklyCount}회, ${stats.thisWeekDistance.toFixed(1)}km입니다.`
    : "아직 최근 주행 기록이 없습니다.";
  const conditionComment =
    condition === "tired"
      ? "오늘 컨디션이 피곤함이면 훈련을 접는 게 아니라 강도를 낮춰서 리듬만 지키면 됩니다."
      : "오늘 컨디션이 괜찮다면 기록을 조금 더 선명하게 만들 수 있습니다.";

  return `${profileName}${lastRide} ${getCoachMismatchComment(goal, evaluation)} ${getCoachAccountabilityComment(evaluation)} ${conditionComment} ${getCoachWeightSentence()}`.trim();
}

function getLocalWorkoutPlan(condition, goal) {
  const evaluation = evaluateCoachPattern(goal);
  if (condition === "tired") {
    return ["10분 아주 가볍게 다리 풀기", "15~20분 대화 가능한 강도로 회복 주행", "5분 천천히 내려오며 하체 스트레칭"];
  }
  if (evaluation.tone === "strict") {
    return ["오늘 안에 20분이라도 주행 시작", "숨은 차지만 말은 가능한 강도로 유지", "종료 후 기록 저장하고 다음 주행 날짜 정하기"];
  }
  if (goal === "speed") {
    return ["12분 워밍업", "40초 빠르게 + 100초 회복을 6~8회", "10분 편한 페이스로 마무리"];
  }
  if (goal === "fatloss") {
    return ["8분 워밍업", "35~45분 대화 가능한 강도로 꾸준히", "5분 쿨다운 후 수분 보충"];
  }
  if (goal === "health") {
    return ["10분 워밍업", "20~30분 편안한 강도 유지", "5분 호흡 낮추며 마무리"];
  }
  return ["10분 워밍업으로 호흡 안정", "30분 같은 페이스 유지", "마지막 5분은 조금 더 가볍게 정리"];
}

async function requestAiCoach(condition, goal, weather = null) {
  const apiKey = getOpenAiKey();
  if (!apiKey) return null;

  const context = {
    ...buildCoachContext(condition, goal, weather),
    coachEvaluation: evaluateCoachPattern(goal),
  };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      instructions:
        "You are a warm but accountable Korean cycling coach inside a personal bicycle trainer app. The provided summary and recentRecords contain only valid cycling records for coaching, and route path coordinates are intentionally excluded. Do not infer missing ride data or invent records. Prioritize the 7-day, 14-day, and 30-day ride volume, ride frequency, average speed, rest gap, goal fit, weight trend, current condition, and today's weather when available. If weather data is missing, do not mention, apologize for, or explain that weather is unavailable. The rider selected coachIntensity: gentle means encouragement-first with little tough love, balanced means honest but supportive, and strict means more direct accountability for missed training while still never insulting, shaming, or demeaning the rider. Interpret what the numbers mean instead of merely listing them. Use weather only to adjust today's ride intensity or safety advice. Use weight trend only for training guidance, never for shame or medical diagnosis. If the rider is under-training, give honest but not insulting tough love according to coachIntensity. If the rider is consistent or exceeding the plan, praise specifically with evidence from the data. If the recent pattern does not match the selected goal, say so clearly and explain the correction. Avoid generic template language and do not over-explain data quality. Respond in Korean with one natural paragraph, then exactly three workout steps starting with '1.', '2.', '3.'. Each step needs a duration or intensity.",
      input: `라이더 최근 패턴과 코칭 평가: ${JSON.stringify(context)}`,
      max_output_tokens: 650,
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

window.addEventListener("focus", handleNativeAppReturn);

document.addEventListener("visibilitychange", handleNativeAppReturn);

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
elements.closeFirstRunSetup?.addEventListener("click", () => hideFirstRunSetup());
elements.openBatterySettings?.addEventListener("click", openBatteryOptimizationSettings);
elements.showPermissionGuide?.addEventListener("click", showFirstRunSetup);
elements.dismissFirstRunSetup?.addEventListener("click", () => hideFirstRunSetup({ remember: true }));

elements.rideToggle.addEventListener("click", async () => {
  if (state.riding) await stopRide();
  else await startRide();
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

elements.clearRecords?.addEventListener("click", () => {
  if (!state.records.length) return;
  setRecordDeleteMode(!state.recordDeleteMode);
});

elements.cancelRecordDelete?.addEventListener("click", () => {
  setRecordDeleteMode(false);
});

elements.deleteSelectedRecords?.addEventListener("click", deleteSelectedRecords);

elements.recordsList?.addEventListener("change", (event) => {
  const checkbox = event.target.closest("input[data-record-id]");
  if (!checkbox) return;

  if (checkbox.checked) {
    state.selectedRecordIds.add(checkbox.dataset.recordId);
  } else {
    state.selectedRecordIds.delete(checkbox.dataset.recordId);
  }
  updateRecordDeleteControls();
});

elements.recordsList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-route-record-id]");
  if (!button) return;
  showRecordRoute(button.dataset.routeRecordId);
});

elements.mapLocateMe?.addEventListener("click", centerMapOnCurrentLocation);
elements.routeNavigate?.addEventListener("click", openKakaoNavigation);

elements.profileForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = elements.profileName.value.trim();
  const heightCm = Number(elements.profileHeight.value);
  const weightKg = Number(elements.profileWeight.value);
  const goal = elements.profileGoal.value;

  state.profile = normalizeProfile({
    name,
    heightCm: heightCm ? Number(heightCm.toFixed(1)) : "",
    weightKg: weightKg ? Number(weightKg.toFixed(1)) : "",
    goal,
    updatedAt: new Date().toISOString(),
  });

  if (weightKg) addWeightHistory(weightKg);
  saveProfile();
  renderProfile();
  renderCoach();
});

elements.settingsForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const openAiKey = elements.openAiKey.value.trim();
  const key = elements.kakaoMapKey.value.trim();
  state.coachIntensity = elements.coachIntensity?.value || "balanced";
  localStorage.setItem(COACH_INTENSITY_KEY, state.coachIntensity);
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
  renderCoach();
});

elements.coachIntensity?.addEventListener("change", () => {
  state.coachIntensity = elements.coachIntensity.value;
  localStorage.setItem(COACH_INTENSITY_KEY, state.coachIntensity);
  renderSettings();
  renderCoach();
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
elements.seedSampleRecords?.addEventListener("click", seedSampleRouteRecords);
elements.showCoachJson?.addEventListener("click", showCoachJson);

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
renderSettings();
renderProfile();
renderAll();
updateRideMetrics();
updateInstallButton();
checkNativeAppUpdate();
initializeGpsStatus();
initializeFirstRunSetup();
