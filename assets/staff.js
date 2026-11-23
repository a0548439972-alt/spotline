/* Spotline - staff mode ("אזור לקוחות").
   Loaded on every page. When a staff member has a client open (clients.html -> "בחירת מוצרים באתר"),
   the site's quote basket (localStorage "sl-quote") IS that client's open quote: every add / remove / qty change
   is mirrored into the client's record. Prices, rooms, notes and purchases live only in the client record.
   Storage: localStorage "sl-staff-db" (this preview). On the WordPress site the same shape goes to the REST API
   (see SLDB.adapter below) so it is shared between devices. */
(function(){
"use strict";
const DBK="sl-staff-db",CART="sl-quote",PREV="sl-quote-prev";
const DEMO={"SL-1042":["ספוט מסילה טרוורטין","assets/p1.jpg"],"SL-2210":["מנורת קיר גלובוס על אבן","assets/p2.jpg"],"SL-2236":["מנורת קיר עגולה עם ספוט עץ","assets/p3.jpg"],"SL-3105":["מנורה תלויה כיפה טרוורטין","assets/p5.jpg"],"SL-2248":["מנורת קיר אנכית טרוורטין","assets/p4.jpg"],"SL-3120":["מנורה תלויה דיסק","assets/p6.jpg"],"SL-4011":["מנורת שולחן פטרייה","assets/p7.jpg"]};
const DFIN={tr:"טרוורטין",br:"פליז",bk:"שחור",wh:"לבן",wd:"עץ"},DTONE={warm:"3000K",neutral:"4500K",cool:"6000K"};
const rawGet=Storage.prototype.getItem,rawSet=Storage.prototype.setItem;
const get=k=>{try{return rawGet.call(localStorage,k)}catch(e){return null}};
const put=(k,v)=>{try{rawSet.call(localStorage,k,v)}catch(e){}};
function load(){try{const d=JSON.parse(get(DBK)||"null");if(d&&d.v===1)return d}catch(e){}return null}
function saveDb(d){d.saved=Date.now();put(DBK,JSON.stringify(d))}
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

/* cart line (page format) -> quote line fields */
function fromCart(x){
  const o={key:x.id,q:Math.max(1,Math.min(999,Math.round(+x.q||1))),raw:x};
  if(x.src==="cat"){o.kind="cat";o.pid=x.pid;o.sku=x.sku||x.pid;o.n=x.n;o.img=x.img||"";o.fin=x.fin||"";o.k=x.k||"";}
  else if(x.src==="profile"){o.kind="profile";o.sku="";o.n=x.n;o.fin=x.d||"";o.img="";}
  else if(x.calc){o.kind="calc";o.sku="";o.n=x.n;o.fin="מהמחשבון";o.k=x.k?x.k+"K":"";o.img="";}
  else if(DEMO[x.id]){o.kind="demo";o.sku=x.id;o.n=DEMO[x.id][0];o.img=DEMO[x.id][1];o.fin=DFIN[x.fin]||"";o.k=DTONE[x.tone]||"";}
  else{o.kind="other";o.sku=x.sku||"";o.n=x.n||x.id;o.img=x.img||"";}
  return o;
}
function activeQuote(d){
  if(!d||!d.active)return null;
  const c=d.clients.find(c=>c.id===d.active.cid);if(!c)return null;
  const q=c.quotes.find(q=>q.id===d.active.qid);if(!q)return null;
  return{c,q};
}
/* mirror the basket into the active quote; keeps staff fields (price, room, note, bought) by key */
function mirror(json){
  const d=load(),a=activeQuote(d);if(!a)return;
  if(!(d.staff>Date.now()))return expire();
  let arr;try{arr=JSON.parse(json||"[]")}catch(e){return}
  if(!Array.isArray(arr))return;
  const old=a.q.lines,next=[];
  arr.forEach(x=>{if(!x||typeof x.id!=="string")return;const f=fromCart(x),ex=old.find(l=>l.key===f.key);
    if(ex){const big=ex.q>99&&f.q===99?ex.q:null;Object.assign(ex,f);if(big)ex.q=big;next.push(ex)}else next.push(Object.assign({lid:uid("l"),price:null,room:"",note:"",bought:0,boughtAt:"",added:Date.now()},f,{price:priceFor(d,f.sku)}))});
  /* lines added by hand in the client card (no site key) stay */
  old.forEach(l=>{if(l.manual&&!l.raw&&!next.includes(l))next.push(l)});
  a.q.lines=next;a.q.updated=a.c.updated=Date.now();
  saveDb(d);paint();
}
function priceFor(d,sku){const p=sku&&d.prices&&d.prices[sku];return p?p.p:null}

/* every write to the basket on any page goes through here */
Storage.prototype.setItem=function(k,v){rawSet.call(this,k,v);if(this===localStorage&&k===CART){try{mirror(v)}catch(e){}}};

/* ---------- UI: floating client pill + basket drawer patch ---------- */
const CSS=`
.slx{position:fixed;z-index:2147483000;left:16px;bottom:16px;display:flex;align-items:center;gap:4px;background:#0a0a0a;color:#f3efe7;border:1px solid rgba(255,189,0,.55);border-radius:999px;padding:5px;font:500 15px/1.2 "Primaries",system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);direction:rtl;max-width:calc(100vw - 32px)}
.slx b{font-weight:700}
.slx .dot{width:9px;height:9px;border-radius:50%;background:#FFBD00;box-shadow:0 0 0 4px rgba(255,189,0,.18);flex:none;margin:0 10px 0 6px}
.slx .who{display:flex;flex-direction:column;padding-inline-end:10px;min-width:0}
.slx .who small{font-size:12px;color:#a39e94;font-weight:400}
.slx .who b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:42vw}
.slx a,.slx button{position:relative;overflow:hidden;isolation:isolate;display:inline-flex;align-items:center;height:40px;padding:0 16px;border-radius:999px;font:700 14px "Primaries",system-ui,sans-serif;color:#0a0a0a;background:#FFBD00;border:0;cursor:pointer;text-decoration:none;white-space:nowrap;transition:color .35s}
.slx .ghost{background:transparent;color:#f3efe7;border:1px solid rgba(243,239,231,.25)}
.slx .ghost:hover{color:#0a0a0a}
.slx .rip{position:absolute;z-index:-1;border-radius:50%;background:#fff;transform:translate(-50%,-50%) scale(0);pointer-events:none;transition:transform .5s cubic-bezier(.16,1,.3,1)}
body.has-bar .slx{bottom:86px}
.slx.fab{left:104px}
#drawer.on~.slx{display:none}
@media (max-width:620px){.slx,.slx.fab{left:10px;right:10px;bottom:10px}.slx.fab{bottom:84px}body.has-bar .slx,body.has-bar .slx.fab{bottom:150px}.slx .who{flex:1}.slx .who small,.slx .w{display:none}.slx a,.slx button{padding:0 12px;height:44px}}
.slx-dr{padding:20px 24px;border-top:1px solid rgba(127,127,127,.25);display:grid;gap:10px;font-family:"Primaries",system-ui,sans-serif}
.slx-dr p{margin:0;font-size:15px;line-height:1.5}
.slx-dr p b{color:inherit}
.slx-dr .row{display:flex;gap:8px;flex-wrap:wrap}
.slx-dr a{flex:1;position:relative;overflow:hidden;isolation:isolate;display:inline-flex;justify-content:center;align-items:center;height:52px;padding:0 18px;background:#FFBD00;color:#0a0a0a;font-weight:700;font-size:16px;text-decoration:none;transition:color .35s}
.slx-dr a.k{background:transparent;border:1px solid currentColor;color:inherit}
.slx-dr .rip{position:absolute;z-index:-1;border-radius:50%;background:#fff;transform:translate(-50%,-50%) scale(0);pointer-events:none;transition:transform .5s cubic-bezier(.16,1,.3,1)}
body.slx-on #cartForm{display:none!important}
.slx-foot{display:inline-block;margin-inline-start:10px;color:inherit;opacity:.55;text-decoration:none;font-size:13px}
.slx-foot:hover{opacity:1}
@media (prefers-reduced-motion:reduce){.slx .rip,.slx-dr .rip{display:none}.slx a:hover,.slx button:hover,.slx-dr a:hover{filter:brightness(1.12)}}
@media print{.slx,.slx-dr{display:none!important}}`;
/* circle that grows from the point the pointer entered and shrinks back to where it left */
function ripple(el){
  if(el._rip)return;el._rip=1;const r=document.createElement("span");r.className="rip";el.prepend(r);
  const at=e=>{const b=el.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top,R=2*Math.hypot(Math.max(x,b.width-x),Math.max(y,b.height-y));r.style.left=x+"px";r.style.top=y+"px";r.style.width=r.style.height=R+"px"};
  el.addEventListener("pointerenter",e=>{at(e);r.style.transform="translate(-50%,-50%) scale(1)";if(!el.classList.contains("ghost")&&!el.classList.contains("k"))el.style.color="#0a0a0a"});
  el.addEventListener("pointerleave",e=>{at(e);r.style.transform="translate(-50%,-50%) scale(0)";el.style.color=""});
}
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let pill,drx;
function paint(){
  const d=load(),a=activeQuote(d),on=!!(a&&d.staff>Date.now())&&!document.documentElement.hasAttribute("data-slx-off");
  document.body.classList.toggle("slx-on",on);
  if(!on){pill&&pill.remove();pill=null;drx&&drx.remove();drx=null;return}
  const n=a.q.lines.reduce((s,l)=>s+(+l.q||0),0),href=`clients.html#c=${a.c.id}&q=${a.q.id}`;
  if(!pill){pill=document.createElement("div");pill.className="slx";pill.setAttribute("role","region");pill.setAttribute("aria-label","עבודה עם לקוח");document.body.appendChild(pill);if(document.querySelector(".wa-fab,.waf"))pill.classList.add("fab")}
  pill.innerHTML=`<span class="dot" aria-hidden="true"></span><span class="who"><small>בוחרים עכשיו עבור</small><b>${esc(a.c.name)}</b></span><a href="${href}">לכרטיס · ${n}<span class="w"> פריטים</span></a><button class="ghost" type="button" data-slx-end>סיום</button>`;
  pill.querySelectorAll("a,button").forEach(ripple);
  const dr=document.getElementById("drawer");
  if(dr){
    if(!drx){drx=document.createElement("div");drx.className="slx-dr";const f=document.getElementById("cartForm");f?f.after(drx):dr.appendChild(drx)}
    drx.innerHTML=`<p>הרשימה נשמרת לבד בכרטיס של <b>${esc(a.c.name)}</b>, ב${esc(a.q.title)}. מחירים, כמויות וסימון קנייה עושים בכרטיס.</p><div class="row"><a href="${href}">לכרטיס הלקוח והצעת המחיר</a></div>`;
    drx.querySelectorAll("a").forEach(ripple);
  }
}
document.addEventListener("click",e=>{
  if(!e.target.closest("[data-slx-end]"))return;
  endClient();location.reload();
});
/* public API, used by clients.html */
function startClient(cid,qid){
  const d=load();if(!d)return;
  if(!d.active){const cur=get(CART);if(cur&&cur!=="[]")put(PREV,cur)}
  d.active={cid,qid};saveDb(d);
  const a=activeQuote(d);
  put(CART,JSON.stringify(a?a.q.lines.filter(l=>l.raw).map(l=>Object.assign({},l.raw,{q:l.q})):[]));
}
function expire(){endClient();if(!document.documentElement.hasAttribute("data-slx-off"))location.reload()}
function endClient(){
  const d=load();if(!d)return;d.active=null;saveDb(d);
  const prev=get(PREV);put(CART,prev||"[]");try{localStorage.removeItem(PREV)}catch(e){}
}
window.SLStaff={startClient,endClient,fromCart,load,save:saveDb,DBK,CART};

function boot(){
  if(!document.getElementById("slx-css")){const s=document.createElement("style");s.id="slx-css";s.textContent=CSS;document.head.appendChild(s)}
  /* a quiet way in for the staff, at the bottom of the footer */
  const fb=document.querySelector(".ftr-bot > div");
  if(fb&&!fb.querySelector(".slx-foot")){const a=document.createElement("a");a.className="slx-foot";a.href="clients.html";a.textContent="· כניסת צוות";fb.appendChild(a)}
  /* the page may have loaded the basket before we were here; make sure the record matches it */
  const d=load();if(activeQuote(d)){if(d.staff>Date.now())mirror(get(CART));else if(!document.documentElement.hasAttribute("data-slx-off")){expire();return}}
  paint();
}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",boot):boot();
addEventListener("storage",e=>{if(e.key===DBK)paint()});
addEventListener("pageshow",e=>{if(e.persisted){const d=load();activeQuote(d)?location.reload():paint()}});
})();
