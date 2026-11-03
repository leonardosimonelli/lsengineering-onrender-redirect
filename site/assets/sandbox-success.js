(()=>{
'use strict';
const API='https://ijdjyketecwwplvqcqpd.supabase.co/functions/v1/reverse-m13-sandbox';
const dict={
it:{heading:'Verifica del pagamento',lead:'Controlliamo il pagamento su Stripe prima di abilitare il download.',checking:'Controllo in corso…',confirmed:'SANDBOX: pagamento di prova verificato, REVERSE M13 2D è disponibile.',download:'Scarica ZIP completo (circa 67,7 MB)',fallback:'Download alternativo: tre parti separate',parts:'Scarica le tre parti nella stessa cartella. Puoi unirle con uno dei comandi qui sotto.',expiry:'I collegamenti scadono dopo 10 minuti. Premi «Rigenera link» se necessario.',renew:'Rigenera link',support:'Problemi con pagamento o download?',privacy:'Non condividere l’indirizzo di questa pagina: contiene il riferimento al tuo acquisto.',error:'Il pagamento non risulta ancora verificato. Riprova oppure contatta l’assistenza.',missing:'Non è stato trovato un riferimento acquisto valido. Apri questa pagina dal link di Stripe.',assembling:'Preparazione del file in corso…',done:'Download avviato.',failed:'Download unico non disponibile: usa le tre parti separate.',catalog:'← Catalogo'},
en:{heading:'Payment verification',lead:'We verify your Stripe payment before releasing your download.',checking:'Checking payment…',confirmed:'SANDBOX: test payment verified. REVERSE M13 2D is available.',download:'Download complete ZIP (about 67.7 MB)',fallback:'Alternative download: three separate parts',parts:'Save all three parts in the same folder and combine them using a command below.',expiry:'Links expire after 10 minutes; click Refresh links if needed.',renew:'Refresh links',support:'Questions about your payment or download?',privacy:'Do not share this page URL: it contains your purchase reference.',error:'Your payment could not be verified. Try again or contact support.',missing:'Missing or invalid purchase reference. Open this page from Stripe.',assembling:'Preparing download…',done:'Download started.',failed:'Full download failed; use the three separate parts.',catalog:'← Catalogue'},
fr:{heading:'Vérification du paiement',lead:'Nous vérifions le paiement Stripe avant le téléchargement.',checking:'Vérification en cours…',confirmed:'Paiement confirmé. REVERSE M13 est disponible.',download:'Télécharger le ZIP complet (67,7 Mo)',fallback:'Autre option : trois parties',parts:'Téléchargez les trois parties dans le même dossier puis assemblez-les.',expiry:'Les liens expirent après 10 minutes.',renew:'Actualiser les liens',support:'Besoin d’aide ?',privacy:'Ne partagez pas cette URL contenant la référence de votre achat.',error:'Paiement non vérifié. Réessayez ou contactez-nous.',missing:'Référence d’achat manquante.',assembling:'Préparation du téléchargement…',done:'Téléchargement lancé.',failed:'Utilisez les trois parties séparées.',catalog:'← Catalogue'},
de:{heading:'Zahlung überprüfen',lead:'Wir prüfen Ihre Stripe-Zahlung vor dem Download.',checking:'Überprüfung läuft…',confirmed:'Zahlung bestätigt. REVERSE M13 ist verfügbar.',download:'Gesamte ZIP-Datei laden (67,7 MB)',fallback:'Alternativ: drei Dateien',parts:'Laden Sie alle drei Teile in denselben Ordner und fügen Sie sie zusammen.',expiry:'Links laufen nach 10 Minuten ab.',renew:'Links erneuern',support:'Fragen zum Kauf oder Download?',privacy:'Diese URL mit Kaufreferenz nicht teilen.',error:'Zahlung nicht bestätigt. Erneut versuchen oder Support kontaktieren.',missing:'Kaufreferenz fehlt.',assembling:'Datei wird vorbereitet…',done:'Download gestartet.',failed:'Bitte die drei Einzeldateien nutzen.',catalog:'← Katalog'},
es:{heading:'Verificación del pago',lead:'Comprobamos tu pago de Stripe antes de la descarga.',checking:'Verificando…',confirmed:'Pago confirmado. REVERSE M13 disponible.',download:'Descargar ZIP completo (67,7 MB)',fallback:'Descarga alternativa: tres partes',parts:'Guarda las tres partes en la misma carpeta y únelas con un comando.',expiry:'Los enlaces caducan en 10 minutos.',renew:'Renovar enlaces',support:'¿Necesitas ayuda?',privacy:'No compartas esta URL: incluye tu referencia de compra.',error:'No se pudo verificar el pago. Inténtalo de nuevo.',missing:'Falta la referencia de compra.',assembling:'Preparando descarga…',done:'Descarga iniciada.',failed:'Usa las tres partes por separado.',catalog:'← Catálogo'},
ru:{heading:'Проверка платежа',lead:'Проверяем оплату Stripe перед загрузкой.',checking:'Проверка…',confirmed:'Оплата подтверждена. REVERSE M13 доступен.',download:'Скачать ZIP (67,7 МБ)',fallback:'Альтернатива: три части',parts:'Сохраните все три части в одной папке и объедините их.',expiry:'Ссылки действуют 10 минут.',renew:'Обновить ссылки',support:'Нужна помощь?',privacy:'Не делитесь адресом этой страницы.',error:'Платёж не подтверждён. Попробуйте снова.',missing:'Нет номера покупки.',assembling:'Подготовка файла…',done:'Загрузка началась.',failed:'Скачайте три части отдельно.',catalog:'← Каталог'},
zh:{heading:'付款验证',lead:'下载前验证 Stripe 付款。',checking:'正在验证…',confirmed:'付款成功，REVERSE M13 可下载。',download:'下载完整 ZIP（约 67.7 MB）',fallback:'备用下载：三个分卷',parts:'将三个分卷保存到同一文件夹，然后合并。',expiry:'链接有效期 10 分钟。',renew:'刷新链接',support:'需要帮助？',privacy:'请勿分享包含购买编号的页面链接。',error:'付款尚未验证，请重试。',missing:'缺少购买编号。',assembling:'正在准备下载…',done:'下载已开始。',failed:'请分别下载三个分卷。',catalog:'← 产品目录'},
ar:{heading:'التحقق من الدفع',lead:'نتحقق من دفعة Stripe قبل التحميل.',checking:'جارٍ التحقق…',confirmed:'تم الدفع. REVERSE M13 متاح للتحميل.',download:'تنزيل ZIP الكامل (67.7 ميغابايت)',fallback:'بديل: ثلاثة أجزاء',parts:'نزّل الأجزاء الثلاثة في مجلد واحد ثم ادمجها.',expiry:'تنتهي الروابط بعد 10 دقائق.',renew:'تحديث الروابط',support:'هل تحتاج إلى مساعدة؟',privacy:'لا تشارك رابط هذه الصفحة.',error:'لم يتم تأكيد الدفع. حاول مرة أخرى.',missing:'مرجع الشراء غير موجود.',assembling:'جارٍ إعداد الملف…',done:'بدأ التنزيل.',failed:'استخدم الأجزاء الثلاثة المنفصلة.',catalog:'← الكتالوج'}
};
let lang=(navigator.language||'it').slice(0,2).toLowerCase();if(!dict[lang])lang='en';
try { const saved=localStorage.getItem('ls_language');if(saved&&dict[saved])lang=saved }catch{}
const t=dict[lang];document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';
const $=id=>document.getElementById(id);
const fieldNames={heading:'heading',lead:'lead',confirmed:'confirmed',download:'merge-download',fallback:'fallback-label',parts:'parts-help',expiry:'expiry',renew:'renew',support:'support-text',privacy:'privacy',catalog:'return'};
for(const [k,id] of Object.entries(fieldNames))if($(id))$(id).textContent=t[k];
const p=new URLSearchParams(location.search),sid=p.get('session_id');
// The purchase reference is used once and immediately removed from browser history.
// Avoid sending the checkout session ID to other websites via Referrer.
if(sid)history.replaceState({},'',location.pathname);
let fileList=[];
function notice(message,err=false){$('notice').textContent=message;$('notice').classList.toggle('error',err)}
async function load(){
 if(!sid||!/^cs_test_[A-Za-z0-9_]{20,256}$/.test(sid)){notice(t.missing,true);return}
 notice(t.checking);$('renew').disabled=true;
 try {
   const res=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({session_id:sid}),cache:'no-store'});
   const data=await res.json();if(!res.ok||!data.paid||!Array.isArray(data.files)||data.files.length!==3)throw new Error(data.error||'Verification failed');
   fileList=data.files;const list=$('file-links');list.replaceChildren();
   for(const file of fileList){const li=document.createElement('li');const a=document.createElement('a');a.href=file.url;a.textContent=file.name;a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';li.appendChild(a);list.appendChild(li)}
   notice(t.confirmed);$('notice').hidden=true;$('downloads').hidden=false;
 } catch(e){console.warn('Download verification failed');notice(t.error,true)}
 finally{$('renew').disabled=false}
}
$('merge-download').addEventListener('click',async()=>{
 const btn=$('merge-download');btn.disabled=true;$('merge-status').textContent=t.assembling;
 try{
  let blobs=[];
  for(const file of fileList){const res=await fetch(file.url,{cache:'no-store'});if(!res.ok)throw new Error('Part download failed');blobs.push(await res.blob())}
  const blob=new Blob(blobs,{type:'application/zip'});const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='REVERSE_M13_Multilingua_Windows_Linux.zip';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  $('merge-status').textContent=t.done;
 }catch(e){console.warn('ZIP assembly failed');$('merge-status').textContent=t.failed}
 finally{btn.disabled=false}
});
$('renew').addEventListener('click',load);load();
})();