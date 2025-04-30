import React, { useState } from 'react';
import { CatNode } from './types';

export default function App() {
  const [url, setUrl] = useState('');
  const [tree, setTree] = useState<CatNode[] | null>(null);
  const [err, setErr]   = useState('');
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!url) return;
    setLoading(true);
    setErr('');
    try {
      const res = await fetch(
        `/api/scrape?url=${encodeURIComponent(url)}`
      );
      const { ok, data, error } = await res.json();
      if (!ok) throw new Error(error);
      setTree(data);
    } catch (e: any) {
      setErr(e.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif', maxWidth: 640 }}>
      <h1 style={{ marginBottom: 20 }}>Smart-Form Navigator</h1>

      {/* URL entry */}
      <label style={{ display: 'block', marginBottom: 10 }}>
        Home-page URL:&nbsp;
        <input
          style={{ width: '100%' }}
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://www.aeropostale.com/"
        />
      </label>

      <button onClick={generate} disabled={!url || loading}>
        {loading ? 'Scraping…' : 'Generate'}
      </button>

      {err && <p style={{ color: 'red', marginTop: 10 }}>{err}</p>}

      {/* Quick proof it worked */}
      {tree && (
        <pre
          style={{
            background: '#f0f0f0',
            padding: 10,
            whiteSpace: 'pre-wrap',
            marginTop: 20,
          }}
        >
          {JSON.stringify(tree, null, 2)}
        </pre>
      )}
    </div>
  );
}
