# Gemini Audio Assistant & Pitch-Black Live Display

A dual-device AI assistant system:
- **PC 1 (Electron App)**: Captures your active speaker output (meeting/interviewer audio) or microphone, sends the question + customizable system prompt to Gemini, and syncs the response in real time.
- **PC 2 (Render Website)**: A stealth, pitch-black (`#000000`) web viewer that automatically displays the full answer formatted in clean Markdown with syntax-highlighted code blocks, **without ever refreshing**.

---

## 📁 Project Structure

```
c:\INTERVIEW\
├── server\             # Node.js + Express + Socket.io (Host on Render)
│   ├── public\         # Pitch-black web viewer (index.html, style.css, app.js)
│   ├── server.js       # Real-time WebSocket relay server with in-memory history
│   ├── render.yaml     # Render auto-deploy blueprint
│   └── package.json
└── electron-app\       # Electron Desktop Application (Run on PC 1)
    ├── main.js         # Window & loopback audio capture permissions
    ├── preload.js      # Secure IPC bridge
    ├── renderer\       # UI Controller (Gemini API, audio visualizer, presets)
    └── package.json
```

---

## 🚀 Quick Start Guide

### Step 1: Test Locally

1. **Start the Render Server locally**:
   ```powershell
   cd c:\INTERVIEW\server
   npm start
   ```
   *Your server will start at `http://localhost:3000`.*

2. **Open the Pitch-Black Webpage (PC 2 or browser tab)**:
   * Open `http://localhost:3000/?room=interview-room-1`
   * Notice the true OLED black background and the green "Connected" status dot.

3. **Start the Electron App (PC 1)**:
   ```powershell
   cd c:\INTERVIEW\electron-app
   npm start
   ```
   * The app will open.
   * Enter your **Gemini API Key**.
   * Leave Server URL as `http://localhost:3000` (or your Render URL).
   * Click **"▶ Start Audio Listener"** (select **Current Active Speaker Output**).
   * When someone speaks or asks a question, click **"Record Question"** (or press `Spacebar`), then click **"Stop & Ask Gemini"**.
   * The answer will instantly appear on your pitch-black website without page refresh!

---

## 🌐 How to Deploy the Server to Render (Free)

Deploying `server/` to Render allows PC 2 to open your website from anywhere in the world:

1. **Push the `server` folder to GitHub**:
   * Create a new GitHub repository (e.g., `interview-black-screen`).
   * Push the contents of `c:\INTERVIEW\server` to your repository.

2. **Create a Free Web Service on [Render.com](https://render.com)**:
   * Log into your Render dashboard.
   * Click **New +** > **Web Service**.
   * Connect your GitHub repository.
   * Settings:
     * **Name**: `interview-viewer` (or your choice)
     * **Environment**: `Node`
     * **Build Command**: `npm install`
     * **Start Command**: `npm start`
     * **Instance Type**: `Free`
   * Click **Create Web Service**.

3. **Get Your Public Render URL**:
   * Render will give you a public URL like `https://interview-viewer.onrender.com`.
   * Open this URL on **PC 2**:
     ```
     https://interview-viewer.onrender.com/?room=interview-room-1
     ```
   * Enter `https://interview-viewer.onrender.com` into the Electron App on **PC 1**.

---

## ⚙️ Features & Controls

### PC 1: Electron App
* **System Prompt Presets**: Switch instantly between *Interview Pro*, *Direct LeetCode*, and *System Design* roles.
* **Audio Loopback**: Captures active speaker/headphone sound directly on Windows using Chromium loopback audio.
* **Live Audio Activity Meter**: Visual VU meter confirms when the speaker is talking.
* **Hotkeys**: Press `Spacebar` to start/stop question recording.
* **Manual Input**: Quick text input to type or edit questions before sending to Gemini.

### PC 2: Pitch-Black Viewer
* **OLED Pure Black (`#000000`)**: Complete dark background with eye-friendly soft-white text.
* **Zero Refresh Real-Time Updates**: WebSockets push new answers seamlessly.
* **Syntax Highlighting & Copy Button**: Code blocks automatically highlighted with one-click copy.
* **Font Sizing (`A-` / `A+`)**: Increase text size for reading comfortably from across your desk.
* **Fullscreen (`⛶` / `F11`)**: Borderless stealth viewing.
