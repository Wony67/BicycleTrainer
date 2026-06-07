const STORAGE_KEY = "bicycle-trainer-records";

const state = {
  records: loadRecords(),
  riding: false,
  startedAt: 0,
  elapsedTimer: null,
  watchId: null,
  lastPosition: null,
  distanceKm: 0,
  currentSpeed: 0,
  installPrompt: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  installApp: $("#installApp"),
  gpsStatus: $("#gpsStatus"),
  rideToggle: $("#rideToggle"),
  elapsed: $("#elapsed"),
  distance: $("#distance"),
  avgSpeed: $("#avgSpeed"),
  speed: $("#speed"),
  recordsList: $("#recordsList"),
  manualRideForm: $("#manualRideForm"),
  clearRecords: $("#clearRecords"),
  locateMe: $("#locateMe"),
  coords: $("#coords"),
  routeForm: $("#routeForm"),
  routeAdvice: $("#routeAdvice"),
  coachForm: $("#coachForm"),
  coachMessage: $("#coachMessage"),
  workoutPlan: $("#workoutPlan"),
  totalDistance: $("#totalDistance"),
  totalTime: $("#totalTime"),
  bestDistance: $("#bestDistance"),
  weeklyCount: $("#weeklyCount"),
  distanceChart: $("#distanceChart"),
};

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
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

function updateRideMetrics() {
  const elapsedMs = state.riding ? Date.now() - state.startedAt : 0;
  const elapsedHours = elapsedMs / 3600000;
  elements.elapsed.textContent = formatElapsed(elapsedMs);
  elements.distance.textContent = state.distanceKm.toFixed(2);
  elements.speed.textContent = state.currentSpeed.toFixed(1);
  elements.avgSpeed.textContent = elapsedHours > 0 ? (state.distanceKm / elapsedHours).toFixed(1) : "0.0";
}

function startRide() {
  state.riding = true;
  state.startedAt = Date.now();
  state.distanceKm = 0;
  state.currentSpeed = 0;
  state.lastPosition = null;
  elements.rideToggle.textContent = "종료";
  setGpsStatus("GPS 추적 중");
  state.elapsedTimer = setInterval(updateRideMetrics, 1000);

  if (!navigator.geolocation) {
    setGpsStatus("GPS 미지원");
    return;
  }

  state.watchId = navigator.geolocation.watchPosition(
    (position) => {
      const current = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      if (state.lastPosition) {
        const nextDistance = haversineKm(state.lastPosition, current);
        if (nextDistance < 0.2) {
          state.distanceKm += nextDistance;
        }
      }
      state.currentSpeed = Math.max(0, (position.coords.speed || 0) * 3.6);
      state.lastPosition = current;
      elements.coords.textContent = `${current.latitude.toFixed(5)}, ${current.longitude.toFixed(5)}`;
      updateRideMetrics();
    },
    () => setGpsStatus("GPS 권한 필요"),
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 },
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
  if (!last) {
    elements.coachMessage.textContent = "첫 기록을 남기면 거리, 속도, 빈도를 보고 맞춤 훈련을 제안합니다.";
    renderWorkout(["20분 가볍게 페달링", "5분 스트레칭", "다음 라이딩에서 거리 기준 기록 만들기"]);
    return;
  }

  const message =
    last.avgSpeed >= 25
      ? `최근 평균 ${last.avgSpeed.toFixed(1)} km/h로 좋은 페이스입니다. 오늘은 고강도보다 회복 주행을 섞어 누적 피로를 관리하세요.`
      : `최근 ${last.distanceKm.toFixed(1)} km를 기록했습니다. 총 ${totalDistance.toFixed(1)} km가 쌓였고, 다음 목표는 같은 시간에 5% 더 멀리 가기입니다.`;
  elements.coachMessage.textContent = message;
}

function renderWorkout(items) {
  elements.workoutPlan.innerHTML = items
    .map((item, index) => `<article class="workout-item"><strong>${index + 1}. ${item}</strong><span>컨디션에 맞춰 강도를 조절하세요.</span></article>`)
    .join("");
}

function renderAll() {
  renderRecords();
  renderAnalysis();
  renderCoach();
}

function switchView(viewName) {
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === `view-${viewName}`));
  $$(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewName));
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

elements.rideToggle.addEventListener("click", () => {
  if (state.riding) stopRide();
  else startRide();
});

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

elements.locateMe.addEventListener("click", () => {
  if (!navigator.geolocation) {
    elements.coords.textContent = "이 브라우저는 위치 기능을 지원하지 않습니다.";
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      elements.coords.textContent = `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`;
      setGpsStatus("위치 확인");
    },
    () => {
      elements.coords.textContent = "위치 권한을 허용해야 합니다.";
      setGpsStatus("GPS 권한 필요");
    },
    { enableHighAccuracy: true, timeout: 10000 },
  );
});

elements.routeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const destination = $("#destination").value.trim() || "목적지";
  const distance = Number($("#routeDistance").value);
  if (!distance) return;
  const easyMinutes = Math.round((distance / 18) * 60);
  const tempoMinutes = Math.round((distance / 24) * 60);
  elements.routeAdvice.textContent = `${destination}까지 약 ${distance.toFixed(1)} km입니다. 회복 주행은 ${easyMinutes}분, 템포 주행은 ${tempoMinutes}분 정도로 계획하세요.`;
});

elements.coachForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const condition = $("#condition").value;
  const goal = $("#goal").value;
  const plans = {
    endurance: ["10분 워밍업", "30분 일정 페이스 유지", "마지막 5분 가볍게 정리"],
    fatloss: ["8분 워밍업", "3분 빠르게 + 2분 천천히를 6회", "수분 보충 후 5분 쿨다운"],
    speed: ["12분 워밍업", "30초 전력 + 90초 회복을 8회", "케이던스 안정화 10분"],
  };
  const tiredPlan = ["20분 저강도 회복 주행", "호흡이 편한 강도 유지", "운동 후 하체 스트레칭"];
  renderWorkout(condition === "tired" ? tiredPlan : plans[goal]);
});

$$(".tab").forEach((tab) => {
  tab.addEventListener("click", () => switchView(tab.dataset.view));
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}

renderAll();
updateRideMetrics();
updateInstallButton();
