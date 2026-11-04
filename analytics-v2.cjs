'use strict';
const stripeKey=process.env.STRIPE_READONLY_KEY||'';
const cache=new Map();
const periodDays={d7:7,d30:30,d90:90,d365:365,all:0};
const dateFormat=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'});
function dayKey(stamp){
 const parts=Object.fromEntries(dateFormat.formatToParts(new Date(stamp*1000)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return parts.year+'-'+parts.month+'-'+parts.day;
}
function titleFor(charge){
 const m=charge.metadata||{};
 return String(m.product_name||m.product||m.app||m.product_title||m.item||charge.description||'Pagamento non attribuito').slice(0,180);
}
function groupFor(charge){
 const m=charge.metadata||{};
 const s=[m.product_name,m.product,m.app,m.product_title,m.item,charge.description].filter(Boolean).join(' ').toLowerCase();
 if(/reverse.{0,50}3d|3d.{0,40}reverse|mechanism.{0,25}3d/.test(s))return 'REVERSE Mechanism Suite 3D';
 if(/reverse|m13|cinematism|mechanism/.test(s))return 'REVERSE Mechanism Suite 2D';
 if(/scadenz|deadline/.test(s))return 'Scadenze Studio';
 if(/appuntament|appointment/.test(s))return 'Conferma Appuntamenti';
 return 'Non attribuita';
}
async function api(path,params){
 const url=new URL('https://api.stripe.com/v1/'+path);
 for(const [k,v] of Object.entries(params||{}))url.searchParams.set(k,String(v));
 const r=await fetch(url,{headers:{authorization:'Bearer '+stripeKey},signal:AbortSignal.timeout(12000)});
 if(!r.ok){const e=new Error('Stripe '+r.status);e.status=r.status;throw e}
 return r.json();
}
async function pages(resource,query,maxPages,deadline){
 let rows=[],after=null,more=false,limited=false;
 for(let i=0;i<maxPages;i++){
   if(Date.now()>deadline){limited=true;break}
   const q={...query,limit:100};if(after)q.starting_after=after;
   const d=await api(resource,q);
   if(!Array.isArray(d.data))throw Error('Unexpected Stripe response');
   rows.push(...d.data);more=!!d.has_more;
   if(!more)break;
   if(!d.data.length){limited=true;break}
   after=d.data[d.data.length-1].id;
   if(i===maxPages-1)limited=true;
 }
 return {rows,partial:limited||more};
}
function aggregate(rows){
 const map=new Map();
 for(const c of rows){
   const k=groupFor(c),v=map.get(k)||{name:k,count:0,gross:0,refunds:0};
   v.count++;v.gross+=c.amount_captured||c.amount||0;v.refunds+=c.amount_refunded||0;map.set(k,v);
 }
 return Array.from(map.values()).sort((a,b)=>b.gross-a.gross);
}
async function compile(period){
 if(!stripeKey)return {connected:false};
 const days=periodDays[period]??30;
 const since=days?Math.floor(Date.now()/1000-days*86400):null;
 const filter=since?{'created[gte]':since}:{};
 const deadline=Date.now()+17000;
 const charges=await pages('charges',filter,40,deadline);
 const paid=charges.rows.filter(c=>c.paid&&c.status==='succeeded');
 const eur=paid.filter(c=>c.currency==='eur'),outside=paid.filter(c=>c.currency!=='eur');
 let fees=null,feeCoverage=0,feePartial=false,feeError=false;
 try{
   const balanceFilter=since?{'created[gte]':since-7*86400}:{};
   const balance=await pages('balance_transactions',balanceFilter,40,deadline);
   const byCharge=new Map(balance.rows.filter(b=>b.source&&Number.isFinite(b.fee)).map(b=>[b.source,b.fee]));
   feeCoverage=eur.filter(c=>byCharge.has(c.id)).length;
   fees=eur.reduce((n,c)=>n+(byCharge.get(c.id)||0),0);
   feePartial=balance.partial||feeCoverage<eur.length;
 }catch{feeError=true}
 let subscriptions=null,subsPartial=false;
 try{
   const subs=await pages('subscriptions',{status:'active'},10,Date.now()+11000);
   subscriptions=subs.rows.length;subsPartial=subs.partial;
 }catch{}
 const monthly=new Map(),daily=new Map();
 for(const c of eur){
   const day=dayKey(c.created),month=day.slice(0,7);
   daily.set(day,(daily.get(day)||0)+(c.amount_captured||c.amount||0));
   monthly.set(month,(monthly.get(month)||0)+(c.amount_captured||c.amount||0));
 }
 const transactions=eur.map(c=>({date:dayKey(c.created),description:titleFor(c),group:groupFor(c),amount:c.amount_captured||c.amount||0,refund:c.amount_refunded||0,fee:fees===null?null:null})).sort((a,b)=>b.date.localeCompare(a.date));
 return {
   connected:true,mode:stripeKey.includes('_test_')?'test':'live',period,partial:charges.partial,
   count:eur.length,gross:eur.reduce((n,c)=>n+(c.amount_captured||c.amount||0),0),
   refunds:eur.reduce((n,c)=>n+(c.amount_refunded||0),0),
   fees,feeCoverage,feePartial,feeError,
   subscriptions,subsPartial,
   nonEuro:outside.length,
   byProduct:aggregate(eur),
   monthly:Array.from(monthly,([date,value])=>({date,value})).sort((a,b)=>a.date.localeCompare(b.date)),
   daily:Array.from(daily,([date,value])=>({date,value})).sort((a,b)=>a.date.localeCompare(b.date)),
   transactions,
   updatedAt:new Date().toISOString()
 };
}
async function stats(period){
 const name=Object.hasOwn(periodDays,period)?period:'d30';
 const current=cache.get(name);
 if(current&&current.expires>Date.now())return current.result;
 if(current?.pending)return current.pending;
 const job=compile(name);
 cache.set(name,{expires:0,pending:job});
 try{const result=await job;cache.set(name,{result,expires:Date.now()+120000});return result}catch(e){cache.delete(name);throw e}
}
function frontend(){
 const state={data:null,period:'d30',chart:'monthly'};
 const euro=cents=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(cents/100);
 const el=id=>document.getElementById(id);
 function cell(text,parent,tag='td'){const node=document.createElement(tag);node.textContent=String(text);parent.append(node);return node}
 function metric(name,value,note){const box=document.createElement('div');box.className='metric';cell(name,box,'span');cell(value,box,'strong');if(note)cell(note,box,'small');el('metrics').append(box)}
 function showChart(){
   const list=el('bars');list.replaceChildren();const data=state.data;if(!data)return;
   const points=(state.chart==='monthly'?data.monthly:data.daily.slice(-30));
   if(!points.length){cell('Nessun pagamento nel periodo selezionato.',list,'p');return}
   const max=Math.max(1,...points.map(x=>x.value));
   for(const x of points){const row=document.createElement('div');row.className='bar-row';const label=document.createElement('span');label.textContent=x.date;const track=document.createElement('div');track.className='bar-track';const bar=document.createElement('div');bar.className='bar';bar.style.width=Math.max(2,100*x.value/max)+'%';track.append(bar);const amount=document.createElement('span');amount.textContent=euro(x.value);row.append(label,track,amount);list.append(row)}
 }
 function render(data){
  el('metrics').replaceChildren();el('products').replaceChildren();el('rows').replaceChildren();
  if(!data.connected){el('message').textContent='Manca la chiave Stripe in sola lettura su Render.';el('export').disabled=true;return}
  const warning=[];
  if(data.mode==='test')warning.push('ATTENZIONE: dati Stripe di prova, non incassi reali.');
  if(data.partial)warning.push('Storico parziale: limite o tempo massimo di consultazione raggiunto.');
  if(data.nonEuro)warning.push(data.nonEuro+' pagamenti in altre valute esclusi dai totali EUR (nessuna conversione presunta).');
  if(data.feeError||data.fees===null)warning.push('Commissioni Stripe non disponibili: serve permesso di sola lettura Balance Transactions.');
  else if(data.feePartial)warning.push('Commissioni parziali: collegate a '+data.feeCoverage+' pagamenti su '+data.count+'.');
  if(data.subscriptions===null)warning.push('Numero abbonamenti non disponibile: verificare lettura Subscriptions.');
  else if(data.subsPartial)warning.push('Abbonamenti attivi: conteggio parziale.');
  el('message').textContent=warning.length?warning.join(' '):'Dati aggiornati · '+new Date(data.updatedAt).toLocaleString('it-IT')+' · account Stripe '+(data.mode==='live'?'reale':'test');
  metric('Pagamenti lordi',euro(data.gross),'Valore dei pagamenti riusciti');
  metric('Rimborsi',euro(data.refunds),'Attribuiti alla data del pagamento originario');
  metric('Dopo rimborsi',euro(data.gross-data.refunds),'Prima delle commissioni');
  metric('Vendite',String(data.count),'Transazioni riuscite in EUR');
  metric('Commissioni documentate',data.fees===null?'N/D':euro(data.fees),data.feePartial?'Copertura parziale':'Da Balance Transactions');
  metric('Dopo rimborsi e commissioni',data.fees===null||data.feePartial?'N/D':euro(data.gross-data.refunds-data.fees),'Non è utile fiscale né importo liquidato');
  metric('Abbonamenti attivi',data.subscriptions===null?'N/D':String(data.subscriptions),data.subsPartial?'Conteggio incompleto':'Stato attuale, non storico');
  for(const p of data.byProduct){const row=document.createElement('tr');cell(p.name,row);cell(p.count,row);cell(euro(p.gross),row);cell(euro(p.gross-p.refunds),row);el('products').append(row)}
  for(const t of data.transactions.slice(0,250)){const row=document.createElement('tr');cell(t.date,row);cell(t.group,row);cell(t.description,row);cell(euro(t.amount),row);cell(euro(t.refund),row);el('rows').append(row)}
  if(!data.byProduct.length)cell('Nessun prodotto nel periodo.',el('products'),'tr');
  el('export').disabled=false;
  showChart();
 }
 async function load(){
  el('message').textContent='Caricamento dati Stripe in sola lettura…';
  el('period').disabled=true;el('export').disabled=true;
  try{const response=await fetch('/_ls/stats?period='+encodeURIComponent(state.period),{credentials:'same-origin'});
   if(response.status===401){location.reload();return}
   const data=await response.json();if(!response.ok)throw Error(data.error||'Impossibile leggere le statistiche');
   state.data=data;render(data)
  }catch(e){el('message').textContent='Errore nella consultazione: '+e.message}
  finally{el('period').disabled=false}
 }
 function exportCsv(){
  if(!state.data?.connected)return;
  const rows=[['Data','Categoria','Descrizione','Lordo EUR','Rimborsi EUR'],...state.data.transactions.map(x=>[x.date,x.group,x.description,(x.amount/100).toFixed(2).replace('.',','),(x.refund/100).toFixed(2).replace('.',',')])];
  const escaped=rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(';')).join('\r\n');
  const blob=new Blob(['\ufeff'+escaped],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=u;a.download='LS_Engineering_vendite_'+state.period+'.csv';document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),5000);
 }
 el('period').addEventListener('change',e=>{state.period=e.target.value;load()});
 el('chartMode').addEventListener('change',e=>{state.chart=e.target.value;showChart()});
 el('export').addEventListener('click',exportCsv);
 el('refresh').addEventListener('click',load);
 el('logout').addEventListener('click',async()=>{await fetch('/_ls/logout',{method:'POST',credentials:'same-origin'});location.reload()});
 load();
}
const extraCSS='.wide{max-width:1120px}.dash-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.tools{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:15px 0}select{background:#102d49;color:white;border:1px solid #3c7899;border-radius:7px;padding:8px}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}.metric{background:#164160;border:1px solid #315e79;border-radius:10px;padding:14px}.metric strong{display:block;font-size:23px;margin:5px 0}.metric small{display:block;color:#b4cce1}.bar-row{display:grid;grid-template-columns:90px 1fr 105px;gap:12px;align-items:center;margin:7px 0;font-size:12px}.bar-track{height:16px;background:#102d49;border-radius:5px;overflow:hidden}.bar{height:100%;background:#27b7b2;border-radius:5px}.bar-row span:last-child{text-align:right}button:disabled{opacity:.5;cursor:wait}@media(max-width:520px){.bar-row{grid-template-columns:75px 1fr 90px;gap:5px;font-size:11px}}';
function dashboard(res,page){
 const body='<style>'+extraCSS+'</style><div class="dash-head"><div><h1>LS Engineering · Vendite 2.0</h1><p>Dashboard privata · pagamenti Stripe verificati · predisposta per REVERSE 3D</p><p><a href="/_ls/m30/upload">Caricamento privato REVERSE 3D M30.18</a></p><p><a href="https://analytics.google.com/analytics/web/" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" title="Statistiche visite Google Analytics 4">📊 Google Analytics · Visite al sito</a> <small style="color:#b5cce2">Link riservato al titolare, visibile solo nel pannello privato.</small></p></div><div><a href="/">Sito</a> <button id="logout">Esci</button></div></div>'+
  '<div class="tools"><label for="period">Periodo</label><select id="period"><option value="d7">Ultimi 7 giorni</option><option value="d30" selected>Ultimi 30 giorni</option><option value="d90">Ultimi 90 giorni</option><option value="d365">Ultimi 365 giorni</option><option value="all">Tutto lo storico</option></select><button id="refresh">Aggiorna</button><button id="export" disabled>CSV per Excel</button></div>'+
  '<p id="message" role="status">Caricamento…</p><div class="box"><h2>Indicatori economici</h2><div id="metrics" class="metrics"></div></div>'+
  '<div class="box"><div class="dash-head"><h2>Andamento dei pagamenti lordi</h2><select id="chartMode" aria-label="Vista grafico"><option value="monthly">Mensile</option><option value="daily">Giornaliero (fino a 30 giorni)</option></select></div><div id="bars"></div></div>'+
  '<div class="box"><h2>Vendite per applicazione</h2><p>Le transazioni senza nome prodotto verificabile sono indicate come non attribuite. REVERSE 3D verrà riconosciuto quando il suo checkout includerà il nome del prodotto.</p><div class="scroll"><table><thead><tr><th>Applicazione</th><th>Vendite</th><th>Lordo</th><th>Dopo rimborsi</th></tr></thead><tbody id="products"></tbody></table></div></div>'+
  '<div class="box"><h2>Dettaglio ultime transazioni</h2><div class="scroll"><table><thead><tr><th>Data</th><th>Categoria</th><th>Descrizione</th><th>Lordo</th><th>Rimborsi</th></tr></thead><tbody id="rows"></tbody></table></div></div>'+
  '<p>Importi in euro, senza conversioni valutarie. I rimborsi sono associati al pagamento iniziale, non alla data effettiva del rimborso. Le commissioni potrebbero non includere costi extra fatturati separatamente da Stripe: per la riconciliazione contabile fa fede la reportistica Stripe.</p>';
 page(res,body,'('+frontend.toString()+')()');
}
module.exports={dashboard,stats};