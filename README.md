# Virtual TV v0.2.0

Transform your local media collection into a personal cable TV experience. One standalone binary, zero dependencies. synced global playback, and simple tray controls.

## Features

- **Synced Global Playback**: Everyone on your network sees the same frame, just like real TV.
- **Premium TV Interface**: Sleek dark UI with glassmorphism and a channel carousel.
- **Chromecast Support**: Beam channels to your TV with full progress syncing.
- **Visual Folder Browser**: Manage channels effortlessly through the web UI.
- **Tray Mode**: Discreet system tray icon for quick access and status.
- **Admin Protection**: Management buttons are automatically hidden for non-admin users.

## Quick Start

1. Download the binary for your platform (`virtual-tv` or `virtual-tv.exe`).
2. Run the file.
3. The app will appear in your **System Tray**.
4. Right-click the tray icon and select **Open Virtual TV** or go to `http://<YOUR-IP>:9210`.

## Chromecast Setup (Critical)

Browsers block storage on local IP addresses. To use Chromecast, you must trust your server's IP:

1. Open Chrome/Edge and go to: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Add your server's network address (e.g., `http://192.168.1.50:9210`).
3. Set the dropdown to **Enabled** and **Relaunch**.

*Note: Access the TV via your Network IP (found in the tray menu) when you want to cast.*

