<p align="center">
  <img src="assets\yvonne-banner.png" alt="Endfield Field Assistant">
</p>

<h1 align="center">Arknights: Endfield Auto Check-In</h1>

<p align="center">
  Automates Endfield <b>daily attendance check-in</b>, 
  sends results to a <b>Discord webhook</b>, and runs easily with Docker.
</p>

---

## Features

- Automated daily check-in
- Multi-account support
- Discord notifications (webhook)
- Run locally (Node.js) or with Docker

## Prerequisites

- Node.js 18+ (or Docker)
- pnpm 9+ (for local runs)
- Discord webhook URL
- Arknights: Endfield account

## Quick Start

### 1) Clone Repo

```bash
git clone https://github.com/<YOUR_ORG_OR_USERNAME>/<REPO_NAME>.git
cd <REPO_NAME>
```

### 2) Install

```bash
pnpm install
cp .env.example .env
```

Windows PowerShell (if `cp` is not available):

```powershell
Copy-Item .env.example .env
```

### 3) Get credentials (`cred` / `sk-game-role`)

1. Open https://game.skport.com/endfield/sign-in in your browser
2. Open DevTools (F12) → Network
3. Log in and find the request with URL: `https://zonai.skport.com/web/v1/game/endfield/attendance`

4. Copy `cred` and `sk-game-role` from Request Headers

### 4) Configure environment variables

Example `.env`:

```env
# Discord Webhook URL (Required)
DISCORD_WEBHOOK_URL=your_discord_webhook_url_here

# Discord Webhook Customization (Optional)
DISCORD_WEBHOOK_USERNAME=Endfield Auto
DISCORD_WEBHOOK_AVATAR_URL=https://raw.githubusercontent.com/Snow0406/endfield-auto-check-in/main/assets/bot-image.png

# Cron Schedule (Optional, Default: "0 1 * * *" = Daily at 1 AM)
CRON_CHECKIN=0 1 * * *

# Timezone (Optional, Default: "Asia/Seoul")
TIMEZONE=Asia/Seoul

ACCOUNT_1_CRED=your_cred_token
ACCOUNT_1_SK_GAME_ROLE=your_server_uid
```

Multiple accounts:

```env
ACCOUNT_1_CRED=your_cred_token
ACCOUNT_1_SK_GAME_ROLE=your_server_uid

ACCOUNT_2_CRED=...
ACCOUNT_2_SK_GAME_ROLE=...
```

Only `ACCOUNT_N_CRED` and `ACCOUNT_N_SK_GAME_ROLE` are required per account. Add `ACCOUNT_3_*`, `ACCOUNT_4_*`, etc. as needed.

Timezone configuration:

```env
# Use your local timezone (default: Asia/Seoul)
TIMEZONE=America/New_York
```

For a full list of available timezones, see: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

### 5) Run locally

```bash
pnpm dev
```

Production:

```bash
pnpm build
pnpm start
```

### 6) Run with Docker

```bash
docker compose up -d
```

## Credits

This project is based on: https://github.com/torikushiii/endfield-auto

## License

MIT
