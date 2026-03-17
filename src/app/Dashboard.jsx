"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, ComposedChart, Cell, BarChart } from "recharts";
import { CH_META, STREAMS, STRATEGY_PATHS, PNL_REVENUE, PNL_EXPENSES, PNL_DATA, fmt, fmtK, fmtMonth, fmtMonthFull } from "./data";

const pct=(a,b)=>b?((a-b)/b*100).toFixed(1):"—";
const useIsMobile=()=>{const[m,setM]=useState(false);useEffect(()=>{const c=()=>setM(window.innerWidth<768);c();window.addEventListener("resize",c);return()=>window.removeEventListener("resize",c)},[]);return m;};
const TT=({active,payload,label})=>{if(!active||!payload?.length)return null;return(<div style={{background:"rgba(8,10,15,0.96)",border:"1px solid rgba(34,197,94,0.25)",borderRadius:8,padding:"10px 14px",fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}><p style={{color:"#22C55E",marginBottom:6,fontWeight:600,fontSize:12}}>{label}</p>{payload.map((p,i)=>(<p key={i} style={{color:p.color||"#A1A1AA",margin:"2px 0"}}>{p.name}: <span style={{fontWeight:700}}>{typeof p.value==="number"&&p.dataKey!=="margin"?fmt(p.value):p.value+(p.dataKey==="margin"?"%":"")}</span></p>))}</div>)};


const EF_SECTIONS=[{key:"overview",label:"📊 Estado"},{key:"decision",label:"⚡ Decisión"},{key:"unconverted",label:"🎯 $0"},{key:"funnel",label:"📈 Funnel"},{key:"playbook",label:"🗺️ Plan"},{key:"comparison",label:"⚖️ vs"}];
const EfMetric=({label,value,sub,accent="#22C55E",mob})=>(<div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:8,padding:mob?"10px 8px":"12px",textAlign:"center",minWidth:0}}><div style={{fontSize:mob?7:8,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:3}}>{label}</div><div style={{fontSize:mob?15:18,fontWeight:700,color:accent,fontFamily:"'Space Grotesk'"}}>{value}</div>{sub&&<div style={{fontSize:mob?8:9,color:"#71717A",marginTop:2}}>{sub}</div>}</div>);
const EfBar=({label,value,max,color="#22C55E",suffix=""})=>{const p=Math.min((value/max)*100,100);return(<div style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><span style={{fontSize:10,color:"#71717A"}}>{label}</span><span style={{fontSize:10,fontWeight:700,color}}>{typeof value==="number"?fmt(value):value}{suffix}</span></div><div style={{height:6,background:"rgba(255,255,255,0.04)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:color,width:`${p}%`,transition:"width 0.5s"}}/></div></div>);};

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

  const[liveStats,setLiveStats]=useState(null);

  const loadData=useCallback(async()=>{setLoading(true);try{const{data,error}=await supabase.from("growth_snapshots").select("*").order("month",{ascending:true});if(!error&&data)setSnapshots(data)}catch(e){console.error("Supabase fetch error:",e)}finally{setLoading(false)}},[]);
  useEffect(()=>{loadData()},[loadData]);

  // Fetch live channel stats — single API route for YT subscribers + IG followers
  useEffect(()=>{
    fetch("/api/channel-stats")
      .then(r=>r.json()).then(d=>{
        if(d&&(d.youtube||d.instagram))setLiveStats(d);
      }).catch(()=>{
        // Fallback: call YT API directly if local route fails (e.g. first deploy)
        const YT_KEY="AIzaSyANRsjsV-WdoLxM9yEz-yIgBFBdoUYPXCw";
        const YT_CH="UC1yKEFqN6Tzz9DTK7fwS3LQ";
        fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${YT_CH}&key=${YT_KEY}`)
          .then(r=>r.json()).then(d=>{
            if(d.items?.[0]?.statistics){
              const s=d.items[0].statistics;
              setLiveStats({youtube:{subscribers:parseInt(s.subscriberCount||"0"),totalViews:parseInt(s.viewCount||"0")},instagram:null});
            }
          }).catch(()=>{});
      });
  },[]);

  const revenueData=useMemo(()=>snapshots.filter(s=>Number(s.rev_total)>0).map(s=>({month:fmtMonth(s.month),youtube:Number(s.rev_youtube)||0,gumroad_substack:Number(s.rev_gumroad_substack)||0,sponsors:Number(s.rev_sponsors)||0,spotify:Number(s.rev_spotify)||0,events:Number(s.rev_events)||0,total:Number(s.rev_total)||0,expenses:Number(s.expenses)||0})),[snapshots]);
  const profitData=useMemo(()=>revenueData.map(d=>({...d,profit:d.total-d.expenses,margin:d.total>0?parseFloat(((d.total-d.expenses)/d.total*100).toFixed(0)):0})),[revenueData]);
  const followerSnapshots=useMemo(()=>snapshots.filter(s=>CH_META.some(c=>Number(s[c.dbCol])>0)),[snapshots]);
  const latest=revenueData[revenueData.length-1]||{};
  const latestFollowers=followerSnapshots[followerSnapshots.length-1]||{};
  const prevFollowers=followerSnapshots.length>1?followerSnapshots[followerSnapshots.length-2]:null;
  const knownFollowers=CH_META.reduce((s,c)=>s+(Number(latestFollowers[c.dbCol])||0),0);
  const knownChannels=CH_META.filter(c=>Number(latestFollowers[c.dbCol])>0).length;

  // Live-enhanced follower counts: override YT with API data when available
  // IG follower count not available via existing shorts API (only reel metrics)
  const liveFollowerOverrides=useMemo(()=>{
    const o={};
    if(liveStats?.youtube?.subscribers)o.youtube=liveStats.youtube.subscribers;
    if(liveStats?.instagram?.followers)o.instagram=liveStats.instagram.followers;
    return o;
  },[liveStats]);
  const enhancedFollowers=useMemo(()=>{
    const base={...latestFollowers};
    if(liveFollowerOverrides.youtube)base.youtube=liveFollowerOverrides.youtube;
    if(liveFollowerOverrides.instagram)base.instagram=liveFollowerOverrides.instagram;
    return base;
  },[latestFollowers,liveFollowerOverrides]);
  const enhancedTotal=CH_META.reduce((s,c)=>s+(Number(enhancedFollowers[c.dbCol])||0),0);
  const enhancedChannels=CH_META.filter(c=>Number(enhancedFollowers[c.dbCol])>0).length;
  const revPer1K=enhancedTotal>0&&latest.total?(latest.total/(enhancedTotal/1000)).toFixed(2):"—";

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
  const TABS=[{key:"tracker",label:"🏁 $500K"},{key:"strategy",label:"🎯 Strategy"},{key:"emailfirst",label:"📧 Estrategia"},{key:"conversion",label:"🔄 Conversión"},{key:"pnl",label:"💵 P&L"},{key:"followers",label:"📈 Followers"},{key:"velocity",label:"🚀 Velocity"},{key:"revenue",label:"💰 Revenue"},{key:"profit",label:"📊 Profit"},{key:"model",label:"🔮 Model"},{key:"admin",label:"⚙️ Admin"}];
  const[efSection,setEfSection]=useState("overview");
  const mob=useIsMobile();

  if(loading)return(<div style={{minHeight:"100vh",background:"#08090D",display:"flex",alignItems:"center",justifyContent:"center",color:"#22C55E",fontFamily:"'JetBrains Mono',monospace"}}>Loading...</div>);

  return(
    <div style={{minHeight:"100vh",background:"#08090D",color:"#E4E4E7",fontFamily:"'JetBrains Mono',ui-monospace,monospace"}}>

      {/* HEADER */}
      <div style={{background:"linear-gradient(180deg,rgba(12,14,20,1) 0%,#08090D 100%)",borderBottom:"1px solid rgba(255,255,255,0.04)",padding:"14px 24px"}}>
        <div style={{maxWidth:1280,margin:"0 auto",display:"flex",alignItems:mob?"flex-start":"center",justifyContent:"space-between",flexDirection:mob?"column":"row",gap:mob?12:0}}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <img src="https://10ampro-hub.vercel.app/logo.jpg" alt="10AMPRO" style={{width:44,height:44,borderRadius:"50%",objectFit:"cover",border:"2px solid rgba(212,168,67,0.2)"}}/>
            <div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:800,fontSize:20,letterSpacing:"-0.03em"}}><span style={{color:"#D4A843"}}>10</span><span style={{color:"#22C55E"}}>AM</span><span style={{color:"#71717A"}}>PRO</span></div><div style={{fontSize:8,color:"#71717A",letterSpacing:"0.2em",textTransform:"uppercase",marginTop:-2}}>Growth Command Center</div></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <a href="https://10ampro-shorts-analytics.vercel.app" target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:"#71717A",textDecoration:"none",border:"1px solid rgba(255,255,255,0.06)",padding:"4px 10px",borderRadius:4}}>📊 Shorts</a>
            <a href="https://10am.pro" target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:"#71717A",textDecoration:"none",borderBottom:"1px dotted #27272A"}}>10am.pro</a>
            <span style={{background:"rgba(34,197,94,0.1)",color:"#22C55E",padding:"3px 10px",borderRadius:4,fontSize:8,fontWeight:700,letterSpacing:"0.12em"}}>LIVE</span>
          </div>
        </div>
      </div>

      <div style={{maxWidth:1280,margin:"0 auto",padding:"20px 24px 40px"}}>
        {/* HERO METRIC */}
        <div style={{background:"linear-gradient(135deg,rgba(34,197,94,0.03),rgba(212,168,67,0.03))",border:"1px solid rgba(34,197,94,0.08)",borderRadius:14,padding:"20px 28px",marginBottom:20,display:"flex",alignItems:mob?"flex-start":"center",justifyContent:"space-between",flexWrap:"wrap",gap:16,flexDirection:mob?"column":"row"}}>
          <div>
            <div style={{fontSize:8,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:6}}>Current ARR → Target</div>
            <div style={{display:"flex",alignItems:"baseline",gap:12}}>
              <span style={{fontFamily:"'Space Grotesk'",fontSize:38,fontWeight:800,color:"#22C55E"}}>{fmt(currentARR)}</span>
              <span style={{fontSize:14,color:"#71717A"}}>→</span>
              <span style={{fontFamily:"'Space Grotesk'",fontSize:22,fontWeight:600,color:"#D4A843"}}>{fmt(targetARR)}</span>
            </div>
            <div style={{marginTop:8,height:4,background:"rgba(255,255,255,0.04)",borderRadius:2,width:"100%",maxWidth:300,position:"relative"}}><div style={{position:"absolute",top:0,left:0,height:4,borderRadius:2,background:"linear-gradient(90deg,#22C55E,#D4A843)",width:`${arrProgress}%`}}/></div>
            <div style={{fontSize:10,color:"#71717A",marginTop:4}}>{arrProgress.toFixed(1)}% of $500K</div>
          </div>
          <div style={{display:"flex",gap:mob?12:24,alignItems:mob?"flex-start":"center",flexDirection:mob?"column":"row"}}>
            {[{l:"Monthly Rev",v:fmt(latestPnl.totalRev),c:"#22C55E"},{l:"Gap",v:fmt(monthlyGap),c:"#EF4444"},{l:"Take-Home",v:fmt(latestPnl.hernan),c:"#818CF8"}].map((m,i)=>(<div key={i} style={{textAlign:"center"}}>{i>0&&<div style={{display:"none"}}/>}<div style={{fontSize:8,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{m.l}</div><div style={{fontSize:20,fontWeight:700,color:m.c,fontFamily:"'Space Grotesk'"}}>{m.v}</div></div>))}
          </div>
        </div>

        {/* TABS */}
        <div style={{display:"flex",gap:3,marginBottom:20,flexWrap:"wrap",borderBottom:"1px solid rgba(255,255,255,0.04)",paddingBottom:12}}>
          {TABS.map(t=>(<button key={t.key} onClick={()=>setView(t.key)} style={{background:view===t.key?"rgba(34,197,94,0.08)":"transparent",border:view===t.key?"1px solid rgba(34,197,94,0.2)":"1px solid transparent",color:view===t.key?"#22C55E":"#3F3F46",padding:"6px 14px",borderRadius:6,fontSize:10,cursor:"pointer",fontFamily:"inherit",fontWeight:view===t.key?600:400}}>{t.label}</button>))}
        </div>

        {/* 🏁 $500K TRACKER */}
        {view==="tracker"&&(<div>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:16,marginBottom:16}}>
            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"20px"}}>
              <div style={{fontSize:10,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Revenue Trajectory</div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={pnlComputed.map(d=>({month:d.monthLabel,revenue:d.totalRev,target:monthlyTarget}))} margin={{top:5,right:20,bottom:5,left:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)"/><XAxis dataKey="month" tick={{fontSize:9,fill:"#71717A"}} tickLine={false} axisLine={{stroke:"#1A1A2E"}}/><YAxis tick={{fontSize:9,fill:"#71717A"}} tickLine={false} axisLine={false} tickFormatter={v=>fmt(v)}/><Tooltip content={<TT/>}/>
                  <Area type="monotone" dataKey="revenue" fill="rgba(34,197,94,0.08)" stroke="#22C55E" strokeWidth={2} name="Monthly Revenue"/>
                  <Line type="monotone" dataKey="target" stroke="#D4A843" strokeWidth={1} strokeDasharray="6 4" dot={false} name="$500K Target"/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"20px"}}>
              <div style={{fontSize:10,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Milestones</div>
              {[{l:"$150K ARR",a:12500},{l:"$200K ARR",a:16667},{l:"$250K ARR",a:20833},{l:"$300K ARR",a:25000},{l:"$350K ARR",a:29167},{l:"$400K ARR",a:33333},{l:"$500K ARR",a:41667}].map((m,i)=>{const reached=(latestPnl.totalRev||0)>=m.a;const p=Math.min(((latestPnl.totalRev||0)/m.a)*100,100);return(<div key={i} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,color:reached?"#22C55E":"#52525B",fontWeight:reached?600:400}}>{reached?"✓ ":"○ "}{m.l}</span><span style={{fontSize:10,color:"#71717A"}}>{fmt(m.a)}/mo</span></div><div style={{height:3,background:"rgba(255,255,255,0.03)",borderRadius:2}}><div style={{height:3,borderRadius:2,background:reached?"#22C55E":"rgba(34,197,94,0.3)",width:`${p}%`}}/></div></div>)})}
              <div style={{marginTop:16,padding:"12px 14px",background:"rgba(212,168,67,0.04)",border:"1px solid rgba(212,168,67,0.1)",borderRadius:8}}>
                <div style={{fontSize:10,color:"#D4A843",fontWeight:600,marginBottom:4}}>Projection</div>
                <div style={{fontSize:11,color:"#A1A1AA",lineHeight:1.6}}>{avgGrowth>0?<>At +{fmt(avgGrowth)}/mo growth → $500K in <span style={{color:"#22C55E",fontWeight:700}}>~{monthsToTarget} months</span></>:<>Need more data to project.</>}</div>
              </div>
            </div>
          </div>
          {/* Revenue stack targets */}
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"20px"}}>
            <div style={{fontSize:10,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Revenue Stack → $41.7K/mo</div>
            <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(5,1fr)",gap:10}}>
              {[{l:"YouTube AdSense",c:latestPnl.youtube||0,t:6000,color:"#FF0000",n:"Plateau ~$5-6K"},{l:"Substack+Gumroad",c:latestPnl.stripe||0,t:15000,color:"#FF6719",n:"Core lever. Scale to 10K subs."},{l:"Sponsors",c:latestPnl.sponsors||0,t:5000,color:"#D4A843",n:"Media kit + recurring deals."},{l:"10AMPRO Pro",c:0,t:15000,color:"#818CF8",n:"New product. 150@$99."},{l:"Events+Other",c:(latestPnl.events||0)+(latestPnl.spotify||0),t:667,color:"#1DB954",n:"2 events/yr + Spotify."}].map((s,i)=>{const p=Math.min((s.c/s.t)*100,100);return(<div key={i} style={{background:"rgba(255,255,255,0.015)",border:`1px solid ${s.color}15`,borderRadius:8,padding:"14px"}}><div style={{fontSize:10,color:s.color,fontWeight:600,marginBottom:8}}>{s.l}</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}><span style={{fontSize:18,fontWeight:700,color:"#E4E4E7",fontFamily:"'Space Grotesk'"}}>{fmt(s.c)}</span><span style={{fontSize:10,color:"#71717A"}}>/{fmt(s.t)}</span></div><div style={{height:3,background:"rgba(255,255,255,0.03)",borderRadius:2,marginBottom:8}}><div style={{height:3,borderRadius:2,background:s.color,width:`${p}%`,opacity:0.6}}/></div><div style={{fontSize:9,color:"#71717A",lineHeight:1.5}}>{s.n}</div></div>)})}
            </div>
          </div>
        </div>)}

        {/* 🎯 STRATEGY */}
        {view==="strategy"&&(<div>
          <div style={{background:"linear-gradient(135deg,rgba(212,168,67,0.04),rgba(34,197,94,0.03))",border:"1px solid rgba(212,168,67,0.1)",borderRadius:12,padding:"20px 24px",marginBottom:20,display:"flex",alignItems:mob?"flex-start":"center",justifyContent:"space-between",flexDirection:mob?"column":"row",gap:mob?12:0}}>
            <div><div style={{fontSize:8,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:6}}>Performance Review — Feb 2026</div><div style={{fontFamily:"'Space Grotesk'",fontSize:48,fontWeight:800,color:"#D4A843"}}>B</div><div style={{fontSize:11,color:"#71717A",marginTop:2}}>Content engine is elite. Revenue architecture needs leveling up.</div></div>
            <div style={{display:"grid",gridTemplateColumns:mob?"repeat(3,1fr)":"repeat(3,1fr)",gap:mob?8:12}}>{[{l:"Content",g:"A",c:"#22C55E"},{l:"Monetization",g:"C+",c:"#F59E0B"},{l:"Flywheel",g:"B+",c:"#818CF8"}].map((g,i)=>(<div key={i} style={{textAlign:"center",padding:"10px 18px",background:"rgba(255,255,255,0.02)",borderRadius:8,border:"1px solid rgba(255,255,255,0.04)"}}><div style={{fontSize:8,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{g.l}</div><div style={{fontSize:24,fontWeight:800,color:g.c,fontFamily:"'Space Grotesk'"}}>{g.g}</div></div>))}</div>
          </div>
          <div style={{fontSize:10,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>5 Paths to $500K ARR</div>
          {STRATEGY_PATHS.map((path,i)=>{const progress=Math.min((path.current/path.target)*100,100);return(<div key={path.id} style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${path.color}15`,borderRadius:10,padding:"18px 20px",marginBottom:12,display:"grid",gridTemplateColumns:mob?"1fr":"1fr 280px",gap:mob?12:20}}>
            <div><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}><span style={{fontSize:10,color:path.color,fontWeight:700,background:`${path.color}15`,padding:"2px 8px",borderRadius:4}}>PATH {i+1}</span><span style={{fontSize:13,color:"#E4E4E7",fontWeight:600}}>{path.title}</span></div><div style={{fontSize:11,color:"#71717A",marginBottom:10,lineHeight:1.6}}>{path.description}</div><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}><span style={{fontSize:20,fontWeight:700,color:path.color,fontFamily:"'Space Grotesk'"}}>{path.unit==="$/mo"?fmt(path.current):path.current}</span><span style={{fontSize:10,color:"#71717A"}}>/ {path.unit==="$/mo"?fmt(path.target):path.target} {path.unit!=="$/mo"?path.unit:""}</span><div style={{flex:1,height:3,background:"rgba(255,255,255,0.03)",borderRadius:2}}><div style={{height:3,borderRadius:2,background:path.color,width:`${progress}%`,opacity:0.5}}/></div><span style={{fontSize:10,color:path.color,fontWeight:600}}>{progress.toFixed(0)}%</span></div><div style={{fontSize:9,color:"#71717A"}}>Revenue impact: <span style={{color:"#22C55E",fontWeight:600}}>{path.revImpact}</span></div></div>
            <div style={{borderLeft:"1px solid rgba(255,255,255,0.04)",paddingLeft:20}}><div style={{fontSize:9,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Action Items</div>{path.actions.map((a,j)=>(<div key={j} style={{fontSize:10,color:"#71717A",marginBottom:5,paddingLeft:12,position:"relative"}}><span style={{position:"absolute",left:0,color:"#71717A"}}>○</span>{a}</div>))}</div>
          </div>)})}
        </div>)}

        {/* 💵 P&L */}

        {/* ════ 📧 ESTRATEGIA EMAIL FIRST ════ */}
        {view==="emailfirst"&&(<div>
            {/* Header */}
            <div style={{background:"linear-gradient(135deg,rgba(34,197,94,0.04),rgba(212,168,67,0.03))",border:"1px solid rgba(34,197,94,0.1)",borderRadius:12,padding:mob?"12px 14px":"16px 24px",marginBottom:16,display:"flex",flexDirection:mob?"column":"row",alignItems:mob?"flex-start":"center",justifyContent:"space-between",gap:mob?8:12}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontFamily:"'Space Grotesk'",fontSize:mob?18:22,fontWeight:800,color:"#22C55E"}}>EMAIL FIRST</span>
                <span style={{background:"rgba(34,197,94,0.1)",color:"#22C55E",padding:"2px 8px",borderRadius:4,fontSize:8,fontWeight:700,letterSpacing:"0.1em"}}>{fmtMonth(pnlComputed[pnlComputed.length-1]?.month||"2026-01").toUpperCase()}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:mob?8:16,fontSize:mob?9:10,flexWrap:"wrap"}}>
                <span style={{color:"#71717A"}}>Rev: <span style={{color:"#22C55E",fontWeight:700}}>{fmt(latestPnl.totalRev)}</span></span>
                <span style={{color:"#71717A"}}>→</span>
                <span style={{color:"#71717A"}}>Meta: <span style={{color:"#D4A843",fontWeight:700}}>$41.7K</span></span>
                <span style={{color:"#818CF8",fontWeight:700}}>$500K ARR</span>
              </div>
            </div>

            {/* Sub-tabs */}
            <div style={{display:"flex",gap:3,marginBottom:16,flexWrap:"wrap",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
              {EF_SECTIONS.map(s=>(<button key={s.key} onClick={()=>setEfSection(s.key)} style={{background:efSection===s.key?"rgba(34,197,94,0.08)":"transparent",border:efSection===s.key?"1px solid rgba(34,197,94,0.2)":"1px solid transparent",color:efSection===s.key?"#22C55E":"#3F3F46",padding:mob?"4px 8px":"5px 12px",borderRadius:5,fontSize:mob?9:10,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,fontFamily:"inherit",fontWeight:efSection===s.key?600:400}}>{s.label}</button>))}
            </div>

            {/* ── OVERVIEW ── */}
            {efSection==="overview"&&(<div>
              {/* Revenue Gap Bar */}
              <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:12,padding:mob?"14px":"20px 24px",marginBottom:16}}>
                <div style={{fontSize:9,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Revenue Gap Analysis</div>
                <div style={{display:"flex",alignItems:"center",gap:mob?10:20,marginBottom:14,flexWrap:"wrap",justifyContent:mob?"center":"flex-start"}}>
                  <div style={{textAlign:"center"}}><div style={{fontSize:9,color:"#71717A",marginBottom:2}}>Actual</div><div style={{fontSize:mob?20:26,fontWeight:800,color:"#22C55E",fontFamily:"'Space Grotesk'"}}>{latestPnl.totalRev?latestPnl.totalRev.toLocaleString("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}):"—"}</div><div style={{fontSize:9,color:"#71717A"}}>/mes</div></div>
                  <span style={{fontSize:20,color:"#71717A"}}>→</span>
                  <div style={{textAlign:"center"}}><div style={{fontSize:9,color:"#71717A",marginBottom:2}}>Meta</div><div style={{fontSize:mob?20:26,fontWeight:800,color:"#D4A843",fontFamily:"'Space Grotesk'"}}>$41,667</div><div style={{fontSize:9,color:"#71717A"}}>/mes ($500K ARR)</div></div>
                  <span style={{fontSize:20,color:"#71717A"}}>=</span>
                  <div style={{textAlign:"center"}}><div style={{fontSize:9,color:"#71717A",marginBottom:2}}>Gap</div><div style={{fontSize:mob?20:26,fontWeight:800,color:"#EF4444",fontFamily:"'Space Grotesk'"}}>{fmt(monthlyGap)}</div><div style={{fontSize:9,color:"#71717A"}}>/mes faltante</div></div>
                </div>
                <div style={{height:14,background:"rgba(255,255,255,0.04)",borderRadius:7,overflow:"hidden",position:"relative"}}>
                  <div style={{height:"100%",borderRadius:7,background:"linear-gradient(90deg,#22C55E,#16a34a)",width:`${arrProgress.toFixed(1)}%`}}/>
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",paddingLeft:10}}><span style={{fontSize:9,fontWeight:700,color:"#fff",textShadow:"0 1px 2px rgba(0,0,0,0.8)"}}>{arrProgress.toFixed(1)}% del objetivo</span></div>
                </div>
              </div>

              {/* KPIs */}
              <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:mob?8:10,marginBottom:16}}>
                <EfMetric mob={mob} label="YoY Growth" value={prevPnl&&pnlComputed[0]?"+"+((latestPnl.totalRev-pnlComputed[0].totalRev)/pnlComputed[0].totalRev*100).toFixed(0)+"%":"—"} accent="#22C55E"/>
                <EfMetric mob={mob} label="Stripe/Substack YoY" value={pnlComputed[0]?.stripe>0?"+"+((latestPnl.stripe-pnlComputed[0].stripe)/pnlComputed[0].stripe*100).toFixed(0)+"%":"—"} sub={`$${pnlComputed[0]?.stripe||0} → ${fmt(latestPnl.stripe)}`} accent="#818CF8"/>
                <EfMetric mob={mob} label="YouTube AdSense" value={fmt(latestPnl.youtube)} sub="Plateauing" accent="#F59E0B"/>
                <EfMetric mob={mob} label="Substack ARR" value={fmt((latestPnl.stripe||0)*12)} sub="Estimated from Stripe" accent="#22C55E"/>
              </div>

              {/* Revenue Breakdown */}
              <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12,marginBottom:16}}>
                <div style={{background:"rgba(129,140,248,0.03)",border:"1px solid rgba(129,140,248,0.1)",borderRadius:10,padding:mob?"14px":"18px 20px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><div style={{width:10,height:10,borderRadius:"50%",background:"#818CF8"}}/><span style={{fontSize:12,fontWeight:600,color:"#E4E4E7"}}>Stripe/Substack</span><span style={{background:"rgba(129,140,248,0.1)",color:"#818CF8",padding:"1px 6px",borderRadius:3,fontSize:8,fontWeight:700}}>{latestPnl.totalRev>0?Math.round((latestPnl.stripe||0)/latestPnl.totalRev*100):0}%</span></div>
                  <div style={{fontSize:mob?20:24,fontWeight:800,color:"#818CF8",fontFamily:"'Space Grotesk'",marginBottom:2}}>{fmt(latestPnl.stripe)}/mo</div>
                  <div style={{fontSize:9,color:"#71717A"}}>{pnlComputed[0]?.stripe>0?"+"+((latestPnl.stripe-pnlComputed[0].stripe)/pnlComputed[0].stripe*100).toFixed(0)+"% YoY":"—"}</div>
                  <div style={{fontSize:9,color:"#71717A",marginTop:2}}>Core revenue engine · Compounding</div>
                </div>
                <div style={{background:"rgba(239,68,68,0.03)",border:"1px solid rgba(239,68,68,0.1)",borderRadius:10,padding:mob?"14px":"18px 20px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><div style={{width:10,height:10,borderRadius:"50%",background:"#EF4444"}}/><span style={{fontSize:12,fontWeight:600,color:"#E4E4E7"}}>YouTube AdSense</span><span style={{background:"rgba(239,68,68,0.1)",color:"#EF4444",padding:"1px 6px",borderRadius:3,fontSize:8,fontWeight:700}}>{latestPnl.totalRev>0?Math.round((latestPnl.youtube||0)/latestPnl.totalRev*100):0}%</span></div>
                  <div style={{fontSize:mob?20:24,fontWeight:800,color:"#EF4444",fontFamily:"'Space Grotesk'",marginBottom:2}}>{fmt(latestPnl.youtube)}/mo</div>
                  <div style={{fontSize:9,color:"#71717A"}}>Plateauing</div>
                  <div style={{fontSize:9,color:"#F59E0B",marginTop:2}}>⚠️ Crecimiento estancado</div>
                </div>
              </div>

              {/* Substack Deep */}
              <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:10,padding:mob?"12px":"16px 20px"}}>
                <div style={{fontSize:9,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Substack Metrics</div>
                <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:mob?8:10}}>
                  <EfMetric mob={mob} label="Paid Subs" value="—" sub="Update via Admin" accent="#22C55E"/>
                  <EfMetric mob={mob} label="ARR" value={fmt((latestPnl.stripe||0)*12)} accent="#818CF8"/>
                  <EfMetric mob={mob} label="Free→Paid" value="10.3%" accent="#F59E0B"/>
                  <EfMetric mob={mob} label="Orgánicos/mes" value="~80" accent="#22C55E"/>
                </div>
              </div>
            </div>)}

            {/* ── LA DECISIÓN ── */}
            {efSection==="decision"&&(<div>
              <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:12,padding:mob?"16px":"24px",textAlign:"center",marginBottom:16}}>
                <div style={{fontSize:9,color:"#D4A843",textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:8}}>La Decisión Estratégica</div>
                <div style={{fontSize:mob?15:18,fontWeight:800,color:"#E4E4E7",fontFamily:"'Space Grotesk'",marginBottom:8}}>Priorizar captura de emails sobre optimizar conversión paid</div>
                <div style={{fontSize:11,color:"#71717A",maxWidth:600,margin:"0 auto",lineHeight:1.7}}>El pool de emails actuales es demasiado pequeño. Optimizar conversión en 3,500 subs tiene retornos decrecientes. El crecimiento real viene de expandir la base.</div>
              </div>

              {/* 22x Contrast */}
              <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(212,168,67,0.15)",borderRadius:12,padding:mob?"14px":"20px 24px"}}>
                <div style={{fontSize:9,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Revenue por Follower: Revenue por Follower</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:mob?10:16}}>
                  <div style={{textAlign:"center",padding:mob?"14px 8px":"20px",background:"rgba(34,197,94,0.03)",borderRadius:10,border:"1px solid rgba(34,197,94,0.08)"}}>
                    <div style={{fontSize:24,marginBottom:4}}>📧</div>
                    <div style={{fontSize:11,color:"#71717A",marginBottom:6}}>Substack</div>
                    <div style={{fontSize:mob?28:36,fontWeight:800,color:"#22C55E",fontFamily:"'Space Grotesk'"}}>$2.11</div>
                    <div style={{fontSize:9,color:"#71717A",marginTop:2}}>por follower</div>
                    <div style={{marginTop:8}}><span style={{background:"rgba(34,197,94,0.1)",color:"#22C55E",padding:"2px 8px",borderRadius:4,fontSize:8,fontWeight:700}}>WINNER</span></div>
                  </div>
                  <div style={{textAlign:"center",padding:mob?"14px 8px":"20px",background:"rgba(239,68,68,0.03)",borderRadius:10,border:"1px solid rgba(239,68,68,0.08)"}}>
                    <div style={{fontSize:24,marginBottom:4}}>📺</div>
                    <div style={{fontSize:11,color:"#71717A",marginBottom:6}}>YouTube</div>
                    <div style={{fontSize:mob?28:36,fontWeight:800,color:"#EF4444",fontFamily:"'Space Grotesk'"}}>$0.23</div>
                    <div style={{fontSize:9,color:"#71717A",marginTop:2}}>por follower</div>
                    <div style={{marginTop:8}}><span style={{background:"rgba(255,255,255,0.04)",color:"#71717A",padding:"2px 8px",borderRadius:4,fontSize:8,fontWeight:700}}>9.2× menor</span></div>
                  </div>
                </div>
                <div style={{marginTop:14,textAlign:"center"}}><span style={{fontSize:12,color:"#D4A843",fontWeight:700}}>Substack genera 22× más revenue por follower que YouTube</span></div>
              </div>
            </div>)}

            {/* ── AUDIENCIAS SIN CONVERTIR ── */}
            {efSection==="unconverted"&&(<div>
              <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:12,padding:mob?"14px":"20px 24px",marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:6}}>
                  <div style={{fontSize:9,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em"}}>Audiencias en Plataformas de $0</div>
                  <span style={{background:"rgba(239,68,68,0.1)",color:"#EF4444",padding:"2px 8px",borderRadius:4,fontSize:8,fontWeight:700}}>87K SIN CONVERTIR</span>
                </div>
                <div style={{fontSize:10,color:"#71717A",marginBottom:14}}>Estas audiencias existen pero no generan revenue directo. La estrategia Email First las convierte en suscriptores de Substack.</div>

                {[{name:"TikTok",followers:48800,rev:0,color:"#E879F9",note:"Mayor audiencia, $0 revenue",hl:false},
                  {name:"Spotify",followers:38600,rev:53,color:"#22C55E",note:"Mayor desperdicio — 5% conv = 1,930 emails = +$4K MRR",hl:true},
                  {name:"Instagram",followers:16200,rev:0,color:"#F472B6",note:"Canal de boost activo",hl:false},
                  {name:"X / Twitter",followers:5400,rev:0,color:"#60A5FA",note:"",hl:false},
                  {name:"LinkedIn",followers:1300,rev:0,color:"#818CF8",note:"",hl:false}
                ].map(p=>(<div key={p.name} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:8,marginBottom:6,background:p.hl?"rgba(212,168,67,0.04)":"rgba(255,255,255,0.015)",border:p.hl?"1px solid rgba(212,168,67,0.12)":"1px solid rgba(255,255,255,0.03)"}}>
                  <div style={{width:3,height:32,borderRadius:2,background:p.color}}/>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,fontWeight:600,color:"#E4E4E7"}}>{p.name}</span><span style={{fontSize:9,color:"#71717A"}}>{p.followers.toLocaleString()} followers</span></div>
                    {p.note&&<div style={{fontSize:9,color:p.hl?"#D4A843":"#52525B",marginTop:2}}>{p.note}</div>}
                  </div>
                  <div style={{fontSize:12,fontWeight:700,color:p.rev>0?"#22C55E":"#EF4444"}}>${p.rev}/mo</div>
                </div>))}
              </div>

              {/* Spotify Opportunity */}
              <div style={{background:"rgba(212,168,67,0.03)",border:"1px solid rgba(212,168,67,0.12)",borderRadius:12,padding:mob?"14px":"18px 24px"}}>
                <div style={{fontSize:9,color:"#D4A843",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>🎧 Spotify: Mayor Oportunidad Más Grande</div>
                <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(3,1fr)",gap:10,marginBottom:12}}>
                  <EfMetric mob={mob} label="Audiencia" value="38.6K" accent="#22C55E"/>
                  <EfMetric mob={mob} label="Revenue Actual" value="$53/mo" accent="#EF4444"/>
                  <EfMetric mob={mob} label="Potencial (5% conv)" value="+$4K MRR" accent="#D4A843"/>
                </div>
                <div style={{fontSize:10,color:"#71717A",lineHeight:1.7}}>Con solo 5% de conversión: 38,600 × 5% = 1,930 emails nuevos. A 10% free→paid × $8/sub = <span style={{color:"#D4A843",fontWeight:700}}>+$1,544 MRR inmediato</span>, compounding mensualmente hasta ~$4K MRR.</div>
              </div>
            </div>)}

            {/* ── FUNNEL MODEL ── */}
            {efSection==="funnel"&&(<div>
              <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:12,padding:mob?"14px":"20px 24px",marginBottom:16}}>
                <div style={{fontSize:9,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>IG Boost Funnel — Parámetros del Modelo</div>
                <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(3,1fr)",gap:mob?8:10}}>
                  <EfMetric mob={mob} label="CPM" value="$3-8" sub="Finanzas LATAM" accent="#60A5FA"/>
                  <EfMetric mob={mob} label="CTR" value="1-3%" accent="#22C55E"/>
                  <EfMetric mob={mob} label="Landing Conv." value="15-30%" accent="#F59E0B"/>
                  <EfMetric mob={mob} label="Free→Paid" value="5-15%" accent="#818CF8"/>
                  <EfMetric mob={mob} label="Rev/Sub" value="$8/mo" accent="#22C55E"/>
                  <EfMetric mob={mob} label="Churn" value="~5%/mo" accent="#EF4444"/>
                </div>
              </div>

              {/* Projection to 15K */}
              <div style={{background:"rgba(34,197,94,0.03)",border:"1px solid rgba(34,197,94,0.1)",borderRadius:12,padding:mob?"14px":"20px 24px"}}>
                <div style={{fontSize:9,color:"#22C55E",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>📈 Proyección a 15K Subs</div>
                <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:mob?4:8,marginBottom:16,fontSize:mob?10:12}}>
                  {[{t:"15K subs",c:false},{t:"×"},{t:"10% conv",c:false},{t:"="},{t:"1,500 paid",c:true},{t:"×"},{t:"$8/mo",c:false},{t:"="},{t:"$12K MRR",c:true}].map((x,i)=>x.t==="×"||x.t==="="?<span key={i} style={{color:"#71717A",fontSize:14}}>{x.t}</span>:<span key={i} style={{background:x.c?"rgba(34,197,94,0.08)":"rgba(255,255,255,0.04)",border:x.c?"1px solid rgba(34,197,94,0.15)":"1px solid rgba(255,255,255,0.06)",color:x.c?"#22C55E":"#A1A1AA",padding:mob?"4px 8px":"6px 14px",borderRadius:6,fontWeight:x.c?700:400}}>{x.t}</span>)}
                </div>
                <EfBar label="Substack" value={12000} max={22000} color="#22C55E" suffix="/mo"/>
                <EfBar label="YouTube AdSense" value={5000} max={22000} color="#EF4444" suffix="/mo"/>
                <EfBar label="Sponsors" value={5000} max={22000} color="#818CF8" suffix="/mo"/>
                <div style={{marginTop:14,padding:"12px 16px",background:"rgba(34,197,94,0.04)",border:"1px solid rgba(34,197,94,0.1)",borderRadius:8,textAlign:"center"}}>
                  <span style={{fontSize:10,color:"#71717A"}}>Total proyectado: </span>
                  <span style={{fontSize:mob?16:20,fontWeight:800,color:"#22C55E",fontFamily:"'Space Grotesk'"}}>$22,000/mo</span>
                  <span style={{fontSize:10,color:"#71717A",marginLeft:8}}>($264K ARR)</span>
                </div>
              </div>
            </div>)}

            {/* ── PLAYBOOK ── */}
            {efSection==="playbook"&&(<div>
              <div style={{fontSize:9,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>Playbook 3 Fases + Path Complementario</div>

              {[{n:1,title:"Captura Agresiva de Emails",color:"#22C55E",desc:"Meta: 500+ emails nuevos por mes. CTAs específicos en cada pieza de contenido. Cada short, cada podcast, cada post debe tener un CTA claro hacia Substack. IG Boosts direccionan tráfico a landing pages optimizadas en español.",tags:["Meta: 500+/mes","CTA en todo contenido","IG Boost → Landing","Spotify → Newsletter CTA"]},
                {n:2,title:"Optimizar Conversión a Paid",color:"#F59E0B",desc:"Al llegar a 8-10K free subs, implementar welcome sequences automatizados en español. Segmentación por fuente de adquisición. A/B testing de copy y pricing.",tags:["Trigger: 8-10K free subs","Welcome sequences ES","A/B testing pricing","Segmentación por fuente"]},
                {n:3,title:"Lanzar Producto Mid-Tier $50-200/mes",color:"#818CF8",desc:"Comunidad premium con acceso directo, análisis exclusivos, calls grupales. 300 miembros a $99/mes = $30K MRR. Requiere masa crítica de audiencia comprometida.",tags:["$50-200/mes","300 × $99 = $30K MRR","Calls grupales","Análisis exclusivos"]}
              ].map(phase=>(<div key={phase.n} style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${phase.color}15`,borderRadius:10,padding:mob?"14px":"18px 20px",marginBottom:12,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,left:0,width:3,height:"100%",background:phase.color}}/>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,paddingLeft:8}}>
                  <div style={{width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,background:`${phase.color}15`,color:phase.color}}>{phase.n}</div>
                  <span style={{fontSize:13,fontWeight:600,color:"#E4E4E7"}}>{phase.title}</span>
                </div>
                <div style={{fontSize:10,color:"#71717A",marginBottom:10,lineHeight:1.7,paddingLeft:8}}>{phase.desc}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,paddingLeft:8}}>{phase.tags.map((t,i)=>(<span key={i} style={{fontSize:9,padding:"3px 8px",borderRadius:4,background:"rgba(255,255,255,0.04)",color:"#A1A1AA",border:"1px solid rgba(255,255,255,0.06)"}}>{t}</span>))}</div>
              </div>))}

              {/* Sponsors */}
              <div style={{background:"rgba(129,140,248,0.03)",border:"1px solid rgba(129,140,248,0.1)",borderRadius:10,padding:"18px 20px"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <div style={{width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,background:"rgba(129,140,248,0.1)",color:"#818CF8"}}>$</div>
                  <div><div style={{fontSize:13,fontWeight:600,color:"#E4E4E7"}}>Path Complementario: Sponsors</div><div style={{fontSize:9,color:"#71717A"}}>No reemplaza Email First, lo complementa</div></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:mob?8:10}}>
                  <EfMetric mob={mob} label="Nov-Dic 2025" value="$3.2K" sub="Se cayó" accent="#EF4444"/>
                  <EfMetric mob={mob} label="CPM Range" value="$50-150" accent="#818CF8"/>
                  <EfMetric mob={mob} label="Potencial" value="$2-4K/mo" accent="#22C55E"/>
                  <EfMetric mob={mob} label="Requiere" value="Media Kit" accent="#F59E0B"/>
                </div>
              </div>
            </div>)}

            {/* ── COMPARATIVO ── */}
            {efSection==="comparison"&&(<div>
              <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:12,padding:mob?"14px":"20px 24px",marginBottom:16}}>
                <div style={{fontSize:9,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>⚖️ Email vs Optimizar Conversión</div>
                <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:mob?12:14}}>

                  {/* Email Column */}
                  <div style={{background:"rgba(34,197,94,0.03)",border:"1px solid rgba(34,197,94,0.1)",borderRadius:10,padding:mob?"14px":"20px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12,flexWrap:"wrap"}}>
                      <span style={{fontSize:18}}>📧</span>
                      <div><div style={{fontSize:12,fontWeight:700,color:"#22C55E"}}>Email Acquisition</div></div>
                      <span style={{background:"rgba(34,197,94,0.1)",color:"#22C55E",padding:"1px 6px",borderRadius:3,fontSize:8,fontWeight:700}}>RECOMENDADO</span>
                    </div>
                    {[["Pool disponible","87,000","#22C55E"],["Techo","Sin límite","#22C55E"],["Compounding","✅ Sí","#22C55E"],["Impacto a 15K subs","+$12K/mo","#22C55E"],["Perfil retornos","Creciente","#22C55E"]].map(([l,v,c],i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.03)"}}><span style={{fontSize:10,color:"#71717A"}}>{l}</span><span style={{fontSize:10,fontWeight:700,color:c}}>{v}</span></div>))}
                    <div style={{marginTop:12,paddingTop:10,borderTop:"1px solid rgba(34,197,94,0.08)"}}>
                      <div style={{fontSize:9,color:"#71717A",marginBottom:6}}>Ventajas:</div>
                      {["Pool 25× más grande que base actual","Cada email nuevo compone en el tiempo","Habilita Fases 2 y 3 del playbook","Múltiples canales de adquisición"].map((t,i)=>(<div key={i} style={{fontSize:9,color:"rgba(34,197,94,0.7)",marginBottom:3}}>• {t}</div>))}
                    </div>
                  </div>

                  {/* Conversion Column */}
                  <div style={{background:"rgba(239,68,68,0.03)",border:"1px solid rgba(239,68,68,0.1)",borderRadius:10,padding:mob?"14px":"20px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12,flexWrap:"wrap"}}>
                      <span style={{fontSize:18}}>🔧</span>
                      <div><div style={{fontSize:12,fontWeight:700,color:"#EF4444"}}>Optimizar Conversión</div></div>
                      <span style={{background:"rgba(239,68,68,0.1)",color:"#EF4444",padding:"1px 6px",borderRadius:3,fontSize:8,fontWeight:700}}>DEPRIORITIZADO</span>
                    </div>
                    {[["Pool disponible","3,500","#EF4444"],["Techo","~15-20%","#EF4444"],["Compounding","❌ No","#EF4444"],["Impacto (10→15%)","+$1,400/mo","#EF4444"],["Perfil retornos","Decreciente","#EF4444"]].map(([l,v,c],i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.03)"}}><span style={{fontSize:10,color:"#71717A"}}>{l}</span><span style={{fontSize:10,fontWeight:700,color:c}}>{v}</span></div>))}
                    <div style={{marginTop:12,paddingTop:10,borderTop:"1px solid rgba(239,68,68,0.08)"}}>
                      <div style={{fontSize:9,color:"#71717A",marginBottom:6}}>Limitaciones:</div>
                      {["Ya al 10.3% (bueno para la industria)","10→15% solo añade $1,400/mo","Retornos decrecientes al subir %","No escala sin más subs"].map((t,i)=>(<div key={i} style={{fontSize:9,color:"rgba(239,68,68,0.7)",marginBottom:3}}>• {t}</div>))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Impact Multiplier */}
              <div style={{background:"rgba(212,168,67,0.03)",border:"1px solid rgba(212,168,67,0.12)",borderRadius:12,padding:mob?"14px":"20px 24px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"#D4A843",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Multiplicador de Impacto</div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:mob?12:20,flexWrap:"wrap"}}>
                  <div><div style={{fontSize:mob?30:38,fontWeight:800,color:"#22C55E",fontFamily:"'Space Grotesk'"}}>8.6×</div><div style={{fontSize:9,color:"#71717A"}}>más impacto con email acquisition</div></div>
                  {!mob&&<div style={{width:1,height:50,background:"rgba(255,255,255,0.06)"}}/>}
                  <div style={{textAlign:"left",fontSize:10,color:"#71717A",lineHeight:1.8}}>
                    Email: <span style={{color:"#22C55E",fontWeight:600}}>+$12,000/mo</span> a 15K subs<br/>
                    Conversión: <span style={{color:"#EF4444",fontWeight:600}}>+$1,400/mo</span> (10→15%)<br/>
                    <span style={{color:"#D4A843",fontWeight:700}}>$12,000 ÷ $1,400 = 8.6× más impacto</span>
                  </div>
                </div>
              </div>
            </div>)}

          </div>)}

        {/* 💵 P&L CONTINUES */}
        {view==="pnl"&&(<div>
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"20px",marginBottom:16}}>
            <div style={{fontSize:10,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Monthly P&L — Rev vs Expenses vs Take-Home</div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={pnlComputed} margin={{top:5,right:30,bottom:5,left:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)"/><XAxis dataKey="monthLabel" tick={{fontSize:9,fill:"#71717A"}} tickLine={false} axisLine={{stroke:"#1A1A2E"}}/><YAxis tick={{fontSize:9,fill:"#71717A"}} tickLine={false} axisLine={false} tickFormatter={v=>fmt(v)}/><Tooltip content={<TT/>}/>
                <Bar dataKey="totalRev" name="Revenue" radius={[3,3,0,0]}>{pnlComputed.map((_,i)=><Cell key={i} fill={i===pnlComputed.length-1?"rgba(34,197,94,0.5)":"rgba(34,197,94,0.15)"}/>)}</Bar>
                <Bar dataKey="totalExp" name="Expenses" radius={[3,3,0,0]}>{pnlComputed.map((_,i)=><Cell key={i} fill={i===pnlComputed.length-1?"rgba(239,68,68,0.5)":"rgba(239,68,68,0.12)"}/>)}</Bar>
                <Line type="monotone" dataKey="hernan" stroke="#818CF8" strokeWidth={2} dot={{r:3,fill:"#818CF8"}} name="Hernán Take-Home"/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:16}}>
            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:14}}><div style={{fontSize:10,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em"}}>Revenue — {fmtMonthFull(latestPnl.month)}</div><div style={{fontSize:18,fontWeight:700,color:"#22C55E",fontFamily:"'Space Grotesk'"}}>{fmt(latestPnl.totalRev)}</div></div>
              {PNL_REVENUE.filter(r=>(latestPnl[r.key]||0)>0).sort((a,b)=>(latestPnl[b.key]||0)-(latestPnl[a.key]||0)).map(r=>{const val=latestPnl[r.key]||0;const share=latestPnl.totalRev>0?(val/latestPnl.totalRev*100).toFixed(0):0;const prevVal=prevPnl?(prevPnl[r.key]||0):0;const delta=prevVal>0?((val-prevVal)/prevVal*100).toFixed(0):"new";return(<div key={r.key} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.02)"}}><div style={{width:4,height:24,borderRadius:2,background:r.color,opacity:0.6}}/><div style={{flex:1,fontSize:11,color:"#A1A1AA"}}>{r.label}</div><div style={{fontSize:12,fontWeight:600,color:"#E4E4E7",fontFamily:"'JetBrains Mono'"}}>{fmt(val)}</div><div style={{fontSize:9,color:"#71717A",width:32,textAlign:"right"}}>{share}%</div><div style={{fontSize:9,color:delta==="new"?"#818CF8":Number(delta)>=0?"#22C55E":"#EF4444",width:44,textAlign:"right"}}>{delta==="new"?"new":Number(delta)>=0?"+"+delta+"%":delta+"%"}</div></div>)})}
            </div>
            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:14}}><div style={{fontSize:10,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em"}}>Expenses — {fmtMonthFull(latestPnl.month)}</div><div style={{fontSize:18,fontWeight:700,color:"#EF4444",fontFamily:"'Space Grotesk'"}}>{fmt(latestPnl.totalExp)}</div></div>
              {PNL_EXPENSES.filter(e=>(latestPnl[e.key]||0)>0).sort((a,b)=>(latestPnl[b.key]||0)-(latestPnl[a.key]||0)).map(e=>{const val=latestPnl[e.key]||0;const share=latestPnl.totalExp>0?(val/latestPnl.totalExp*100).toFixed(0):0;return(<div key={e.key} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.02)"}}><div style={{width:4,height:24,borderRadius:2,background:e.color,opacity:0.4}}/><div style={{flex:1,fontSize:11,color:"#A1A1AA"}}>{e.label}</div><div style={{fontSize:12,fontWeight:600,color:"#E4E4E7",fontFamily:"'JetBrains Mono'"}}>{fmt(val)}</div><div style={{fontSize:9,color:"#71717A",width:32,textAlign:"right"}}>{share}%</div></div>)})}
              <div style={{marginTop:12,padding:"10px 14px",background:"rgba(129,140,248,0.04)",border:"1px solid rgba(129,140,248,0.1)",borderRadius:8,display:"flex",justifyContent:"space-between"}}><div><div style={{fontSize:9,color:"#71717A",textTransform:"uppercase",marginBottom:2}}>Profit (50/50)</div><div style={{fontSize:10,color:"#71717A"}}>Margin: {latestPnl.margin}%</div></div><div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#818CF8",fontWeight:600}}>Hernán: {fmt(latestPnl.hernan)}</div><div style={{fontSize:11,color:"#D4A843",fontWeight:600}}>Dario: {fmt(latestPnl.dario)}</div></div></div>
            </div>
          </div>
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"20px",marginTop:16}}>
            <div style={{fontSize:10,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Monthly Summary</div>
            <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}><thead><tr>{["Month","Revenue","Expenses","Profit","Margin","Hernán","Dario"].map(h=>(<th key={h} style={{padding:"8px 10px",textAlign:h==="Month"?"left":"right",color:"#71717A",borderBottom:"1px solid rgba(255,255,255,0.04)",fontWeight:600,fontSize:9,textTransform:"uppercase"}}>{h}</th>))}</tr></thead><tbody>{pnlComputed.map((row,i)=>(<tr key={row.month} style={{background:i===pnlComputed.length-1?"rgba(34,197,94,0.03)":"transparent"}}><td style={{padding:"6px 10px",color:i===pnlComputed.length-1?"#22C55E":"#71717A",fontWeight:i===pnlComputed.length-1?600:400}}>{row.monthLabel}</td><td style={{padding:"6px 10px",textAlign:"right",color:"#E4E4E7"}}>{fmt(row.totalRev)}</td><td style={{padding:"6px 10px",textAlign:"right",color:"#EF4444"}}>{fmt(row.totalExp)}</td><td style={{padding:"6px 10px",textAlign:"right",color:"#22C55E",fontWeight:600}}>{fmt(row.profit)}</td><td style={{padding:"6px 10px",textAlign:"right",color:"#D4A843"}}>{row.margin}%</td><td style={{padding:"6px 10px",textAlign:"right",color:"#818CF8"}}>{fmt(row.hernan)}</td><td style={{padding:"6px 10px",textAlign:"right",color:"#D4A843"}}>{fmt(row.dario)}</td></tr>))}</tbody></table></div>
          </div>
        </div>)}

        {/* 📈 FOLLOWERS */}
        {view==="followers"&&(<div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"24px"}}>
          <div style={{fontSize:10,color:"#71717A",marginBottom:20,textTransform:"uppercase",letterSpacing:"0.1em"}}>Latest: {fmtMonth(latestFollowers.month)} — {enhancedChannels}/8 Captured {liveStats&&(liveStats.youtube||liveStats.instagram)&&<span style={{color:"#22C55E",fontSize:8,background:"rgba(34,197,94,0.1)",padding:"2px 6px",borderRadius:3,marginLeft:8}}>● LIVE {liveStats.youtube?"YT":""}{liveStats.youtube&&liveStats.instagram?"+":""}{liveStats.instagram?"IG":""}</span>}</div>
          <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10}}>{CH_META.map(ch=>{const val=Number(enhancedFollowers[ch.dbCol])||0;const isLive=!!liveFollowerOverrides[ch.key];const pv=prevFollowers?Number(prevFollowers[ch.dbCol])||0:0;const d=prevFollowers?val-pv:0;return(<div key={ch.key} style={{background:val>0?"rgba(255,255,255,0.02)":"rgba(255,255,255,0.01)",border:val>0?`1px solid ${ch.color}20`:"1px solid rgba(255,255,255,0.03)",borderRadius:8,padding:"14px 16px",position:"relative",overflow:"hidden"}}>{val>0&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${ch.color}60,transparent)`}}/>}<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><span style={{fontSize:16}}>{ch.key==="linkedin"?<span style={{fontWeight:800,color:ch.color,fontSize:13}}>in</span>:ch.icon}</span><span style={{fontSize:11,color:"#A1A1AA",fontWeight:500}}>{ch.name}</span>{isLive?<span style={{fontSize:7,marginLeft:"auto",fontWeight:700,letterSpacing:"0.08em",padding:"1px 5px",borderRadius:3,color:"#22C55E",background:"rgba(34,197,94,0.12)"}}>● LIVE</span>:<span style={{fontSize:7,marginLeft:"auto",fontWeight:700,letterSpacing:"0.08em",padding:"1px 5px",borderRadius:3,color:val>0?"#22C55E":"#F59E0B",background:val>0?"rgba(34,197,94,0.08)":"rgba(245,158,11,0.08)"}}>{val>0?"✓":"—"}</span>}</div><div style={{fontSize:24,fontWeight:700,color:val>0?ch.color:"#71717A",fontFamily:"'Space Grotesk'"}}>{val>0?fmtK(val):"—"}</div>{d!==0&&<div style={{fontSize:10,color:d>0?"#22C55E":"#EF4444",marginTop:4}}>{d>0?"+":""}{fmtK(d)} ({pct(val,pv)}%)</div>}</div>)})}</div>
        </div>)}

        {/* 🚀 VELOCITY */}
        {view==="velocity"&&(<div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"24px"}}>
          {!growthData?(<div style={{textAlign:"center",padding:40}}><div style={{fontSize:36,marginBottom:12}}>📊</div><div style={{fontSize:14,color:"#A1A1AA",marginBottom:8}}>Need 2+ snapshots for velocity</div></div>):(
          <><div style={{fontSize:10,color:"#71717A",marginBottom:20,textTransform:"uppercase",letterSpacing:"0.1em"}}>Growth: {growthData.fromMonth} → {growthData.toMonth}</div>
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:12,marginBottom:24}}>
              <div style={{background:"rgba(34,197,94,0.03)",border:"1px solid rgba(34,197,94,0.1)",borderRadius:8,padding:16}}><div style={{fontSize:9,color:"#71717A",textTransform:"uppercase",marginBottom:6}}>Net New Followers</div><div style={{fontSize:28,fontWeight:700,color:growthData.totalDelta>=0?"#22C55E":"#EF4444",fontFamily:"'Space Grotesk'"}}>{growthData.totalDelta>=0?"+":""}{fmtK(growthData.totalDelta)}</div></div>
              <div style={{background:"rgba(212,168,67,0.03)",border:"1px solid rgba(212,168,67,0.1)",borderRadius:8,padding:16}}><div style={{fontSize:9,color:"#71717A",textTransform:"uppercase",marginBottom:6}}>Blended Rev/1K</div><div style={{fontSize:28,fontWeight:700,color:"#D4A843",fontFamily:"'Space Grotesk'"}}>${revPer1K}</div></div>
              <div style={{background:"rgba(129,140,248,0.03)",border:"1px solid rgba(129,140,248,0.1)",borderRadius:8,padding:16}}><div style={{fontSize:9,color:"#71717A",textTransform:"uppercase",marginBottom:6}}>Marginal Rev/1K</div><div style={{fontSize:28,fontWeight:700,color:"#818CF8",fontFamily:"'Space Grotesk'"}}>{growthData.marginalRevPer1K!=="—"?"$"+growthData.marginalRevPer1K:"—"}</div></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10}}>{growthData.channels.map(ch=>(<div key={ch.key} style={{background:"rgba(255,255,255,0.015)",border:`1px solid ${ch.color}15`,borderRadius:8,padding:"12px 14px"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:11,color:ch.color,fontWeight:600}}>{ch.name}</span><span style={{fontSize:10,color:ch.delta>0?"#22C55E":ch.delta<0?"#EF4444":"#52525B",fontWeight:600}}>{ch.delta>0?"+":""}{fmtK(ch.delta)}</span></div><div style={{fontSize:18,fontWeight:700,color:"#E4E4E7",fontFamily:"'Space Grotesk'"}}>{fmtK(ch.curr)}</div><div style={{fontSize:9,color:"#71717A",marginTop:4}}>{ch.pctChange!=="—"?(ch.delta>=0?"+":"")+ch.pctChange+"%":"No prior"}</div></div>))}</div>
          </>)}
        </div>)}

        {/* 💰 REVENUE */}
        {view==="revenue"&&revenueData.length>0&&(<div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"20px 16px 10px"}}>
          <div style={{fontSize:10,color:"#71717A",marginBottom:14,paddingLeft:8,textTransform:"uppercase",letterSpacing:"0.1em"}}>Monthly Revenue — Stacked (Supabase)</div>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={revenueData} margin={{top:5,right:20,bottom:5,left:5}}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)"/><XAxis dataKey="month" tick={{fontSize:9,fill:"#71717A"}} tickLine={false} axisLine={{stroke:"#1A1A2E"}}/><YAxis tick={{fontSize:10,fill:"#71717A"}} tickLine={false} axisLine={false} tickFormatter={v=>fmt(v)}/><Tooltip content={<TT/>}/><Bar dataKey="youtube" stackId="a" fill="#FF0000" name="YouTube"/><Bar dataKey="gumroad_substack" stackId="a" fill="#FF6719" name="Gumroad+Substack"/><Bar dataKey="sponsors" stackId="a" fill="#D4A843" name="Sponsors"/><Bar dataKey="spotify" stackId="a" fill="#1DB954" name="Spotify"/><Bar dataKey="events" stackId="a" fill="#818CF8" name="Events" radius={[3,3,0,0]}/></BarChart>
          </ResponsiveContainer>
          <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(5,1fr)",gap:8,marginTop:16,padding:"0 8px"}}>{STREAMS.map(s=>{const val=latest[s.chartKey]||0;const share=latest.total>0?(val/latest.total*100).toFixed(0):0;return(<div key={s.key} style={{background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.03)",borderRadius:8,padding:"10px 12px"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:10,color:s.color,fontWeight:600}}>{s.label}</span><span style={{fontSize:9,color:"#71717A"}}>{share}%</span></div><div style={{fontSize:16,fontWeight:700,color:"#E4E4E7",fontFamily:"'Space Grotesk'"}}>{fmt(val)}</div></div>)})}</div>
        </div>)}

        {/* 📊 PROFIT */}
        {view==="profit"&&profitData.length>0&&(<div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"20px 16px 10px"}}>
          <div style={{fontSize:10,color:"#71717A",marginBottom:14,paddingLeft:8,textTransform:"uppercase",letterSpacing:"0.1em"}}>Revenue vs Expenses — Margin %</div>
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={profitData} margin={{top:5,right:30,bottom:5,left:5}}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)"/><XAxis dataKey="month" tick={{fontSize:9,fill:"#71717A"}} tickLine={false} axisLine={{stroke:"#1A1A2E"}}/><YAxis yAxisId="money" tick={{fontSize:10,fill:"#71717A"}} tickLine={false} axisLine={false} tickFormatter={v=>fmt(v)}/><YAxis yAxisId="pct" orientation="right" tick={{fontSize:10,fill:"#71717A"}} tickLine={false} axisLine={false} tickFormatter={v=>v+"%"} domain={[0,100]}/><Tooltip content={<TT/>}/><Bar yAxisId="money" dataKey="total" name="Revenue" radius={[3,3,0,0]}>{profitData.map((_,i)=><Cell key={i} fill={i===profitData.length-1?"rgba(34,197,94,0.5)":"rgba(34,197,94,0.15)"}/>)}</Bar><Bar yAxisId="money" dataKey="expenses" name="Expenses" radius={[3,3,0,0]}>{profitData.map((_,i)=><Cell key={i} fill={i===profitData.length-1?"rgba(239,68,68,0.5)":"rgba(239,68,68,0.12)"}/>)}</Bar><Line yAxisId="pct" type="monotone" dataKey="margin" stroke="#D4A843" strokeWidth={2} dot={{r:3,fill:"#D4A843"}} name="Margin %"/></ComposedChart>
          </ResponsiveContainer>
        </div>)}

        {/* 🔮 MODEL */}
        {view==="model"&&(<div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"24px"}}>
          <div style={{fontSize:10,color:"#71717A",marginBottom:20,textTransform:"uppercase",letterSpacing:"0.1em"}}>Revenue Model — per 1K followers</div>
          <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:28}}>{[{t:15000,l:"$15K/mo"},{t:20000,l:"$20K/mo"},{t:30000,l:"$30K/mo"},{t:50000,l:"$50K/mo"}].map((t,i)=>{const rate=parseFloat(revPer1K)||0;const needed=rate>0?Math.round(t.t/rate*1000):0;const gap=needed-enhancedTotal;return(<div key={i} style={{background:i===0?"rgba(34,197,94,0.03)":"rgba(255,255,255,0.015)",border:`1px solid ${i===0?"rgba(34,197,94,0.1)":"rgba(255,255,255,0.03)"}`,borderRadius:8,padding:"16px"}}><div style={{fontSize:20,fontWeight:700,color:i===0?"#22C55E":"#D4A843",fontFamily:"'Space Grotesk'",marginBottom:8}}>{t.l}</div><div style={{fontSize:11,color:"#A1A1AA",marginBottom:4}}>Need: <span style={{fontWeight:600,color:"#E4E4E7"}}>{fmtK(needed)}</span></div><div style={{fontSize:11,color:"#A1A1AA"}}>Gap: <span style={{fontWeight:600,color:gap>0?"#F59E0B":"#22C55E"}}>{gap>0?"+"+fmtK(gap):"✓ Met"}</span></div></div>)})}</div>
          <div style={{background:"rgba(212,168,67,0.03)",border:"1px solid rgba(212,168,67,0.08)",borderRadius:8,padding:"16px 20px"}}><div style={{fontSize:12,color:"#D4A843",fontWeight:600,marginBottom:8}}>The 10AMPRO Flywheel</div><div style={{fontSize:11,color:"#71717A",lineHeight:1.6}}>TikTok/IG clips → YouTube episodes → Substack deep dives → Gumroad + Substack premium → Sponsors.</div></div>
        </div>)}

        {/* 📊 SHORTS → EMAIL */}
                {/* 🔄 CONVERSIÓN — All Channels */}
        {view==="conversion"&&(<div>
          {/* Top-Level KPIs */}
          <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:16}}>
            {[
              {label:"Total Subs (All Time)",value:"4,310",sub:"From Substack sources CSV",color:"#FF6719"},
              {label:"Total Visitors Tracked",value:"118K+",sub:"All sources combined",color:"#22C55E"},
              {label:"Best Converter",value:"YouTube",sub:"13.7% visitor→sub rate",color:"#FF0000"},
              {label:"Revenue from Subs",value:"$36.9K",sub:"All-time from sources data",color:"#D4A843"},
            ].map((k,i)=>(<div key={i} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:8,padding:"14px 16px"}}><div style={{fontSize:9,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>{k.label}</div><div style={{fontSize:24,fontWeight:700,color:k.color,fontFamily:"'Space Grotesk'"}}>{k.value}</div><div style={{fontSize:10,color:"#71717A",marginTop:4}}>{k.sub}</div></div>))}
          </div>

          {/* Conversion Rate by Channel — the money chart */}
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:12,padding:"20px",marginBottom:16}}>
            <div style={{fontSize:10,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:16}}>Conversion Rate by Source (Visitor → Subscriber)</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[
                {source:"YouTube",subs:126,visitors:917,rate:13.7,color:"#FF0000",rev:"$1,680"},
                {source:"TikTok",subs:13,visitors:104,rate:12.5,color:"#00F2EA",rev:"$0"},
                {source:"Instagram",subs:62,visitors:752,rate:8.2,color:"#E1306C",rev:"$0"},
                {source:"Google (SEO)",subs:221,visitors:2764,rate:8.0,color:"#4285F4",rev:"$6,888"},
                {source:"PodcastAI",subs:93,visitors:1402,rate:6.6,color:"#818CF8",rev:"$480"},
                {source:"Substack Ecosystem",subs:559,visitors:30114,rate:1.9,color:"#FF6719",rev:"$8,728"},
                {source:"X / Twitter",subs:140,visitors:3113,rate:4.5,color:"#A1A1AA",rev:"$2,640"},
                {source:"LinkedIn",subs:27,visitors:908,rate:3.0,color:"#0A66C2",rev:"$0"},
                {source:"Direct",subs:608,visitors:47178,rate:1.3,color:"#71717A",rev:"$6,642"},
                {source:"Direct to App",subs:158,visitors:25463,rate:0.6,color:"#71717A",rev:"$1,440"},
              ].map((ch,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",background:i%2===0?"rgba(255,255,255,0.015)":"transparent",borderRadius:6}}>
                <div style={{width:mob?80:120,fontSize:11,color:ch.color,fontWeight:600,flexShrink:0}}>{ch.source}</div>
                <div style={{flex:1,height:20,background:"rgba(255,255,255,0.04)",borderRadius:4,overflow:"hidden",position:"relative"}}>
                  <div style={{height:"100%",borderRadius:4,background:ch.color,width:`${Math.min(ch.rate/14*100,100)}%`,opacity:0.6,transition:"width 0.5s"}}/>
                  <div style={{position:"absolute",top:2,left:8,fontSize:10,fontWeight:700,color:"#E4E4E7"}}>{ch.rate}%</div>
                </div>
                <div style={{width:50,textAlign:"right",fontSize:11,color:"#A1A1AA",fontWeight:600}}>{ch.subs}</div>
                <div style={{width:mob?0:70,textAlign:"right",fontSize:10,color:"#71717A",display:mob?"none":"block"}}>{ch.rev}</div>
              </div>))}
            </div>
            <div style={{display:"flex",gap:16,marginTop:12,fontSize:10,color:"#71717A",justifyContent:"flex-end"}}>
              <span>Bar = conversion rate</span><span>Number = total subs</span>{!mob&&<span>Right = revenue attributed</span>}
            </div>
          </div>

          {/* Substack Recommendations — free growth engine */}
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:12,padding:"20px",marginBottom:16}}>
            <div style={{fontSize:10,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>Substack Recommendations Network</div>
            <div style={{fontSize:10,color:"#71717A",marginBottom:16}}>Other Substacks recommending 10AMPRO — free subscriber acquisition</div>
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:10}}>
              {[
                {name:"ARIAS FINANCIAL ACADEMY",subs:178,rev:"$1,360",color:"#FF6719",badge:"#1 referrer"},
                {name:"Macrowise Newsletter",subs:69,rev:"$400",color:"#D4A843",badge:"finance niche"},
                {name:"Hermanos Bilbao",subs:35,rev:"$0",color:"#22C55E",badge:"NEW — 35 subs in 2 days"},
                {name:"La Estrategia Emergente",subs:10,rev:"$0",color:"#818CF8",badge:"steady"},
                {name:"Investment Edge",subs:9,rev:"$0",color:"#A1A1AA",badge:"finance"},
                {name:"Nicolás Fernández",subs:3,rev:"$0",color:"#71717A",badge:"co-host"},
              ].map((r,i)=>(<div key={i} style={{background:"rgba(255,255,255,0.015)",border:`1px solid ${r.color}20`,borderRadius:8,padding:"12px 14px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:11,color:r.color,fontWeight:600}}>{r.name}</span><span style={{fontSize:8,color:r.color,background:`${r.color}15`,padding:"1px 6px",borderRadius:3,fontWeight:600}}>{r.badge}</span></div><div style={{fontSize:18,fontWeight:700,color:"#E4E4E7",fontFamily:"'Space Grotesk'"}}>{r.subs} subs</div>{r.rev!=="$0"&&<div style={{fontSize:10,color:"#22C55E",marginTop:2}}>→ {r.rev} revenue</div>}</div>))}
            </div>
          </div>

          {/* Substack Notes Performance */}
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:12,padding:"20px",marginBottom:16}}>
            <div style={{fontSize:10,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>Substack Notes — Top Performing</div>
            <div style={{fontSize:10,color:"#71717A",marginBottom:16}}>Notes that drove subscriber acquisition</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {[
                {note:"El DNA de 10ampro",author:"Hernán",subs:17,rev:"$400"},
                {note:"Tarifas, Tensiones y Tesoros",author:"Hernán",subs:17,rev:"$0"},
                {note:"La tesis del 10x de 10ampro",author:"Hernán",subs:15,rev:"$0"},
                {note:"Lo que miramos en el WhatsApp 10amalpha",author:"Hernán",subs:12,rev:"$0"},
                {note:"El origen de las opciones",author:"Hernán",subs:11,rev:"$0"},
                {note:"El ecosistema 10am está detonando...",author:"Guillermo",subs:11,rev:"$400"},
                {note:"Obligatoriamente se tiene q leer esto",author:"Darío",subs:7,rev:"$0"},
              ].map((n,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 10px",background:i%2===0?"rgba(255,255,255,0.015)":"transparent",borderRadius:4}}>
                <div style={{width:20,textAlign:"center",fontSize:11,color:"#71717A",fontWeight:600}}>{i+1}</div>
                <div style={{flex:1,fontSize:11,color:"#A1A1AA"}}>{n.note}</div>
                <div style={{fontSize:10,color:"#71717A"}}>{n.author}</div>
                <div style={{fontSize:12,fontWeight:700,color:"#FF6719",width:40,textAlign:"right"}}>{n.subs}</div>
              </div>))}
            </div>
          </div>

          {/* Monthly Trends Chart */}
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:12,padding:"20px",marginBottom:16}}>
            <div style={{fontSize:10,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:16}}>Monthly: New Subs + Shorts Views + Google SEO</div>
            <div style={{width:"100%",overflowX:"auto"}}>
              <ComposedChart width={mob?360:780} height={280} data={[
                {m:"Abr 25",subs:862,google:0,shorts:0},
                {m:"May 25",subs:435,google:12,shorts:0},
                {m:"Jun 25",subs:203,google:8,shorts:0},
                {m:"Jul 25",subs:190,google:11,shorts:0},
                {m:"Ago 25",subs:268,google:13,shorts:0},
                {m:"Sep 25",subs:173,google:6,shorts:0},
                {m:"Oct 25",subs:234,google:16,shorts:63000},
                {m:"Nov 25",subs:172,google:5,shorts:0},
                {m:"Dic 25",subs:203,google:14,shorts:62936},
                {m:"Ene 26",subs:612,google:51,shorts:859240},
                {m:"Feb 26",subs:473,google:70,shorts:226457},
                {m:"Mar 26*",subs:208,google:15,shorts:0},
              ]} margin={{top:5,right:50,bottom:5,left:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)"/>
                <XAxis dataKey="m" tick={{fontSize:9,fill:"#71717A"}} tickLine={false} axisLine={{stroke:"#1A1A2E"}}/>
                <YAxis yAxisId="subs" tick={{fontSize:10,fill:"#FF6719"}} tickLine={false} axisLine={false} orientation="left"/>
                <YAxis yAxisId="views" tick={{fontSize:9,fill:"#71717A"}} tickLine={false} axisLine={false} orientation="right" tickFormatter={v=>v>=1000?(v/1000).toFixed(0)+"K":""+v}/>
                <Tooltip content={({active,payload,label})=>{if(!active||!payload?.length)return null;return(<div style={{background:"rgba(8,10,15,0.96)",border:"1px solid rgba(34,197,94,0.25)",borderRadius:8,padding:"10px 14px",fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}><p style={{color:"#22C55E",marginBottom:6,fontWeight:600,fontSize:12}}>{label}</p>{payload.map((p,i)=>(<p key={i} style={{color:p.color||"#A1A1AA",margin:"2px 0"}}>{p.name}: <span style={{fontWeight:700}}>{p.dataKey==="subs"?p.value.toLocaleString()+" subs":p.dataKey==="google"?p.value+" from SEO":p.value>=1000?(p.value/1000).toFixed(0)+"K views":""+p.value}</span></p>))}</div>)}}/>
                <Bar yAxisId="subs" dataKey="subs" fill="#FF6719" name="New Subs" radius={[4,4,0,0]}/>
                <Line yAxisId="subs" type="monotone" dataKey="google" stroke="#4285F4" strokeWidth={2} dot={{r:3,fill:"#4285F4"}} name="Google SEO Subs"/>
                <Line yAxisId="views" type="monotone" dataKey="shorts" stroke="#E1306C" strokeWidth={2} dot={{r:3,fill:"#E1306C"}} name="Shorts Views"/>
              </ComposedChart>
            </div>
            <div style={{display:"flex",gap:16,marginTop:8,padding:"0 8px"}}>
              {[{c:"#FF6719",l:"New Subs (total)"},{c:"#4285F4",l:"Google SEO subs"},{c:"#E1306C",l:"Shorts Views"}].map((lg,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:2,background:lg.c}}/><span style={{fontSize:10,color:"#71717A"}}>{lg.l}</span></div>))}
            </div>
          </div>

          {/* Insights Cards */}
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:12,marginBottom:16}}>
            <div style={{background:"rgba(66,133,244,0.03)",border:"1px solid rgba(66,133,244,0.12)",borderRadius:12,padding:"16px"}}>
              <div style={{fontSize:11,color:"#4285F4",fontWeight:600,marginBottom:8}}>Google SEO → Silently winning</div>
              <div style={{fontSize:11,color:"#A1A1AA",lineHeight:1.6}}>221 subs, 8% conv, <span style={{color:"#22C55E",fontWeight:600}}>$6,888 revenue</span>. Went from 0→51 subs/mo in Jan, 70 in Feb. Highest revenue per channel after Direct. SEO is compounding.</div>
            </div>
            <div style={{background:"rgba(255,0,0,0.03)",border:"1px solid rgba(255,0,0,0.12)",borderRadius:12,padding:"16px"}}>
              <div style={{fontSize:11,color:"#FF0000",fontWeight:600,marginBottom:8}}>YouTube → Highest converter</div>
              <div style={{fontSize:11,color:"#A1A1AA",lineHeight:1.6}}>13.7% conversion rate. Only 917 visitors but 126 subs and <span style={{color:"#22C55E",fontWeight:600}}>$1,680 revenue</span>. Every YouTube click is worth 10x an IG click. Optimize descriptions + pinned comment.</div>
            </div>
            <div style={{background:"rgba(225,48,108,0.03)",border:"1px solid rgba(225,48,108,0.12)",borderRadius:12,padding:"16px"}}>
              <div style={{fontSize:11,color:"#E1306C",fontWeight:600,marginBottom:8}}>Shorts → Volume problem</div>
              <div style={{fontSize:11,color:"#A1A1AA",lineHeight:1.6}}>1.15M views, 0.14% conv. IG converts at 8.2% <em>when people click</em> — but only 752 visitors from 590K views. The CTA bridge is missing. TikTok same: 12.5% conv but only 104 visitors.</div>
            </div>
          </div>

          {/* Episode Conversion Impact */}
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:12,padding:"20px",marginBottom:16}}>
            <div style={{fontSize:10,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>Episode Conversion Impact</div>
            <div style={{fontSize:10,color:"#71717A",marginBottom:16}}>New subs in 3-day window after episode premiere (from Substack sources CSV)</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead><tr>
                  {["Ep","Title","3-Day Subs","Revenue","Pattern"].map((h,i)=>(<th key={i} style={{textAlign:i>1?"right":"left",padding:"8px 10px",color:"#71717A",fontSize:9,textTransform:"uppercase",letterSpacing:"0.08em",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>{h}</th>))}
                </tr></thead>
                <tbody>
                  {[
                    {ep:"E195",title:"$STKE CTO: Validators, SOL",subs:94,rev:"$1,440",pattern:"Crypto/Solana = highest spike. D+1 had 58 subs alone.",color:"#22C55E",top:true},
                    {ep:"E189",title:"Colombia + Venezuela",subs:74,rev:"$2,320",pattern:"Geopolítica LATAM. D+1 to D+3 growing (34→27→37).",color:"#22C55E",top:true},
                    {ep:"E191",title:"Wenia sponsor ep",subs:64,rev:"$1,680",pattern:"Sponsor ep does NOT hurt conversion. Still converts.",color:"#D4A843"},
                    {ep:"E190",title:"Forecast 2026",subs:54,rev:"$880",pattern:"Predictions = new audience magnet.",color:"#D4A843"},
                    {ep:"E196",title:"Colombia vs Argentina",subs:51,rev:"$2,736",pattern:"Highest revenue. Country rivalry = engagement + paid.",color:"#22C55E",top:true},
                    {ep:"E193",title:"(Feb 5 episode)",subs:42,rev:"$2,160",pattern:"Strong revenue despite avg subs.",color:"#A1A1AA"},
                    {ep:"E194",title:"Un meteorito: Intel",subs:32,rev:"$960",pattern:"Tech/semis — average conversion.",color:"#A1A1AA"},
                    {ep:"E198",title:"2028 sin trabajo",subs:31,rev:"$960",pattern:"AI + employment — good engagement.",color:"#A1A1AA"},
                    {ep:"E197",title:"Estado grande + IA",subs:27,rev:"$480",pattern:"Politics + AI — lower engagement.",color:"#71717A"},
                    {ep:"E199",title:"Internet del futuro",subs:26,rev:"$1,360",pattern:"Infra/tech — avg subs but good rev.",color:"#A1A1AA"},
                    {ep:"E192",title:"(Jan 29 episode)",subs:25,rev:"$1,760",pattern:"Below avg subs but solid revenue.",color:"#A1A1AA"},
                  ].map((e,i)=>(<tr key={i} style={{background:i%2===0?"rgba(255,255,255,0.015)":"transparent"}}>
                    <td style={{padding:"8px 10px",color:e.top?"#22C55E":"#A1A1AA",fontWeight:700,fontFamily:"'Space Grotesk'",whiteSpace:"nowrap"}}>{e.ep}</td>
                    <td style={{padding:"8px 10px",color:"#E4E4E7",fontSize:11,maxWidth:mob?120:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.title}</td>
                    <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:e.subs>=50?"#22C55E":e.subs>=30?"#D4A843":"#A1A1AA",fontFamily:"'Space Grotesk'",fontSize:14}}>{e.subs}</td>
                    <td style={{padding:"8px 10px",textAlign:"right",color:parseFloat(e.rev.replace(/[$,]/g,""))>=2000?"#22C55E":"#71717A",fontSize:11}}>{e.rev}</td>
                    <td style={{padding:"8px 10px",color:"#71717A",fontSize:10,maxWidth:mob?100:300,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.pattern}</td>
                  </tr>))}
                </tbody>
              </table>
            </div>
            {/* Patterns summary */}
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:10,marginTop:16}}>
              {[
                {label:"Crypto/Solana",insight:"Highest sub spike (94). Brings new audience from DeFi community.",color:"#22C55E",icon:"₿"},
                {label:"Geopolítica LATAM",insight:"Highest revenue ($2.7K). Country-specific topics drive paid conversions.",color:"#D4A843",icon:"🌎"},
                {label:"Sponsor episodes",insight:"No cannibalization. E191 (Wenia) still got 64 subs + $1.7K rev.",color:"#818CF8",icon:"🤝"},
              ].map((p,i)=>(<div key={i} style={{background:`${p.color}08`,border:`1px solid ${p.color}20`,borderRadius:8,padding:"12px 14px"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><span style={{fontSize:14}}>{p.icon}</span><span style={{fontSize:11,color:p.color,fontWeight:600}}>{p.label}</span></div>
                <div style={{fontSize:10,color:"#71717A",lineHeight:1.5}}>{p.insight}</div>
              </div>))}
            </div>
          </div>

          {/* Emerging Signals — Expanded */}
          <div style={{background:"rgba(212,168,67,0.03)",border:"1px solid rgba(212,168,67,0.1)",borderRadius:12,padding:"20px"}}>
            <div style={{fontSize:12,color:"#D4A843",fontWeight:600,marginBottom:4}}>Señales emergentes & accionables</div>
            <div style={{fontSize:10,color:"#71717A",marginBottom:16}}>Insights del CSV de Substack sources — datos reales, no estimados</div>

            {/* Tier 1: High Impact */}
            <div style={{fontSize:9,color:"#22C55E",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8,fontWeight:600}}>Alto impacto — actuar esta semana</div>
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:10,marginBottom:20}}>
              {[
                {signal:"Hermanos Bilbao: 35 subs en 2 días",detail:"Recomendación de Substack (Mar 16-17). Nuevo aliado con conversión explosiva. Contactar para cross-promo sostenida — podrían ser los próximos ARIAS.",color:"#22C55E",action:"DM/email esta semana"},
                {signal:"Google SEO: 0→51→70 subs/mo",detail:"Trending up agresivamente. Genera $6,888 en revenue (8% conv). El contenido indexado de 10am.pro está rindiendo. Invertir en SEO de los deep dives — cada artículo es un activo permanente.",color:"#4285F4",action:"Optimizar títulos/meta de posts"},
                {signal:"ARIAS FINANCIAL ACADEMY: 178 subs, $1.4K rev",detail:"El referral #1 por lejos. 178 subs gratis. Considerar alianza formal: cross-recs mutuas, guest episode, co-branded content. Cada sub de ARIAS ya viene pre-calificado en finanzas.",color:"#FF6719",action:"Proponer alianza formal"},
                {signal:"Viernes = día de más revenue",detail:"Los viernes generan $9,136 en 2026 — 2x más que cualquier otro día. Coincide con premieres de podcast (Fri/Sat). Los subs del viernes PAGAN. Nunca mover el premiere del viernes.",color:"#D4A843",action:"Proteger el slot del viernes"},
              ].map((s,i)=>(<div key={i} style={{display:"flex",gap:10,padding:"12px 14px",background:"rgba(255,255,255,0.02)",border:`1px solid ${s.color}15`,borderRadius:8}}>
                <div style={{width:4,borderRadius:2,background:s.color,flexShrink:0}}/>
                <div style={{flex:1}}><div style={{fontSize:12,color:"#E4E4E7",fontWeight:600,marginBottom:3}}>{s.signal}</div><div style={{fontSize:10,color:"#71717A",lineHeight:1.5,marginBottom:6}}>{s.detail}</div><div style={{fontSize:9,color:s.color,fontWeight:600,background:`${s.color}10`,display:"inline-block",padding:"2px 8px",borderRadius:3}}>→ {s.action}</div></div>
              </div>))}
            </div>

            {/* Tier 2: Growth Levers */}
            <div style={{fontSize:9,color:"#818CF8",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8,fontWeight:600}}>Palancas de crecimiento — optimizar este mes</div>
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:10,marginBottom:20}}>
              {[
                {signal:"Notas de Hernán = 238 subs de 42 notas",detail:"Promedio 5.7 subs/nota, gratis. Las mejores: 'El DNA de 10ampro' (17), 'Tarifas y Tesoros' (17), 'Tesis del 10x' (15). Temas meta + tesis macro convierten más. Publicar 2-3 notas/semana mínimo.",color:"#FF6719",action:"Cadencia de 3 notas/semana"},
                {signal:"Guillermo Valencia: 8.5 subs/nota (2 notas, 17 subs)",detail:"La conversión por nota más alta de todos los autores. Su endorsement tiene peso en la comunidad. Pedirle que postee 1 nota/mes mencionando 10AMPRO o compartiendo un deep dive.",color:"#818CF8",action:"Pedirle 1 nota/mes"},
                {signal:"PodcastAI: 93 subs, 6.6% conv",detail:"10ampro.onpodcastai.com genera 1,402 visitors con 6.6% conversión. Herramienta subestimada. Asegurar que cada episodio nuevo aparezca ahí con CTA a 10am.pro.",color:"#A855F7",action:"Verificar cada ep en PodcastAI"},
                {signal:"Substack Onboarding: 444 subs gratis",detail:"Gente que se suscribe durante el signup flow de Substack. Esto es tráfico orgánico de la plataforma — crece cuando 10am.pro aparece en recs, leaderboards, y search dentro de Substack. Optimizar description y tags.",color:"#FF6719",action:"Optimizar perfil/tags Substack"},
              ].map((s,i)=>(<div key={i} style={{display:"flex",gap:10,padding:"12px 14px",background:"rgba(255,255,255,0.015)",borderRadius:8}}>
                <div style={{width:4,borderRadius:2,background:s.color,flexShrink:0}}/>
                <div style={{flex:1}}><div style={{fontSize:12,color:"#E4E4E7",fontWeight:600,marginBottom:3}}>{s.signal}</div><div style={{fontSize:10,color:"#71717A",lineHeight:1.5,marginBottom:6}}>{s.detail}</div><div style={{fontSize:9,color:s.color,fontWeight:600,background:`${s.color}10`,display:"inline-block",padding:"2px 8px",borderRadius:3}}>→ {s.action}</div></div>
              </div>))}
            </div>

            {/* Tier 3: Watch & Learn */}
            <div style={{fontSize:9,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8,fontWeight:600}}>Monitorear — señales tempranas</div>
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:10}}>
              {[
                {signal:"Luma.com → tráfico pre-evento",detail:"26 visitors desde la página del Ep200 event en Luma. El evento ya genera discovery sin haberse celebrado. Post-evento: analizar cuántos registrantes convierten a paid.",color:"#818CF8"},
                {signal:"Shares creciendo: 14 subs en Feb (0 en Dic)",detail:"La gente está compartiendo 10am.pro con otros. Feb tuvo 14 share-subs vs 0 en Dic. También 11 gifts en Feb. El word-of-mouth se está activando.",color:"#22C55E"},
                {signal:"ChatGPT refiere tráfico",detail:"Feb 20: primer sub desde ChatGPT. AI referrals son nuevos (Perplexity también manda tráfico). El contenido de 10am.pro está siendo citado por LLMs — señal temprana de SEO en AI.",color:"#00F2EA"},
                {signal:"Tus tools Vercel refieren tráfico",detail:"info-diet (57 vis), 10ampro-hub (39 vis), btc-pension (19 vis), earningswatch (9 vis). Ninguno convierte a subs aún — agregar CTAs a 10am.pro en cada tool.",color:"#A1A1AA"},
              ].map((s,i)=>(<div key={i} style={{display:"flex",gap:10,padding:"10px 12px",background:"rgba(255,255,255,0.01)",borderRadius:6}}>
                <div style={{width:3,borderRadius:2,background:s.color,flexShrink:0}}/>
                <div><div style={{fontSize:11,color:"#A1A1AA",fontWeight:600,marginBottom:2}}>{s.signal}</div><div style={{fontSize:10,color:"#71717A",lineHeight:1.5}}>{s.detail}</div></div>
              </div>))}
            </div>
          </div>
        </div>)}

        {/* ⚙️ ADMIN */}
        {view==="admin"&&(<div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:"24px"}}>
          {!adminUnlocked?(<div style={{maxWidth:340,margin:"40px auto",textAlign:"center"}}><div style={{fontSize:24,marginBottom:12}}>🔒</div><div style={{fontSize:13,color:"#A1A1AA",marginBottom:16}}>Enter admin password</div><input type="password" value={adminPass} onChange={e=>setAdminPass(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&adminPass==="10ampro")setAdminUnlocked(true)}} placeholder="Password" style={{...iS,textAlign:"center",marginBottom:12}}/><button onClick={()=>{if(adminPass==="10ampro")setAdminUnlocked(true)}} style={{background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.2)",color:"#22C55E",padding:"8px 24px",borderRadius:6,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Unlock</button></div>):(
          <><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}><div><div style={{fontSize:14,fontWeight:600,color:"#E4E4E7",marginBottom:4}}>Monthly Snapshot</div><div style={{fontSize:11,color:"#71717A"}}>Enter followers + revenue.</div></div><input type="month" value={formMonth} onChange={e=>setFormMonth(e.target.value)} style={{...iS,width:180}}/></div>
            <div style={{fontSize:10,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Follower Counts</div>
            <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:24}}>{CH_META.map(ch=>(<div key={ch.key}><label style={{fontSize:10,color:ch.color,display:"block",marginBottom:4}}>{ch.icon} {ch.name}</label><input type="number" value={formData[ch.dbCol]} onChange={e=>setFormData(p=>({...p,[ch.dbCol]:e.target.value}))} placeholder="0" style={iS}/></div>))}</div>
            <div style={{fontSize:10,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Revenue</div>
            <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:24}}>{[{key:"rev_youtube",label:"YouTube",color:"#FF0000"},{key:"rev_gumroad_substack",label:"Gumroad+Substack",color:"#FF6719"},{key:"rev_sponsors",label:"Sponsors",color:"#D4A843"},{key:"rev_spotify",label:"Spotify",color:"#1DB954"},{key:"rev_events",label:"Events",color:"#818CF8"},{key:"rev_total",label:"Total Revenue",color:"#22C55E"},{key:"expenses",label:"Total Expenses",color:"#EF4444"}].map(f=>(<div key={f.key}><label style={{fontSize:10,color:f.color,display:"block",marginBottom:4}}>{f.label}</label><input type="number" value={formData[f.key]} onChange={e=>setFormData(p=>({...p,[f.key]:e.target.value}))} placeholder="0" style={iS}/></div>))}</div>
            <div style={{display:"flex",gap:12,alignItems:"center"}}><button onClick={handleSave} disabled={saving} style={{background:saving?"rgba(34,197,94,0.05)":"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.2)",color:"#22C55E",padding:"10px 32px",borderRadius:6,fontSize:13,cursor:saving?"default":"pointer",fontFamily:"inherit",fontWeight:600}}>{saving?"Saving...":"💾 Save"}</button>{saveMsg&&<span style={{fontSize:12,color:saveMsg.startsWith("Error")?"#EF4444":"#22C55E"}}>{saveMsg}</span>}</div>
            <div style={{marginTop:28,fontSize:10,color:"#71717A",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Snapshots ({snapshots.length})</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{snapshots.map(s=>{const hf=CH_META.some(c=>Number(s[c.dbCol])>0);const hr=Number(s.rev_total)>0;return(<button key={s.month} onClick={()=>setFormMonth(s.month)} style={{background:s.month===formMonth?"rgba(34,197,94,0.08)":"rgba(255,255,255,0.015)",border:s.month===formMonth?"1px solid rgba(34,197,94,0.2)":"1px solid rgba(255,255,255,0.04)",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontFamily:"inherit",color:s.month===formMonth?"#22C55E":"#52525B",fontSize:10}}>{fmtMonth(s.month)}{hf&&<span style={{color:"#818CF8",marginLeft:4}}>📈</span>}{hr&&<span style={{color:"#22C55E",marginLeft:2}}>💰</span>}</button>)})}</div>
          </>)}
        </div>)}

        <div style={{textAlign:"center",fontSize:8,color:"#71717A",paddingBottom:20,marginTop:28}}>10AMPRO Growth Command Center · {snapshots.length} snapshots · P&L {pnlComputed.length}mo · Last: {fmtMonth(pnlComputed[pnlComputed.length-1]?.month)} · Updated {new Date().toLocaleDateString("en-US",{month:"short",year:"2-digit"})} · <a href="https://10ampro-shorts-analytics.vercel.app" style={{color:"#71717A"}}>Shorts →</a></div>
      </div>
    </div>
  );
}
