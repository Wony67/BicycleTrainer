# App Structure

`app.js` is still a single browser script, but it is divided with VS Code folding regions.

## Sections

- `App constants, state, and DOM references`
  - Storage keys, Firebase config, global state, and cached DOM elements.
- `Data normalization and local storage`
  - Records, profile, weight history, route path normalization, localStorage reads/writes.
- `API key encryption and modal helpers`
  - PIN prompt, JSON modal, encrypted cloud backup of API keys.
- `Settings, profile, and shared UI helpers`
  - Settings tab rendering, profile form rendering, weight history, formatting helpers.
- `Native platform, permissions, and updates`
  - Capacitor/native checks, battery optimization setup, PWA/native update banners.
- `GPS, route map, and destination guidance`
  - Browser geolocation, Leaflet/Kakao map setup, destination search and navigation links.
- `Native background ride tracking and ride recording`
  - Android background ride plugin snapshots, ride start/stop, record creation.
- `Sample records, record list, analytics, and weather`
  - Test records, record list, delete mode, analytics cards, weather note.
- `Firebase authentication and cloud backup`
  - Firebase init, Google login, Firestore backup/restore payloads.
- `Coach generation and workout planning`
  - Local coach rules, OpenAI request/response parsing, workout plan rendering.
- `App rendering, navigation, and event wiring`
  - View switching, install prompt, event listeners, startup calls.

## Debugging Pointers

- Settings data load: `loadProfile` -> `normalizeProfile` -> `renderProfile`
- Cloud restore: `restoreFromCloud` -> `saveProfile`/`saveRecords`/`saveWeightHistory`
- Ride save: `startRide`/`stopRide` -> `addRecord` -> `renderAll`
- Coach errors: `getCoachStats` -> `evaluateCoachPattern` -> `getLocalCoachMessage`
