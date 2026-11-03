export const API='/.netlify/functions/api';
export const $=sel=>document.querySelector(sel);
export const safe=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function notice(message,error=false){let el=$('#notice');if(el){el.textContent=message;el.className='notice '+(error?'error':'info');el.classList.remove('hide')}}
export async function api(action,params={},pass=''){
 const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json',...(pass?{'x-host-passcode':pass}:{})},body:JSON.stringify({action,...params})});
 const d=await r.json().catch(()=>({error:'ไม่สามารถอ่านผลเซิร์ฟเวอร์ได้'}));if(!r.ok)throw Error(d.error||`HTTP ${r.status}`);return d;
}
export async function get(action,pass=''){
 const r=await fetch(API+'?action='+encodeURIComponent(action),{headers:pass?{'x-host-passcode':pass}:{},cache:'no-store'});
 const d=await r.json().catch(()=>({error:'ไม่สามารถอ่านผลเซิร์ฟเวอร์ได้'}));if(!r.ok)throw Error(d.error||`HTTP ${r.status}`);return d;
}
export const STAGES=['waiting','voting','planning','crisis','replan','ideas','results','closed'];
export const STATE={waiting:'รอสมัคร',voting:'1 · เลือกปัญหาเมือง',planning:'2 · ลงทุนแก้ปัญหา',crisis:'3 · ทดสอบ 3 วิกฤต',replan:'4 · ปรับแผนรับมือ 3 วิกฤต',ideas:'5 · ส่งข้อเสนอ',results:'6 · ประกาศแชมป์',closed:'สิ้นสุดเกม'};
export const CRISIS={none:'ยังไม่มีวิกฤต',flood:'ฝนหนัก–น้ำท่วม',drought:'ภัยแล้ง',heat:'คลื่นความร้อน'};
export const stateTH=x=>STATE[x]||x;export const crisisTH=x=>CRISIS[x]||x;
export function steps(stage){const idx=STAGES.indexOf(stage);return STAGES.slice(1,8).map((s,i)=>`<span class="stepchip ${i+1<idx?'done':i+1===idx?'current':''}">${safe(STATE[s])}</span>`).join('')}
export const scoreOf=(list,teamId)=>list.find(s=>s.team_id===teamId)?.total??null;
export const snapOf=(list,teamId,phase)=>list.find(s=>s.team_id===teamId&&s.phase===phase)?.total??null;
