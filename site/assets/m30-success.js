'use strict';
(function(){
  const API='https://ijdjyketecwwplvqcqpd.supabase.co/functions/v1/reverse-m30-delivery';
  const id=new URLSearchParams(location.search).get('session_id')||'';
  history.replaceState(null,'',location.pathname);
  const note=document.getElementById('m30-note'),links=document.getElementById('m30-parts'),button=document.getElementById('m30-zip'),hash=document.getElementById('m30-hash');
  const set=(text)=>{note.textContent=text};
  let files=[],expectedHash='';
  if(!/^cs_live_[a-zA-Z0-9_]{20,256}$/.test(id)){set('Riferimento acquisto non valido. Apri questa pagina dal ritorno Stripe dopo il pagamento oppure contatta LS Engineering.');return;}
  async function tryDelivery(){
    for(let i=0;i<9;i++){
      try{
        const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},cache:'no-store',body:JSON.stringify({session_id:id})});
        const data=await r.json();
        if(r.status===409&&i<8){set('Pagamento in elaborazione: nuova verifica tra pochi secondi ('+(i+1)+'/9)…');await new Promise(resolve=>setTimeout(resolve,5000));continue;}
        if(!r.ok||!data.paid||!Array.isArray(data.files)||data.files.length!==3)throw Error(data.error||'Verifica pagamento non riuscita');
        files=data.files;expectedHash=data.archive_sha256||'';
        set('Pagamento confermato: il software è disponibile. I link scadono tra 10 minuti; aggiorna questa pagina dal link Stripe per richiederne altri.');
        hash.textContent='SHA-256 ZIP: '+expectedHash;
        for(const f of files){const a=document.createElement('a');a.href=f.url;a.textContent='Scarica '+f.name+' ('+(f.bytes/1048576).toFixed(1)+' MiB)';a.download=f.name;a.target='_blank';a.rel='noopener noreferrer';const li=document.createElement('li');li.append(a);links.append(li);}
        document.getElementById('m30-downloads').hidden=false;
        return;
      }catch(e){set('Download non disponibile: '+e.message+'. Se hai pagato, contatta LS Engineering allegando la ricevuta Stripe.');return;}
    }
  }
  button.addEventListener('click',async()=>{
    button.disabled=true;
    try{
      set('Preparazione dello ZIP originale in memoria: non chiudere questa scheda…');
      const chunks=[];
      for(const f of files){const r=await fetch(f.url,{cache:'no-store'});if(!r.ok)throw Error('Impossibile scaricare '+f.name);const blob=await r.blob();if(blob.size!==f.bytes)throw Error('Dimensione non corretta: '+f.name);chunks.push(blob);}
      const combined=new Blob(chunks,{type:'application/zip'});
      if(combined.size!==74150107)throw Error('Dimensione totale errata');
      const url=URL.createObjectURL(combined),a=document.createElement('a');
      a.href=url;a.download='REVERSE_M30_18_WINDOWS.zip';document.body.append(a);a.click();a.remove();
      set('Download avviato. Conserva il file ZIP e verifica il codice SHA-256 riportato in pagina.');
      setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(e){set('Download completo non riuscito: '+e.message+'. Usa i tre link delle parti qui sotto e lo script di ricomposizione.');}
    finally{button.disabled=false;}
  });
  set('Verifica del pagamento Stripe in corso…');
  tryDelivery();
})();
