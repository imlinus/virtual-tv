# Virtual TV

Transform your local media collection into a personal cable TV experience. No more infinite scrolling—just pick a channel and watch what's on, perfectly synced for everyone.

## Features

- **Synced Global Playback**: Everyone watching the same channel sees the same frame, just like real TV.
- **Premium TV Interface**: A sleek, dark-themed UI featuring glassmorphism, smooth animations, and a channel carousel.
- **Chromecast Support**: Beam your channels to the big screen with full metadata and progress syncing.
- **Browser-Based Management**: Effortlessly create channels using the built-in visual folder browser—no path-typing required.

## Quick Start (CLI Mode)

Recommended for Linux and local servers.

1. Ensure you have `nodejs`, `npm`, and `ffmpeg` (for probe data) installed.
2. Clone this repository.
3. Run `npm install`.
4. Run `npm run cli`.
5. Open `http://localhost:9210` in your browser.

Click **Manage** (gear icon) to start adding your media folders!

## Chromecast Setup (Critical)

Because browsers block storage on local IP addresses, you must tell Chrome to trust your server for the Cast SDK to initialize.

1. Open Chrome and go to: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Add your server's address: `http://YOUR_IP:9210` (e.g., `http://192.168.1.50:9210`).
3. Set the dropdown to **Enabled**.
4. Relaunch Chrome.

*Note: Always use your **Network IP** instead of `localhost` when you want to cast.*

## Advanced: Systemd Setup

To run as a permanent background service on Linux:

```ini
[Unit]
Description=Virtual TV Server
After=network.target

[Service]
ExecStart=/usr/bin/node /path/to/virtual-tv/src/backend/server.js
Restart=always
User=yourusername
WorkingDirectory=/path/to/virtual-tv

[Install]
WantedBy=multi-user.target
```

