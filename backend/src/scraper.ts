import { chromium, Browser } from 'playwright';

/** ----------  Shared types  ---------- **/
export interface CatNode {
  label : string;
  url   : string;
  children?: CatNode[];
}

export interface FacetValue {
  label : string;
  qs    : string;              // e.g.  "size=L"  or  "Colour=Black"
}
export interface FacetGroup {
  name   : string;             // e.g.  "Size"
  multi  : boolean;            // true  = check-boxes ; false = radio buttons
  values : FacetValue[];
}

/** ----------  Category scraper  ---------- **/
export async function scrapeCategories(homeUrl: string): Promise<CatNode[]> {
  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto(homeUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });

  const nav = await page.$('nav') ?? await page.$('header ul');
  if (!nav) { await browser.close(); throw new Error('Navigation element not found'); }

  const mainLinks = await nav.$$(':scope a');
  const tree: CatNode[] = [];

  for (const link of mainLinks) {
    const mainText = (await link.innerText()).trim();
    if (mainText.length < 2 || mainText.length > 40) continue;

    const mainHref = await link.getAttribute('href') ?? '/';
    try { await link.hover({ force: true }); } catch {}

    await page.waitForTimeout(300);

    const subLinks = await link.$$(':scope + ul a, :scope >> .. ul a');
    const subNodes: CatNode[] = [];

    for (const s of subLinks) {
      const subText = (await s.innerText()).trim();
      if (subText.length < 2 || subText.length > 60) continue;

      const subHref = await s.getAttribute('href') ?? mainHref;
      try { await s.hover({ force: true }); } catch {}
      await page.waitForTimeout(200);

      const leafLinks = await s.$$(':scope + ul a, :scope >> .. ul a');
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

/** ----------  Facet scraper  ---------- **/
async function getBrowser(): Promise<Browser> {
  // simple singleton to avoid spawning chromium for every request
  if (!(global as any)._smBrowser) {
    (global as any)._smBrowser = await chromium.launch({ headless: true });
  }
  return (global as any)._smBrowser as Browser;
}

/**
 * Extracts filter facets from a product-listing page.
 * Heuristic: find any  <section|div>  with data-testid or class containing "filter".
 */
export async function scrapeFacets(plpUrl: string): Promise<FacetGroup[]> {
  const browser = await getBrowser();
  const page    = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto(plpUrl, { waitUntil: 'networkidle', timeout: 45_000 });

  /* Strategy 1 – DOM search */
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
