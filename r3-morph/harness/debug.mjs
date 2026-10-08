// quick page probe: load the film, print console/page errors, the font report and per-time render cost
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import puppeteer from 'puppeteer-core';
const ROOT = path.resolve('.'); const PAGE = '/film/index.html';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const srv = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => srv.listen(0, r));
const b = await puppeteer.launch({ executablePath: process.env.MG_CHROME, headless: true, args: ['--no-sandbox'] });
const pg = await b.newPage(); await pg.setViewport({ width: 1920, height: 1080 });
pg.on('console', (m) => console.log('[console]', m.type(), m.text())); pg.on('pageerror', (e) => console.log('[pageerror]', e.message));
const t0 = Date.now();
await pg.goto(`http://127.0.0.1:${srv.address().port}${PAGE}`);
try {
  await pg.waitForFunction('window.__ready === true', { timeout: 90000 }); console.log('ready in', Date.now() - t0, 'ms');
  console.log(JSON.stringify(await pg.evaluate(() => window.__fontReport)));
  for (const t of process.argv.slice(2).map(Number)) { const a = Date.now(); await pg.evaluate((t) => window.renderAt(t), t); console.log('t', t, Date.now() - a, 'ms'); }
} catch (e) { console.log('ERR', e.message); }
await b.close(); srv.close();
