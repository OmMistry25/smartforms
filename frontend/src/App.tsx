import { useState, useEffect } from 'react';
import { CatNode, FacetGroup, FacetValue } from './types';
import { fetchTree, fetchFacets } from './api';

export default function App() {
  /* ----------------   state   ---------------- */
  const [url,  setUrl ] = useState('');
  const [tree,setTree] = useState<CatNode[]|null>(null);

  const [lvl1,setLvl1] = useState<number|null>(null);
  const [lvl2,setLvl2] = useState<number|null>(null);
  const [lvl3,setLvl3] = useState<number|null>(null);

  const [facets, setFacets]  = useState<FacetGroup[]|null>(null);
  const [selFacets,setSelFacets] = useState<Record<string,string[]>>({}); // key -> array of qs

  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');

  /* ----------------   helpers   ---------------- */
  const leafUrl = () => {
    if (lvl1===null) return '';
    if (lvl3!==null) return tree![lvl1].children![lvl2!].children![lvl3].url;
    if (lvl2!==null) return tree![lvl1].children![lvl2].url;
    return tree![lvl1].url;
  };

  /** build final destination URL with query params from selected facets */
  const buildDest = (): string => {
    const base = new URL(leafUrl());
    Object.values(selFacets).flat().forEach(qs => {
      const [k,v] = qs.split('=');
      base.searchParams.append(k,v);
    });
    return base.href;
  };

  /* ----------------   load category tree   ---------------- */
  const load = async () => {
    setLoading(true); setErr('');
    try {
      const data = await fetchTree(url);
      setTree(data);
      setLvl1(null); setLvl2(null); setLvl3(null);
      setFacets(null); setSelFacets({});
    } catch (e:any){ setErr(e.message); }
    setLoading(false);
  };

  /* ----------------   load facets when leaf changes   ---------------- */
  useEffect(() => {
    const go = async () => {
      const u = leafUrl();
      if (!u) { setFacets(null); return; }
      try {
        const data = await fetchFacets(u);
        setFacets(data);
        setSelFacets({});
      } catch { setFacets(null); }
    };
    go();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lvl1,lvl2,lvl3]);

  /** toggle a facet selection */
  const toggleFacet = (groupName:string,val:FacetValue, multi:boolean) => {
    setSelFacets(prev => {
      const arr = prev[groupName] || [];
      const exists = arr.includes(val.qs);
      if (multi) {
        return { ...prev,
                 [groupName]: exists ? arr.filter(q=>q!==val.qs) : [...arr,val.qs] };
      }
      // radio
      return { ...prev, [groupName]: exists ? [] : [val.qs] };
    });
  };

  /* ----------------   render   ---------------- */
  return (
    <main className="flex flex-col gap-6 p-8 font-sans max-w-xl mx-auto">

      <h1 className="text-3xl font-bold">Smart-Form Navigator</h1>

      {/* ---- URL input ---- */}
      <label className="flex gap-2">
        <input className="flex-1 border p-2 rounded"
               placeholder="https://www.aeropostale.com/"
               value={url}
               onChange={e=>setUrl(e.target.value)}/>
        <button className="px-4 py-2 bg-black text-white rounded"
                disabled={!url||loading}
                onClick={load}>
          {loading? 'Scraping…':'Generate'}
        </button>
      </label>
      {err && <p className="text-red-600">{err}</p>}

      {/* ---- Category dropdowns ---- */}
      {tree && (
        <section className="space-y-4">
          {/* level 1 */}
          <select className="w-full border p-2 rounded"
                  value={lvl1??''}
                  onChange={e=>{setLvl1(+e.target.value); setLvl2(null); setLvl3(null);}}>
            <option value="" disabled>Choose main category…</option>
            {tree.map((n,i)=><option key={i} value={i}>{n.label}</option>)}
          </select>

          {/* level 2 */}
          {lvl1!==null && tree[lvl1].children && (
            <select className="w-full border p-2 rounded"
                    value={lvl2??''}
                    onChange={e=>{setLvl2(+e.target.value); setLvl3(null);}}>
              <option value="" disabled>Sub-category…</option>
              {tree[lvl1].children!.map((n,i)=><option key={i} value={i}>{n.label}</option>)}
            </select>
          )}

          {/* level 3 */}
          {lvl1!==null && lvl2!==null &&
           tree[lvl1].children![lvl2].children && (
            <select className="w-full border p-2 rounded"
                    value={lvl3??''}
                    onChange={e=>setLvl3(+e.target.value)}>
              <option value="" disabled>Option…</option>
              {tree[lvl1].children![lvl2].children!.map((n,i)=>
                <option key={i} value={i}>{n.label}</option>)}
            </select>
          )}
        </section>
      )}

      {/* ---- Facet filters ---- */}
      {facets && facets.length>0 && (
        <section className="space-y-6">
          {facets.map(group=>(
            <div key={group.name} className="border rounded p-3">
              <h2 className="font-semibold mb-2">{group.name}</h2>
              <div className="flex flex-wrap gap-3">
                {group.values.map(v=>(
                  <label key={v.qs} className="flex items-center gap-1">
                    <input type={group.multi?'checkbox':'radio'}
                           checked={(selFacets[group.name]||[]).includes(v.qs)}
                           onChange={()=>toggleFacet(group.name,v,group.multi)}/>
                    <span>{v.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ---- Final preview + GO button ---- */}
      {leafUrl() && (
        <section className="space-y-2">
          <div className="text-sm break-all">
            <strong>Destination URL :</strong><br/>{buildDest()}
          </div>
          <button className="px-6 py-3 bg-green-600 text-white font-semibold rounded"
                  onClick={()=>window.open(buildDest(),'_blank')}>
            Shop Now
          </button>
        </section>
      )}

    </main>
  );
}
