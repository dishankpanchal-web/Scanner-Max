# Feedback Form Scanner (installable phone app)

Camera-based scanner for the AMA feedback form → Excel. Works as an installable app (PWA) on Android and iPhone.

## 1. Put it online (HTTPS is required for camera + install)
Upload this whole folder to any static host. Easiest options:
- Netlify Drop (app.netlify.com/drop) — drag the folder in, get a link
- GitHub Pages, Vercel, Cloudflare Pages
(Opening index.html straight from the phone's files will NOT work — no camera, no install.)

## 2. Install on the phone
- Android (Chrome): open the link → "Install app" button, or menu → Install app
- iPhone (Safari): open the link → Share → Add to Home Screen

## 3. First use
Open the app → Settings → paste an Anthropic API key (console.anthropic.com) → Save.
Then: Open camera → photograph each form → Scan forms → review/edit → Excel.
On a phone, "Excel" opens the share sheet (save to Drive/Files, WhatsApp, email).

## Notes
- The API key is stored only on that phone. For many users/staff, don't hand out keys: put a small
  proxy server between the app and the API and change the fetch URL in index.html (function `extract`).
- Captured results are kept on the device until "Clear all".
- App shell works offline; scanning needs internet.

## Want a Play Store / APK build?
This folder wraps directly with Capacitor:
  npm i @capacitor/core @capacitor/cli @capacitor/android
  npx cap init FormScan com.example.formscan --web-dir .
  npx cap add android && npx cap sync && npx cap open android   (build APK in Android Studio)
