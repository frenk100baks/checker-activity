# CheckerActivity

Dashboard for monitoring wallet activity across **eleven** integrated modules. Each module reads a separate `db.json` file; paths are set in `config.json` (see [Setup](#setup-and-run-english-guide)).

**Special for Gentleman community:** [https://t.me/byGentleman_bot?start=ref5561204288](https://t.me/byGentleman_bot?start=ref5561204288)

## Modules

| Module | Config key | API base | Highlights (UI / CSV) |
|--------|------------|----------|-------------------------|
| **Konnex** | `konnexDbPath` | `/api/konnex` | Points, rank, ref code, Twitter / Discord, ref used |
| **Canopy** | `canopyDbPath` | `/api/canopy` | Points, rank, Twitter, Discord |
| **ZugChain** | `zugChainDbPath` | `/api/zugchain` | XP, rank, **Native Balance**, TwitterConnected |
| **XStocks** | `xStocksDbPath` | `/api/xstocks` | Points, ReffCode, registered |
| **Permacast** | `permacastDbPath` | `/api/permacast` | Points, rank, Twitter, Discord |
| **ProjectZero** | `projectZeroDbPath` | `/api/projectzero` | Gems, streak, ReffCode used |
| **Shelby** | `shelbyDbPath` | `/api/shelby` | Address, upload count |
| **Surf AI** | `surfDbPath` | `/api/surf` | X account, task count, invite code |
| **Truthtensor** | `truthtensorDbPath` | `/api/truthtensor` | Address, agents count |
| **Concrete** | `concreteDbPath` | `/api/concrete` | Points, rank, Twitter / Discord, ReffCode, ReffCode used, referrals count |
| **Neura** | `neuraDbPath` | `/api/neura` | Neura points, pulses, trading volumes, native / Sepolia balance, Discord / Twitter linked |

CSV for each module: append `/csv` to the same path (e.g. `GET /api/neura/csv`).

## Features

- **Eleven-tab UI** — one tab per module; switch to compare projects side by side in the same layout
- **Auto-reload** — polls file metadata every 5 seconds and reloads when `db.json` changes
- **Address lookup** — paste many addresses; order is preserved when matching
- **Filters & search** — per module (points/XP, Twitter, Discord, ref codes, etc., where applicable)
- **Sorting** — click column headers
- **CSV export** — per-module download links in the UI
- **Truncated JSON recovery** — best-effort parse if a `db.json` was cut off mid-file

## Project Structure

```
checker-activity/
├── server.js           — HTTP server (port 3000), data parsing, API
├── index.html          — Dashboard UI (all module tabs)
├── start.bat           — Launch script (Windows; frees port 3000)
├── config.example.json — committed template (copy to config.json)
└── config.json         — your local paths (gitignored; create from template)
```

`.gitignore` also excludes local secrets and typical `db.json` files so databases are not committed by mistake.

## Setup and Run (English Guide)

### 1) Requirements

- Node.js 18+ (recommended)
- Access to all module `db.json` files on your machine

### 2) Clone and open the project

```bash
git clone https://github.com/frenk100baks/checker-activity.git
cd checker-activity
```

### 3) Create local config

Create your local `config.json` from the template:

```bash
copy config.example.json config.json
```

Then edit `config.json` and set absolute paths to your local module files:

- `konnexDbPath`
- `canopyDbPath`
- `zugChainDbPath`
- `xStocksDbPath`
- `permacastDbPath`
- `projectZeroDbPath`
- `shelbyDbPath`
- `surfDbPath`
- `truthtensorDbPath`
- `concreteDbPath`
- `neuraDbPath`

Example (`config.example.json`):

```json
{
  "konnexDbPath": "D:\\path\\to\\KonnexMastery\\db.json",
  "canopyDbPath": "D:\\path\\to\\Canopy\\db.json",
  "zugChainDbPath": "D:\\path\\to\\ZugChain\\db.json",
  "xStocksDbPath": "D:\\path\\to\\XStocks\\db.json",
  "permacastDbPath": "D:\\path\\to\\Permacast\\db.json",
  "projectZeroDbPath": "D:\\path\\to\\ProjectZeroMastery\\db.json",
  "shelbyDbPath": "D:\\path\\to\\Shelby\\db.json",
  "surfDbPath": "D:\\path\\to\\Surf\\db.json",
  "truthtensorDbPath": "D:\\path\\to\\Truthtensor\\db.json",
  "concreteDbPath": "D:\\path\\to\\Concrete\\db.json",
  "neuraDbPath": "D:\\path\\to\\Neura\\db.json"
}
```

`config.json` is intentionally ignored by git, so your local paths never get committed.

### 4) Start the dashboard server

```bash
node server.js
```

Windows alternative:

- Run `start.bat`

### 5) Open the dashboard

- [http://localhost:3000](http://localhost:3000)

### 6) Verify data is loaded

- Open `http://localhost:3000/api/status`
- Check each module has:
  - `"exists": true`
  - non-zero `"count"` (if your source file has records)

### 7) Troubleshooting

- **`config.json` missing**: create it from `config.example.json`.
- **`file not found` in status**: verify absolute paths in `config.json`.
- **Port 3000 already in use**: close the process or use `start.bat` (it kills previous listener on port 3000).
- **JSON parse error**: validate the source `db.json` file. The app can recover from some truncated JSON, but not fully invalid JSON.
- **No rows in UI**: test endpoint directly (for example `http://localhost:3000/api/zugchain`) to confirm backend data.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/konnex` | Konnex wallet data (JSON) |
| `GET /api/canopy` | Canopy wallet data (JSON) |
| `GET /api/zugchain` | ZugChain wallet data (JSON) |
| `GET /api/xstocks` | XStocks wallet data (JSON) |
| `GET /api/permacast` | Permacast wallet data (JSON) |
| `GET /api/projectzero` | ProjectZero wallet data (JSON) |
| `GET /api/shelby` | Shelby wallet data (JSON) |
| `GET /api/surf` | Surf AI wallet data (JSON) |
| `GET /api/truthtensor` | Truthtensor wallet data (JSON) |
| `GET /api/concrete` | Concrete wallet data (JSON) |
| `GET /api/neura` | Neura wallet data (JSON) |
| `GET /api/konnex/csv` | Konnex data as CSV download |
| `GET /api/canopy/csv` | Canopy data as CSV download |
| `GET /api/zugchain/csv` | ZugChain data as CSV download |
| `GET /api/xstocks/csv` | XStocks data as CSV download |
| `GET /api/permacast/csv` | Permacast data as CSV download |
| `GET /api/projectzero/csv` | ProjectZero data as CSV download |
| `GET /api/shelby/csv` | Shelby data as CSV download |
| `GET /api/surf/csv` | Surf AI data as CSV download |
| `GET /api/truthtensor/csv` | Truthtensor data as CSV download |
| `GET /api/concrete/csv` | Concrete data as CSV download |
| `GET /api/neura/csv` | Neura data as CSV download |
| `GET /api/status` | File metadata and cache status |
