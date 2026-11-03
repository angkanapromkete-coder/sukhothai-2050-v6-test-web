import {$,get,notice,safe,stateTH,crisisTH,steps,scoreOf,snapOf} from './common.js';
async function refresh(){try{let [d,stats]=await Promise.all([get('public'),get('stats')]);
 $('#stage').textContent=stateTH(d.session.state);$('#steps').innerHTML=steps(d.session.state);
 $('#crisisBanner').classList.toggle('hide',!['crisis','replan','ideas','results'].includes(d.session.state));$('#crisisText').textContent=`ทดสอบแล้ว ${d.crisesCompleted||0}/3 · ล่าสุด ${crisisTH(d.session.active_crisis)}`;
 $('#votesTotal').textContent=stats.votesTotal;
 const final=['results','closed'].includes(d.session.state);
 if(final){
  const ranks=d.finalRankings||[];
  $('#champion').classList.toggle('hide',ranks.length===0);
  $('#champion').innerHTML=ranks.length?`<div class="tag">🏆 CHAMPION · ทีมชนะเลิศอันดับ 1</div><h1>${safe(ranks[0].display_name)}</h1><div class="champion-score">${ranks[0].grand_total} / 300 คะแนน</div><div>ก่อนวิกฤต ${ranks[0].before_score} + หลังวิกฤต ${ranks[0].shock_score} + หลังปรับแผน ${ranks[0].after_score}</div>`:'';
  $('#rankingTitle').textContent='อันดับคะแนนรวมการแข่งขัน · 300 คะแนน';
  $('#ranking').innerHTML=ranks.length?ranks.map(t=>`<div class="score leaderline"><b>${t.place===1?'🏆 ':''}${t.place}. ${safe(t.display_name)}</b><b>${t.grand_total} / 300</b></div>`).join(''):'<p>ยังไม่มีทีมที่มีคะแนนครบทั้งสามช่วง</p>';
  $('#comparisons').innerHTML='<div class="final-row"><b>ทีม</b><b>ก่อน</b><b>วิกฤต</b><b>ปรับแผน</b><b>รวม / 300</b></div>'+ranks.map(t=>`<div class="final-row"><b>${safe(t.display_name)}</b><span>${t.before_score}</span><span>${t.shock_score}</span><span>${t.after_score}</span><b>${t.grand_total}</b></div>`).join('');
 } else {
  $('#champion').classList.add('hide');
  $('#rankingTitle').textContent='คะแนนปัจจุบันของทีม · 100 คะแนน';
  const ranked=d.teams.map(t=>{const active=(d.crisisResults||[]).find(x=>x.team_id===t.id&&x.phase==='initial'&&x.crisis===d.session.active_crisis);const baseline=snapOf(d.snapshots,t.id,'before');const after=snapOf(d.snapshots,t.id,'after');const total=['ideas'].includes(d.session.state)?after:(d.session.state==='crisis'&&active?active.score:baseline);return {...t,total};}).sort((a,b)=>a.team_number-b.team_number);
  $('#rankingTitle').textContent='ทีมเข้าร่วมและคะแนนปัจจุบัน (ยังไม่จัดอันดับ)';
  $('#ranking').innerHTML=ranked.map(t=>`<div class="score leaderline"><b>${safe(t.display_name)}</b><b>${t.total===null?'–':t.total+' / 100'}</b></div>`).join('');
  $('#comparisons').innerHTML='<div class="comparison-row"><b>ทีม</b><b>ก่อนวิกฤต</b><b>หลังวิกฤต</b><b>หลังปรับ</b></div>'+d.teams.map(t=>`<div class="comparison-row"><b>${safe(t.display_name)}</b><span>${snapOf(d.snapshots,t.id,'before')??'–'}</span><span>${snapOf(d.snapshots,t.id,'shock')??'–'}</span><b>${snapOf(d.snapshots,t.id,'after')??'–'}</b></div>`).join('');
 }
 const l=d.crisisResults||[];
 $('#crisisGrid').innerHTML=['flood','drought','heat'].map(c=>{
  const found=l.some(x=>x.crisis===c&&x.phase==='initial');
  const avg=f=>{const n=l.filter(x=>x.crisis===c&&x.phase===f&&x.score>0);return n.length?Math.round(n.reduce((s,x)=>s+x.score,0)/n.length):'–'};
  return `<div class="score-stat"><small>${crisisTH(c)}</small><strong>${found?avg('initial'):'–'}</strong><small>เฉลี่ยทีมที่มีคะแนน · หลังปรับ ${avg('revised')}</small></div>`;
 }).join('');
 $('#voteBars').innerHTML=(d.priorities||[]).map(p=>{const count=stats.tally[p.id]||0;return `<div class="listrow"><div class="row between"><span>${safe(p.name_th)}</span><b>${count}</b></div><div class="bar"><div style="width:${stats.votesTotal?count/stats.votesTotal*100:0}%"></div></div></div>`}).join('');
 $('#featured').innerHTML=d.featured?`<div class="idea-display">“${safe(d.featured.idea_text)}”</div><div class="tag">${safe(d.featured.display_name)} · ${safe(d.featured.team_label)}</div>`:'<p class="muted">รอเจ้าหน้าที่อนุมัติและเลือกข้อเสนอ</p>';
 }catch(e){notice('จอไม่สามารถอัปเดต: '+e.message,true)}}
await refresh();setInterval(refresh,4500);
