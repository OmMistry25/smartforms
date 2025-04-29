import { CatNode, FacetGroup } from './types';

const BASE = 'http://localhost:4000';

export async function fetchTree(url: string): Promise<CatNode[]> {
  const r = await fetch(`${BASE}/api/scrape?url=${encodeURIComponent(url)}`);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error);
  return j.data;
}

export async function fetchFacets(plpUrl: string): Promise<FacetGroup[]> {
  const r = await fetch(`${BASE}/api/facets?url=${encodeURIComponent(plpUrl)}`);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error);
  return j.data;
}
