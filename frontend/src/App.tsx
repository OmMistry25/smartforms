import React, { useState } from 'react';

export default function App() {
  const [url, setUrl] = useState('');

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>Smart-Form Navigator</h1>

      <label>
        Home-page URL:&nbsp;
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://www.aeropostale.com/"
          style={{ width: 320 }}
        />
      </label>
    </div>
  );
}
