# CheckerActivity

Dashboard for monitoring wallet activity across **Konnex**, **Canopy**, **ZugChain**, **XStocks**, **Permacast**, **ProjectZero**, **Shelby**, **Surf AI**, and **Truthtensor** projects.

## Features

- **Nine-tab UI** — switch between Konnex, Canopy, ZugChain, XStocks, Permacast, ProjectZero, Shelby, Surf AI, and Truthtensor data
- **Auto-reload** — detects file changes every 5 seconds and refreshes data automatically
- **Address lookup** — paste a list of addresses to check their status in bulk
- **Filters** — filter by Twitter connected, Discord connected, has points, has ref code
- **Sorting** — click any column header to sort
- **Search** — search by wallet address or ref code
- **CSV export** — download current data as a CSV file
- **Truncated JSON recovery** — gracefully handles incomplete/truncated database files

## Project Structure

```
checker-activity/
├── server.js        — HTTP server (port 3000), data parsing, API
├── index.html       — Dashboard UI
├── start.bat        — Launch script (Windows)
└── config.example.json — template with sample absolute paths
```

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
  "truthtensorDbPath": "D:\\path\\to\\Truthtensor\\db.json"
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
| `GET /api/konnex/csv` | Konnex data as CSV download |
| `GET /api/canopy/csv` | Canopy data as CSV download |
| `GET /api/zugchain/csv` | ZugChain data as CSV download |
| `GET /api/xstocks/csv` | XStocks data as CSV download |
| `GET /api/permacast/csv` | Permacast data as CSV download |
| `GET /api/projectzero/csv` | ProjectZero data as CSV download |
| `GET /api/shelby/csv` | Shelby data as CSV download |
| `GET /api/surf/csv` | Surf AI data as CSV download |
| `GET /api/truthtensor/csv` | Truthtensor data as CSV download |
| `GET /api/status` | File metadata and cache status |
