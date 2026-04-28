// /api/admin-vercel-status — server-side query of Vercel API for cron registration status
const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN;
const TEAM = "team_nPG5TrnRZyVuclmm6dZL1AcX";
const PROJECT = "prj_nwKc9PV3nOvFJj2XzhUf0TPliKcp";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.query.pass !== "elgordo") return res.status(401).json({ error: "Unauthorized" });
  if (!VERCEL_TOKEN) return res.status(500).json({ error: "VERCEL_API_TOKEN not set in Vercel env vars. Add it in dashboard settings." });
  
  const headers = { Authorization: `Bearer ${VERCEL_TOKEN}` };
  try {
    const [projectR, cronsR, teamR] = await Promise.all([
      fetch(`https://api.vercel.com/v9/projects/${PROJECT}?teamId=${TEAM}`, { headers }),
      fetch(`https://api.vercel.com/v1/projects/${PROJECT}/crons?teamId=${TEAM}`, { headers }),
      fetch(`https://api.vercel.com/v2/teams/${TEAM}`, { headers }),
    ]);
    const project = await projectR.json();
    const crons = await cronsR.json();
    const team = await teamR.json();
    
    return res.status(200).json({
      now: new Date().toISOString(),
      team_plan: team.billing?.plan || team.plan || "unknown",
      team_name: team.name,
      project_name: project.name,
      project_disabled: project.disabledAt || null,
      project_live: project.live,
      crons_in_vercel_json: project.crons || "not in project response",
      crons_registered: crons,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
