import {$,api,get,notice,safe,stateTH,crisisTH,steps,STAGES,scoreOf,snapOf} from './common.js';
let pass=sessionStorage.getItem('s2050-host')||'',data=null;const hide=(id,yes)=>$(id).classList.toggle('hide',yes);
async function load(){try{data=await get('host',pass);hide('#login',true);hide('#hostPanel',false);render()}catch(e){hide('#login',false);hide('#hostPanel',true);notice(e.message,true);sessionStorage.removeItem('s2050-host');pass=''}}
async function act(action,payload={}){try{await api(action,payload,pass);await load();notice('ดำเนินการสำเร็จ')}catch(e){notice(e.message,true)}}
const teamName=id=>data.teams.find(t=>t.id===id)?.display_name||'—';
function render(){if(!data)return;const stage=data.session.state;
 $('#currentStage').textContent=`${stateTH(stage)} · ${crisisTH(data.session.active_crisis)}`;$('#steps').innerHTML=steps(stage);
 const next=({waiting:'voting',voting:'planning',planning:'crisis',crisis:'replan',replan:'ideas',ideas:'results',results:'closed'})[stage];
 if(stage==='planning'){
  $('#nextAction').innerHTML='<h3>ภารกิจ 03 · เปิดการทดสอบวิกฤต 3 เรื่อง</h3><p class="tiny muted">ก่อนเปิด ตรวจสอบว่าแต่ละทีมลงคะแนนปัญหาเมืองและมีแผนลงทุนแล้ว ระบบจะบันทึกคะแนนเริ่มต้นทันที</p><button class="btn warn" data-next="crisis">เริ่มทดสอบ 3 วิกฤต</button>';
 } else if(stage==='crisis'){
  const n=data.crisesCompleted||0;
  const names=['🌊 น้ำท่วม','☀️ ภัยแล้ง','🌡️ คลื่นความร้อน'];
  $('#nextAction').innerHTML=n<3
   ? `<h3>ภารกิจ 03 · วิกฤต ${n}/3 ผ่านแล้ว</h3><p class="muted">ทุกทีมใช้แผนเดิม ห้ามปรับแผนจนกว่าจะทดสอบครบสามเหตุการณ์</p><button class="btn warn" id="nextCrisis">เปิด ${n+1}/3 · ${names[n]}</button>`
   : '<h3>ทดสอบครบทั้ง 3 วิกฤตแล้ว</h3><p class="muted">บันทึกคะแนนเฉลี่ยหลังวิกฤตเรียบร้อย เปิดภารกิจ 04 เพื่อให้หัวหน้าทีมปรับแผนหนึ่งครั้ง</p><button class="btn" data-next="replan">เปิดภารกิจ 04 · ปรับแผนเมือง</button>';
  const b=$('#nextCrisis');if(b)b.onclick=()=>{if(confirm('ยืนยันเปิดและบันทึกผลวิกฤตถัดไป?'))act('hostCrisisNext')};
 } else if(next){
  const labels={voting:'เปิดภารกิจ 01 · เลือกปัญหาเมือง',planning:'เปิดภารกิจ 02 · ลงทุนมาตรการ',ideas:'เปิดภารกิจ 05 · ส่งข้อเสนอ',results:'เปิดภารกิจ 06 · ประกาศแชมป์ทีมเดียว',closed:'ปิดกิจกรรม'};
  $('#nextAction').innerHTML=`<h3>ขั้นถัดไป</h3><div class="qflex"><button class="btn" data-next="${next}">${labels[next]||safe(next)}</button></div>`;
 }else{$('#nextAction').innerHTML='<p>กิจกรรมสิ้นสุดแล้ว · หากต้องเริ่มรอบใหม่ให้สำรองและรีเซ็ตอย่างระมัดระวัง</p>'}
 document.querySelectorAll('[data-next]').forEach(b=>b.onclick=()=>{const next=b.dataset.next,crisis='none';if(confirm(`ยืนยันเปิด ${stateTH(next)}? เมื่อเปลี่ยนขั้นจะไม่ย้อนกลับในหน้า Host`))act('hostStage',{state:next,crisis})});
 $('#playerCount').textContent=`มีผู้เล่น ${data.players.length}/80 คน`;
 $('#players').innerHTML=data.teams.map(t=>{const ppl=data.players.filter(p=>p.team_id===t.id);return `<div class="listrow"><b>${safe(t.display_name)} (${ppl.length}/${t.max_players||10})</b><div class="qflex" style="margin-top:8px">${ppl.length?ppl.map(p=>`<button class="btn sm ${p.is_team_leader?'':'alt'}" data-leader="${p.id}" ${p.is_team_leader?'disabled':''}>${p.is_team_leader?'★ ':''}${safe(p.nickname)}</button>`).join(''):'<span class="muted tiny">ยังไม่มีผู้เล่น</span>'}</div></div>`}).join('');
 document.querySelectorAll('[data-leader]').forEach(b=>b.onclick=()=>{if(confirm('ตั้งเป็นหัวหน้าทีมแทนคนเดิม?'))act('hostLeader',{playerId:b.dataset.leader})});
 const total=data.votes.length;$('#votes').innerHTML=(data.priorities||[]).map(p=>{let count=data.votes.filter(v=>v.priority_id===p.id).length;return `<div class="listrow"><b>${safe(p.name_th)}</b> · ${count} เสียง<div class="bar"><div style="width:${total?count/total*100:0}%"></div></div></div>`}).join('')+`<p class="tiny muted">รวม ${total} โหวต</p>`+data.votes.map(v=>{let p=data.players.find(x=>x.id===v.player_id);let proj=(data.priorities||[]).find(x=>x.id===v.priority_id);return `<div class="listrow"><b>${safe(p?.nickname||'ผู้เล่น')} · ${safe(teamName(p?.team_id))}</b><div>${safe(proj?.name_th||'')}</div><div class="tiny muted">${safe(v.rationale)}</div></div>`}).join('');
 const cNames={flood:'น้ำท่วม',drought:'ภัยแล้ง',heat:'คลื่นความร้อน'};
 const v6c=data.crisisResults||[];
 $('#crisisDetailsHost').innerHTML=v6c.length?'<h3>ผลทดสอบแต่ละวิกฤต (คะแนนเต็ม 100)</h3>'+data.teams.map(t=>{
 const a=v6c.filter(x=>x.team_id===t.id&&x.phase==='initial');
 const b=v6c.filter(x=>x.team_id===t.id&&x.phase==='revised');
 return `<div class="listrow"><b>${safe(t.display_name)}</b><p class="tiny muted">แผนแรก: ${a.map(x=>`${cNames[x.crisis]} ${x.score}`).join(' · ')||'ยังไม่ทดสอบ'}<br>แผนปรับ: ${b.map(x=>`${cNames[x.crisis]} ${x.score}`).join(' · ')||'ยังไม่มี'}</p></div>`;
 }).join(''):'<p class="muted">ยังไม่มีการทดสอบวิกฤต</p>';
 const finished=['results','closed'].includes(stage);
 if(finished){
  const rank=data.finalRankings||[];
  $('#winnerHost').innerHTML=rank.length?`<div class="champion-box"><div class="tag">🏆 CHAMPION · ทีมชนะเลิศเพียงทีมเดียว</div><h2>${safe(rank[0].display_name)}</h2><div class="kpi">${rank[0].grand_total} / 300 คะแนน</div><p>ก่อนวิกฤต ${rank[0].before_score} + หลังวิกฤต ${rank[0].shock_score} + หลังปรับแผน ${rank[0].after_score}</p></div>`:'<p class="muted">ยังไม่มีทีมที่มีคะแนนครบทั้งสามช่วง</p>';
  $('#rankings').innerHTML='<div class="final-row"><b>อันดับ / ทีม</b><b>ก่อน</b><b>วิกฤต</b><b>ปรับแผน</b><b>รวม / 300</b></div>'+rank.map(t=>`<div class="final-row"><b>${t.place===1?'🏆 ':''}${t.place}. ${safe(t.display_name)}</b><span>${t.before_score}</span><span>${t.shock_score}</span><span>${t.after_score}</span><b>${t.grand_total}</b></div>`).join('');
 } else {
  $('#winnerHost').innerHTML='<p class="muted tiny">ระบบจะประกาศทีมชนะเลิศเพียงทีมเดียวเมื่อ Host เปิดภารกิจ 06</p>';
  const ranking=data.teams.map(t=>({...t,total:scoreOf(data.scores,t.id)??0,before:snapOf(data.snapshots,t.id,'before'),shock:snapOf(data.snapshots,t.id,'shock'),after:snapOf(data.snapshots,t.id,'after')})).sort((a,b)=>b.total-a.total||a.team_number-b.team_number);
  $('#rankings').innerHTML='<div class="comparison-row"><b>ทีม</b><b>ก่อนวิกฤต</b><b>หลังวิกฤต</b><b>หลังปรับ</b></div>'+ranking.map(t=>`<div class="comparison-row"><b>${safe(t.display_name)}</b><span>${t.before??'–'}</span><span>${t.shock??'–'}</span><b>${t.after??'–'}</b></div>`).join('');
 }
 const pending=data.ideas.filter(x=>x.status==='pending');$('#pending').innerHTML=pending.length?pending.map(i=>{const p=data.players.find(x=>x.id===i.player_id);return `<div class="listrow"><div class="tag">${safe(teamName(i.team_id))} · ${safe(p?.nickname||'ผู้เล่น')} · ${p?.display_consent?'อนุญาตให้แสดงชื่อ':'ไม่แสดงชื่อ'}</div><p>${safe(i.body)}</p><div class="qflex"><button class="btn sm" data-ok="${i.id}">อนุมัติ</button><button class="btn sm alt" data-show="${i.id}">อนุมัติและขึ้นจอ</button><button class="btn sm warn" data-no="${i.id}">ไม่อนุมัติ</button></div></div>`}).join(''):'<p class="muted">ยังไม่มีข้อเสนอรอตรวจ</p>';
 document.querySelectorAll('[data-ok]').forEach(b=>b.onclick=()=>act('hostModerate',{ideaId:b.dataset.ok,approve:true,show:false}));
 document.querySelectorAll('[data-show]').forEach(b=>b.onclick=()=>act('hostModerate',{ideaId:b.dataset.show,approve:true,show:true}));
 document.querySelectorAll('[data-no]').forEach(b=>b.onclick=()=>act('hostModerate',{ideaId:b.dataset.no,approve:false}));
 $('#features').innerHTML=data.featuredAll.length?data.featuredAll.map(f=>`<div class="listrow"><b>${safe(f.display_name)} · ${safe(f.team_label)} ${f.is_visible?'· บนจอ':''}</b><p>${safe(f.idea_text)}</p><button class="btn sm alt" data-feature="${f.id}" ${f.is_visible?'disabled':''}>Highlight</button></div>`).join(''):'<p class="muted">ยังไม่มีข้อความที่อนุมัติ</p>';
 document.querySelectorAll('[data-feature]').forEach(b=>b.onclick=()=>act('hostFeature',{featureId:b.dataset.feature}));
}
$('#hostLogin').onclick=async()=>{pass=$('#hostPin').value;if(pass.length<16)return notice('กรุณากรอกรหัสผู้ควบคุมอย่างน้อย 16 ตัวอักษร',true);sessionStorage.setItem('s2050-host',pass);await load()};
$('#logoutHost').onclick=()=>{sessionStorage.removeItem('s2050-host');pass='';hide('#login',false);hide('#hostPanel',true)};$('#refreshHost').onclick=load;
if(pass)await load();setInterval(()=>{if(pass)load()},6000);
