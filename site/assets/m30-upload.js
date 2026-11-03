'use strict';
(function(){
 const sizes={part01:26214400,part02:26214400,part03:21721307};
 const input=document.getElementById('m30files'),button=document.getElementById('m30send'),status=document.getElementById('m30log');
 button.addEventListener('click',async()=>{
  const mapping=new Map();
  for(const file of Array.from(input.files||[])){
    const m=file.name.match(/\.part(01|02|03)$/i);
    if(!m){status.textContent='File non riconosciuto: '+file.name;return}
    const id='part'+m[1];
    if(mapping.has(id)||file.size!==sizes[id]){status.textContent='Dimensione errata o file duplicato: '+file.name;return}
    mapping.set(id,file);
  }
  if(mapping.size!==3){status.textContent='Seleziona tutte e tre le parti del programma.';return}
  button.disabled=true;
  try{
   for(const [part,file] of mapping){
     status.textContent='Invio e verifica di '+part+' ('+(file.size/1048576).toFixed(1)+' MiB)…';
     const r=await fetch('/_ls/m30/upload?part='+part,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/octet-stream','x-ls-upload':'1'},body:file});
     const response=await r.json();
     if(!r.ok||!response.verified)throw Error(response.error||'Verifica fallita');
     status.textContent=part+' verificata. Proseguo…';
   }
   status.textContent='TUTTE LE TRE PARTI SONO STATE CARICATE NELLO STORAGE PRIVATO E VERIFICATE TRAMITE SHA-256. Il checkout rimane bloccato finché non è configurato Stripe.';
  }catch(e){status.textContent='Caricamento non completato: '+e.message+'. Le parti già verificate sono conservate.'}
  finally{button.disabled=false}
 });
})();
