import express from 'express';
import cors    from 'cors';
import { scrapeCategories, scrapeFacets } from './scraper.js';

const app  = express();
const PORT = 4000;

app.use(cors());

/* ---- category tree ---- */
app.get('/api/scrape', async (req, res) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).json({ error: 'Missing url param' });
  try {
    const data = await scrapeCategories(url);
    res.json({ ok: true, data });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* ---- facet groups for a given PLP ---- */
app.get('/api/facets', async (req, res) => {
  const plp = req.query.url as string;
  if (!plp) return res.status(400).json({ error: 'Missing url param' });
  try {
    const data = await scrapeFacets(plp);
    res.json({ ok: true, data });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, () => console.log(`Backend listening at http://localhost:${PORT}`));
