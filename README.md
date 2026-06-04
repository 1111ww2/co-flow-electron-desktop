# Co-Flow — Electron Desktop Prototype

Co-Flow is an **Electron desktop application prototype**. It is **not intended to be opened as a normal browser website**.

The project uses a local Node.js server only as the internal backend for the Electron app. When the project is run correctly, it opens:

1. a main **Co-Flow desktop dashboard window**;
2. a small **always-on-top floating desktop window**.

The local `http://localhost:3344` route is only an internal renderer/API address used by Electron.

---

## Run this project correctly

### First time setup

```bash
npm install
npm run seed
npm start
```

`npm start` now opens the **Electron desktop app**.

You can also run:

```bash
npm run desktop
```

### Mac shortcut

You can also double-click:

```text
Open Co-Flow Desktop.command
```

This command opens Terminal, installs dependencies if needed, seeds the local database, and starts Electron desktop mode.

---
### macOS Keychain permission prompt

When running the Electron app on macOS for the first time, the system may show a Keychain prompt saying that Electron wants to access information stored in **Electron Safe Storage**.

This is a normal macOS security prompt triggered by Electron. It is not an error in the project.

If this prompt appears:

1. Enter your Mac login password.
2. Click **Allow** or **Always Allow**.

Choosing **Always Allow** prevents the same prompt from appearing repeatedly on future launches.

## Important: do not use the browser as the main presentation mode

Do **not** present this project by opening `public/index.html` directly.

Do **not** use the browser route as the final mode unless you are only debugging.

The intended presentation mode is:

```bash
npm start
```

or:

```bash
npm run desktop
```

The browser/debug-only server command is now renamed to:

```bash
npm run preview
```

---

## What this project is

Co-Flow is a speculative desktop wellbeing system for office workers. It connects prolonged work, fatigue visibility, nature-based micro-recovery, voluntary team breaks, and a spatial desk garden.

The prototype includes:

- Electron desktop shell;
- main desktop dashboard window;
- always-on-top floating energy window;
- local Node.js API server;
- local SQLite database;
- recovery task system;
- simulated Co-Break team flow;
- camera-based low-movement prototype;
- desk photo upload and spatial garden interaction;
- desktop alert feedback for severe fatigue.

---

## Core interaction loop

1. The user works for a long period.
2. Energy decreases through simulated work or local low-movement detection.
3. The dashboard and floating desktop window show fatigue status.
4. The user completes a short nature-based recovery task or joins a Co-Break.
5. Energy and Nature Points increase.
6. Nature Points can be spent on natural desk elements.
7. The user places redeemed natural elements on a simulated desk projection surface.

---

## Main features

### Desktop dashboard

The main Electron window shows:

- current Energy;
- Normal / Mild Fatigue / Severe Fatigue status;
- Nature Points;
- team average energy;
- desk scan readiness;
- wristband status;
- camera monitor status;
- recent recovery history;
- simulated 30-minute work button.

### Floating desktop window

The floating Electron window shows:

- current Energy;
- current fatigue status;
- quick access to the dashboard;
- quick access to recovery when energy is low;
- alert mode when energy falls below 40.

The Electron main process can also trigger desktop-level feedback such as beep, Dock bounce, frame flash, and floating-window shake.

### Recovery tasks

The recovery section contains short nature-based actions:

- Water Touch;
- Feel the Wind;
- Plant Breathing;
- Sunlight Reset;
- Nature Sound;
- Short Walk.

Completing a task updates Energy, Nature Points, and local recovery history.

### Co-Break

The Co-Break section simulates voluntary team recovery.

Current flow:

1. confirm company name;
2. show team list only after confirmation;
3. privacy checkboxes are off by default;
4. require avatar and user ID before inviting others;
5. select at least two low-energy members;
6. show a fixed 30-second waiting state;
7. show accepted members;
8. join the Co-Break;
9. increase Energy and Nature Points;
10. clear selected members and return to the invitation state.

The team member list is prototype mock data inside `public/js/app.js`, not a real networked team system.

### Camera Monitor

The Camera Monitor is a local movement-difference prototype.

It:

- requests camera access;
- draws video frames to a hidden canvas;
- compares pixel differences;
- estimates movement level;
- accumulates inactive prototype minutes;
- applies energy penalties at low-movement thresholds.

It does **not** record, store, upload, or identify the user. It only sends numeric movement values to the local server.

### Restorative Garden

The garden section lets users:

- upload a desk photo;
- use it as a simulated projection surface;
- redeem natural elements with Nature Points;
- drag elements onto the desk;
- reposition placed elements;
- return elements to the purchased list;
- delete the desk photo and reset placed elements.

---

## Technology stack

- Electron;
- Electron main process and preload bridge;
- local Node.js HTTP server;
- SQLite through Node's built-in `node:sqlite` API;
- vanilla HTML, CSS, and JavaScript renderer files;
- no external production backend;
- no front-end framework.

Node.js **22.5.0 or later** is required because the project uses `node:sqlite`.

---

## Project structure

```text
co-flow-electron-desktop-v15/
├── db/
│   ├── schema.sql
│   └── coflow.db
├── electron/
│   ├── main.cjs
│   └── preload.cjs
├── public/
│   ├── index.html
│   ├── floating.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── app.js
│       └── floating.js
├── src/
│   ├── db.js
│   ├── seed.js
│   └── server.js
├── Open Co-Flow Desktop.command
├── Open Co-Flow Desktop.bat
├── package.json
└── README.md
```

---

## Scripts

```bash
npm start
```

Starts the Electron desktop app.

```bash
npm run desktop
```

Also starts the Electron desktop app.

```bash
npm run seed
```

Resets and seeds the local SQLite database.

```bash
npm run preview
```

Starts the local server only for debugging. This is not the final presentation mode.

---

## Prototype limitations

This is a high-fidelity desktop prototype, not a production system.

- Co-Break team members are mock data.
- Camera Monitor uses simple frame-difference movement estimation, not AI posture recognition.
- The desk garden is a simulated spatial projection interface.
- SQLite data is local to the project folder.
- The local server exists to support Electron and does not make the project a normal website.

---

## Notes for assessment explanation

A clear way to describe the project:

> Co-Flow is an Electron desktop prototype that uses a local server and SQLite database to simulate a closed-loop office recovery system. The main dashboard manages recovery tasks, Co-Break, camera-based low-movement detection, and the restorative desk garden, while the floating desktop window keeps energy feedback visible during work.
