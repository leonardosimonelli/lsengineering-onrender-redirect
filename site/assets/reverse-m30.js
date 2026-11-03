'use strict';
(function(){
  const API_STATUS='/api/m30/status';
  const API_CHECKOUT='/api/m30/checkout';
  const btn=document.getElementById('m30-buy');
  const status=document.getElementById('m30-status');
  const agree=document.getElementById('m30-consent');
  if(!btn||!status||!agree)return;
  const message=(s)=>{status.textContent=s;};
  async function availability(){
    btn.disabled=true;
    try {
      const r=await fetch(API_STATUS,{method:'GET',cache:'no-store'});
      if(!r.ok)throw Error();
      const data=await r.json();
      if(data.ready){btn.disabled=false;message('Consegna privata attiva. Seleziona la conferma prima di procedere al pagamento.');}
      else{btn.disabled=true;message('Vendita non ancora attiva: stiamo completando la consegna privata del pacchetto. Nessun pagamento sarà addebitato.');}
    }catch{btn.disabled=true;message('Impossibile verificare ora la disponibilità. Riprova più tardi.');}
  }
  btn.addEventListener('click',async()=>{
    if(!agree.checked){message('Prima di acquistare devi confermare di aver compreso che M30.18 non è stata ancora collaudata funzionalmente su Windows.');agree.focus();return;}
    btn.disabled=true;message('Preparazione del pagamento sicuro Stripe…');
    try{
      const r=await fetch(API_CHECKOUT,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({confirmedUnverified:true})});
      const data=await r.json();
      if(!r.ok||!data.checkout_url||!data.checkout_url.startsWith('https://checkout.stripe.com/'))throw Error(data.error||'Checkout non disponibile');
      window.location.assign(data.checkout_url);
    }catch(e){message('Pagamento non avviato: '+e.message);await availability();}
  });
  availability();
})();
