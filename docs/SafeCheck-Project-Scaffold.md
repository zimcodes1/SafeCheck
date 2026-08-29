# SafeCheck — Project Scaffold & Groundwork Guide

This document is the "before anyone writes real logic" guide. It covers how the repo is laid out, what folders and files should exist on day one, how ports and environments are assigned, and the exact order the team should follow so nobody's blocked waiting on someone else's setup.

Follow this top to bottom on Day 1. By the end of it, all five people should be able to run their own piece locally, talking to the same shared contracts (register map, ports, database location) — even before any real detection or attack logic exists.

---

## 1. Repo Strategy: One Repo, Not Five

We're using a **single repository** with a folder per component, not separate repos per person. Reasons:

- The register map, port numbers, and database schema are shared contracts every component depends on — keeping everything in one repo means a change to one of those is visible to everyone immediately, instead of being a message someone forgets to send.
- Judges (or anyone reviewing your submission) can look at one place and see the whole system, which matters for the "explain your results honestly" and reproducibility asks in the brief.
- A hackathon team of 5 doesn't have the scale where multi-repo coordination overhead pays for itself.

This is sometimes called a "monorepo" — just means: one repo, several independent folders inside it, each buildable/runnable on its own.

---

## 2. Top-Level Folder Structure

```
safecheck/
├── README.md                     ← project overview, how to run everything
├── .gitignore
├── .env.example                  ← shared config template (ports, db path)
│
├── plant/                        ← Person 1
│   ├── README.md
│   ├── requirements.txt
│   ├── register_map.md           ← the shared contract, written down, not just in code
│   ├── plant_server/              (empty for now — Modbus server logic goes here)
│   └── legit_client/               (empty for now — normal operator behavior goes here)
│
├── attacks/                      ← Person 2
│   ├── README.md
│   ├── requirements.txt
│   ├── injection/
│   ├── replay/
│   ├── wrong_moment/
│   ├── slow_drift/
│   └── maintenance_scenario/
│
├── backend/                      ← Person 3
│   ├── README.md
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py                (empty for now — FastAPI app entry point)
│   │   ├── models/                 (empty — SQLite table definitions)
│   │   ├── routes/                 (empty — the endpoints from the implementation plan)
│   │   └── detector/               (empty — the four detection layers)
│   └── safecheck.db               ← created automatically once backend runs once
│
├── dashboard/                    ← Person 4
│   ├── README.md
│   ├── package.json
│   ├── src/
│   │   ├── views/
│   │   │   ├── LiveView/
│   │   │   └── AlertsView/
│   │   └── api/                    (empty — where polling calls to backend live)
│   └── ...  (rest is standard Vite/React scaffold output)
│
└── docs/                         ← Person 5
    ├── limitations.md
    ├── offline-behavior.md
    ├── demo-script.md
    └── data-generation-explanation.md
```

**Why folders are pre-created but empty:** so the very first commit already shows the intended shape of the project to everyone, and so nobody has to guess where their code is "supposed" to live. Empty folders with a placeholder file (like a one-line `README.md` in each) are fine — Git doesn't track empty folders otherwise, so drop a tiny `.gitkeep` or `README.md` in each so it survives the first push.

---

## 3. Port & Config Assignments

Agree these before anyone starts coding — this is the second shared contract, alongside the register map.

| Component | Port | Notes |
|---|---|---|
| Plant (Modbus TCP server) | `5020` | Modbus's default is `502`, but that usually needs admin/root privileges on most machines — `5020` avoids that entirely |
| Backend (FastAPI) | `8000` | Standard FastAPI/Uvicorn default |
| Dashboard (Vite dev server) | `5173` | Standard Vite default |

Put these in a root-level `.env.example` file so every component reads its ports/paths from one place instead of hardcoding numbers in five different files. Each person copies `.env.example` to their own `.env` locally (which stays out of Git — see `.gitignore` below).

---

## 4. Groundwork Steps — Do These In Order

### Step 1 — Repo creation (whoever sets it up first)
1. Create the repo on GitHub, name it `safecheck`.
2. Add a root `.gitignore` covering: Python virtual environments (`venv/`, `__pycache__/`), Node (`node_modules/`, `dist/`), environment files (`.env`), and the SQLite file itself (`*.db`) — the database is generated data, not something to commit.
3. Push the folder skeleton from Section 2, each with a placeholder file, as the first commit directly to `main`.
4. Create the `develop` branch from `main`.
5. Create the six feature branches listed in the Implementation Plan (Section 4 of that doc), all branching off `develop`.
6. Add all five teammates as collaborators.

### Step 2 — Root README
Write a short root `README.md` covering: what SafeCheck is (one paragraph), the folder structure, the port table, and exact steps to run all five components locally in order. This becomes the first thing anyone (including a judge browsing your repo) reads — keep it short and accurate, update it as things change rather than leaving it stale.

