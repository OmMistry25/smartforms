import { chromium, Browser, ElementHandle } from 'playwright';

/* ----------  Shared types ---------- */
export interface CatNode {
  label: string;
  url: string;
  children?: CatNode[];
}

export interface FacetValue {
  label: string;
  qs: string;                // e.g. "size=L"
}

export interface FacetGroup {
  name: string;              // e.g. "Size"
  multi: boolean;            // true = checkbox list ; false = radio list
  values: FacetValue[];
}

/* ----------  Category scraper ---------- */
export async function scrapeCategories(homeUrl: string): Promise<CatNode[]> {
  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto(homeUrl, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.evaluate(() => window.scrollTo(0, 400)); // trigger sticky headers
  await page.waitForTimeout(500);

  /* -------- locate the best nav element -------- */
  const candidates = await page.$$(
    'nav, header nav, nav[role="navigation"], header ul, div[class*=Header] nav'
  );

  let nav: ElementHandle<Element> | null = null;
  let bestScore = -1;
  const siteHost = new URL(homeUrl).host;

  for (const el of candidates) {
    // ignore ultra-thin bars (likely brand switchers)
    const box = await el.boundingBox();
    if (box && box.height < 20) continue;

    const anchors = await el.$$(':scope a');
    let sameHost = 0;
    for (const a of anchors) {
      const href = await a.getAttribute('href');
      if (!href) continue;
      if (new URL(href, homeUrl).host === siteHost) sameHost++;
    }
    if (sameHost > bestScore) {
      bestScore = sameHost;
      nav = el;
    }
  }

  if (!nav || bestScore < 3) {
    await browser.close();
    throw new Error('Navigation element not found');
  }

  /* -------- extract hierarchy -------- */
  const mainLinks = await nav.$$(':scope a');
  const tree: CatNode[] = [];

  for (const link of mainLinks) {
    const mainText = (await link.innerText()).trim();
    if (mainText.length < 2 || mainText.length > 40) continue;

    const mainHref = await link.getAttribute('href') ?? '/';
    try { await link.hover({ force: true }); } catch {}
    await page.waitForTimeout(300);

    /* second level */
    const subLinks = await link.$$(':scope ul a');   // any <a> inside descendant <ul>
    const subNodes: CatNode[] = [];

    for (const s of subLinks) {
      const subText = (await s.innerText()).trim();
      if (subText.length < 2 || subText.length > 60) continue;

      const subHref = await s.getAttribute('href') ?? mainHref;
      try { await s.hover({ force: true }); } catch {}
      await page.waitForTimeout(200);

      /* third level */
      const leafLinks = await s.$$(':scope ul a');
      const leafNodes: CatNode[] = [];
      for (const t of leafLinks) {
        const txt = (await t.innerText()).trim();
        if (txt.length < 2 || txt.length > 60) continue;
        const href = await t.getAttribute('href') ?? subHref;
        leafNodes.push({ label: txt, url: new URL(href, homeUrl).href });
      }

      subNodes.push({
        label   : subText,
        url     : new URL(subHref, homeUrl).href,
        children: leafNodes.length ? leafNodes : undefined
      });
    }

    tree.push({
      label   : mainText,
      url     : new URL(mainHref, homeUrl).href,
      children: subNodes.length ? subNodes : undefined
    });
  }

  await browser.close();
  return tree;
}

/* ----------  Facet scraper (unchanged) ---------- */
async function getBrowser(): Promise<Browser> {
  if (!(global as any)._smBrowser) {
    (global as any)._smBrowser = await chromium.launch({ headless: true });
  }
  return (global as any)._smBrowser as Browser;
}

export async function scrapeFacets(plpUrl: string): Promise<FacetGroup[]> {
  const browser = await getBrowser();
  const page    = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto(plpUrl, { waitUntil: 'networkidle', timeout: 45_000 });

  const containers = await page.$$('[data-testid*="filter"], [class*="filter"], aside');
  const groups: FacetGroup[] = [];

  for (const box of containers) {
    const heading = await box.$('h2, h3, span[class*=title], p[class*=title]');
    if (!heading) continue;
    const name = (await heading.innerText()).trim();
    if (!name || name.length > 40) continue;

    const inputs = await box.$$(`input[type=checkbox], input[type=radio]`);
    const links  = await box.$$(`a[href*="?"]`);
    const values: FacetValue[] = [];

    if (inputs.length) {
      for (const inp of inputs) {
        const id = await inp.getAttribute('id');
        const labelEl = id ? await page.$(`label[for="${id}"]`) : null;
        const text = (labelEl ? await labelEl.innerText() : '').trim() ||
                     (await inp.getAttribute('value')) || '';
        const href = await inp.getAttribute('data-href') || '';
        const qs   = href.split('?')[1] || '';
        if (text && qs) values.push({ label: text, qs });
      }
    } else if (links.length) {
      for (const a of links) {
        const text = (await a.innerText()).trim();
        const href = await a.getAttribute('href') ?? '';
        const qs   = href.split('?')[1] || '';
        if (text && qs) values.push({ label: text, qs });
      }
    }

    if (values.length) {
      const isMulti = (await box.$$('input[type=checkbox]')).length > 0;
      groups.push({ name, multi: isMulti, values });
    }
  }

  await page.close();
  return groups;
}
