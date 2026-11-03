'use strict';
(function(){
 const P={
  part01:{size:26214400,sha:'d80dea7162c872959d7d44af3d65f35b3f9065e226fcb8ba8b807e8634a17515'},
  part02:{size:26214400,sha:'942d354b8ad98fb75edd0b9bb5f8c4e2fa655b61d3c5eb3af5e951b5c85106b2'},
  part03:{size:21721307,sha:'2fcb28717a8a828330524d8686cc1582229b64fde58f43f5c13beaafcebd5524'}
 };
 const input=document.getElementById('m30files'),button=document.getElementById('m30send'),log=document.getElementById('m30log'),status=document.getElementById('m30state');
 function tell(x){log.textContent=x}
 function hex(bytes){return Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('')}
 async function api(action,part){
  const r=await fetch('/_ls/m30/api',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action,part})});
  const result=await r.json().catch(()=>({error:'Errore di comunicazione'}));
  if(!r.ok)throw Error(result.error||'Operazione non riuscita ('+r.status+')');
  return result;
 }
 async function refresh(){
  const state=await api('status');
  const values=Object.entries(state.parts||{}).map(([k,v])=>k+': '+(v.verified?'verificata':'da caricare'));
  status.textContent=values.join(' · ')+(state.complete?' — PACCHETTO COMPLETO':'');
  return state;
 }
 async function doUpload(){
  const map=new Map();
  for(const file of Array.from(input.files||[])){
   const m=file.name.match(/\.part(01|02|03)$/i);
   if(!m){tell('Nome file non riconosciuto: '+file.name);return}
   const key='part'+m[1],expected=P[key];
   if(map.has(key)||file.size!==expected.size){tell('Parte duplicata o dimensione errata: '+file.name);return}
   map.set(key,file);
  }
  if(map.size!==3){tell('Seleziona esattamente le tre parti M30.18, insieme.');return}
  button.disabled=true;
  try{
   for(const [part,file] of map){
    tell('Verifica SHA-256 sul tuo computer: '+part+'…');
    const digest=hex(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()));
    if(digest!==P[part].sha)throw Error('SHA-256 non corrispondente per '+part+'. Nessun upload eseguito per questa parte.');
    tell('Invio '+part+' ('+(file.size/1048576).toFixed(1)+' MiB) allo storage privato…');
    const signed=await api('mint',part);
    if(!/^https:\/\/ijdjyketecwwplvqcqpd(?:\.storage)?\.supabase\.co\/storage\/v1\/object\/upload\/sign\//.test(signed.signedUrl))throw Error('URL di caricamento inatteso');
    const upload=await fetch(signed.signedUrl,{method:'PUT',headers:{'content-type':'application/octet-stream','x-upsert':'true'},body:file});
    if(!upload.ok)throw Error('Storage ha rifiutato '+part+' (HTTP '+upload.status+'). Riprova.');
    tell('Controllo SHA-256 su Supabase: '+part+'…');
    const confirmation=await api('verify',part);
    if(!confirmation.verified||confirmation.sha256!==digest)throw Error('La verifica remota non ha confermato '+part);
    tell(part+' caricata e verificata. Proseguo…');
    await refresh();
   }
   const end=await refresh();
   tell(end.complete?'TUTTE LE PARTI SONO NELLO STORAGE PRIVATO E VERIFICATE. Il sistema di vendita resta bloccato fino al completamento di Stripe.':'Upload finito, ma non tutte le parti risultano verificate: ricontrolla lo stato.');
  }catch(e){tell('Caricamento interrotto: '+e.message+'. Le parti già confermate restano nello storage.');await refresh().catch(()=>{});}
  finally{button.disabled=false}
 }
 button.addEventListener('click',doUpload);
 refresh().catch(e=>tell('Impossibile leggere lo stato: '+e.message));
})();