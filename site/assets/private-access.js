/* LS Engineering: static readiness bridge for the free Render private admin.
 * Does not authenticate users, read business data, or bypass access controls.
 * The private backend still requires the owner's verified Google identity.
 */
(function(){
 'use strict';
 var TARGET='https://lsengineering.onrender.com/_ls/admin';
 var READY='https://lsengineering.onrender.com/_ls/admin/ready';
 var status=document.getElementById('status');
 var detail=document.getElementById('detail');
 var retry=document.getElementById('retry');
 var attempts=0, timer=null, active=false, aborted=false;
 var maxAttempts=30;
 function say(a,b){status.textContent=a;detail.textContent=b}
 async function probe(){
   if(aborted||active)return;
   active=true;attempts++;
   var controller=new AbortController();
   var timeout=setTimeout(function(){controller.abort()},12000);
   try{
     var response=await fetch(READY+'?check='+Date.now(),{
       method:'GET',mode:'cors',credentials:'omit',cache:'no-store',signal:controller.signal
     });
     if(!response.ok)throw new Error('not ready');
     var value=await response.json();
     if(!value||value.ready!==true)throw new Error('not ready');
     clearTimeout(timeout);
     say('Pannello disponibile. Apertura in corso…','Reindirizzamento al login Google riservato al titolare.');
     window.location.replace(TARGET);
     return;
   }catch(e){
     if(attempts>=maxAttempts){
       say('Il pannello non risponde ancora.','Il sito resta accessibile: riprova la connessione oppure usa il pulsante per aprire il pannello direttamente.');
       retry.disabled=false;
     }else{
       say('Riattivazione del pannello…','Tentativo '+attempts+' di '+maxAttempts+'. Il server gratuito potrebbe essere momentaneamente inattivo.');
       timer=setTimeout(probe,4000);
     }
   }finally{clearTimeout(timeout);active=false}
 }
 retry.addEventListener('click',function(){
   if(timer)clearTimeout(timer);
   attempts=0;aborted=false;
   say('Nuovo controllo in corso…','Verifico la disponibilità del servizio privato.');
   probe();
 });
 probe();
})();