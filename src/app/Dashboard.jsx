"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Bar, ComposedChart, Cell, BarChart
} from "recharts";

const CH_META = [
  { key: "substack", name: "Substack", icon: "✉️", color: "#FF6719", dbCol: "substack" },
  { key: "youtube", name: "YouTube", icon: "▶️", color: "#FF0000", dbCol: "youtube" },
  { key: "tiktok", name: "TikTok", icon: "♪", color: "#00F2EA", dbCol: "tiktok" },
  { key: "instagram", name: "Instagram", icon: "📷", color: "#E1306C", dbCol: "instagram" },
  { key: "x", name: "X / Twitter", icon: "𝕏", color: "#A1A1AA", dbCol: "x_twitter" },
  { key: "linkedin", name: "LinkedIn", icon: "in", color: "#0A66C2", dbCol: "linkedin" },
  { key: "spotify", name: "Spotify Pods", icon: "🎵", color: "#1DB954", dbCol: "spotify" },
  { key: "apple", name: "Apple Pods", icon: "🎧", color: "#A855F7", dbCol: "apple_pods" },
];

const STREAMS = [
  { key: "rev_youtube", label: "YouTube", color: "#FF0000", chartKey: "youtube" },
  { key: "rev_gumroad_substack", label: "Gumroad + Substack", color: "#FF6719", chartKey: "gumroad_substack" },
  { key: "rev_sponsors", label: "Sponsors", color: "#D4A843", chartKey: "sponsors" },
  { key: "rev_spotify", label: "Spotify", color: "#1DB954", chartKey: "spotify" },
  { key: "rev_events", label: "Events", color: "#818CF8", chartKey: "events" },
];

function fmt(n) { if(n==null)return"—";n=Number(n);if(n>=1e6)return"$"+(n/1e6).toFixed(1)+"M";if(n>=1000)return"$"+(n/1000).toFixed(1)+"K";return"$"+Math.round(n); }
function fmtK(n) { if(!n)return"—";n=Number(n);if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1000)return(n/1000).toFixed(1)+"K";return n.toString(); }
function fmtMonth(m) { if(!m)return"—";const[y,mo]=m.split("-");const ms=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];return ms[parseInt(mo)-1]+" "+y.slice(2); }
const pct=(a,b)=>b?((a-b)/b*100).toFixed(1):"—";