### Step 3 — Python environment (Plant, Backend, Attacks — Persons 1, 2, 3)
Each of these three folders is independently runnable Python, so each gets its own virtual environment and its own `requirements.txt`, even though they'll eventually share some dependencies (like `pymodbus`). Keeping them separate avoids one person's dependency changes breaking another's environment.

1. Inside each of `plant/`, `attacks/`, `backend/`, create a virtual environment.
2. Install the dependencies listed in the Implementation Plan's dependency table for that component.
3. Freeze them into that folder's `requirements.txt` immediately, even before real code exists — so anyone cloning the repo on Day 2 can install and run without guessing versions.

### Step 4 — Register map, written down first
Before Person 1 writes a single line of the Plant server, the register map from the Implementation Plan (Section 6) gets copied into `plant/register_map.md`, and everyone on the team reads it. This is the single most important groundwork artifact — a mismatch here is the most likely source of silent, confusing bugs later, because a wrong register number won't throw an error, it'll just quietly read/write the wrong thing.

### Step 5 — Backend skeleton (Person 3)
1. Set up the FastAPI app entry point so it starts and responds to a basic health check (e.g., visiting the root URL returns something, even just a placeholder message) — this proves the environment works before any real endpoints exist.
2. Create empty `models/`, `routes/`, `detector/` folders inside `app/` matching the structure in Section 2.
3. Confirm SQLite creates the database file automatically the first time the backend runs, at the path agreed in `.env.example` — don't hand-create the `.db` file; let the app do it, so the schema always starts from the actual model definitions.

### Step 6 — Plant skeleton (Person 1)
1. Get a Modbus TCP server running on port `5020` that responds at all — even before real tank physics exist, prove the server starts and a basic Modbus client can connect to it.
2. Confirm the register addresses from `register_map.md` are wired up as placeholders (reading them returns *something*, even if it's just a fixed default value for now).

### Step 7 — Dashboard scaffold (Person 4)
1. Scaffold a new Vite + React + TypeScript project inside `dashboard/`.
2. Confirm it runs on port `5173` and shows the default starter page — this proves the environment and tooling work before any real UI exists.
3. Create empty `views/LiveView/`, `views/AlertsView/`, and `api/` folders matching Section 2.

### Step 8 — Attack scripts skeleton (Person 2)
1. Create the five subfolders (`injection/`, `replay/`, `wrong_moment/`, `slow_drift/`, `maintenance_scenario/`), each with a placeholder script that just connects to the Plant on port `5020` and confirms it can read a register — proves the environment and network path work before any real attack logic exists.

### Step 9 — Docs skeleton (Person 5)
1. Create the four placeholder files listed in Section 2 under `docs/`, each with just a heading and a one-line note on what will eventually go there. Nothing needs real content yet — the goal at this stage is just making sure the writing work has an obvious home from day one, so it doesn't get forgotten until week 3.

### Step 10 — First integration check
Once Steps 5–8 are each individually confirmed working (backend responds, plant responds, dashboard loads, an attack placeholder can connect), do one combined check together as a team, even if nothing "real" happens yet:
1. Start the Plant.
2. Start the Backend.
3. Start the Dashboard.
4. Confirm the Dashboard can successfully reach the Backend, and the Backend can successfully reach the Plant — even if all it's showing is placeholder/default data.

This proves the whole pipeline is wired correctly end-to-end *before* anyone builds real detector logic or real attack behavior on top of it — meaning any bugs found from this point on are about logic, not plumbing, which is a much easier category of bug to fix under time pressure.

---

## 5. "Groundwork Done" Checklist

Don't move into the real Week 1–3 build plan (from the Implementation Plan doc) until every box here is checked:

- [ ] Repo created, folder skeleton pushed, `develop` and all feature branches exist
- [ ] Root README written and accurate
- [ ] `.env.example` created with agreed ports
- [ ] Register map written down in `plant/register_map.md` and read by the whole team
- [ ] Each Python component has its own virtual environment and a working `requirements.txt`
- [ ] Backend starts and responds to a basic request
- [ ] Plant starts and a client can connect to it
- [ ] Dashboard starts and loads in a browser
- [ ] An attack placeholder script can connect to the Plant
- [ ] Full pipeline integration check (Step 10) done together as a team, at least once

---

## 6. Common Pitfalls at This Stage

- **Skipping the register map read-through.** It's tempting to jump straight to "real" code — resist this, since a silent mismatch here costs far more time later than the 10 minutes it takes now.
- **Committing the SQLite file or virtual environments to Git.** Bloats the repo and causes merge conflicts on binary files that can't actually be merged — make sure `.gitignore` is in place before the first real commit with generated files.
- **Hardcoding ports instead of reading from `.env`.** Someone will inevitably need to run two components on the same machine during testing, or a teammate's machine will have a port conflict — reading from config avoids a scramble later.
- **One person doing all the groundwork alone.** Steps 3–9 are designed to run in parallel — if only one person sets up everyone else's folder, the others lose the chance to understand their own piece's environment from the start, which costs time in Week 2 when something breaks and they don't know their own setup.
