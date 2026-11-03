import {$,api,get,notice,safe,steps,stateTH,crisisTH,scoreOf,snapOf} from './common.js';
const KEY='sukhothai2050-player-token';let token=localStorage.getItem(KEY),pub=null,mine=null,selected=null,busy=false;
const hide=(s,b)=>$(s).classList.toggle('hide',b);
function issueCard(p){
 const hit=selected===p.id;
 return `<div class="card project" style="${hit?'border:2px solid #1f978c;background:#ebf7f2':''}"><div class="tag">${safe(p.code)} · ประเด็นเมือง</div><h3>${safe(p.name_th)}</h3><p class="muted tiny" style="flex:1;margin:0">${safe(p.description_th)}</p><button class="btn ${hit?'alt':''} sm" data-vote="${safe(p.id)}">${hit?'✓ เลือกแล้ว':'เลือกปัญหานี้'}</button></div>`;
}
function investmentCard(p,selectedIds=[]){
 const hit=selectedIds.includes(p.id);
 const canEdit=(pub.session.state==='planning'||pub.session.state==='replan')&&mine?.me?.is_leader;
 return `<div class="card project" style="${hit?'border:2px solid #1f978c;background:#ebf7f2':''}"><div class="tag">${safe(p.code)} · ${p.cost} เหรียญ</div><h3>${safe(p.name_th)}</h3><p class="muted tiny" style="flex:1;margin:0">${safe(p.description_th)}</p><button class="btn ${hit?'alt':''} sm" data-team="${safe(p.id)}" ${!canEdit?'disabled':''}>${hit?'ลบออกจากแผน':'ลงทุนมาตรการนี้'}</button></div>`;
}
function issueName(){const t=pub?.teamIssues?.find(x=>x.team_id===mine?.me?.team_id);return pub?.priorities?.find(p=>p.id===t?.priority_id)?.name_th||'ยังไม่มีผลโหวตของทีม'}
function stat(phase){if(!mine)return '–';return snapOf(pub.snapshots||[],mine.me.team_id,phase)??'–'}
function render(){if(!pub)return;
 const stage=pub.session.state;$('#stage').textContent=stateTH(stage);$('#steps').innerHTML=steps(stage);
 $('#liveCount').textContent=`${pub.teams.length} ทีม · ${pub.teams.reduce((n,t)=>n+(t.max_players||10),0)} ที่นั่ง`;
 let prior=$('#team').value;$('#team').innerHTML='<option value="">-- เลือกทีม --</option>'+pub.teams.map(t=>`<option value="${t.team_number}">${safe(t.display_name)}</option>`).join('');if(prior)$('#team').value=prior;
 hide('#join',!!token);hide('#player',!token);if(!token)return;
 if(mine){$('#playerName').textContent=mine.me.nickname;$('#teamName').textContent=`ทีม ${String(mine.me.team_number).padStart(2,'0')}${mine.me.is_leader?' · ★ หัวหน้าทีม':''}`}
 const notes={waiting:'ลงทะเบียนแล้ว รอเจ้าหน้าที่เริ่มภารกิจ 01',voting:'ภารกิจ 01: เลือกปัญหาเมืองที่อยากแก้ก่อน 1 เรื่อง (ยังไม่ใช้งบประมาณ)',planning:'ภารกิจ 02: สมาชิกปรึกษามาตรการลงทุน แล้วหัวหน้าทีมจัดงบ 10 เหรียญ',crisis:'ภารกิจ 03: ทดสอบวิกฤต '+(pub.crisesCompleted||0)+'/3 — '+crisisTH(pub.session.active_crisis)+' · ใช้แผนเดิมทั้งสามสถานการณ์',replan:'ภารกิจ 04: ปรับแผนครั้งเดียวเพื่อรับมือทั้งน้ำท่วม ภัยแล้ง และคลื่นความร้อน',ideas:'ภารกิจ 05: ส่งข้อเสนอหลังเรียนรู้จากวิกฤต',results:'ภารกิจ 06: ประกาศคะแนนรวมสูงสุด 300 คะแนน และทีมชนะเลิศเพียงทีมเดียว',closed:'จบกิจกรรมแล้ว ขอบคุณที่ร่วมออกแบบเมือง'};
 $('#stageNote').textContent=notes[stage]||'';
 hide('#vote',stage!=='voting');hide('#teamplanning',!['planning','replan'].includes(stage));hide('#crisisPanel',!['crisis','replan','ideas','results'].includes(stage));hide('#ideas',stage!=='ideas');hide('#resultsPanel',!['results','closed'].includes(stage));
 if(stage==='voting'){
  $('#projectList').innerHTML=(pub.priorities||[]).map(issueCard).join('');
  document.querySelectorAll('[data-vote]').forEach(btn=>btn.onclick=()=>{selected=btn.dataset.vote;render()});
  $('#voteBtn').disabled=!selected||!!mine?.hasVoted;
  $('#voteNote').textContent=mine?.hasVoted?'ส่งความเห็นเรื่องปัญหาเมืองแล้ว — รอภารกิจถัดไป':'เลือกปัญหาเมือง 1 เรื่อง แล้วกดส่งคำตอบ';
 }
 const choices=mine?.choices||[];const spent=choices.reduce((n,c)=>n+(c.cost||0),0);
 if(['planning','replan'].includes(stage)){
  $('#planTag').textContent=stage==='replan'?'ภารกิจ 04 · ปรับแผนหลังวิกฤต':'ภารกิจ 02 · City Investment Challenge';
  $('#planTitle').textContent=stage==='replan'?'ปรับแผนให้รับมือ 3 วิกฤต':'เลือกมาตรการพัฒนาเมืองภายในงบ 10 เหรียญ';
  const team=pub.teams.find(t=>t.id===mine?.me?.team_id);const max=team?.budget_total||10;
  $('#budget').textContent=`ใช้ ${spent} / ${max} เหรียญ`;
  $('#alignmentNote').textContent=`ปัญหาหลักของทีม: ${issueName()} · ระบบประเมินความสอดคล้องของแผนโดยอัตโนมัติ (ซ่อนคะแนนจนกว่าจะประกาศผลภารกิจ 06)`;
  $('#budgetProgress').style.width=`${spent/max*100}%`;
  $('#leaderNote').textContent=mine?.me?.is_leader?'คุณเป็นหัวหน้าทีม กดเพิ่มหรือลบโครงการได้ในรอบนี้ ระบบบันทึกทันที':'สมาชิกช่วยกันเสนอแผน แต่หัวหน้าทีมเป็นผู้กดเลือก/แก้แผน';
  $('#teamProjects').innerHTML=pub.projects.map(p=>investmentCard(p,choices.map(x=>x.project_id))).join('');
  document.querySelectorAll('[data-team]').forEach(b=>b.onclick=async()=>{try{b.disabled=true;await api('toggle',{token,projectId:b.dataset.team});await refreshMe();render();notice('บันทึกแผนทีมสำเร็จ')}catch(e){notice(e.message,true);b.disabled=false}});
 }
 if(['crisis','replan','ideas','results'].includes(stage)){
  $('#crisisName').textContent='ผลทดสอบ '+(pub.crisesCompleted||0)+'/3 วิกฤต · ล่าสุด '+crisisTH(pub.session.active_crisis);
  const final=['results','closed'].includes(stage);
  const v6rows=final?(pub.crisisResults||[]).filter(x=>x.team_id===mine?.me?.team_id):[];
  $('#crisisList').innerHTML=['flood','drought','heat'].map((c,i)=>{
   if(!final)return `<div class="listrow"><b>${crisisTH(c)}</b><span>${i<(pub.crisesCompleted||0)?'ทดสอบแล้ว':'รอทดสอบ'} · ซ่อนคะแนน</span></div>`;
   const a=v6rows.find(x=>x.phase==='initial'&&x.crisis===c);
   const b=v6rows.find(x=>x.phase==='revised'&&x.crisis===c);
   return `<div class="listrow"><b>${crisisTH(c)}</b><span>แผนแรก: ${a?.score??'–'} / 100 · หลังปรับ: ${b?.score??'–'} / 100</span></div>`;
  }).join('');
  $('#crisisScore').innerHTML=final?[['ก่อนวิกฤต',stat('before')],['หลังวิกฤต',stat('shock')],['หลังปรับแผน',stat('after')]].map(x=>`<div class="score-stat"><small>${safe(x[0])}</small><strong>${safe(x[1])}</strong><small>จาก 100</small></div>`).join(''):'<p class="muted">คะแนนทั้งสามช่วงจะเปิดเผยเมื่อ Host เริ่มภารกิจ 06 เท่านั้น</p>';
 }
 if(['results','closed'].includes(stage)){
  const r=(pub.finalRankings||[]).find(x=>x.team_id===mine?.me?.team_id);
  const champ=(pub.finalRankings||[])[0];
  $('#resultScore').innerHTML=r?`<div class="score-split"><div class="score-stat">ก่อนวิกฤต<strong>${r.before_score}</strong></div><div class="score-stat">หลังวิกฤต<strong>${r.shock_score}</strong></div><div class="score-stat">หลังปรับแผน<strong>${r.after_score}</strong></div></div><div class="final-summary"><b>คะแนนรวมของทีมคุณ: ${r.grand_total} / 300</b><p>อันดับ ${r.place} จาก ${pub.finalRankings.length} ทีมที่มีคะแนนครบ</p><p>🏆 ชนะเลิศ: ${safe(champ?.display_name||'รอผล')}</p></div>`:'<p class="muted">ยังไม่มีคะแนนครบทุกช่วงสำหรับทีมนี้ โปรดแจ้งเจ้าหน้าที่</p>';
 }
}
async function refreshMe(){if(!token)return;try{mine=await api('me',{token})}catch(e){notice('ตรวจสอบบัญชีไม่สำเร็จ แต่ยังเก็บรหัสเดิมไว้: '+e.message,true)}}
async function refresh(){try{pub=await get('public');if(token)await refreshMe();render()}catch(e){notice('โหลดข้อมูลไม่สำเร็จ: '+e.message,true)}}
$('#joinBtn').onclick=async()=>{if(busy)return;const nickname=$('#nickname').value.trim(),teamNumber=Number($('#team').value);if(!nickname||!teamNumber)return notice('กรอกชื่อเล่นและเลือกทีมก่อน',true);busy=true;$('#joinBtn').disabled=true;try{const x=await api('join',{nickname,teamNumber,consent:$('#consent').checked});token=x.token;localStorage.setItem(KEY,token);await refresh();notice('เข้าร่วมสำเร็จ รอเจ้าหน้าที่เริ่มเกม')}catch(e){notice(e.message,true)}finally{busy=false;$('#joinBtn').disabled=false}};
$('#voteBtn').onclick=async()=>{if(!selected)return;$('#voteBtn').disabled=true;try{await api('vote',{token,priorityId:selected,rationale:$('#reason').value});await refreshMe();render();notice('ส่งผลโหวตสำเร็จ')}catch(e){notice(e.message,true);render()}};
$('#ideaBtn').onclick=async()=>{let text=$('#ideaText').value.trim();if(text.length<10)return notice('กรุณาพิมพ์อย่างน้อย 10 ตัวอักษร',true);$('#ideaBtn').disabled=true;try{await api('idea',{token,text});$('#ideaText').value='';notice('ส่งข้อเสนอสำเร็จ รอเจ้าหน้าที่ตรวจสอบ')}catch(e){notice(e.message,true)}finally{$('#ideaBtn').disabled=false}};
$('#logoutBtn').onclick=()=>{if(confirm('ล้างรหัสบนเครื่องนี้? ระบบจะไม่ลบข้อมูลในฐานข้อมูลจริง')){localStorage.removeItem(KEY);token=null;mine=null;render()}};
await refresh();setInterval(refresh,5000);
