import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
const SESSION = 'SUKHOTHAI2050';
const headers = {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const send = (payload, status=200) => new Response(JSON.stringify(payload),{status,headers});
const s = (x,max=200) => String(x??'').trim().slice(0,max);
const sha = raw => createHash('sha256').update(raw).digest('hex');
function checkHost(req){
 const expected=process.env.HOST_PASSCODE || '';
 const actual=req.headers.get('x-host-passcode') || '';
 if(expected.length<16||!actual || actual.length!==expected.length)return false;
 return timingSafeEqual(Buffer.from(actual),Buffer.from(expected));
}
function getCfg(){
 const base=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
 const secret=String(process.env.SUPABASE_SECRET_KEY||'');
 if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base) || !secret) throw Error('ยังไม่ได้ตั้งค่า SUPABASE_URL และ SUPABASE_SECRET_KEY ใน Netlify Environment variables');
 return {base,secret};
}
async function db(path, options={}){
 const {base,secret}=getCfg();
 const r=await fetch(`${base}/rest/v1/${path}`,{
  method:options.method||'GET',
  headers:{apikey:secret,'content-type':'application/json','accept':'application/json', ...(options.method==='POST'?{'prefer':'return=representation'}:{})},
  body:options.body===undefined?undefined:JSON.stringify(options.body),
  signal:AbortSignal.timeout(12000)
 });
 const txt=await r.text();let body;try{body=JSON.parse(txt)}catch{body={message:txt}};
 if(!r.ok){throw Error(body.message||body.details||`Database error (${r.status})`)}
 return body;
}
const q=(v)=>encodeURIComponent(v);
const rows=(r)=>Array.isArray(r)?r:[];
function tokenHash(payload){const t=s(payload.token,100); if(!/^[0-9a-f]{64}$/.test(t))throw Error('ไม่พบรหัสผู้เล่นในเครื่องนี้ กรุณาเข้าร่วมใหม่');return sha(t)}
function isUUID(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v||''))}
const rpc=(name,args)=>db(`rpc/${name}`,{method:'POST',body:args});
async function publicPayload(){
 const sessions=rows(await db(`game_sessions?code=eq.${SESSION}&select=id,code,title,state,active_crisis`));
 if(!sessions[0])throw Error('ไม่พบกิจกรรม SUKHOTHAI2050');
 const id=sessions[0].id;
 const scoresVisible=['results','closed'].includes(sessions[0].state);
 const [teams,projects,priorities,scores,featured,snapshots,progress,crisisResults,teamIssues,issueLinks] = await Promise.all([
  db(`teams?session_id=eq.${id}&is_active=eq.true&select=id,team_number,display_name,budget_total,max_players&order=team_number.asc`),
  db(`projects?session_id=eq.${id}&select=id,code,name_th,description_th,cost,is_active&order=code.asc`),
  db(`urban_priorities?session_id=eq.${id}&select=id,code,name_th,description_th,display_order,is_active&order=display_order.asc`),
  db(`team_scores?select=team_id,safety,environment,quality,heritage,total`),
  db(`featured_ideas?session_id=eq.${id}&is_visible=eq.true&select=id,display_name,team_label,project_label,idea_text,created_at&order=created_at.desc&limit=1`),
  db(`v6_phase_scores?select=team_id,phase,total`),
  db(`v6_game_progress?session_id=eq.${id}&select=crises_completed`),
  db(`v6_crisis_results?select=team_id,phase,crisis,score,alignment`),
  db(`v6_team_issues?session_id=eq.${id}&select=team_id,priority_id,team_votes`),
  db(`v6_issue_measure_links?session_id=eq.${id}&select=priority_id,project_id,relevance`)
 ]);
 const ids=new Set(rows(teams).map(x=>x.id));
 // Never reveal a champion before the host opens Mission 06.
 const finalRankings=scoresVisible
   ? rows(await db(`v6_final_scores?session_id=eq.${id}&eligible=eq.true&select=team_id,team_number,display_name,before_score,shock_score,after_score,grand_total,remaining_budget,place&order=place.asc`))
   : [];
 return {session:sessions[0],teams:rows(teams),projects:rows(projects).filter(x=>x.is_active),priorities:rows(priorities).filter(x=>x.is_active),scores:scoresVisible?rows(scores).filter(x=>ids.has(x.team_id)):[],snapshots:scoresVisible?rows(snapshots).filter(x=>ids.has(x.team_id)):[],crisesCompleted:rows(progress)[0]?.crises_completed??0,crisisResults:scoresVisible?rows(crisisResults).filter(x=>ids.has(x.team_id)):[],teamIssues:rows(teamIssues).filter(x=>ids.has(x.team_id)),issueLinks:scoresVisible?rows(issueLinks):[],featured:rows(featured)[0]||null,finalRankings};
}
async function myState(payload){
 const me=await rpc('game_me',{p_token_hash:tokenHash(payload)});
 const [choices,votes]=await Promise.all([
  db(`team_choices?team_id=eq.${me.team_id}&select=project_id,projects(cost,name_th)`),
  db(`player_votes?player_id=eq.${me.player_id}&select=priority_id`),
 ]);
 return {me,choices:rows(choices).map(c=>({project_id:c.project_id,cost:c.projects?.cost??0,name_th:c.projects?.name_th??''})),hasVoted:rows(votes).length>0};
}
async function stats(){
 const session=(await publicPayload()).session;
 const votes=rows(await db(`player_votes?session_id=eq.${session.id}&select=priority_id`));
 const tally={}; for(const v of votes)tally[v.priority_id]=(tally[v.priority_id]||0)+1;
 return {votesTotal:votes.length,tally};
}
async function hostState(){
 const pub=await publicPayload();
 const sessionId=pub.session.id;
 const [players,ideas,votes,choices,featuredAll]=await Promise.all([
  db(`players?session_id=eq.${sessionId}&select=id,team_id,nickname,is_team_leader,display_consent,joined_at&order=joined_at.asc`),
  db(`ideas?session_id=eq.${sessionId}&select=id,player_id,team_id,body,status,created_at&order=created_at.desc&limit=160`),
  db(`player_votes?session_id=eq.${sessionId}&select=player_id,priority_id,rationale`),
  db(`team_choices?session_id=eq.${sessionId}&select=team_id,project_id`),
  db(`featured_ideas?session_id=eq.${sessionId}&select=id,display_name,team_label,idea_text,is_visible,created_at&order=created_at.desc&limit=60`)
 ]);
 const tally={};for(const v of rows(votes))tally[v.priority_id]=(tally[v.priority_id]||0)+1;
 return {...pub,players:rows(players),ideas:rows(ideas),votes:rows(votes),choices:rows(choices),featuredAll:rows(featuredAll),tally};
}
export default async (req)=>{
 try {
  const url=new URL(req.url);
  if(req.method==='GET'){
   if(url.searchParams.get('action')==='public')return send(await publicPayload());
   if(url.searchParams.get('action')==='stats')return send(await stats());
   if(url.searchParams.get('action')==='host'){
    if(!checkHost(req))return send({error:'รหัสผ่านผู้ควบคุมไม่ถูกต้อง'},401);
    return send(await hostState());
   }
   return send({error:'Unknown request'},404);
  }
  if(req.method!=='POST')return send({error:'Method not allowed'},405);
  let body;try{body=await req.json()}catch{return send({error:'ข้อมูล JSON ไม่ถูกต้อง'},400)}
  if(JSON.stringify(body).length>5000)return send({error:'ข้อมูลยาวเกินกำหนด'},413);
  const action=s(body.action,60);
  if(action==='join'){
   const token=randomBytes(32).toString('hex');
   const me=await rpc('game_join',{p_session_code:SESSION,p_team_number:Number(body.teamNumber),p_nickname:s(body.nickname,80),p_token_hash:sha(token),p_display_consent:body.consent===true});
   return send({token,me});
  }
  if(action==='me')return send(await myState(body));
  if(action==='vote'){
   if(!isUUID(body.priorityId))return send({error:'ปัญหาเมืองที่เลือกไม่ถูกต้อง'},400);
   // Legacy RPC argument p_project_id now holds an urban priority UUID.
   return send(await rpc('game_vote',{p_token_hash:tokenHash(body),p_project_id:body.priorityId,p_rationale:s(body.rationale,350)}));
  }
  if(action==='idea')return send(await rpc('game_idea',{p_token_hash:tokenHash(body),p_body:s(body.text,600)}));
  if(action==='toggle'){
   if(!isUUID(body.projectId))return send({error:'โครงการไม่ถูกต้อง'},400);
   return send(await rpc('game_team_toggle',{p_token_hash:tokenHash(body),p_project_id:body.projectId}));
  }
  if(!checkHost(req))return send({error:'เฉพาะเจ้าหน้าที่ผู้ควบคุมเกมเท่านั้น'},401);
  if(action==='hostStage')return send(await rpc('game_host_set_stage',{p_state:s(body.state,20),p_crisis:s(body.crisis||'none',20)}));
  if(action==='hostCrisisNext')return send(await rpc('game_host_crisis_next',{}));
  if(action==='hostLeader'){
   if(!isUUID(body.playerId))return send({error:'ผู้เล่นไม่ถูกต้อง'},400);
   return send(await rpc('game_host_assign_leader',{p_player_id:body.playerId}));
  }
  if(action==='hostModerate'){
   if(!isUUID(body.ideaId))return send({error:'ข้อเสนอไม่ถูกต้อง'},400);
   return send(await rpc('game_host_moderate',{p_idea_id:body.ideaId,p_approve:body.approve===true,p_show:body.show===true}));
  }
  if(action==='hostFeature'){
   if(!isUUID(body.featureId))return send({error:'ข้อเสนอไม่ถูกต้อง'},400);
   return send(await rpc('game_host_show_feature',{p_feature_id:body.featureId}));
  }
  return send({error:'ไม่พบคำสั่ง'},404);
 }catch(e){return send({error:e?.message||'ไม่สามารถเชื่อมต่อฐานข้อมูลได้'},400)}
};