const TT=({active,payload,label})=>{if(!active||!payload?.length)return null;return(<div style={{background:"rgba(8,10,15,0.96)",border:"1px solid rgba(34,197,94,0.25)",borderRadius:8,padding:"10px 14px",fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}><p style={{color:"#22C55E",marginBottom:6,fontWeight:600,fontSize:12}}>{label}</p>{payload.map((p,i)=>(<p key={i} style={{color:p.color||"#A1A1AA",margin:"2px 0"}}>{p.name}: <span style={{fontWeight:700}}>{p.dataKey==="margin"?p.value+"%":fmt(p.value)}</span></p>))}</div>);};

export default function GrowthDashboard() {
  const [view, setView] = useState("followers");
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminPass, setAdminPass] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const now = new Date();
  const defaultMonth = now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
  const [formMonth, setFormMonth] = useState(defaultMonth);
  const [formData, setFormData] = useState({ substack:"",youtube:"",tiktok:"",instagram:"",x_twitter:"",linkedin:"",spotify:"",apple_pods:"",rev_youtube:"",rev_gumroad_substack:"",rev_sponsors:"",rev_spotify:"",rev_events:"",rev_total:"",expenses:"" });

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("growth_snapshots").select("*").order("month", { ascending: true });
    if (!error && data) setSnapshots(data);
    setLoading(false);
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const revenueData = useMemo(() => snapshots.filter(s => Number(s.rev_total) > 0).map(s => ({
    month: fmtMonth(s.month), youtube: Number(s.rev_youtube)||0, gumroad_substack: Number(s.rev_gumroad_substack)||0,
    sponsors: Number(s.rev_sponsors)||0, spotify: Number(s.rev_spotify)||0, events: Number(s.rev_events)||0,
    total: Number(s.rev_total)||0, expenses: Number(s.expenses)||0,
  })), [snapshots]);

  const profitData = useMemo(() => revenueData.map(d => ({ ...d, profit: d.total-d.expenses, margin: d.total>0?parseFloat(((d.total-d.expenses)/d.total*100).toFixed(0)):0 })), [revenueData]);
  const followerSnapshots = useMemo(() => snapshots.filter(s => CH_META.some(c => Number(s[c.dbCol]) > 0)), [snapshots]);

  const latest = revenueData[revenueData.length - 1] || {};
  const latestFollowers = followerSnapshots[followerSnapshots.length - 1] || {};
  const prevFollowers = followerSnapshots.length > 1 ? followerSnapshots[followerSnapshots.length - 2] : null;
  const knownFollowers = CH_META.reduce((s, c) => s + (Number(latestFollowers[c.dbCol]) || 0), 0);
  const knownChannels = CH_META.filter(c => Number(latestFollowers[c.dbCol]) > 0).length;
  const revPer1K = knownFollowers > 0 && latest.total ? (latest.total / (knownFollowers / 1000)).toFixed(2) : "—";

  const growthData = useMemo(() => {
    if (!prevFollowers) return null;
    const channels = CH_META.map(c => { const curr=Number(latestFollowers[c.dbCol])||0; const prev=Number(prevFollowers[c.dbCol])||0; return { ...c, curr, prev, delta: curr-prev, pctChange: prev>0?((curr-prev)/prev*100).toFixed(1):"—" }; });
    const totalCurr = channels.reduce((s,c) => s+c.curr, 0);
    const totalPrev = channels.reduce((s,c) => s+c.prev, 0);
    const totalDelta = totalCurr - totalPrev;
    const revSnaps = snapshots.filter(s => Number(s.rev_total) > 0);
    const lr = revSnaps[revSnaps.length-1]; const pr = revSnaps.length>1?revSnaps[revSnaps.length-2]:null;
    let marginalRevPer1K = "—";
    if (pr && totalDelta > 0) marginalRevPer1K = ((Number(lr.rev_total)-Number(pr.rev_total))/(totalDelta/1000)).toFixed(2);
    return { channels, totalCurr, totalPrev, totalDelta, marginalRevPer1K, fromMonth: fmtMonth(prevFollowers.month), toMonth: fmtMonth(latestFollowers.month) };
  }, [prevFollowers, latestFollowers, snapshots]);

  useEffect(() => {
    const existing = snapshots.find(s => s.month === formMonth);
    if (existing) { const fd = {}; Object.keys(formData).forEach(k => { fd[k] = existing[k] || ""; }); setFormData(fd); }
    else { setFormData({ substack:"",youtube:"",tiktok:"",instagram:"",x_twitter:"",linkedin:"",spotify:"",apple_pods:"",rev_youtube:"",rev_gumroad_substack:"",rev_sponsors:"",rev_spotify:"",rev_events:"",rev_total:"",expenses:"" }); }
  }, [formMonth, snapshots]);

  const handleSave = async () => {
    setSaving(true); setSaveMsg("");
    const row = { month: formMonth };
    Object.keys(formData).forEach(k => { row[k] = formData[k]===""?0:Number(formData[k]); });
    row.rev_total = row.rev_total || (row.rev_youtube+row.rev_gumroad_substack+row.rev_sponsors+row.rev_spotify+row.rev_events);
    row.updated_at = new Date().toISOString();
    const { error } = await supabase.from("growth_snapshots").upsert(row, { onConflict: "month" });
    if (error) setSaveMsg("Error: "+error.message);
    else { setSaveMsg("✓ Saved "+fmtMonth(formMonth)); await loadData(); }
    setSaving(false);
  };

  const iS = { background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:6,padding:"8px 10px",color:"#E4E4E7",fontSize:13,fontFamily:"'JetBrains Mono',monospace",width:"100%",outline:"none" };

  if (loading) return (<div style={{minHeight:"100vh",background:"#0A0A0F",display:"flex",alignItems:"center",justifyContent:"center",color:"#22C55E",fontFamily:"'JetBrains Mono',monospace"}}>Loading growth data...</div>);

  return (
    <div style={{ minHeight:"100vh",background:"#0A0A0F",color:"#E4E4E7",fontFamily:"'JetBrains Mono',ui-monospace,monospace" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      {/* HEADER */}
      <div style={{background:"linear-gradient(180deg,rgba(15,15,22,1) 0%,#0A0A0F 100%)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"14px 24px"}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <img src="https://10ampro-hub.vercel.app/logo.jpg" alt="10AMPRO" style={{width:48,height:48,borderRadius:"50%",objectFit:"cover",border:"2px solid rgba(212,168,67,0.25)",boxShadow:"0 0 24px rgba(34,197,94,0.08)"}} />
            <div>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,letterSpacing:"-0.02em"}}><span style={{color:"#D4A843"}}>10</span><span style={{color:"#22C55E"}}>AM</span><span style={{color:"#52525B"}}>PRO</span></div>
              <div style={{fontSize:9,color:"#3F3F46",letterSpacing:"0.18em",textTransform:"uppercase",marginTop:-1}}>Growth Intelligence</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <a href="https://10am.substack.com" target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:"#52525B",textDecoration:"none",borderBottom:"1px dotted #3F3F46"}}>10am.pro</a>
            <a href="https://x.com/holdmybirra" target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:"#52525B",textDecoration:"none",borderBottom:"1px dotted #3F3F46"}}>@holdmybirra</a>
            <span style={{background:"rgba(34,197,94,0.12)",color:"#22C55E",padding:"3px 10px",borderRadius:4,fontSize:9,fontWeight:700,letterSpacing:"0.1em"}}>LIVE</span>
          </div>
        </div>
      </div>

      <div style={{maxWidth:1200,margin:"0 auto",padding:"24px 24px 40px"}}>
        {/* CORE METRIC */}
        <div style={{background:"linear-gradient(135deg,rgba(34,197,94,0.04),rgba(212,168,67,0.04))",border:"1px solid rgba(34,197,94,0.12)",borderRadius:12,padding:"20px 24px",marginBottom:24,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
          <div>
            <div style={{fontSize:9,color:"#52525B",textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:6}}>Core Metric — Revenue per 1,000 Followers ({knownChannels}/8 channels)</div>
            <div style={{fontFamily:"'Space Grotesk'",fontSize:42,fontWeight:700,color:"#22C55E"}}>${revPer1K}</div>
            <div style={{fontSize:11,color:"#71717A",marginTop:4}}>Based on {fmtK(knownFollowers)} followers across {knownChannels} channels</div>
          </div>
          <div style={{display:"flex",gap:20,alignItems:"center"}}>
            <div style={{textAlign:"center"}}><div style={{fontSize:9,color:"#52525B",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Audience</div><div style={{fontSize:22,fontWeight:700,color:"#D4A843",fontFamily:"'Space Grotesk'"}}>{fmtK(knownFollowers)}</div></div>
            <div style={{width:1,height:40,background:"rgba(255,255,255,0.06)"}} />
            <div style={{textAlign:"center"}}><div style={{fontSize:9,color:"#52525B",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Latest Rev</div><div style={{fontSize:22,fontWeight:700,color:"#22C55E",fontFamily:"'Space Grotesk'"}}>{fmt(latest.total)}</div></div>
            <div style={{width:1,height:40,background:"rgba(255,255,255,0.06)"}} />
            <div style={{textAlign:"center"}}><div style={{fontSize:9,color:"#52525B",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Snapshots</div><div style={{fontSize:22,fontWeight:700,color:"#818CF8",fontFamily:"'Space Grotesk'"}}>{followerSnapshots.length}</div></div>
          </div>
        </div>

        {/* TABS */}
        <div style={{display:"flex",gap:4,marginBottom:20,flexWrap:"wrap"}}>
          {[{key:"followers",label:"📈 Followers"},{key:"velocity",label:"🚀 Growth Velocity"},{key:"revenue",label:"💰 Revenue"},{key:"profit",label:"📊 Profit & Margin"},{key:"model",label:"🎯 Revenue Model"},{key:"admin",label:"⚙️ Update Data"}].map(t=>(
            <button key={t.key} onClick={()=>setView(t.key)} style={{background:view===t.key?"rgba(34,197,94,0.1)":"transparent",border:view===t.key?"1px solid rgba(34,197,94,0.25)":"1px solid rgba(255,255,255,0.04)",color:view===t.key?"#22C55E":"#52525B",padding:"7px 16px",borderRadius:6,fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:view===t.key?600:400}}>{t.label}</button>
          ))}
        </div>

        {/* FOLLOWERS */}
        {view==="followers"&&(<div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:12,padding:"24px"}}>
          <div style={{fontSize:11,color:"#52525B",marginBottom:20,textTransform:"uppercase",letterSpacing:"0.1em"}}>Latest: {fmtMonth(latestFollowers.month)} — {knownChannels}/8 Captured</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
            {CH_META.map(ch=>{const val=Number(latestFollowers[ch.dbCol])||0;const pv=prevFollowers?Number(prevFollowers[ch.dbCol])||0:0;const d=prevFollowers?val-pv:0;return(
              <div key={ch.key} style={{background:val>0?"rgba(255,255,255,0.025)":"rgba(255,255,255,0.01)",border:val>0?`1px solid ${ch.color}25`:"1px solid rgba(255,255,255,0.04)",borderRadius:8,padding:"14px 16px",position:"relative",overflow:"hidden"}}>
                {val>0&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${ch.color}80,transparent)`}}/>}
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{fontSize:16}}>{ch.key==="linkedin"?<span style={{fontWeight:800,color:ch.color,fontSize:13}}>in</span>:ch.icon}</span>
                  <span style={{fontSize:11,color:"#A1A1AA",fontWeight:500}}>{ch.name}</span>
                  <span style={{fontSize:7,marginLeft:"auto",fontWeight:700,letterSpacing:"0.08em",padding:"1px 5px",borderRadius:3,color:val>0?"#22C55E":"#F59E0B",background:val>0?"rgba(34,197,94,0.1)":"rgba(245,158,11,0.1)"}}>{val>0?"✓ CAPTURED":"NEEDS INPUT"}</span>
                </div>
                <div style={{fontSize:24,fontWeight:700,color:val>0?ch.color:"#3F3F46",fontFamily:"'Space Grotesk'"}}>{val>0?fmtK(val):"—"}</div>
                {d!==0&&<div style={{fontSize:10,color:d>0?"#22C55E":"#EF4444",marginTop:4}}>{d>0?"+":""}{fmtK(d)} ({pct(val,pv)}%)</div>}
              </div>
            );})}
          </div>
        </div>)}

        {/* GROWTH VELOCITY */}
        {view==="velocity"&&(<div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:12,padding:"24px"}}>
          {!growthData?(<div style={{textAlign:"center",padding:40}}>
            <div style={{fontSize:36,marginBottom:12}}>📊</div>
            <div style={{fontSize:14,color:"#A1A1AA",marginBottom:8}}>Need 2+ monthly snapshots to compute velocity</div>
            <div style={{fontSize:11,color:"#52525B"}}>Current: {followerSnapshots.length} snapshot. Add next month in ⚙️ Update Data.</div>
          </div>):(
          <>
            <div style={{fontSize:11,color:"#52525B",marginBottom:20,textTransform:"uppercase",letterSpacing:"0.1em"}}>Growth: {growthData.fromMonth} → {growthData.toMonth}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
              <div style={{background:"rgba(34,197,94,0.04)",border:"1px solid rgba(34,197,94,0.15)",borderRadius:8,padding:16}}>
                <div style={{fontSize:9,color:"#52525B",textTransform:"uppercase",marginBottom:6}}>Net New Followers</div>
                <div style={{fontSize:28,fontWeight:700,color:growthData.totalDelta>=0?"#22C55E":"#EF4444",fontFamily:"'Space Grotesk'"}}>{growthData.totalDelta>=0?"+":""}{fmtK(growthData.totalDelta)}</div>
                <div style={{fontSize:10,color:"#71717A"}}>{fmtK(growthData.totalPrev)} → {fmtK(growthData.totalCurr)}</div>
              </div>
              <div style={{background:"rgba(212,168,67,0.04)",border:"1px solid rgba(212,168,67,0.15)",borderRadius:8,padding:16}}>
                <div style={{fontSize:9,color:"#52525B",textTransform:"uppercase",marginBottom:6}}>Blended Rev/1K</div>
                <div style={{fontSize:28,fontWeight:700,color:"#D4A843",fontFamily:"'Space Grotesk'"}}>${revPer1K}</div>
                <div style={{fontSize:10,color:"#71717A"}}>Total rev ÷ total followers</div>
              </div>
              <div style={{background:"rgba(129,140,248,0.04)",border:"1px solid rgba(129,140,248,0.15)",borderRadius:8,padding:16}}>
                <div style={{fontSize:9,color:"#52525B",textTransform:"uppercase",marginBottom:6}}>Marginal Rev/1K</div>
                <div style={{fontSize:28,fontWeight:700,color:"#818CF8",fontFamily:"'Space Grotesk'"}}>{growthData.marginalRevPer1K!=="—"?"$"+growthData.marginalRevPer1K:"—"}</div>
                <div style={{fontSize:10,color:"#71717A"}}>Δ revenue ÷ Δ followers</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {growthData.channels.map(ch=>(<div key={ch.key} style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${ch.color}20`,borderRadius:8,padding:"12px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <span style={{fontSize:11,color:ch.color,fontWeight:600}}>{ch.name}</span>
                  <span style={{fontSize:10,color:ch.delta>0?"#22C55E":ch.delta<0?"#EF4444":"#52525B",fontWeight:600}}>{ch.delta>0?"+":""}{fmtK(ch.delta)}</span>
                </div>
                <div style={{fontSize:18,fontWeight:700,color:"#E4E4E7",fontFamily:"'Space Grotesk'"}}>{fmtK(ch.curr)}</div>
                <div style={{fontSize:9,color:"#52525B",marginTop:4}}>{ch.pctChange!=="—"?(ch.delta>=0?"+":"")+ch.pctChange+"%":"No prior"}</div>
              </div>))}
            </div>
            <div style={{marginTop:20,background:"rgba(129,140,248,0.06)",border:"1px solid rgba(129,140,248,0.15)",borderRadius:8,padding:"14px 18px"}}>
              <div style={{fontSize:12,color:"#818CF8",fontWeight:600,marginBottom:6}}>📐 What these numbers mean</div>
              <div style={{fontSize:11,color:"#A1A1AA",lineHeight:1.7}}>
                <strong style={{color:"#D4A843"}}>Blended ${revPer1K}/1K</strong> = avg monetization. Rising = better conversion.<br/>
                <strong style={{color:"#818CF8"}}>Marginal {growthData.marginalRevPer1K!=="—"?"$"+growthData.marginalRevPer1K+"/1K":"—"}</strong> = value of <em>new</em> followers. Marginal {">"} blended = higher quality growth.<br/>
                <strong style={{color:"#22C55E"}}>Per-channel growth</strong> = Substack growth {">"} TikTok = funnel converting. Reverse = awareness outpacing monetization.
              </div>
            </div>
          </>)}
        </div>)}

        {/* REVENUE */}
        {view==="revenue"&&revenueData.length>0&&(<div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:12,padding:"20px 16px 10px",marginBottom:20}}>
          <div style={{fontSize:11,color:"#52525B",marginBottom:14,paddingLeft:8}}>Monthly Revenue — Stacked</div>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={revenueData} margin={{top:5,right:20,bottom:5,left:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="month" tick={{fontSize:9,fill:"#3F3F46"}} tickLine={false} axisLine={{stroke:"#1A1A2E"}} />
              <YAxis tick={{fontSize:10,fill:"#3F3F46"}} tickLine={false} axisLine={false} tickFormatter={v=>fmt(v)} />
              <Tooltip content={<TT />} />
              <Bar dataKey="youtube" stackId="a" fill="#FF0000" name="YouTube" />
              <Bar dataKey="gumroad_substack" stackId="a" fill="#FF6719" name="Gumroad + Substack" />
              <Bar dataKey="sponsors" stackId="a" fill="#D4A843" name="Sponsors" />
              <Bar dataKey="spotify" stackId="a" fill="#1DB954" name="Spotify" />
              <Bar dataKey="events" stackId="a" fill="#818CF8" name="Events" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginTop:16,padding:"0 8px"}}>
            {STREAMS.map(s=>{const val=latest[s.chartKey]||0;const share=latest.total>0?(val/latest.total*100).toFixed(0):0;return(
              <div key={s.key} style={{background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:8,padding:"10px 12px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:10,color:s.color,fontWeight:600}}>{s.label}</span><span style={{fontSize:9,color:"#3F3F46"}}>{share}%</span></div>
                <div style={{fontSize:16,fontWeight:700,color:"#E4E4E7",fontFamily:"'Space Grotesk'"}}>{fmt(val)}</div>
              </div>);})}
          </div>
        </div>)}

        {/* PROFIT */}
        {view==="profit"&&profitData.length>0&&(<div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:12,padding:"20px 16px 10px"}}>
          <div style={{fontSize:11,color:"#52525B",marginBottom:14,paddingLeft:8}}>Revenue vs Expenses — Margin %</div>
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={profitData} margin={{top:5,right:30,bottom:5,left:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="month" tick={{fontSize:9,fill:"#3F3F46"}} tickLine={false} axisLine={{stroke:"#1A1A2E"}} />
              <YAxis yAxisId="money" tick={{fontSize:10,fill:"#3F3F46"}} tickLine={false} axisLine={false} tickFormatter={v=>fmt(v)} />
              <YAxis yAxisId="pct" orientation="right" tick={{fontSize:10,fill:"#3F3F46"}} tickLine={false} axisLine={false} tickFormatter={v=>v+"%"} domain={[0,100]} />
              <Tooltip content={<TT />} />
              <Bar yAxisId="money" dataKey="total" name="Revenue" radius={[3,3,0,0]}>{profitData.map((_,i)=><Cell key={i} fill={i===profitData.length-1?"rgba(34,197,94,0.5)":"rgba(34,197,94,0.2)"}/>)}</Bar>
              <Bar yAxisId="money" dataKey="expenses" name="Expenses" radius={[3,3,0,0]}>{profitData.map((_,i)=><Cell key={i} fill={i===profitData.length-1?"rgba(239,68,68,0.5)":"rgba(239,68,68,0.2)"}/>)}</Bar>
              <Line yAxisId="pct" type="monotone" dataKey="margin" stroke="#D4A843" strokeWidth={2} dot={{r:3,fill:"#D4A843"}} name="Margin %" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>)}

        {/* REVENUE MODEL */}
        {view==="model"&&(<div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:12,padding:"24px"}}>
          <div style={{fontSize:11,color:"#52525B",marginBottom:20,textTransform:"uppercase",letterSpacing:"0.1em"}}>Revenue Model — What does 1,000 followers produce?</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:28}}>
            {[{target:15000,label:"$15K/mo"},{target:20000,label:"$20K/mo"},{target:30000,label:"$30K/mo"},{target:50000,label:"$50K/mo"}].map((t,i)=>{const rate=parseFloat(revPer1K)||0;const needed=rate>0?Math.round(t.target/rate*1000):0;const gap=needed-knownFollowers;return(
              <div key={i} style={{background:i===0?"rgba(34,197,94,0.04)":"rgba(255,255,255,0.015)",border:`1px solid ${i===0?"rgba(34,197,94,0.15)":"rgba(255,255,255,0.04)"}`,borderRadius:8,padding:"16px"}}>
                <div style={{fontSize:20,fontWeight:700,color:i===0?"#22C55E":"#D4A843",fontFamily:"'Space Grotesk'",marginBottom:8}}>{t.label}</div>
                <div style={{fontSize:11,color:"#A1A1AA",marginBottom:4}}>Need: <span style={{fontWeight:600,color:"#E4E4E7"}}>{fmtK(needed)}</span></div>
                <div style={{fontSize:11,color:"#A1A1AA"}}>Gap: <span style={{fontWeight:600,color:gap>0?"#F59E0B":"#22C55E"}}>{gap>0?"+"+fmtK(gap):"✓ Met"}</span></div>
              </div>);})}
          </div>
          <div style={{background:"rgba(212,168,67,0.04)",border:"1px solid rgba(212,168,67,0.12)",borderRadius:8,padding:"16px 20px"}}>
            <div style={{fontSize:12,color:"#D4A843",fontWeight:600,marginBottom:8}}>The 10AMPRO Flywheel</div>
            <div style={{fontSize:11,color:"#A1A1AA",lineHeight:1.6}}>TikTok/IG clips → YouTube episodes → Substack deep dives → Gumroad + Substack premium → Sponsors.</div>
          </div>
        </div>)}

        {/* ADMIN */}
        {view==="admin"&&(<div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:12,padding:"24px"}}>
          {!adminUnlocked?(<div style={{maxWidth:340,margin:"40px auto",textAlign:"center"}}>
            <div style={{fontSize:24,marginBottom:12}}>🔒</div>
            <div style={{fontSize:13,color:"#A1A1AA",marginBottom:16}}>Enter admin password</div>
            <input type="password" value={adminPass} onChange={e=>setAdminPass(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&adminPass==="10ampro")setAdminUnlocked(true);}} placeholder="Password" style={{...iS,textAlign:"center",marginBottom:12}} />
            <button onClick={()=>{if(adminPass==="10ampro")setAdminUnlocked(true);}} style={{background:"rgba(34,197,94,0.15)",border:"1px solid rgba(34,197,94,0.3)",color:"#22C55E",padding:"8px 24px",borderRadius:6,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Unlock</button>
          </div>):(
          <>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
              <div><div style={{fontSize:14,fontWeight:600,color:"#E4E4E7",marginBottom:4}}>Monthly Snapshot</div><div style={{fontSize:11,color:"#52525B"}}>Enter followers + revenue. Existing data overwritten.</div></div>
              <input type="month" value={formMonth} onChange={e=>setFormMonth(e.target.value)} style={{...iS,width:180}} />
            </div>
            <div style={{fontSize:10,color:"#52525B",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Follower Counts</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:24}}>
              {CH_META.map(ch=>(<div key={ch.key}><label style={{fontSize:10,color:ch.color,display:"block",marginBottom:4}}>{ch.icon} {ch.name}</label><input type="number" value={formData[ch.dbCol]} onChange={e=>setFormData(p=>({...p,[ch.dbCol]:e.target.value}))} placeholder="0" style={iS}/></div>))}
            </div>
            <div style={{fontSize:10,color:"#52525B",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Revenue</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:24}}>
              {[{key:"rev_youtube",label:"YouTube AdSense",color:"#FF0000"},{key:"rev_gumroad_substack",label:"Gumroad + Substack",color:"#FF6719"},{key:"rev_sponsors",label:"Sponsors",color:"#D4A843"},{key:"rev_spotify",label:"Spotify",color:"#1DB954"},{key:"rev_events",label:"Events",color:"#818CF8"},{key:"rev_total",label:"Total Revenue",color:"#22C55E"},{key:"expenses",label:"Total Expenses",color:"#EF4444"}].map(f=>(<div key={f.key}><label style={{fontSize:10,color:f.color,display:"block",marginBottom:4}}>{f.label}</label><input type="number" value={formData[f.key]} onChange={e=>setFormData(p=>({...p,[f.key]:e.target.value}))} placeholder="0" style={iS}/></div>))}
            </div>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <button onClick={handleSave} disabled={saving} style={{background:saving?"rgba(34,197,94,0.05)":"rgba(34,197,94,0.15)",border:"1px solid rgba(34,197,94,0.3)",color:"#22C55E",padding:"10px 32px",borderRadius:6,fontSize:13,cursor:saving?"default":"pointer",fontFamily:"inherit",fontWeight:600}}>{saving?"Saving...":"💾 Save Snapshot"}</button>
              {saveMsg&&<span style={{fontSize:12,color:saveMsg.startsWith("Error")?"#EF4444":"#22C55E"}}>{saveMsg}</span>}
            </div>
            <div style={{marginTop:28,fontSize:10,color:"#52525B",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Saved Snapshots ({snapshots.length})</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {snapshots.map(s=>{const hf=CH_META.some(c=>Number(s[c.dbCol])>0);const hr=Number(s.rev_total)>0;return(
                <button key={s.month} onClick={()=>setFormMonth(s.month)} style={{background:s.month===formMonth?"rgba(34,197,94,0.1)":"rgba(255,255,255,0.02)",border:s.month===formMonth?"1px solid rgba(34,197,94,0.3)":"1px solid rgba(255,255,255,0.06)",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontFamily:"inherit",color:s.month===formMonth?"#22C55E":"#71717A",fontSize:10}}>
                  {fmtMonth(s.month)}{hf&&<span style={{color:"#818CF8",marginLeft:4}}>📈</span>}{hr&&<span style={{color:"#22C55E",marginLeft:2}}>💰</span>}
                </button>);})}
            </div>
          </>)}
        </div>)}

        <div style={{textAlign:"center",fontSize:9,color:"#1A1A2E",paddingBottom:20,marginTop:28}}>10AMPRO — Modelos Mentales para Invertir · {snapshots.length} snapshots from Supabase</div>
      </div>
    </div>
  );
}
