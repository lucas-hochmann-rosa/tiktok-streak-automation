# 🔥 Tiktok Streak Automation

<p align="center">
  <a href="https://github.com/lucas-hochmann-rosa/tiktok-streak-automation">
    <img src="https://img.shields.io/badge/GitHub-tiktok--streak--automation-181717?style=for-the-badge&logo=github">
  </a>
  <a href="https://www.linkedin.com/in/lucas-hochmann-rosa">
    <img src="https://img.shields.io/badge/LinkedIn-Lucas_Hochmann_Rosa-0A66C2?style=for-the-badge&logo=linkedin">
  </a>
  <a href="#-tech-stack">
    <img src="https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white">
  </a>
  <a href="#-tech-stack">
    <img src="https://img.shields.io/badge/Playwright-1.58-2EAD33?style=for-the-badge&logo=playwright&logoColor=white">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-2ea44f?style=for-the-badge">
  </a>
</p>

<p align="center"><a href="README.md">🇧🇷 Português</a> · 🇺🇸 English</p>

> Keeps your TikTok **streak (fire)** alive by sending the daily message automatically to the contacts you choose, powered by [Playwright](https://playwright.dev/).

---

## 📌 Overview

Node.js command-line tool that reuses a logged-in TikTok session to open conversations and send the daily message without manual intervention. No password in `.env`, no token, no unofficial API: the session comes from a single login performed by the user, stored in a persistent browser profile.

Source code is written in English (identifiers, functions, structure), with comments in Portuguese explaining decisions that aren't obvious from the code alone.

---

## ✨ Key Features

- Persistent session via `launchPersistentContext`: one-time manual login, no stored credentials.
- Session detection through the `sessionid` cookie, instead of UI text that changes with language and app version.
- Sends to multiple recipients, picking a random message from a configurable list.
- Human pacing: character-by-character typing, reading pauses, and variable delays between actions — no timing is fixed.
- Automatic screenshot to `logs/` whenever a send fails or can't be confirmed.
- Never resends an unconfirmed message, to avoid duplicates.
- Ready-to-use scheduling script for Windows Task Scheduler.

---

## 🧭 Table of Contents

- [Architecture](#-architecture)
- [Module Map](#-module-map)
- [Tech Stack](#-tech-stack)
- [How Login Works](#-how-login-works)
- [Project Ground Rules](#-project-ground-rules)
- [Requirements](#-requirements)
- [Installation](#-installation)
- [Environment Configuration](#-environment-configuration)
- [Usage](#-usage)
- [Human Pacing](#-human-pacing)
- [Daily Scheduling (Windows)](#-daily-scheduling-windows)
- [When It Stops Working](#-when-it-stops-working)
- [Disclaimer](#-disclaimer)
- [Author](#-author)
- [License](#-license)

---

## 🏗️ Architecture

```text
tiktok-streak-automation/
├── main.js
├── package.json
├── .env.example
├── src/
│   ├── config/
│   │   └── settings.js
│   ├── core/
│   │   ├── browser-session.js
│   │   ├── human.js
│   │   ├── logger.js
│   │   ├── screenshots.js
│   │   └── util.js
│   ├── flows/
│   │   └── streak-flow.js
│   └── services/
│       └── streak-service.js
└── scripts/
    └── schedule-task.ps1
```

---

## 🗺️ Module Map

| File | Purpose |
| ------ | ------ |
| `main.js` | CLI: `run` \| `login` \| `logout` \| `help`. |
| `src/config/settings.js` | Reads and validates `.env`. |
| `src/core/browser-session.js` | Opens the persistent profile and checks session via cookie. |
| `src/core/human.js` | Human-paced typing and selector lookup with fallback chain. |
| `src/core/screenshots.js` | Diagnostic screenshot when a send fails. |
| `src/core/logger.js` | Timestamped console logging. |
| `src/core/util.js` | Delays, random pick, regex escaping. |
| `src/flows/streak-flow.js` | The only module aware of TikTok's HTML: selectors and interaction with the message box. |
| `src/services/streak-service.js` | Orchestrates sending to every target and summarizes the result. |
| `scripts/schedule-task.ps1` | Registers the daily run in Windows Task Scheduler. |

---

## 🧰 Tech Stack

**Runtime:** Node.js 20+, ES Modules.

**Automation:** [Playwright](https://playwright.dev/) (Chromium via the `msedge`/`chrome` channel or its own bundled binary).

**Configuration:** `dotenv`.

---

## 🔑 How Login Works

TikTok's automated login is fragile (captcha, e-mail/phone verification, anti-bot blocking) and would require storing the account password in plain text. This project takes a different approach:

1. `npm run login` opens a browser with its own **persistent profile** (`.profile/` folder). Login happens manually, as usual.
2. The session is saved to that folder — cookies, not a password.
3. `npm start` reopens the same profile, already authenticated, opens each conversation, and sends the message.

No credentials live in the repository, login only happens once (until it expires), and the daily run takes just a few seconds.

---

## 📐 Project Ground Rules

- Identifiers, functions, and file structure stay in English.
- Code comments stay in Portuguese, reserved for decisions that aren't obvious — the "why", not the "what".
- All interaction with TikTok's HTML is isolated in `src/flows/streak-flow.js`, with selectors in a fallback chain.
- No credentials are stored: the session comes from a manual login into a persistent profile.
- No unconfirmed send is ever retried automatically.

---

## ⚙️ Requirements

- Node.js 20 or newer
- Microsoft Edge or Google Chrome installed (or `npm run setup` to download Playwright's Chromium)

---

## 🚀 Installation

```bash
git clone https://github.com/lucas-hochmann-rosa/tiktok-streak-automation.git
cd tiktok-streak-automation
npm install
```

If you have **neither** Edge nor Chrome, download Playwright's browser and leave `BROWSER_CHANNEL` empty in `.env`:

```bash
npm run setup
```

---

## 🔐 Environment Configuration

```bash
cp .env.example .env
```

Only one variable is required:

```env
TIKTOK_TARGETS=Maria,John Doe
TIKTOK_MESSAGES=🔥|🔥🔥|hey|good morning
```

`TIKTOK_TARGETS` uses the name **exactly as it appears in your TikTok conversation list**. `TIKTOK_MESSAGES` picks one of the options at random on every send.

| Variable | Default | Purpose |
| --- | --- | --- |
| `TIKTOK_TARGETS` | — | Recipients, comma-separated. **Required** |
| `TIKTOK_MESSAGES` | `🔥` | Candidate messages, separated by `\|` |
| `BROWSER_CHANNEL` | `msedge` | `msedge`, `chrome`, or empty (Playwright's Chromium) |
| `HEADLESS` | `false` | `true` runs without opening a window — faster |
| `BROWSER_PROFILE_DIR` | `.profile` | Where the logged-in session is stored |
| `TIMEOUT_MS` | `45000` | Maximum wait time per element |
| `TYPING_MIN_MS` / `TYPING_MAX_MS` | `90` / `260` | Delay between each typed character |
| `READ_MIN_MS` / `READ_MAX_MS` | `1800` / `4200` | Pause when loading the inbox and opening a conversation |
| `PRE_SEND_MIN_MS` / `PRE_SEND_MAX_MS` | `800` / `2000` | Pause before pressing Enter |
| `DELAY_MIN_MS` / `DELAY_MAX_MS` | `6000` / `18000` | Pause between recipients |
| `START_JITTER_MAX_MS` | `0` | Random delay at the start of the run |
| `DRY_RUN` | `false` | `true` opens the conversation but doesn't send anything |
| `SCREENSHOT_DIR` | `logs` | Where to save screenshots when something fails |

---

## ▶️ Usage

```bash
npm run login   # once (and again if the session expires)
npm start       # sends the daily message
```

Helper commands:

```bash
npm run logout   # drops the saved session
npm run help     # lists the available commands
```

Before the first real send, it's worth testing with `DRY_RUN=true`: the bot opens each conversation and logs what it would do, without sending anything.

The command exits with code `1` if any recipient fails, which makes it easy to detect problems in scheduled runs.

---

## 🐢 Human Pacing

Instant action is the most obvious signature of automation. That's why the bot doesn't rush:

- types **character by character**, with a random delay per key;
- occasionally hesitates after a space, like someone thinking of the next word;
- pauses when loading the inbox and opening a conversation, before starting to type;
- waits a variable interval before pressing Enter and between one recipient and the next.

None of these timings are fixed — all are randomized within a range, so two runs never share the same cadence. A single send usually takes 10 to 20 seconds.

For scheduled runs, it's worth enabling `START_JITTER_MAX_MS` (e.g. `900000` for up to 15 minutes): firing at exactly 09:00:00 every day is a predictable pattern in itself.

---

## 📅 Daily Scheduling (Windows)

```powershell
powershell -ExecutionPolicy Bypass -File scripts\schedule-task.ps1 -Time 09:00
```

This registers a daily task in Task Scheduler. To check or remove it:

```powershell
Get-ScheduledTask -TaskName TikTokStreak
Unregister-ScheduledTask -TaskName TikTokStreak
```

For scheduled runs, set `HEADLESS=true` in `.env`.

> **Don't use GitHub Actions or any other CI for this.** The automation depends on a logged-in browser profile that only exists on your machine; uploading that profile to a runner would mean exposing your TikTok session.

---

## 🔧 When It Stops Working

TikTok changes its interface frequently. All coupling with the HTML is isolated in a single place: the `SELECTORS` constant in [`src/flows/streak-flow.js`](src/flows/streak-flow.js). Each field is a list of attempts, from most specific to most generic — usually adding a new selector at the top of the list is enough.

When a send fails, a screenshot is saved to `logs/`, which usually shows right away what changed.

Other common cases:

| Symptom | Likely cause |
| --- | --- |
| `Sessão ausente ou expirada` | Run `npm run login` again |
| `Conversa com "X" não encontrada` | The name in `TIKTOK_TARGETS` doesn't match the conversation list |
| `O perfil já está aberto em outro processo` | Close the window left open by a previous run |
| `não foi possível confirmar na tela` | The message was likely sent; check manually before running again (the bot never resends on its own, to avoid duplicates) |

---

## ⚠️ Disclaimer

Personal tool built to automate a repetitive task on **your own account**. Automating interactions may go against [TikTok's Terms of Service](https://www.tiktok.com/legal/terms-of-service) and, in the worst case, lead to account restrictions. Use at your own risk, in moderation, and only with people who already talk to you.

Don't commit `.env`, `.profile/`, or `logs/` — all already covered by `.gitignore`.

---

## 👨‍💻 Author

**Lucas Hochmann Rosa**

- Repository: <https://github.com/lucas-hochmann-rosa/tiktok-streak-automation>
- GitHub: <https://github.com/hrlucas>
- LinkedIn: <https://www.linkedin.com/in/lucas-hochmann-rosa>

---

## 📄 License

Licensed under MIT. Feel free to use, modify, and distribute, while keeping the copyright notice and crediting **Lucas Hochmann Rosa**.

---
