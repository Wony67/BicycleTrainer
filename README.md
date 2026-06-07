# Bicycle Trainer

Smartphone-first bicycle trainer toy project.

## Features

- Ride records with GPS tracking or manual indoor ride input
- Route guide with current location and target distance pacing
- Local AI coach with rule-based workout suggestions
- Ride analytics with totals, weekly frequency, and recent distance chart
- PWA files for installable browser experience

## Run Locally

From this folder:

```powershell
node server.mjs
```

Open this on the PC:

```text
http://localhost:4173
```

To open it on a smartphone, connect the phone to the same Wi-Fi, find the PC IP address, then open:

```text
http://YOUR_PC_IP:4173
```

GPS works best on HTTPS or localhost. For real outdoor phone GPS testing, deploy this folder to a static host with HTTPS, such as GitHub Pages, Netlify, or Vercel.

## Install On Phone

Android Chrome can install this as an app when it is served over HTTPS.

1. Deploy this folder to an HTTPS static host.
2. Open the deployed URL on the phone.
3. Tap the install button in the app, or use Chrome's "Add to Home screen" menu.
4. Launch "BikeTrainer" from the phone home screen.

For a native APK later, wrap these same web files with Capacitor or an Android WebView project.
