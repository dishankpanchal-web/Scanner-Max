# Feedback Form Scanner (installable phone app)

Photograph filled AMA feedback forms -> reviewed on the phone -> Excel.

## Two scan engines (switch in the app)
- On-device OCR (default): free, no API key. Tesseract.js runs in the phone's browser. First use downloads the
  OCR engine + English data (~10-15 MB, needs internet once); after that it should work offline.
  Reads printed/typed text well, handwriting only roughly. Ticks (Q1, Q2, catering) are detected from ink in the
  boxes; Q3 digits are read from the box area. Anything unclear is left blank and highlighted for you to fix.
- AI vision: best for handwriting. Needs an Anthropic API key (Settings) and internet.

## Deploy (Render Static Site)
Build Command: (blank)   Publish Directory: .
Files must be at repo root: index.html, ocr.js, manifest.json, sw.js, icon-192.png, icon-512.png.
(Or as a Web Service: package.json with "start": "serve . -l $PORT".)

## Install on the phone
Android Chrome: "Install app" button / menu -> Install. iPhone Safari: Share -> Add to Home Screen.

## Tips for good OCR
Flat form, whole page in frame, bright even light, no shadow, phone held parallel to the page.
If installed copies look old after an update, close and reopen the app (cache version is bumped in sw.js).
