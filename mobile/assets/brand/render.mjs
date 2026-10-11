// Renders the brand SVGs to the PNGs Expo expects. Run: node assets/brand/render.mjs
// (needs puppeteer-core + a local Chrome; PUPPETEER_EXECUTABLE_PATH overrides the path)
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const puppeteer = (await import(process.env.PUPPETEER_MODULE ?? "puppeteer-core")).default;
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..");
const jobs = [
  ["icon.svg", "icon.png", 1024, false],
  ["android-foreground.svg", "android-icon-foreground.png", 1024, true],
  ["android-background.svg", "android-icon-background.png", 1024, false],
  ["android-monochrome.svg", "android-icon-monochrome.png", 1024, true],
  ["splash-icon.svg", "splash-icon.png", 1024, true],
  ["icon.svg", "favicon.png", 96, false],
];
const b = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
});
for (const [src, dst, size, transparent] of jobs) {
  const p = await b.newPage();
  await p.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  const svg = readFileSync(join(here, src), "utf8").replace(/width="1024" height="1024"/, `width="${size}" height="${size}"`);
  await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await p.screenshot({ path: join(out, dst), omitBackground: transparent });
  await p.close();
  console.log("wrote", dst);
}
await b.close();
