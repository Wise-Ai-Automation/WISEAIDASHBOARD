// Builds the app for web (live Supabase + Retell data) and serves it inside a phone frame.
//   npm run preview   →  http://localhost:4173/frame
// /api/mobile/* is proxied to API_TARGET (default: the web app on :3000, i.e. `npm run dev`
// in the project root; set API_TARGET=https://your-site to use the deployed one).
import { execSync } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const OUT = "preview-dist";
const PORT = Number(process.env.PORT ?? 4173);
const API_TARGET = (process.env.API_TARGET ?? "http://localhost:3000").replace(/\/$/, "");

if (!process.argv.includes("--no-build")) {
  execSync(`npx expo export --clear --platform web --output-dir ${OUT}`, {
    stdio: "inherit",
    env: { ...process.env, EXPO_PUBLIC_API_URL: `http://localhost:${PORT}` },
  });
}

const FRAME = `<!doctype html><html><head><meta charset="utf-8"><title>WISE AI — mobile preview</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  html,body{margin:0;height:100%;background:radial-gradient(1200px 600px at 50% -10%,#3b3a8f 0%,#14152b 55%,#0a0b16 100%);font-family:-apple-system,Inter,system-ui,sans-serif;color:#e7e8f5}
  .wrap{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px}
  .phone{position:relative;width:390px;height:844px;border-radius:56px;background:#05060d;padding:12px;box-shadow:0 0 0 2px #2b2d4a,0 40px 80px -20px rgba(0,0,0,.7)}
  .phone iframe{width:100%;height:100%;border:0;border-radius:44px;background:#fff}
  .island{position:absolute;top:22px;left:50%;transform:translateX(-50%);width:110px;height:30px;border-radius:20px;background:#000;z-index:2;pointer-events:none}
  .hint{font-size:13px;opacity:.75;text-align:center;line-height:1.6}
  code{background:rgba(255,255,255,.1);padding:2px 6px;border-radius:6px}
  @media (max-height:900px){.phone{transform:scale(.88);margin:-50px 0}}
</style></head><body><div class="wrap">
  <div class="phone"><div class="island"></div><iframe src="/" title="WISE AI app"></iframe></div>
  <div class="hint">Live data — sign in with your real WISE AI account.</div>
</div></body></html>`;

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".ttf": "font/ttf", ".ico": "image/x-icon", ".svg": "image/svg+xml", ".hbc": "application/octet-stream" };

createServer(async (req, res) => {
  const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
  if (url.startsWith("/api/mobile/")) {
    try {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const upstream = await fetch(API_TARGET + req.url, {
        method: req.method,
        headers: { authorization: req.headers.authorization ?? "", "content-type": "application/json" },
        body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks),
      });
      res.writeHead(upstream.status, { "content-type": "application/json" });
      return res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch {
      res.writeHead(502, { "content-type": "application/json" });
      return res.end(JSON.stringify({ error: `Can't reach the web backend at ${API_TARGET}. Is it running?` }));
    }
  }
  if (url === "/frame") {
    res.writeHead(200, { "content-type": "text/html" });
    return res.end(FRAME);
  }
  let file = normalize(join(OUT, url));
  if (!file.startsWith(OUT)) file = join(OUT, "index.html");
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(OUT, "index.html"); // SPA fallback
  res.writeHead(200, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    // Never let the browser keep an old bundle after a rebuild.
    "cache-control": file.endsWith("index.html") ? "no-store" : "no-cache",
  });
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`\nPreview ready → http://localhost:${PORT}/frame\n`));
