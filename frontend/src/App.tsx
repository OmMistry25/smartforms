import React, { useState } from 'react';
import type { CatNode } from './types';

/* ------------------------- UI component ------------------------- */
export default function App() {
  const [url, setUrl]       = useState('');
  const [loading, setLoad ] = useState(false);
  const [error, setError ]  = useState('');
  const [tree,  setTree  ]  = useState<CatNode[] | null>(null);

  /* --- call backend /api/scrape --- */
  async function generate() {
    if (!url) return;
    setLoad(true);  setError('');  setTree(null);
    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setTree(data.data);
    } catch (err:any) {
      setError(err.message || 'Unknown error');
    }
    setLoad(false);
  }

  return (
    <div style={{
      maxWidth: 700, margin: '0 auto', padding: 24, fontFamily: 'sans-serif'
    }}>
      <h1 style={{ marginBottom: 20 }}>Smart-Form Navigator</h1>

      <label style={{ display:'block', marginBottom:12 }}>
        Home-page URL:
        <input
          style={{ width:'100%', padding:8, marginTop:4 }}
          placeholder="https://www.gap.com/"
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
      </label>

      <button
        onClick={generate}
        disabled={!url || loading}
        style={{
          padding:'8px 20px', background:'#1e64f0', color:'#fff',
          border:'none', borderRadius:4, cursor:'pointer'
        }}
      >
        {loading ? 'Scraping…' : 'Generate'}
      </button>

      {error && <p style={{ color:'red', marginTop:12 }}>{error}</p>}

      {tree && (
        <pre style={{
          background:'#f4f4f4', padding:16, marginTop:20,
          whiteSpace:'pre-wrap', borderRadius:4
        }}>
{JSON.stringify(tree, null, 2)}
        </pre>
      )}
    </div>
  );
}
