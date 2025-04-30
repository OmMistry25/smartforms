import { chromium, Browser, ElementHandle, Page } from 'playwright';

/* ───────────── shared types ───────────── */
export interface CatNode {
  label: string;
  url: string;
  children?: CatNode[];
}
export interface FacetValue {
  label: string;
  qs: string;
}
export interface FacetGroup {
  name: string;
  multi: boolean;
  values: FacetValue[];
}

/* ───────────── pick best nav bar ───────────── */
async function bestNav(page: Page, home: string) {
  const host = new URL(home).host;
  const cands = await page.$$(
    'nav, header nav, nav[role="navigation"], header ul, div[class*=Header] nav'
  );
  let best: ElementHandle<Element> | null = null;
  let bestScore = -1;
  for (const el of cands) {
    const box = await el.boundingBox();
    if (box && box.height < 20) continue;
    const same = (await el.$$(':scope a')).filter(async a => {
      const h = await a.getAttribute('href');
      return h && new URL(h, home).host === host;
    }).length;
    if (same > bestScore) { best = el; bestScore = same; }
  }
  return bestScore >= 3 ? best : null;
}

/* ───────────── category scraper ───────────── */
export async function scrapeCategories(home: string): Promise<CatNode[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto(home, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(500);

  const nav = await bestNav(page, home);
  if (!nav) { await browser.close(); throw new Error('Navigation element not found'); }

  const topLinks = await nav.$$(':scope a');
  const tree: CatNode[] = [];

  for (const top of topLinks) {
    const topText = (await top.innerText()).trim();
    if (!topText || topText.length > 40) continue;

    const topHref = await top.getAttribute('href') ?? '/';
    try { await top.hover({ force: true }); } catch {}
    await page.waitForTimeout(400);

    let secondLevel: CatNode[] = [];

    /* check if a “mega” portal appeared */
    const mega = await page.$('[data-test*=mega],[class*=mega],[id*=mega]');
    if (mega) {
      const links = await mega.$$('a');
      const seen = new Set<string>();
      for (const a of links) {
        const txt = (await a.innerText()).trim();
        const href = await a.getAttribute('href');
        if (!txt || !href || seen.has(txt)) continue;
        seen.add(txt);
        secondLevel.push({ label: txt, url: new URL(href, home).href });
      }
    } else {
      /* fallback: nested <ul>/<div> */
      const subs = await top.$$(':scope ul a, :scope div a');
      for (const a of subs) {
        const txt = (await a.innerText()).trim();
        const href = await a.getAttribute('href') ?? topHref;
        if (txt) secondLevel.push({ label: txt, url: new URL(href, home).href });
      }
    }

    tree.push({
      label: topText,
      url: new URL(topHref, home).href,
      children: secondLevel.length ? secondLevel : undefined
    });
  }

  await browser.close();
  return tree;
}

/* ───────────── facet scraper (original) ───────────── */
async function getBrowser(): Promise<Browser> {
  if (!(global as any)._smBrowser)
    (global as any)._smBrowser = await chromium.launch({ headless: true });
  return (global as any)._smBrowser as Browser;
}
export async function scrapeFacets(plp: string): Promise<FacetGroup[]> {
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto(plp, { waitUntil: 'networkidle', timeout: 45_000 });
  const boxes = await page.$$('[data-testid*="filter"], [class*="filter"], aside');
  const groups: FacetGroup[] = [];

  for (const box of boxes) {
    const head = await box.$('h2,h3,span[class*=title],p[class*=title]');
    if (!head) continue;
    const name = (await head.innerText()).trim();
    if (!name) continue;

    const links = await box.$$(`a[href*="?"]`);
    const vals: FacetValue[] = [];
    for (const a of links) {
      const txt = (await a.innerText()).trim();
      const href = await a.getAttribute('href') ?? '';
      const qs = href.split('?')[1] || '';
      if (txt && qs) vals.push({ label: txt, qs });
    }
    if (vals.length) groups.push({ name, multi: false, values: vals });
  }
  await page.close();
  return groups;
}
