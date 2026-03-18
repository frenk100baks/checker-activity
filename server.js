const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;

const KONNEX_DB = path.join(__dirname, "Konnex", "db.json");
const CANOPY_DB = path.join(__dirname, "Canopy", "db.json");

// ─── Cache (mtime-based auto-reload) ──────────────────────────────────────────
const cache = {
  konnex: { data: null, mtime: 0, count: 0, truncated: false, updatedAt: null },
  canopy:  { data: null, mtime: 0, count: 0, truncated: false, updatedAt: null },
};

// ─── Truncated JSON fix ────────────────────────────────────────────────────────
function loadJson(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  try {
    return { data: JSON.parse(content), truncated: false };
  } catch (_) {
    // Find last complete top-level entry: ends with },\n  "0x...
    const regex = /\},\s*\n\s*"0x/g;
    let lastMatch = null, m;
    while ((m = regex.exec(content)) !== null) lastMatch = m;
    if (lastMatch) {
      const fixed = content.slice(0, lastMatch.index + 1) + "\n}";
      return { data: JSON.parse(fixed), truncated: true };
    }
    throw new Error(`Cannot parse ${path.basename(filePath)}: invalid JSON`);
  }
}

// ─── Parsers ───────────────────────────────────────────────────────────────────
function parseKonnex(raw) {
  return Object.entries(raw).map(([address, info]) => ({
    address,
    points:      info.points      ?? 0,
    rank:        info.rank        ?? 0,
    // flexible field names
    refCode:     info.refCode     || info.ref_code     || info.referralCode || "-",
    refCodeUsed: !!(info.refCodeUsed ?? info.ref_code_used ?? info.referralUsed ?? false),
    twitter:     !!(info.twitterConnected ?? info.twitter_connected ?? info.twitter ?? false),
    discord:     !!(info.discordConnected ?? info.discord_connected ?? info.discord ?? false),
  })).sort((a, b) => b.points - a.points);
}

function parseCanopy(raw) {
  return Object.entries(raw).map(([address, info]) => {
    let twitter = !!(info.twitterConnected ?? info.twitter_connected ?? false);
    let discord = !!(info.discordConnected  ?? info.discord_connected ?? !!info.discordToken ?? false);

    // detect from loyalty transactions
    const txs = info.rewardsLoyaltyOverview?.transactions?.data;
    if (Array.isArray(txs)) {
      for (const tx of txs) {
        const name = tx?.loyaltyTransaction?.loyaltyRule?.name ?? "";
        if (name === "Connect X") twitter = true;
        if (name.toLowerCase().includes("discord")) discord = true;
      }
    }

    return {
      address,
      points:  info.points ?? 0,
      rank:    info.rank   ?? 0,
      twitter,
      discord,
    };
  }).sort((a, b) => b.points - a.points);
}

// ─── Cache accessor ────────────────────────────────────────────────────────────
function getOrParse(project, filePath, parseFn) {
  const stat = fs.statSync(filePath);
  const mtime = stat.mtimeMs;
  const c = cache[project];

  if (c.data && c.mtime === mtime) return c;

  const { data, truncated } = loadJson(filePath);
  const rows = parseFn(data);

  cache[project] = {
    data:      rows,
    mtime,
    count:     rows.length,
    truncated,
    updatedAt: new Date(mtime).toISOString(),
  };

  console.log(`[${project}] Loaded ${rows.length} wallets${truncated ? " ⚠ JSON truncated" : ""} — ${new Date(mtime).toLocaleString()}`);
  return cache[project];
}

// ─── CSV helper ────────────────────────────────────────────────────────────────
function toCsv(rows, fields) {
  const lines = rows.map(r =>
    fields.map(f => {
      const v = r[f];
      if (v === undefined || v === null) return "";
      const s = String(v);
      return s.includes(",") ? `"${s}"` : s;
    }).join(",")
  );
  return [fields.join(","), ...lines].join("\n");
}

// ─── HTTP server ───────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const respond = (status, ct, body) => {
    res.writeHead(status, {
      "Content-Type": ct,
      "Access-Control-Allow-Origin": "*",
    });
    res.end(body);
  };

  try {
    // ── JSON data
    if (req.url === "/api/konnex") {
      const { data } = getOrParse("konnex", KONNEX_DB, parseKonnex);
      return respond(200, "application/json", JSON.stringify(data));
    }

    if (req.url === "/api/canopy") {
      const { data } = getOrParse("canopy", CANOPY_DB, parseCanopy);
      return respond(200, "application/json", JSON.stringify(data));
    }

    // ── CSV download
    if (req.url === "/api/konnex/csv") {
      const { data } = getOrParse("konnex", KONNEX_DB, parseKonnex);
      const csv = toCsv(data, ["address", "points", "rank", "refCode", "refCodeUsed", "twitter", "discord"]);
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="konnex_${Date.now()}.csv"`,
      });
      return res.end(csv);
    }

    if (req.url === "/api/canopy/csv") {
      const { data } = getOrParse("canopy", CANOPY_DB, parseCanopy);
      const csv = toCsv(data, ["address", "points", "rank", "twitter", "discord"]);
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="canopy_${Date.now()}.csv"`,
      });
      return res.end(csv);
    }

    // ── File status (UI polls this to detect changes)
    if (req.url === "/api/status") {
      const status = {};
      for (const [project, filePath] of [["konnex", KONNEX_DB], ["canopy", CANOPY_DB]]) {
        try {
          const stat = fs.statSync(filePath);
          const c = cache[project];
          status[project] = {
            exists:    true,
            mtime:     stat.mtimeMs,
            updatedAt: new Date(stat.mtimeMs).toISOString(),
            count:     c.count     || 0,
            truncated: c.truncated || false,
            stale:     c.mtime    !== stat.mtimeMs,
          };
        } catch (_) {
          status[project] = { exists: false };
        }
      }
      return respond(200, "application/json", JSON.stringify(status));
    }

    // ── Static files
    if (req.url === "/" || req.url === "/index.html") {
      fs.readFile(path.join(__dirname, "index.html"), (err, data) => {
        if (err) return respond(404, "text/plain", "Not found");
        respond(200, "text/html; charset=utf-8", data);
      });
      return;
    }

    respond(404, "text/plain", "Not found");

  } catch (e) {
    console.error(`[ERROR] ${e.message}`);
    respond(500, "application/json", JSON.stringify({ error: e.message }));
  }
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.error(`\n  [ERROR] Порт ${PORT} вже зайнятий.`);
    console.error(`  Закрийте інший процес або запустіть через start.bat\n`);
    process.exit(1);
  }
  throw e;
});

server.listen(PORT, () => {
  console.log(`\n  Сервер запущено: http://localhost:${PORT}\n`);
  console.log(`  Konnex DB : ${KONNEX_DB}`);
  console.log(`  Canopy DB : ${CANOPY_DB}\n`);
  console.log("  Дані перезавантажуються автоматично при зміні файлів.\n");
});
