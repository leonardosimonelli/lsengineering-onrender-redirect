'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'site'),origin='https://lsengineering.onrender.com';
const client=process.env.GOOGLE_CLIENT_ID||'',owner=(process.env.LS_ADMIN_EMAIL||'').toLowerCase(),stripeKey=process.env.STRIPE_READONLY_KEY||'';
let keyset={keys:[],until:0};
function json(res,status,data){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'private,no-store','x-robots-tag':'noindex,nofollow','x-frame-options':'DENY'});res.end(JSON.stringify(data))}
function cookie(req){let m=(req.headers.cookie||'').match(/(?:^|;\s*)__Host-lsadmin=([^;]*)/);try{return m?decodeURIComponent(m[1]):''}catch{return ''}}
async function verify(jwt){
 if(!client||!owner||typeof jwt!=='string'||jwt.length>6000)return null;
 const p=jwt.split('.');if(p.length!==3)return null;
 let h,c;try{h=JSON.parse(Buffer.from(p[0],'base64url'));c=JSON.parse(Buffer.from(p[1],'base64url'))}catch{return null}
 const now=Date.now()/1000;
 if(h.alg!=='RS256'||!h.kid||!['accounts.google.com','https://accounts.google.com'].includes(c.iss)||c.aud!==client||c.email_verified!==true||c.email?.toLowerCase()!==owner||!c.sub||!Number.isFinite(c.exp)||c.exp<=now||!Number.isFinite(c.iat)||c.iat>now+90||c.iat<now-7200)return null;
 if(Date.now()>keyset.until){const r=await fetch('https://www.googleapis.com/oauth2/v3/certs',{signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Google unavailable');keyset={keys:(await r.json()).keys,until:Date.now()+3600000}}
 const k=keyset.keys.find(x=>x.kid===h.kid&&x.alg==='RS256'&&x.kty==='RSA');if(!k)return null;
 try{return crypto.verify('RSA-SHA256',Buffer.from(p[0]+'.'+p[1]),crypto.createPublicKey({key:k,format:'jwk'}),Buffer.from(p[2],'base64url'))?c:null}catch{return null}
}
const css='body{background:#071b30;color:#f1f9ff;font:15px/1.5 system-ui;margin:0}main{max-width:950px;margin:45px auto;padding:0 22px}.box{background:#10304d;padding:20px;border-radius:14px;margin:18px 0;border:1px solid #2c5b7a}.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.kpi{background:#184566;padding:15px;border-radius:11px}.kpi strong{display:block;font-size:25px}p{color:#b5cce2}a,button{background:#258f9c;color:#fff;padding:8px 13px;border:0;border-radius:8px;text-decoration:none;cursor:pointer}td,th{padding:10px;text-align:left;border-bottom:1px solid #305574}.scroll{overflow:auto}table{width:100%;border-collapse:collapse}';
function page(res,body,script){
 const nonce=crypto.randomBytes(16).toString('base64');
 res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'private,no-store','x-robots-tag':'noindex,nofollow','x-frame-options':'DENY','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; script-src 'nonce-"+nonce+"' https://accounts.google.com/gsi/client; style-src 'unsafe-inline'; connect-src 'self'; frame-src https://accounts.google.com; img-src data: https:; frame-ancestors 'none'"});
 res.end('<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>LS Engineering · Vendite private</title><style>'+css+'</style><main>'+body+'</main><script nonce="'+nonce+'">'+script+'</script></html>');
}
function login(res){
 const body='<h1>LS Engineering · Area privata</h1><p>Accesso riservato al titolare tramite Google.</p><div class="box"><div id="google"></div><p id="msg"></p></div><a href="/">Torna al sito</a>';
 const script=client?"const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=()=>{google.accounts.id.initialize({client_id:"+JSON.stringify(client)+",auto_select:false,callback:async x=>{try{const r=await fetch('/_ls/login',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({token:x.credential})});if(!r.ok)throw Error('Account non autorizzato');location.assign('/_ls/admin')}catch(e){document.getElementById('msg').textContent=e.message}}});google.accounts.id.renderButton(document.getElementById('google'),{theme:'outline',size:'large'})};document.head.append(s);":"document.getElementById('msg').textContent='Accesso Google non configurato'";
 page(res,body,script);
}
function dashboard(res){
 const body='<h1>LS Engineering · Statistiche vendite</h1><p>Accesso Google verificato</p><a href="/">Sito pubblico</a> <button id="logout">Esci</button><div class="box"><h2>Riepilogo economico</h2><p id="status">Caricamento…</p><div class="kpis" id="kpis"></div></div><div class="box"><h2>Ultime transazioni</h2><div class="scroll"><table><thead><tr><th>Data</th><th>Prodotto</th><th>Incasso</th><th>Rimborso</th></tr></thead><tbody id="rows"></tbody></table></div></div><p>Consultazione Stripe in sola lettura. Dati non equivalenti agli utili fiscali. Storico limitato agli ultimi 100 pagamenti.</p>';
 const script="const eur=v=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(v/100);document.getElementById('logout').onclick=async()=>{await fetch('/_ls/logout',{method:'POST'});location.reload()};function card(a,b){const e=document.createElement('div');e.className='kpi';const x=document.createElement('span'),y=document.createElement('strong');x.textContent=a;y.textContent=b;e.append(x,y);document.getElementById('kpis').append(e)}fetch('/_ls/stats').then(async r=>{if(r.status===401){location.reload();return}const x=await r.json();if(!r.ok)throw Error(x.error);if(!x.connected){document.getElementById('status').textContent='Accesso Google attivo. Serve una chiave Stripe di sola lettura su Render per visualizzare le vendite reali.';return}document.getElementById('status').textContent=(x.test?'AMBIENTE DI TEST — NON INCASSI REALI. ':'')+(x.partial?'Dati parziali: ultimi 100 pagamenti.':'Dati Stripe aggiornati.');card('Incassi lordi',eur(x.gross));card('Rimborsi',eur(x.refunds));card('Dopo rimborsi',eur(x.gross-x.refunds));card('Vendite',x.count);card('Abbonamenti attivi',x.subs===null?'N/D':x.subs);for(const t of x.latest){const tr=document.createElement('tr');[t.date,t.description,eur(t.amount),eur(t.refund)].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});document.getElementById('rows').append(tr)}}).catch(e=>document.getElementById('status').textContent=e.message);";
 page(res,body,script);
}
async function stats(){
 if(!stripeKey)return {connected:false};const headers={authorization:'Bearer '+stripeKey};
 const r=await fetch('https://api.stripe.com/v1/charges?limit=100',{headers,signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Stripe unavailable');
 const d=await r.json(),good=d.data.filter(x=>x.currency==='eur'&&x.paid&&x.status==='succeeded');let subs=null;
 try{const s=await fetch('https://api.stripe.com/v1/subscriptions?status=active&limit=100',{headers,signal:AbortSignal.timeout(10000)});if(s.ok){const v=await s.json();subs=v.has_more?'100+':v.data.length}}catch{}
 return {connected:true,test:stripeKey.includes('_test_'),partial:d.has_more,count:good.length,gross:good.reduce((n,x)=>n+(x.amount_captured||x.amount||0),0),refunds:good.reduce((n,x)=>n+(x.amount_refunded||0),0),subs,latest:good.slice(0,20).map(x=>({date:new Date(x.created*1000).toLocaleDateString('it-IT'),description:x.description||x.metadata?.product_name||'Pagamento Stripe',amount:x.amount_captured||x.amount||0,refund:x.amount_refunded||0}))};
}
async function route(req,res,next){
 let u;try{u=new URL(req.url,'http://localhost')}catch{return json(res,400,{error:'Invalid URL'})}const p=u.pathname;
 if(!p.startsWith('/_ls/')){
  if(req.method!=='GET'||!(p==='/'||/^\/(en|de|fr|es|ru|ar|zh)\/$/.test(p)))return next(req,res);
  const file=path.join(root,p,'index.html');return fs.readFile(file,'utf8',(e,s)=>{if(e)return next(req,res);const lock='<a href="/_ls/admin" title="Area riservata" aria-label="Pannello vendite" style="position:fixed;right:10px;bottom:10px;z-index:9999;opacity:.6;border-radius:50%;padding:4px 7px;background:#0d2844;color:white;border:1px solid #31718b;text-decoration:none;font-size:12px">&#128274;</a>';res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'public,max-age=120','x-robots-tag':'noindex,follow'});res.end(s.replace(/<\/body>/i,lock+'</body>'))});
 }
 try{
  if(p==='/_ls/admin'&&req.method==='GET')return await verify(cookie(req))?analyticsV2.dashboard(res,page):login(res);
  if(p==='/_ls/login'&&req.method==='POST'){
   if(req.headers.origin!==origin||!req.headers['content-type']?.startsWith('application/json'))return json(res,403,{error:'Forbidden'});
   let b='',size=0;for await(const chunk of req){size+=chunk.length;if(size>7500)return json(res,413,{error:'Too long'});b+=chunk}
   let jwt;try{jwt=JSON.parse(b).token}catch{return json(res,400,{error:'Bad body'})}
   const user=await verify(jwt);if(!user)return json(res,403,{error:'Google account not allowed'});
   const lifetime=Math.max(1,Math.min(3500,user.exp-Math.floor(Date.now()/1000)));
   res.setHeader('set-cookie','__Host-lsadmin='+encodeURIComponent(jwt)+'; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age='+lifetime);return json(res,200,{ok:true});
  }
  if(p==='/_ls/logout'&&req.method==='POST'){if(req.headers.origin!==origin)return json(res,403,{error:'Forbidden'});res.setHeader('set-cookie','__Host-lsadmin=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0');return json(res,200,{ok:true})}
  if(p==='/_ls/m30/upload'&&req.method==='GET'){
   if(!await verify(cookie(req)))return login(res);
   const uploadScript=fs.readFileSync(path.join(root,'assets','m30-upload.js'),'utf8');
   const body='<h1>LS Engineering · Caricamento M30.18</h1><p>Area riservata al titolare. Le tre parti sono caricate direttamente nel bucket privato Supabase e controllate con SHA-256 sia in locale sia sul server.</p><div class="box"><h2>Distribuzione Windows M30.18</h2><p>Seleziona insieme i tre file <code>.part01</code>, <code>.part02</code>, <code>.part03</code> dalla chiavetta o dal computer. La dimensione complessiva è circa 70,7 MiB.</p><input type="file" id="m30files" multiple accept=".part01,.part02,.part03"><p><button id="m30send" type="button">Carica e verifica i tre file</button></p><p id="m30log" role="status"></p><h3>Stato dei file</h3><p id="m30state">Caricamento stato…</p></div><p><a href="/_ls/admin">Torna al pannello vendite</a> · <a href="/software/reverse-3d.html">Scheda commerciale M30.18</a></p>';
   return page(res,body,uploadScript);
  }
  if(p==='/_ls/m30/api'&&req.method==='POST'){
   if(req.headers.origin!==origin||!String(req.headers['content-type']||'').startsWith('application/json'))return json(res,403,{error:'Origine non autorizzata'});
   const jwt=cookie(req);
   if(!await verify(jwt))return json(res,401,{error:'Autenticazione Google richiesta'});
   let body='',n=0;for await(const part of req){n+=part.length;if(n>1500)return json(res,413,{error:'Richiesta troppo grande'});body+=part}
   let args;try{args=JSON.parse(body)}catch{return json(res,400,{error:'Dati non validi'})}
   if(!['mint','verify','status'].includes(args?.action))return json(res,400,{error:'Operazione non autorizzata'});
   if(args.action!=='status'&&!['part01','part02','part03'].includes(args?.part))return json(res,400,{error:'Parte non riconosciuta'});
   const remote=await fetch('https://ijdjyketecwwplvqcqpd.supabase.co/functions/v1/reverse-m30-upload',{
    method:'POST',headers:{'content-type':'application/json','origin':origin},
    body:JSON.stringify({id_token:jwt,action:args.action,part:args.part}),
    signal:AbortSignal.timeout(55000)
   });
   let result;try{result=await remote.json()}catch{return json(res,502,{error:'Verifica remota non disponibile'})}
   return json(res,remote.status,result);
  }
  if(p==='/_ls/stats'&&req.method==='GET'){if(!await verify(cookie(req)))return json(res,401,{error:'Unauthorized'});try{return json(res,200,await analyticsV2.stats(u.searchParams.get('period')||'d30'))}catch{return json(res,502,{error:'Stripe unavailable: verify read-only permissions'})}}
  return json(res,404,{error:'Not found'});
 }catch{return json(res,503,{error:'Temporary auth error'})}
}
const analyticsV2=require('./analytics-v2.cjs');
const old=http.createServer;http.createServer=function(handler){return old.call(this,(req,res)=>Promise.resolve(route(req,res,handler)).catch(()=>{if(!res.headersSent)json(res,500,{error:'Service error'});else res.destroy()}))};
