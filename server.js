const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;

const CONFIG_PATH = path.join(__dirname, "config.json");

function loadDbConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  let cfg;
  try {
    cfg = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Cannot parse config.json: ${e.message}`);
  }

  if (!cfg || typeof cfg !== "object") {
    throw new Error("Invalid config.json: root must be an object");
  }
  if (!cfg.konnexDbPath || !cfg.canopyDbPath || !cfg.zugChainDbPath || !cfg.xStocksDbPath || !cfg.permacastDbPath || !cfg.projectZeroDbPath || !cfg.shelbyDbPath || !cfg.surfDbPath || !cfg.truthtensorDbPath || !cfg.concreteDbPath || !cfg.neuraDbPath || !cfg.startaleDbPath) {
    throw new Error("config.json must contain konnexDbPath, canopyDbPath, zugChainDbPath, xStocksDbPath, permacastDbPath, projectZeroDbPath, shelbyDbPath, surfDbPath, truthtensorDbPath, concreteDbPath, neuraDbPath and startaleDbPath");
  }

  return {
    KONNEX_DB: cfg.konnexDbPath,
    CANOPY_DB: cfg.canopyDbPath,
    ZUGCHAIN_DB: cfg.zugChainDbPath,
    XSTOCKS_DB: cfg.xStocksDbPath,
    PERMACAST_DB: cfg.permacastDbPath,
    PROJECTZERO_DB: cfg.projectZeroDbPath,
    SHELBY_DB: cfg.shelbyDbPath,
    SURF_DB: cfg.surfDbPath,
    TRUTHTENSOR_DB: cfg.truthtensorDbPath,
    CONCRETE_DB: cfg.concreteDbPath,
    NEURA_DB: cfg.neuraDbPath,
    STARTALE_DB: cfg.startaleDbPath,
  };
}

const { KONNEX_DB, CANOPY_DB, ZUGCHAIN_DB, XSTOCKS_DB, PERMACAST_DB, PROJECTZERO_DB, SHELBY_DB, SURF_DB, TRUTHTENSOR_DB, CONCRETE_DB, NEURA_DB, STARTALE_DB } = loadDbConfig();

// ─── Cache (mtime-based auto-reload) ──────────────────────────────────────────
const cache = {
  konnex: { data: null, mtime: 0, count: 0, truncated: false, updatedAt: null },
  canopy:  { data: null, mtime: 0, count: 0, truncated: false, updatedAt: null },
  zugchain:{ data: null, mtime: 0, count: 0, truncated: false, updatedAt: null },
  xstocks: { data: null, mtime: 0, count: 0, truncated: false, updatedAt: null },
  permacast: { data: null, mtime: 0, count: 0, truncated: false, updatedAt: null },
  projectzero: { data: null, mtime: 0, count: 0, truncated: false, updatedAt: null },
  shelby: { data: null, mtime: 0, count: 0, truncated: false, updatedAt: null },
  surf: { data: null, mtime: 0, count: 0, truncated: false, updatedAt: null },
  truthtensor: { data: null, mtime: 0, count: 0, truncated: false, updatedAt: null },
  concrete: { data: null, mtime: 0, count: 0, truncated: false, updatedAt: null },
  neura: { data: null, mtime: 0, count: 0, truncated: false, updatedAt: null },
  startale: { data: null, mtime: 0, count: 0, truncated: false, updatedAt: null },
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
function pickSocialToken(info, kind) {
  const isTw = kind === "twitter";
  const direct = isTw
    ? [
        info.twiiterToken,
        info.twitterToken,
        info.twitter_token,
        info["Twitter Token"],
      ]
    : [info.discordToken, info.discord_token, info["Discord Token"]];
  for (const x of direct) {
    if (x != null && String(x).trim() !== "") return String(x).trim();
  }
  const nested = isTw ? info.twitter : info.discord;
  if (nested && typeof nested === "object" && nested.token != null) {
    const t = String(nested.token).trim();
    if (t) return t;
  }
  return "";
}

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
    twitterToken: pickSocialToken(info, "twitter"),
    discordToken: pickSocialToken(info, "discord"),
  })).sort((a, b) => b.points - a.points);
}

function parseCanopy(raw) {
  return Object.entries(raw).map(([address, info]) => {
    let twitter = !!(info.twitterConnected ?? info.twitter_connected ?? false);
    let discord = !!(info.discordConnected ?? info.discord_connected ?? false);

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
      twitterToken: pickSocialToken(info, "twitter"),
    };
  }).sort((a, b) => b.points - a.points);
}

function parseZugChain(raw) {
  return Object.entries(raw).map(([address, info]) => ({
    address,
    // In zugchain db.json points are stored as a string in the source file.
    points: Number(info.points ?? info.xp ?? 0),
    rank: Number(info.rank ?? 0),
    nativeBalance: Number(
      info.nativeBalance ??
      info.native_balance ??
      info["Native Balance"] ??
      0
    ),
    // Normalize to a single boolean "twitter" field used by the UI filters.
    twitter: !!(
      info.twitterLinked ??
      info.twitterConnected ??
      info.twitter_connected ??
      info.twitter ??
      false
    ),
    twitterToken: pickSocialToken(info, "twitter"),
    discordToken: pickSocialToken(info, "discord"),
  })).sort((a, b) => b.points - a.points);
}

function parseXStocks(raw) {
  return Object.entries(raw).map(([address, info]) => {
    const refCode =
      info.refCode ??
      info.ReffCode ??
      info.ref_code ??
      info.refcode ??
      info.reff_code ??
      "-";

    const userRegisteredRaw =
      info.userRegistered ??
      info.UserRegistered ??
      info.user_registered ??
      info.userregistered ??
      false;

    const userRegistered =
      userRegisteredRaw === true ||
      userRegisteredRaw === 1 ||
      String(userRegisteredRaw).toLowerCase() === "true";

    return {
      address,
      points: Number(info.points ?? info.Points ?? 0),
      rank: 0, // keep shape similar (rank is not shown in UI)
      refCode: (refCode ?? "-") || "-",
      // reuse existing UI/filter key names:
      // - UI uses `twitter` boolean for "connected" filters
      // - we map it to `userRegistered`
      twitter: userRegistered,
      userRegistered,
    };
  }).sort((a, b) => b.points - a.points);
}

function parsePermacast(raw) {
  return Object.entries(raw).map(([address, info]) => {
    const points = Number(info.points ?? info.xp ?? info.totalPoints ?? 0);
    const rank = Number(info.rank ?? info.position ?? 0);
    const twitter = !!(
      info.twitterConnected ??
      info.twitter_connected ??
      info.twitterLinked ??
      info.twitter ??
      false
    );
    const discord = !!(
      info.discordConnected ??
      info.discord_connected ??
      info.discordLinked ??
      info.discord ??
      info.discordToken ??
      false
    );

    return {
      address,
      points,
      rank,
      twitter,
      discord,
    };
  }).sort((a, b) => b.points - a.points);
}

function parseProjectZero(raw) {
  return Object.entries(raw).map(([address, info]) => ({
    address,
    gems: Number(info.Gems ?? info.gems ?? 0),
    streak: Number(info.Streak ?? info.streak ?? 0),
    refCodeUsed: !!(
      info.ReffCodeUsed ??
      info.reffCodeUsed ??
      info.refCodeUsed ??
      false
    ),
  })).sort((a, b) => b.gems - a.gems);
}

function parseShelby(raw) {
  return Object.entries(raw).map(([address, info]) => ({
    address,
    uploadsCount: Number(info.uploadsCount ?? info["Upload Count"] ?? info.uploadCount ?? 0),
  })).sort((a, b) => b.uploadsCount - a.uploadsCount);
}

function parseSurf(raw) {
  return Object.entries(raw).map(([address, info]) => ({
    address,
    xAccount: info.x_account ?? info.xAccount ?? info["X Account"] ?? "-",
    tasksCount: Number(info.tasksCount ?? info["Task Count"] ?? 0),
    inviteCode: info.inviteCode ?? info["Invite Code"] ?? "-",
  })).sort((a, b) => b.tasksCount - a.tasksCount);
}

function parseTruthtensor(raw) {
  return Object.entries(raw).map(([address, info]) => ({
    address,
    agentsCount: Number(info.agentsCount ?? info["Agents Count"] ?? 0),
  })).sort((a, b) => b.agentsCount - a.agentsCount);
}

function parseConcrete(raw) {
  return Object.entries(raw).map(([address, info]) => {
    const rawRef =
      info.refCode ??
      info.ReffCode ??
      info.ref_code ??
      info["ReffCode"];
    const refCode =
      rawRef != null && String(rawRef).trim() !== ""
        ? String(rawRef).trim()
        : "-";
    return {
      address,
      points: Number(info.points ?? info.Points ?? 0),
      rank: Number(info.rank ?? info.Rank ?? 0),
      twitter: !!(info.twitterLinked ?? info.twitterConnected ?? info.twitter ?? false),
      discord: !!(info.discordLinked ?? info.discordConnected ?? info.discord ?? false),
      refCode,
      refCodeUsed: !!(
        info.refCodeUsed ??
        info.ref_code_used ??
        info.reffCodeUsed ??
        info["ReffCode Used"] ??
        false
      ),
      refferalsCount: Number(
        info.refferalsCount ??
        info.referralsCount ??
        info.refferalCount ??
        info.referralCount ??
        info["RefferalsCount"] ??
        0
      ),
      twitterToken: pickSocialToken(info, "twitter"),
      discordToken: pickSocialToken(info, "discord"),
    };
  }).sort((a, b) => b.points - a.points);
}

function parseNeura(raw) {
  return Object.entries(raw).map(([address, info]) => {
    const tv = info.tradingVolume ?? {};
    const discordLinked = !!(
      info.discordLinked ??
      info.discord_connected ??
      info.discord?.linked ??
      false
    );
    const twitterLinked = !!(
      info.twitterLinked ??
      info.twitter_connected ??
      info.twitter?.linked ??
      false
    );
    return {
      address,
      neuraPoints: Number(info.neuraPoints ?? info["Neura Points"] ?? 0),
      collectedPulses: Number(
        info.collectedPulsesCount ??
        info.collectedPulses ??
        info["Collected Pulses"] ??
        0
      ),
      tradingVolumeMonth: Number(
        tv.month ??
        info.tradingVolumeMonth ??
        info["Trading Volume: Month"] ??
        0
      ),
      tradingVolumeAllTime: Number(
        tv.allTime ??
        info.tradingVolumeAllTime ??
        info["Trading Volume: All Time"] ??
        0
      ),
      nativeBalance: Number(
        info.neuroNativeBalance ??
        info.nativeBalance ??
        info.native_balance ??
        info["Native Balance"] ??
        0
      ),
      sepoliaBalance: Number(
        info.sepoliaNativeBalance ??
        info.sepoliaBalance ??
        info.sepolia_balance ??
        info["Sepolia Balance"] ??
        0
      ),
      discordLinked,
      twitterLinked,
      twitterToken: pickSocialToken(info, "twitter"),
      discordToken: pickSocialToken(info, "discord"),
    };
  }).sort((a, b) => b.neuraPoints - a.neuraPoints);
}

function parseStartale(raw) {
  return Object.entries(raw).map(([address, info]) => {
    const rawRef =
      info.refCode ??
      info.reffCode ??
      info.reffcode ??
      info["reffcode"] ??
      info.ReffCode;
    const refCode =
      rawRef != null && String(rawRef).trim() !== ""
        ? String(rawRef).trim()
        : "-";

    const usedRaw =
      info.refCodeUsed ??
      info.reffCodeUsed ??
      info.reffcodeUsed ??
      info.reffcode_used ??
      info["ReffCode Used"] ??
      info["reffcode used"] ??
      false;

    const refCodeUsed =
      usedRaw === true ||
      usedRaw === 1 ||
      String(usedRaw).toLowerCase() === "true";

    return {
      address,
      points: Number(info.points ?? 0),
      rank: Number(info.rank ?? 0),
      refCode,
      refCodeUsed,
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
  const escCell = (s) => {
    const t = String(s);
    if (t.includes(",") || t.includes('"') || t.includes("\n") || t.includes("\r")) {
      return `"${t.replace(/"/g, '""')}"`;
    }
    return t;
  };
  const lines = rows.map(r =>
    fields.map(f => {
      const v = r[f];
      if (v === undefined || v === null) return "";
      return escCell(v);
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

    if (req.url === "/api/zugchain") {
      const { data } = getOrParse("zugchain", ZUGCHAIN_DB, parseZugChain);
      return respond(200, "application/json", JSON.stringify(data));
    }

    if (req.url === "/api/xstocks") {
      const { data } = getOrParse("xstocks", XSTOCKS_DB, parseXStocks);
      return respond(200, "application/json", JSON.stringify(data));
    }

    if (req.url === "/api/permacast") {
      const { data } = getOrParse("permacast", PERMACAST_DB, parsePermacast);
      return respond(200, "application/json", JSON.stringify(data));
    }

    if (req.url === "/api/projectzero") {
      const { data } = getOrParse("projectzero", PROJECTZERO_DB, parseProjectZero);
      return respond(200, "application/json", JSON.stringify(data));
    }

    if (req.url === "/api/shelby") {
      const { data } = getOrParse("shelby", SHELBY_DB, parseShelby);
      return respond(200, "application/json", JSON.stringify(data));
    }

    if (req.url === "/api/surf") {
      const { data } = getOrParse("surf", SURF_DB, parseSurf);
      return respond(200, "application/json", JSON.stringify(data));
    }

    if (req.url === "/api/truthtensor") {
      const { data } = getOrParse("truthtensor", TRUTHTENSOR_DB, parseTruthtensor);
      return respond(200, "application/json", JSON.stringify(data));
    }

    if (req.url === "/api/concrete") {
      const { data } = getOrParse("concrete", CONCRETE_DB, parseConcrete);
      return respond(200, "application/json", JSON.stringify(data));
    }

    if (req.url === "/api/neura") {
      const { data } = getOrParse("neura", NEURA_DB, parseNeura);
      return respond(200, "application/json", JSON.stringify(data));
    }

    if (req.url === "/api/startale") {
      const { data } = getOrParse("startale", STARTALE_DB, parseStartale);
      return respond(200, "application/json", JSON.stringify(data));
    }

    // ── CSV download
    if (req.url === "/api/konnex/csv") {
      const { data } = getOrParse("konnex", KONNEX_DB, parseKonnex);
      const csv = toCsv(data, ["address", "points", "rank", "refCode", "refCodeUsed", "twitter", "discord", "twitterToken", "discordToken"]);
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="konnex_${Date.now()}.csv"`,
      });
      return res.end(csv);
    }

    if (req.url === "/api/canopy/csv") {
      const { data } = getOrParse("canopy", CANOPY_DB, parseCanopy);
      const csv = toCsv(data, ["address", "points", "rank", "twitter", "discord", "twitterToken"]);
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="canopy_${Date.now()}.csv"`,
      });
      return res.end(csv);
    }

    if (req.url === "/api/zugchain/csv") {
      const { data } = getOrParse("zugchain", ZUGCHAIN_DB, parseZugChain);
      const csv = toCsv(data, ["address", "points", "rank", "nativeBalance", "twitter", "twitterToken", "discordToken"]);
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="zugchain_${Date.now()}.csv"`,
      });
      return res.end(csv);
    }

    if (req.url === "/api/xstocks/csv") {
      const { data } = getOrParse("xstocks", XSTOCKS_DB, parseXStocks);
      const csv = toCsv(data, ["address", "points", "refCode", "userRegistered"]);
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="xstocks_${Date.now()}.csv"`,
      });
      return res.end(csv);
    }

    if (req.url === "/api/permacast/csv") {
      const { data } = getOrParse("permacast", PERMACAST_DB, parsePermacast);
      const csv = toCsv(data, ["address", "points", "rank", "twitter", "discord"]);
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="permacast_${Date.now()}.csv"`,
      });
      return res.end(csv);
    }

    if (req.url === "/api/projectzero/csv") {
      const { data } = getOrParse("projectzero", PROJECTZERO_DB, parseProjectZero);
      const csv = toCsv(data, ["address", "gems", "streak", "refCodeUsed"]);
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="projectzero_${Date.now()}.csv"`,
      });
      return res.end(csv);
    }

    if (req.url === "/api/shelby/csv") {
      const { data } = getOrParse("shelby", SHELBY_DB, parseShelby);
      const csv = toCsv(data, ["address", "uploadsCount"]);
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="shelby_${Date.now()}.csv"`,
      });
      return res.end(csv);
    }

    if (req.url === "/api/surf/csv") {
      const { data } = getOrParse("surf", SURF_DB, parseSurf);
      const csv = toCsv(data, ["address", "xAccount", "tasksCount", "inviteCode"]);
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="surf_${Date.now()}.csv"`,
      });
      return res.end(csv);
    }

    if (req.url === "/api/truthtensor/csv") {
      const { data } = getOrParse("truthtensor", TRUTHTENSOR_DB, parseTruthtensor);
      const csv = toCsv(data, ["address", "agentsCount"]);
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="truthtensor_${Date.now()}.csv"`,
      });
      return res.end(csv);
    }

    if (req.url === "/api/concrete/csv") {
      const { data } = getOrParse("concrete", CONCRETE_DB, parseConcrete);
      const csv = toCsv(data, ["address", "points", "rank", "discord", "twitter", "refCode", "refCodeUsed", "refferalsCount", "twitterToken", "discordToken"]);
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="concrete_${Date.now()}.csv"`,
      });
      return res.end(csv);
    }

    if (req.url === "/api/neura/csv") {
      const { data } = getOrParse("neura", NEURA_DB, parseNeura);
      const csv = toCsv(data, [
        "address",
        "neuraPoints",
        "collectedPulses",
        "tradingVolumeMonth",
        "tradingVolumeAllTime",
        "nativeBalance",
        "sepoliaBalance",
        "discordLinked",
        "twitterLinked",
        "twitterToken",
        "discordToken",
      ]);
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="neura_${Date.now()}.csv"`,
      });
      return res.end(csv);
    }

    if (req.url === "/api/startale/csv") {
      const { data } = getOrParse("startale", STARTALE_DB, parseStartale);
      const csv = toCsv(data, ["address", "points", "rank", "refCode", "refCodeUsed"]);
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="startale_${Date.now()}.csv"`,
      });
      return res.end(csv);
    }

    // ── File status (UI polls this to detect changes)
    if (req.url === "/api/status") {
      const status = {};
      for (const [project, filePath] of [
        ["konnex", KONNEX_DB],
        ["canopy", CANOPY_DB],
        ["zugchain", ZUGCHAIN_DB],
        ["xstocks", XSTOCKS_DB],
        ["permacast", PERMACAST_DB],
        ["projectzero", PROJECTZERO_DB],
        ["shelby", SHELBY_DB],
        ["surf", SURF_DB],
        ["truthtensor", TRUTHTENSOR_DB],
        ["concrete", CONCRETE_DB],
        ["neura", NEURA_DB],
        ["startale", STARTALE_DB],
      ]) {
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
    console.error(`\n  [ERROR] Port ${PORT} is already in use.`);
    console.error("  Close another process or run via start.bat\n");
    process.exit(1);
  }
  throw e;
});

server.listen(PORT, () => {
  const printLine = (label, value) => {
    console.log(`  ${label.padEnd(14)}: ${value}`);
  };

  console.log("");
  printLine("Server", `http://localhost:${PORT}`);
  console.log("");
  printLine("Konnex DB", KONNEX_DB);
  printLine("Canopy DB", CANOPY_DB);
  printLine("ZugChain DB", ZUGCHAIN_DB);
  printLine("XStocks DB", XSTOCKS_DB);
  printLine("Permacast DB", PERMACAST_DB);
  printLine("ProjectZero DB", PROJECTZERO_DB);
  printLine("Shelby DB", SHELBY_DB);
  printLine("Surf DB", SURF_DB);
  printLine("Truthtensor DB", TRUTHTENSOR_DB);
  printLine("Concrete DB", CONCRETE_DB);
  printLine("Neura DB", NEURA_DB);
  printLine("Startale DB", STARTALE_DB);
  console.log("");
  console.log("  Auto-reload is enabled on file changes.");
  console.log("");
});
