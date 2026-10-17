import { chromium } from 'playwright';
import fs from 'fs';
const jobs = JSON.parse(fs.readFileSync('urls.json', 'utf8'));
fs.mkdirSync('shots', { recursive: true });
const browser = await chromium.launch();
for (const j of jobs) {
  try {
    const ctx = await browser.newContext({
      viewport: { width: j.w || 1440, height: j.h || 900 },
      deviceScaleFactor: j.dpr || 2,
      isMobile: !!j.mobile, hasTouch: !!j.mobile,
      userAgent: j.mobile ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' : undefined,
      reducedMotion: 'no-preference'
    });
    const page = await ctx.newPage();
    await page.goto(j.url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(j.wait || 3000);
    // trigger lazy content / scroll animations
    if (j.full || j.scroll) {
      const H = await page.evaluate(() => document.body.scrollHeight);
      for (let y = 0; y < H; y += 500) { await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(250); }
      await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(800);
    }
    for (const c of (j.clicks || [])) { try { await page.click(c, { timeout: 4000 }); await page.waitForTimeout(1500); } catch (e) { console.log('click fail', c); } }
    if (j.scrollTo) { await page.evaluate(v => window.scrollTo(0, v), j.scrollTo); await page.waitForTimeout(1200); }
    if (j.css) await page.addStyleTag({ content: j.css });
    await page.screenshot({ path: `shots/${j.name}.png`, fullPage: !!j.full });
    console.log('ok', j.name);
    await ctx.close();
  } catch (e) { console.log('fail', j.name, e.message); }
}
await browser.close();
