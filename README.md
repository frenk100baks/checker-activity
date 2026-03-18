# CheckerActivity

Dashboard for monitoring wallet activity across **Konnex** and **Canopy** projects.

## Features

- **Two-tab UI** — switch between Konnex and Canopy data
- **Auto-reload** — detects file changes every 5 seconds and refreshes data automatically
- **Address lookup** — paste a list of addresses to check their status in bulk
- **Filters** — filter by Twitter connected, Discord connected, has points, has ref code
- **Sorting** — click any column header to sort
- **Search** — search by wallet address or ref code
- **CSV export** — download current data as a CSV file
- **Truncated JSON recovery** — gracefully handles incomplete/truncated database files

## Project Structure

```
CheckerActivity/
├── server.js        — HTTP server (port 3000), data parsing, API
├── index.html       — Dashboard UI
├── start.bat        — Launch script (Windows)
├── Konnex/
│   └── db.json      — Konnex wallet database (not tracked by git)
└── Canopy/
    └── db.json      — Canopy wallet database (not tracked by git)
```

## Getting Started

**Requirements:** Node.js

1. Clone the repository:
   ```bash
   git clone https://github.com/bskvtl/checker-activity.git
   cd checker-activity
   ```

2. Place your database files:
   - `Konnex/db.json`
   - `Canopy/db.json`

3. Start the server:
   ```bash
   node server.js
   ```
   Or on Windows, double-click **`start.bat`**

4. Open in browser: [http://localhost:3000](http://localhost:3000)

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/konnex` | Konnex wallet data (JSON) |
| `GET /api/canopy` | Canopy wallet data (JSON) |
| `GET /api/konnex/csv` | Konnex data as CSV download |
| `GET /api/canopy/csv` | Canopy data as CSV download |
| `GET /api/status` | File metadata and cache status |
