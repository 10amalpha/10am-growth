"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, ComposedChart, Cell, BarChart } from "recharts";
import { CH_META, STREAMS, STRATEGY_PATHS, PNL_REVENUE, PNL_EXPENSES, PNL_DATA, fmt, fmtK, fmtMonth, fmtMonthFull } from "./data";

const pct=(a,b)=>b?((a-b)/b*100).toFixed(1):"—";
const TT=({active,payload,label})=>{if(!active||!payload?.length)return null;return(<div style={{background:"rgba(8,10,15,0.96)",border:"1px solid rgba(34,197,94,0.25)",borderRadius:8,padding:"10px 14px",fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}><p style={{color:"#22C55E",marginBottom:6,fontWeight:600,fontSize:12}}>{label}</p>{payload.map((p,i)=>(<p key={i} style={{color:p.color||"#A1A1AA",margin:"2px 0"}}>{p.name}: <span style={{fontWeight:700}}>{typeof p.value==="number"&&p.dataKey!=="margin"?fmt(p.value):p.value+(p.dataKey==="margin"?"%":"")}</span></p>))}</div>)};

export default function GrowthDashboard(){
  const[view,setView]=useState("tracker");
  const[snapshots,setSnapshots]=useState([]);
  const[loading,setLoading]=useState(true);
  const[adminPass,setAdminPass]=useState("");
  const[adminUnlocked,setAdminUnlocked]=useState(false);
  const[saving,setSaving]=useState(false);
  const[saveMsg,setSaveMsg]=useState("");
  const now=new Date();
  const defaultMonth=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
  const[formMonth,setFormMonth]=useState(defaultMonth);
  const[formData,setFormData]=useState({substack:"",youtube:"",tiktok:"",instagram:"",x_twitter:"",linkedin:"",spotify:"",apple_pods:"",rev_youtube:"",rev_gumroad_substack:"",rev_sponsors:"",rev_spotify:"",rev_events:"",rev_total:"",expenses:""});

  const loadData=useCallback(async()=>{setLoading(true);const{data,error}=await supabase.from("growth_snapshots").select("*").order("month",{ascending:true});if(!error&&data)setSnapshots(data);setLoading(false)},[]);
  useEffect(()=>{loadData()},[loadData]);

  const revenueData=useMemo(()=>snapshots.filter(s=>Number(s.rev_total)>0).map(s=>({month:fmtMonth(s.month),youtube:Number(s.rev_youtube)||0,gumroad_substack:Number(s.rev_gumroad_substack)||0,sponsors:Number(s.rev_sponsors)||0,spotify:Number(s.rev_spotify)||0,events:Number(s.rev_events)||0,total:Number(s.rev_total)||0,expenses:Number(s.expenses)||0})),[snapshots]);
  const profitData=useMemo(()=>revenueData.map(d=>({...d,profit:d.total-d.expenses,margin:d.total>0?parseFloat(((d.total-d.expenses)/d.total*100).toFixed(0)):0})),[revenueData]);
  const followerSnapshots=useMemo(()=>snapshots.filter(s=>CH_META.some(c=>Number(s[c.dbCol])>0)),[snapshots]);
  const latest=revenueData[revenueData.length-1]||{};
  const latestFollowers=followerSnapshots[followerSnapshots.length-1]||{};
  const prevFollowers=followerSnapshots.length>1?followerSnapshots[followerSnapshots.length-2]:null;
  const knownFollowers=CH_META.reduce((s,c)=>s+(Number(latestFollowers[c.dbCol])||0),0);
  const knownChannels=CH_META.filter(c=>Number(latestFollowers[c.dbCol])>0).length;
  const revPer1K=knownFollowers>0&&latest.total?(latest.total/(knownFollowers/1000)).toFixed(2):"—";

  const growthData=useMemo(()=>{
    if(!prevFollowers)return null;
    const channels=CH_META.map(c=>{const curr=Number(latestFollowers[c.dbCol])||0;const prev=Number(prevFollowers[c.dbCol])||0;return{...c,curr,prev,delta:curr-prev,pctChange:prev>0?((curr-prev)/prev*100).toFixed(1):"—"}});
    const totalCurr=channels.reduce((s,c)=>s+c.curr,0);const totalPrev=channels.reduce((s,c)=>s+c.prev,0);const totalDelta=totalCurr-totalPrev;
    const revSnaps=snapshots.filter(s=>Number(s.rev_total)>0);const lr=revSnaps[revSnaps.length-1];const pr=revSnaps.length>1?revSnaps[revSnaps.length-2]:null;
    let marginalRevPer1K="—";if(pr&&totalDelta>0)marginalRevPer1K=((Number(lr.rev_total)-Number(pr.rev_total))/(totalDelta/1000)).toFixed(2);
    return{channels,totalCurr,totalPrev,totalDelta,marginalRevPer1K,fromMonth:fmtMonth(prevFollowers.month),toMonth:fmtMonth(latestFollowers.month)};
  },[prevFollowers,latestFollowers,snapshots]);

  useEffect(()=>{const existing=snapshots.find(s=>s.month===formMonth);if(existing){const fd={};Object.keys(formData).forEach(k=>{fd[k]=existing[k]||""});setFormData(fd)}else{setFormData({substack:"",youtube:"",tiktok:"",instagram:"",x_twitter:"",linkedin:"",spotify:"",apple_pods:"",rev_youtube:"",rev_gumroad_substack:"",rev_sponsors:"",rev_spotify:"",rev_events:"",rev_total:"",expenses:""})}},[formMonth,snapshots]);

  const handleSave=async()=>{setSaving(true);setSaveMsg("");const row={month:formMonth};Object.keys(formData).forEach(k=>{row[k]=formData[k]===""?0:Number(formData[k])});row.rev_total=row.rev_total||(row.rev_youtube+row.rev_gumroad_substack+row.rev_sponsors+row.rev_spotify+row.rev_events);row.updated_at=new Date().toISOString();const{error}=await supabase.from("growth_snapshots").upsert(row,{onConflict:"month"});if(error)setSaveMsg("Error: "+error.message);else{setSaveMsg("✓ Saved "+fmtMonth(formMonth));await loadData()}setSaving(false)};

  const pnlComputed=useMemo(()=>PNL_DATA.map(row=>{const totalRev=PNL_REVENUE.reduce((s,r)=>s+(row[r.key]||0),0);const totalExp=PNL_EXPENSES.reduce((s,e)=>s+(row[e.key]||0),0);const profit=totalRev-totalExp;return{...row,totalRev,totalExp,profit,margin:totalRev>0?((profit/totalRev)*100).toFixed(0):0,dario:profit>0?profit*0.5:0,hernan:profit>0?profit*0.5:0,monthLabel:fmtMonth(row.month)}}),[]);

  const latestPnl=pnlComputed[pnlComputed.length-1]||{};
  const prevPnl=pnlComputed.length>1?pnlComputed[pnlComputed.length-2]:null;
  const currentARR=(latestPnl.totalRev||0)*12;
  const targetARR=500000;
  const arrProgress=Math.min((currentARR/targetARR)*100,100);
  const monthlyTarget=targetARR/12;
  const monthlyGap=monthlyTarget-(latestPnl.totalRev||0);
  const last6=pnlComputed.slice(-6);
  const avgGrowth=last6.length>1?(last6[last6.length-1].totalRev-last6[0].totalRev)/(last6.length-1):0;
  const monthsToTarget=avgGrowth>0?Math.ceil(monthlyGap/avgGrowth):Infinity;

  const iS={background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:6,padding:"8px 10px",color:"#E4E4E7",fontSize:13,fontFamily:"'JetBrains Mono',monospace",width:"100%",outline:"none"};
  const TABS=[{key:"tracker",label:"🏁 $500K"},{key:"strategy",label:"🎯 Strategy"},{key:"pnl",label:"💵 P&L"},{key:"followers",label:"📈 Followers"},{key:"velocity",label:"🚀 Velocity"},{key:"revenue",label:"💰 Revenue"},{key:"profit",label:"📊 Profit"},{key:"model",label:"🔮 Model"},{key:"admin",label:"⚙️ Admin"}];

  if(loading)return(<div style={{minHeight:"100vh",background:"#08090D",display:"flex",alignItems:"center",justifyContent:"center",color:"#22C55E",fontFamily:"'JetBrains Mono',monospace"}}>Loading...</div>);

  return(
    <div style={{minHeight:"100vh",background:"#08090D",color:"#E4E4E7",fontFamily:"'JetBrains Mono',ui-monospace,monospace"}}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>

      {/* HEADER */}
      <div style={{background:"linear-gradient(180deg,rgba(12,14,20,1) 0%,#08090D 100%)",borderBottom:"1px solid rgba(255,255,255,0.04)",padding:"14px 24px"}}>
        <div style={{maxWidth:1280,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <img src="https://10ampro-hub.vercel.app/logo.jpg" alt="10AMPRO" style={{width:44,height:44,borderRadius:"50%",objectFit:"cover",border:"2px solid rgba(212,168,67,0.2)"}}/>
            <div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:800,fontSize:20,letterSpacing:"-0.03em"}}><span style={{color:"#D4A843"}}>10</span><span style={{color:"#22C55E"}}>AM</span><span style={{color:"#3F3F46"}}>PRO</span></div><div style={{fontSize:8,color:"#27272A",letterSpacing:"0.2em",textTransform:"uppercase",marginTop:-2}}>Growth Command Center</div></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <a href="https://10ampro-shorts-analytics.vercel.app" target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:"#3F3F46",textDecoration:"none",border:"1px solid rgba(255,255,255,0.06)",padding:"4px 10px",borderRadius:4}}>📊 Shorts</a>
            <a href="https://10am.substack.com" target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:"#3F3F46",textDecoration:"none",borderBottom:"1px dotted #27272A"}}>10am.pro</a>
            <span style={{background:"rgba(34,197,94,0.1)",color:"#22C55E",padding:"3px 10px",borderRadius:4,fontSize:8,fontWeight:700,letterSpacing:"0.12em"}}>LIVE</span>
          </div>
        </div>
      </div>

      <div style={{maxWidth:1280,margin:"0 auto",padding:"20px 24px 40px"}}>
        {/* HERO METRIC */}
        <div style={{background:"linear-gradient(135deg,rgba(34,197,94,0.03),rgba(212,168,67,0.03))",border:"1px solid rgba(34,197,94,0.08)",borderRadius:14,padding:"20px 28px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
          <div>
            <div style={{fontSize:8,color:"#3F3F46",textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:6}}>Current ARR → Target</div>
            <div style={{display:"flex",alignItems:"baseline",gap:12}}>
              <span style={{fontFamily:"'Space Grotesk'",fontSize:38,fontWeight:800,color:"#22C55E"}}>{fmt(currentARR)}</span>
              <span style={{fontSize:14,color:"#27272A"}}>→</span>
              <span style={{fontFamily:"'Space Grotesk'",fontSize:22,fontWeight:600,color:"#D4A843"}}>{fmt(targetARR)}</span>
            </div>
            <div style={{marginTop:8,height:4,background:"rgba(255,255,255,0.04)",borderRadius:2,width:300,position:"relative"}}><div style={{position:"absolute",top:0,left:0,height:4,borderRadius:2,background:"linear-gradient(90deg,#22C55E,#D4A843)",width:`${arrProgress}%`}}/></div>
            <div style={{fontSize:10,color:"#3F3F46",marginTop:4}}>{arrProgress.toFixed(1)}% of $500K</div>
          </div>
          <div style={{display:"flex",gap:24,alignItems:"center"}}>
            {[{l:"Monthly Rev",v:fmt(latestPnl.totalRev),c:"#22C55E"},{l:"Gap",v:fmt(monthlyGap),c:"#EF4444"},{l:"Take-Home",v:fmt(latestPnl.hernan),c:"#818CF8"}].map((m,i)=>(<div key={i} style={{textAlign:"center"}}>{i>0&&<div style={{display:"none"}}/>}<div style={{fontSize:8,color:"#3F3F46",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{m.l}</div><div style={{fontSize:20,fontWeight:700,color:m.c,fontFamily:"'Space Grotesk'"}}>{m.v}</div></div>))}
          </div>
        </div>

        {/* TABS */}
        <div style={{display:"flex",gap:3,marginBottom:20,flexWrap:"wrap",borderBottom:"1px solid rgba(255,255,255,0.04)",paddingBottom:12}}>
          {TABS.map(t=>(<button key={t.key} onClick={()=>setView(t.key)} style={{background:view===t.key?"rgba(34,197,94,0.08)":"transparent",border:view===t.key?"1px solid rgba(34,197,94,0.2)":"1px solid transparent",color:view===t.key?"#22C55E":"#3F3F46",padding:"6px 14px",borderRadius:6,fontSize:10,cursor:"pointer",fontFamily:"inherit",fontWeight:view===t.key?600:400}}>{t.label}</button>))}
        </div>

        {/* 🏁 $500K TRACKER */}
        {view==="tracker"&&(<div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"20px"}}>
              <div style={{fontSize:10,color:"#3F3F46",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Revenue Trajectory</div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={pnlComputed.map(d=>({month:d.monthLabel,revenue:d.totalRev,target:monthlyTarget}))} margin={{top:5,right:20,bottom:5,left:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)"/><XAxis dataKey="month" tick={{fontSize:9,fill:"#27272A"}} tickLine={false} axisLine={{stroke:"#1A1A2E"}}/><YAxis tick={{fontSize:9,fill:"#27272A"}} tickLine={false} axisLine={false} tickFormatter={v=>fmt(v)}/><Tooltip content={<TT/>}/>
                  <Area type="monotone" dataKey="revenue" fill="rgba(34,197,94,0.08)" stroke="#22C55E" strokeWidth={2} name="Monthly Revenue"/>
                  <Line type="monotone" dataKey="target" stroke="#D4A843" strokeWidth={1} strokeDasharray="6 4" dot={false} name="$500K Target"/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"20px"}}>
              <div style={{fontSize:10,color:"#3F3F46",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Milestones</div>
              {[{l:"$150K ARR",a:12500},{l:"$200K ARR",a:16667},{l:"$250K ARR",a:20833},{l:"$300K ARR",a:25000},{l:"$350K ARR",a:29167},{l:"$400K ARR",a:33333},{l:"$500K ARR",a:41667}].map((m,i)=>{const reached=(latestPnl.totalRev||0)>=m.a;const p=Math.min(((latestPnl.totalRev||0)/m.a)*100,100);return(<div key={i} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,color:reached?"#22C55E":"#52525B",fontWeight:reached?600:400}}>{reached?"✓ ":"○ "}{m.l}</span><span style={{fontSize:10,color:"#3F3F46"}}>{fmt(m.a)}/mo</span></div><div style={{height:3,background:"rgba(255,255,255,0.03)",borderRadius:2}}><div style={{height:3,borderRadius:2,background:reached?"#22C55E":"rgba(34,197,94,0.3)",width:`${p}%`}}/></div></div>)})}
              <div style={{marginTop:16,padding:"12px 14px",background:"rgba(212,168,67,0.04)",border:"1px solid rgba(212,168,67,0.1)",borderRadius:8}}>
                <div style={{fontSize:10,color:"#D4A843",fontWeight:600,marginBottom:4}}>Projection</div>
                <div style={{fontSize:11,color:"#A1A1AA",lineHeight:1.6}}>{avgMonthlyGrowth>0?<>At +{fmt(avgMonthlyGrowth)}/mo growth → $500K in <span style={{color:"#22C55E",fontWeight:700}}>~{monthsToTarget} months</span></>:<>Need more data to project.</>}</div>
              </div>
            </div>
          </div>
          {/* Revenue stack targets */}
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"20px"}}>
            <div style={{fontSize:10,color:"#3F3F46",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Revenue Stack → $41.7K/mo</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
              {[{l:"YouTube AdSense",c:latestPnl.youtube||0,t:6000,color:"#FF0000",n:"Plateau ~$5-6K"},{l:"Substack+Gumroad",c:latestPnl.stripe||0,t:15000,color:"#FF6719",n:"Core lever. Scale to 10K subs."},{l:"Sponsors",c:latestPnl.sponsors||0,t:5000,color:"#D4A843",n:"Media kit + recurring deals."},{l:"10AMPRO Pro",c:0,t:15000,color:"#818CF8",n:"New product. 150@$99."},{l:"Events+Other",c:(latestPnl.events||0)+(latestPnl.spotify||0),t:667,color:"#1DB954",n:"2 events/yr + Spotify."}].map((s,i)=>{const p=Math.min((s.c/s.t)*100,100);return(<div key={i} style={{background:"rgba(255,255,255,0.015)",border:`1px solid ${s.color}15`,borderRadius:8,padding:"14px"}}><div style={{fontSize:10,color:s.color,fontWeight:600,marginBottom:8}}>{s.l}</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}><span style={{fontSize:18,fontWeight:700,color:"#E4E4E7",fontFamily:"'Space Grotesk'"}}>{fmt(s.c)}</span><span style={{fontSize:10,color:"#3F3F46"}}>/{fmt(s.t)}</span></div><div style={{height:3,background:"rgba(255,255,255,0.03)",borderRadius:2,marginBottom:8}}><div style={{height:3,borderRadius:2,background:s.color,width:`${p}%`,opacity:0.6}}/></div><div style={{fontSize:9,color:"#52525B",lineHeight:1.5}}>{s.n}</div></div>)})}
            </div>
          </div>
        </div>)}

        {/* 🎯 STRATEGY */}
        {view==="strategy"&&(<div>
          <div style={{background:"linear-gradient(135deg,rgba(212,168,67,0.04),rgba(34,197,94,0.03))",border:"1px solid rgba(212,168,67,0.1)",borderRadius:12,padding:"20px 24px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div><div style={{fontSize:8,color:"#3F3F46",textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:6}}>Performance Review — Feb 2026</div><div style={{fontFamily:"'Space Grotesk'",fontSize:48,fontWeight:800,color:"#D4A843"}}>B</div><div style={{fontSize:11,color:"#71717A",marginTop:2}}>Content engine is elite. Revenue architecture needs leveling up.</div></div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>{[{l:"Content",g:"A",c:"#22C55E"},{l:"Monetization",g:"C+",c:"#F59E0B"},{l:"Flywheel",g:"B+",c:"#818CF8"}].map((g,i)=>(<div key={i} style={{textAlign:"center",padding:"10px 18px",background:"rgba(255,255,255,0.02)",borderRadius:8,border:"1px solid rgba(255,255,255,0.04)"}}><div style={{fontSize:8,color:"#3F3F46",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{g.l}</div><div style={{fontSize:24,fontWeight:800,color:g.c,fontFamily:"'Space Grotesk'"}}>{g.g}</div></div>))}</div>
          </div>
          <div style={{fontSize:10,color:"#3F3F46",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>5 Paths to $500K ARR</div>
          {STRATEGY_PATHS.map((path,i)=>{const progress=Math.min((path.current/path.target)*100,100);return(<div key={path.id} style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${path.color}15`,borderRadius:10,padding:"18px 20px",marginBottom:12,display:"grid",gridTemplateColumns:"1fr 280px",gap:20}}>
            <div><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}><span style={{fontSize:10,color:path.color,fontWeight:700,background:`${path.color}15`,padding:"2px 8px",borderRadius:4}}>PATH {i+1}</span><span style={{fontSize:13,color:"#E4E4E7",fontWeight:600}}>{path.title}</span></div><div style={{fontSize:11,color:"#71717A",marginBottom:10,lineHeight:1.6}}>{path.description}</div><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}><span style={{fontSize:20,fontWeight:700,color:path.color,fontFamily:"'Space Grotesk'"}}>{path.unit==="$/mo"?fmt(path.current):path.current}</span><span style={{fontSize:10,color:"#3F3F46"}}>/ {path.unit==="$/mo"?fmt(path.target):path.target} {path.unit!=="$/mo"?path.unit:""}</span><div style={{flex:1,height:3,background:"rgba(255,255,255,0.03)",borderRadius:2}}><div style={{height:3,borderRadius:2,background:path.color,width:`${progress}%`,opacity:0.5}}/></div><span style={{fontSize:10,color:path.color,fontWeight:600}}>{progress.toFixed(0)}%</span></div><div style={{fontSize:9,color:"#52525B"}}>Revenue impact: <span style={{color:"#22C55E",fontWeight:600}}>{path.revImpact}</span></div></div>
            <div style={{borderLeft:"1px solid rgba(255,255,255,0.04)",paddingLeft:20}}><div style={{fontSize:9,color:"#3F3F46",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Action Items</div>{path.actions.map((a,j)=>(<div key={j} style={{fontSize:10,color:"#52525B",marginBottom:5,paddingLeft:12,position:"relative"}}><span style={{position:"absolute",left:0,color:"#27272A"}}>○</span>{a}</div>))}</div>
          </div>)})}
        </div>)}

        {/* 💵 P&L */}
        {view==="pnl"&&(<div>
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"20px",marginBottom:16}}>
            <div style={{fontSize:10,color:"#3F3F46",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Monthly P&L — Rev vs Expenses vs Take-Home</div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={pnlComputed} margin={{top:5,right:30,bottom:5,left:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)"/><XAxis dataKey="monthLabel" tick={{fontSize:9,fill:"#27272A"}} tickLine={false} axisLine={{stroke:"#1A1A2E"}}/><YAxis tick={{fontSize:9,fill:"#27272A"}} tickLine={false} axisLine={false} tickFormatter={v=>fmt(v)}/><Tooltip content={<TT/>}/>
                <Bar dataKey="totalRev" name="Revenue" radius={[3,3,0,0]}>{pnlComputed.map((_,i)=><Cell key={i} fill={i===pnlComputed.length-1?"rgba(34,197,94,0.5)":"rgba(34,197,94,0.15)"}/>)}</Bar>
                <Bar dataKey="totalExp" name="Expenses" radius={[3,3,0,0]}>{pnlComputed.map((_,i)=><Cell key={i} fill={i===pnlComputed.length-1?"rgba(239,68,68,0.5)":"rgba(239,68,68,0.12)"}/>)}</Bar>
                <Line type="monotone" dataKey="hernan" stroke="#818CF8" strokeWidth={2} dot={{r:3,fill:"#818CF8"}} name="Hernán Take-Home"/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:14}}><div style={{fontSize:10,color:"#3F3F46",textTransform:"uppercase",letterSpacing:"0.1em"}}>Revenue — {fmtMonthFull(latestPnl.month)}</div><div style={{fontSize:18,fontWeight:700,color:"#22C55E",fontFamily:"'Space Grotesk'"}}>{fmt(latestPnl.totalRev)}</div></div>
              {PNL_REVENUE.filter(r=>(latestPnl[r.key]||0)>0).sort((a,b)=>(latestPnl[b.key]||0)-(latestPnl[a.key]||0)).map(r=>{const val=latestPnl[r.key]||0;const share=latestPnl.totalRev>0?(val/latestPnl.totalRev*100).toFixed(0):0;const prevVal=prevPnl?(prevPnl[r.key]||0):0;const delta=prevVal>0?((val-prevVal)/prevVal*100).toFixed(0):"new";return(<div key={r.key} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.02)"}}><div style={{width:4,height:24,borderRadius:2,background:r.color,opacity:0.6}}/><div style={{flex:1,fontSize:11,color:"#A1A1AA"}}>{r.label}</div><div style={{fontSize:12,fontWeight:600,color:"#E4E4E7",fontFamily:"'JetBrains Mono'"}}>{fmt(val)}</div><div style={{fontSize:9,color:"#3F3F46",width:32,textAlign:"right"}}>{share}%</div><div style={{fontSize:9,color:delta==="new"?"#818CF8":Number(delta)>=0?"#22C55E":"#EF4444",width:44,textAlign:"right"}}>{delta==="new"?"new":Number(delta)>=0?"+"+delta+"%":delta+"%"}</div></div>)})}
            </div>
            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:14}}><div style={{fontSize:10,color:"#3F3F46",textTransform:"uppercase",letterSpacing:"0.1em"}}>Expenses — {fmtMonthFull(latestPnl.month)}</div><div style={{fontSize:18,fontWeight:700,color:"#EF4444",fontFamily:"'Space Grotesk'"}}>{fmt(latestPnl.totalExp)}</div></div>
              {PNL_EXPENSES.filter(e=>(latestPnl[e.key]||0)>0).sort((a,b)=>(latestPnl[b.key]||0)-(latestPnl[a.key]||0)).map(e=>{const val=latestPnl[e.key]||0;const share=latestPnl.totalExp>0?(val/latestPnl.totalExp*100).toFixed(0):0;return(<div key={e.key} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.02)"}}><div style={{width:4,height:24,borderRadius:2,background:e.color,opacity:0.4}}/><div style={{flex:1,fontSize:11,color:"#A1A1AA"}}>{e.label}</div><div style={{fontSize:12,fontWeight:600,color:"#E4E4E7",fontFamily:"'JetBrains Mono'"}}>{fmt(val)}</div><div style={{fontSize:9,color:"#3F3F46",width:32,textAlign:"right"}}>{share}%</div></div>)})}
              <div style={{marginTop:12,padding:"10px 14px",background:"rgba(129,140,248,0.04)",border:"1px solid rgba(129,140,248,0.1)",borderRadius:8,display:"flex",justifyContent:"space-between"}}><div><div style={{fontSize:9,color:"#3F3F46",textTransform:"uppercase",marginBottom:2}}>Profit (50/50)</div><div style={{fontSize:10,color:"#71717A"}}>Margin: {latestPnl.margin}%</div></div><div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#818CF8",fontWeight:600}}>Hernán: {fmt(latestPnl.hernan)}</div><div style={{fontSize:11,color:"#D4A843",fontWeight:600}}>Dario: {fmt(latestPnl.dario)}</div></div></div>
            </div>
          </div>
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"20px",marginTop:16}}>
            <div style={{fontSize:10,color:"#3F3F46",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Monthly Summary</div>
            <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}><thead><tr>{["Month","Revenue","Expenses","Profit","Margin","Hernán","Dario"].map(h=>(<th key={h} style={{padding:"8px 10px",textAlign:h==="Month"?"left":"right",color:"#3F3F46",borderBottom:"1px solid rgba(255,255,255,0.04)",fontWeight:600,fontSize:9,textTransform:"uppercase"}}>{h}</th>))}</tr></thead><tbody>{pnlComputed.map((row,i)=>(<tr key={row.month} style={{background:i===pnlComputed.length-1?"rgba(34,197,94,0.03)":"transparent"}}><td style={{padding:"6px 10px",color:i===pnlComputed.length-1?"#22C55E":"#71717A",fontWeight:i===pnlComputed.length-1?600:400}}>{row.monthLabel}</td><td style={{padding:"6px 10px",textAlign:"right",color:"#E4E4E7"}}>{fmt(row.totalRev)}</td><td style={{padding:"6px 10px",textAlign:"right",color:"#EF4444"}}>{fmt(row.totalExp)}</td><td style={{padding:"6px 10px",textAlign:"right",color:"#22C55E",fontWeight:600}}>{fmt(row.profit)}</td><td style={{padding:"6px 10px",textAlign:"right",color:"#D4A843"}}>{row.margin}%</td><td style={{padding:"6px 10px",textAlign:"right",color:"#818CF8"}}>{fmt(row.hernan)}</td><td style={{padding:"6px 10px",textAlign:"right",color:"#D4A843"}}>{fmt(row.dario)}</td></tr>))}</tbody></table></div>
          </div>
        </div>)}

        {/* 📈 FOLLOWERS */}
        {view==="followers"&&(<div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"24px"}}>
          <div style={{fontSize:10,color:"#3F3F46",marginBottom:20,textTransform:"uppercase",letterSpacing:"0.1em"}}>Latest: {fmtMonth(latestFollowers.month)} — {knownChannels}/8 Captured</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>{CH_META.map(ch=>{const val=Number(latestFollowers[ch.dbCol])||0;const pv=prevFollowers?Number(prevFollowers[ch.dbCol])||0:0;const d=prevFollowers?val-pv:0;return(<div key={ch.key} style={{background:val>0?"rgba(255,255,255,0.02)":"rgba(255,255,255,0.01)",border:val>0?`1px solid ${ch.color}20`:"1px solid rgba(255,255,255,0.03)",borderRadius:8,padding:"14px 16px",position:"relative",overflow:"hidden"}}>{val>0&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${ch.color}60,transparent)`}}/>}<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><span style={{fontSize:16}}>{ch.key==="linkedin"?<span style={{fontWeight:800,color:ch.color,fontSize:13}}>in</span>:ch.icon}</span><span style={{fontSize:11,color:"#A1A1AA",fontWeight:500}}>{ch.name}</span><span style={{fontSize:7,marginLeft:"auto",fontWeight:700,letterSpacing:"0.08em",padding:"1px 5px",borderRadius:3,color:val>0?"#22C55E":"#F59E0B",background:val>0?"rgba(34,197,94,0.08)":"rgba(245,158,11,0.08)"}}>{val>0?"✓":"—"}</span></div><div style={{fontSize:24,fontWeight:700,color:val>0?ch.color:"#27272A",fontFamily:"'Space Grotesk'"}}>{val>0?fmtK(val):"—"}</div>{d!==0&&<div style={{fontSize:10,color:d>0?"#22C55E":"#EF4444",marginTop:4}}>{d>0?"+":""}{fmtK(d)} ({pct(val,pv)}%)</div>}</div>)})}</div>
        </div>)}

        {/* 🚀 VELOCITY */}
        {view==="velocity"&&(<div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"24px"}}>
          {!growthData?(<div style={{textAlign:"center",padding:40}}><div style={{fontSize:36,marginBottom:12}}>📊</div><div style={{fontSize:14,color:"#A1A1AA",marginBottom:8}}>Need 2+ snapshots for velocity</div></div>):(
          <><div style={{fontSize:10,color:"#3F3F46",marginBottom:20,textTransform:"uppercase",letterSpacing:"0.1em"}}>Growth: {growthData.fromMonth} → {growthData.toMonth}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
              <div style={{background:"rgba(34,197,94,0.03)",border:"1px solid rgba(34,197,94,0.1)",borderRadius:8,padding:16}}><div style={{fontSize:9,color:"#3F3F46",textTransform:"uppercase",marginBottom:6}}>Net New Followers</div><div style={{fontSize:28,fontWeight:700,color:growthData.totalDelta>=0?"#22C55E":"#EF4444",fontFamily:"'Space Grotesk'"}}>{growthData.totalDelta>=0?"+":""}{fmtK(growthData.totalDelta)}</div></div>
              <div style={{background:"rgba(212,168,67,0.03)",border:"1px solid rgba(212,168,67,0.1)",borderRadius:8,padding:16}}><div style={{fontSize:9,color:"#3F3F46",textTransform:"uppercase",marginBottom:6}}>Blended Rev/1K</div><div style={{fontSize:28,fontWeight:700,color:"#D4A843",fontFamily:"'Space Grotesk'"}}>${revPer1K}</div></div>
              <div style={{background:"rgba(129,140,248,0.03)",border:"1px solid rgba(129,140,248,0.1)",borderRadius:8,padding:16}}><div style={{fontSize:9,color:"#3F3F46",textTransform:"uppercase",marginBottom:6}}>Marginal Rev/1K</div><div style={{fontSize:28,fontWeight:700,color:"#818CF8",fontFamily:"'Space Grotesk'"}}>{growthData.marginalRevPer1K!=="—"?"$"+growthData.marginalRevPer1K:"—"}</div></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>{growthData.channels.map(ch=>(<div key={ch.key} style={{background:"rgba(255,255,255,0.015)",border:`1px solid ${ch.color}15`,borderRadius:8,padding:"12px 14px"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:11,color:ch.color,fontWeight:600}}>{ch.name}</span><span style={{fontSize:10,color:ch.delta>0?"#22C55E":ch.delta<0?"#EF4444":"#52525B",fontWeight:600}}>{ch.delta>0?"+":""}{fmtK(ch.delta)}</span></div><div style={{fontSize:18,fontWeight:700,color:"#E4E4E7",fontFamily:"'Space Grotesk'"}}>{fmtK(ch.curr)}</div><div style={{fontSize:9,color:"#3F3F46",marginTop:4}}>{ch.pctChange!=="—"?(ch.delta>=0?"+":"")+ch.pctChange+"%":"No prior"}</div></div>))}</div>
          </>)}
        </div>)}

        {/* 💰 REVENUE */}
        {view==="revenue"&&revenueData.length>0&&(<div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"20px 16px 10px"}}>
          <div style={{fontSize:10,color:"#3F3F46",marginBottom:14,paddingLeft:8,textTransform:"uppercase",letterSpacing:"0.1em"}}>Monthly Revenue — Stacked (Supabase)</div>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={revenueData} margin={{top:5,right:20,bottom:5,left:5}}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)"/><XAxis dataKey="month" tick={{fontSize:9,fill:"#27272A"}} tickLine={false} axisLine={{stroke:"#1A1A2E"}}/><YAxis tick={{fontSize:10,fill:"#27272A"}} tickLine={false} axisLine={false} tickFormatter={v=>fmt(v)}/><Tooltip content={<TT/>}/><Bar dataKey="youtube" stackId="a" fill="#FF0000" name="YouTube"/><Bar dataKey="gumroad_substack" stackId="a" fill="#FF6719" name="Gumroad+Substack"/><Bar dataKey="sponsors" stackId="a" fill="#D4A843" name="Sponsors"/><Bar dataKey="spotify" stackId="a" fill="#1DB954" name="Spotify"/><Bar dataKey="events" stackId="a" fill="#818CF8" name="Events" radius={[3,3,0,0]}/></BarChart>
          </ResponsiveContainer>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginTop:16,padding:"0 8px"}}>{STREAMS.map(s=>{const val=latest[s.chartKey]||0;const share=latest.total>0?(val/latest.total*100).toFixed(0):0;return(<div key={s.key} style={{background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.03)",borderRadius:8,padding:"10px 12px"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:10,color:s.color,fontWeight:600}}>{s.label}</span><span style={{fontSize:9,color:"#27272A"}}>{share}%</span></div><div style={{fontSize:16,fontWeight:700,color:"#E4E4E7",fontFamily:"'Space Grotesk'"}}>{fmt(val)}</div></div>)})}</div>
        </div>)}

        {/* 📊 PROFIT */}
        {view==="profit"&&profitData.length>0&&(<div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"20px 16px 10px"}}>
          <div style={{fontSize:10,color:"#3F3F46",marginBottom:14,paddingLeft:8,textTransform:"uppercase",letterSpacing:"0.1em"}}>Revenue vs Expenses — Margin %</div>
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={profitData} margin={{top:5,right:30,bottom:5,left:5}}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)"/><XAxis dataKey="month" tick={{fontSize:9,fill:"#27272A"}} tickLine={false} axisLine={{stroke:"#1A1A2E"}}/><YAxis yAxisId="money" tick={{fontSize:10,fill:"#27272A"}} tickLine={false} axisLine={false} tickFormatter={v=>fmt(v)}/><YAxis yAxisId="pct" orientation="right" tick={{fontSize:10,fill:"#27272A"}} tickLine={false} axisLine={false} tickFormatter={v=>v+"%"} domain={[0,100]}/><Tooltip content={<TT/>}/><Bar yAxisId="money" dataKey="total" name="Revenue" radius={[3,3,0,0]}>{profitData.map((_,i)=><Cell key={i} fill={i===profitData.length-1?"rgba(34,197,94,0.5)":"rgba(34,197,94,0.15)"}/>)}</Bar><Bar yAxisId="money" dataKey="expenses" name="Expenses" radius={[3,3,0,0]}>{profitData.map((_,i)=><Cell key={i} fill={i===profitData.length-1?"rgba(239,68,68,0.5)":"rgba(239,68,68,0.12)"}/>)}</Bar><Line yAxisId="pct" type="monotone" dataKey="margin" stroke="#D4A843" strokeWidth={2} dot={{r:3,fill:"#D4A843"}} name="Margin %"/></ComposedChart>
          </ResponsiveContainer>
        </div>)}

        {/* 🔮 MODEL */}
        {view==="model"&&(<div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"24px"}}>
          <div style={{fontSize:10,color:"#3F3F46",marginBottom:20,textTransform:"uppercase",letterSpacing:"0.1em"}}>Revenue Model — per 1K followers</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:28}}>{[{t:15000,l:"$15K/mo"},{t:20000,l:"$20K/mo"},{t:30000,l:"$30K/mo"},{t:50000,l:"$50K/mo"}].map((t,i)=>{const rate=parseFloat(revPer1K)||0;const needed=rate>0?Math.round(t.t/rate*1000):0;const gap=needed-knownFollowers;return(<div key={i} style={{background:i===0?"rgba(34,197,94,0.03)":"rgba(255,255,255,0.015)",border:`1px solid ${i===0?"rgba(34,197,94,0.1)":"rgba(255,255,255,0.03)"}`,borderRadius:8,padding:"16px"}}><div style={{fontSize:20,fontWeight:700,color:i===0?"#22C55E":"#D4A843",fontFamily:"'Space Grotesk'",marginBottom:8}}>{t.l}</div><div style={{fontSize:11,color:"#A1A1AA",marginBottom:4}}>Need: <span style={{fontWeight:600,color:"#E4E4E7"}}>{fmtK(needed)}</span></div><div style={{fontSize:11,color:"#A1A1AA"}}>Gap: <span style={{fontWeight:600,color:gap>0?"#F59E0B":"#22C55E"}}>{gap>0?"+"+fmtK(gap):"✓ Met"}</span></div></div>)})}</div>
          <div style={{background:"rgba(212,168,67,0.03)",border:"1px solid rgba(212,168,67,0.08)",borderRadius:8,padding:"16px 20px"}}><div style={{fontSize:12,color:"#D4A843",fontWeight:600,marginBottom:8}}>The 10AMPRO Flywheel</div><div style={{fontSize:11,color:"#71717A",lineHeight:1.6}}>TikTok/IG clips → YouTube episodes → Substack deep dives → Gumroad + Substack premium → Sponsors.</div></div>
        </div>)}

        {/* ⚙️ ADMIN */}
        {view==="admin"&&(<div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"24px"}}>
          {!adminUnlocked?(<div style={{maxWidth:340,margin:"40px auto",textAlign:"center"}}><div style={{fontSize:24,marginBottom:12}}>🔒</div><div style={{fontSize:13,color:"#A1A1AA",marginBottom:16}}>Enter admin password</div><input type="password" value={adminPass} onChange={e=>setAdminPass(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&adminPass==="10ampro")setAdminUnlocked(true)}} placeholder="Password" style={{...iS,textAlign:"center",marginBottom:12}}/><button onClick={()=>{if(adminPass==="10ampro")setAdminUnlocked(true)}} style={{background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.2)",color:"#22C55E",padding:"8px 24px",borderRadius:6,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Unlock</button></div>):(
          <><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}><div><div style={{fontSize:14,fontWeight:600,color:"#E4E4E7",marginBottom:4}}>Monthly Snapshot</div><div style={{fontSize:11,color:"#52525B"}}>Enter followers + revenue.</div></div><input type="month" value={formMonth} onChange={e=>setFormMonth(e.target.value)} style={{...iS,width:180}}/></div>
            <div style={{fontSize:10,color:"#3F3F46",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Follower Counts</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:24}}>{CH_META.map(ch=>(<div key={ch.key}><label style={{fontSize:10,color:ch.color,display:"block",marginBottom:4}}>{ch.icon} {ch.name}</label><input type="number" value={formData[ch.dbCol]} onChange={e=>setFormData(p=>({...p,[ch.dbCol]:e.target.value}))} placeholder="0" style={iS}/></div>))}</div>
            <div style={{fontSize:10,color:"#3F3F46",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Revenue</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:24}}>{[{key:"rev_youtube",label:"YouTube",color:"#FF0000"},{key:"rev_gumroad_substack",label:"Gumroad+Substack",color:"#FF6719"},{key:"rev_sponsors",label:"Sponsors",color:"#D4A843"},{key:"rev_spotify",label:"Spotify",color:"#1DB954"},{key:"rev_events",label:"Events",color:"#818CF8"},{key:"rev_total",label:"Total Revenue",color:"#22C55E"},{key:"expenses",label:"Total Expenses",color:"#EF4444"}].map(f=>(<div key={f.key}><label style={{fontSize:10,color:f.color,display:"block",marginBottom:4}}>{f.label}</label><input type="number" value={formData[f.key]} onChange={e=>setFormData(p=>({...p,[f.key]:e.target.value}))} placeholder="0" style={iS}/></div>))}</div>
            <div style={{display:"flex",gap:12,alignItems:"center"}}><button onClick={handleSave} disabled={saving} style={{background:saving?"rgba(34,197,94,0.05)":"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.2)",color:"#22C55E",padding:"10px 32px",borderRadius:6,fontSize:13,cursor:saving?"default":"pointer",fontFamily:"inherit",fontWeight:600}}>{saving?"Saving...":"💾 Save"}</button>{saveMsg&&<span style={{fontSize:12,color:saveMsg.startsWith("Error")?"#EF4444":"#22C55E"}}>{saveMsg}</span>}</div>
            <div style={{marginTop:28,fontSize:10,color:"#3F3F46",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Snapshots ({snapshots.length})</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{snapshots.map(s=>{const hf=CH_META.some(c=>Number(s[c.dbCol])>0);const hr=Number(s.rev_total)>0;return(<button key={s.month} onClick={()=>setFormMonth(s.month)} style={{background:s.month===formMonth?"rgba(34,197,94,0.08)":"rgba(255,255,255,0.015)",border:s.month===formMonth?"1px solid rgba(34,197,94,0.2)":"1px solid rgba(255,255,255,0.04)",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontFamily:"inherit",color:s.month===formMonth?"#22C55E":"#52525B",fontSize:10}}>{fmtMonth(s.month)}{hf&&<span style={{color:"#818CF8",marginLeft:4}}>📈</span>}{hr&&<span style={{color:"#22C55E",marginLeft:2}}>💰</span>}</button>)})}</div>
          </>)}
        </div>)}

        <div style={{textAlign:"center",fontSize:8,color:"#18181B",paddingBottom:20,marginTop:28}}>10AMPRO Growth Command Center · {snapshots.length} snapshots · P&L {pnlComputed.length}mo · <a href="https://10ampro-shorts-analytics.vercel.app" style={{color:"#27272A"}}>Shorts →</a></div>
      </div>
    </div>
  );
}
