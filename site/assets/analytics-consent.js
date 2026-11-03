/* LS Engineering — consent-first Google Analytics 4.
 * Before a valid measurement ID is configured, analytics and the consent banner stay disabled.
 * No Google Analytics network request occurs before opt-in.
 */
(function () {
  'use strict';
  var GA4_ID = ''; // Set to the actual G-... measurement ID after the owner accepts the Google terms.
  if (!/^G-[A-Z0-9]{5,20}$/.test(GA4_ID)) return;
  var KEY = 'ls_ga4_consent_v1';
  var AGE = 180 * 24 * 60 * 60 * 1000;
  var translations = {
    it: ['Statistiche facoltative', 'Usiamo Google Analytics 4 per comprendere quali pagine vengono visitate e migliorare LS Engineering. Nessun dato viene inviato a Google Analytics prima del tuo consenso. Puoi cambiare scelta in qualsiasi momento.', 'Rifiuta', 'Accetta', 'Preferenze cookie', 'Informativa privacy', 'Chiudi e rifiuta'],
    en: ['Optional analytics', 'We use Google Analytics 4 to understand page visits and improve LS Engineering. Nothing is sent to Google Analytics before your consent. You may change your choice at any time.', 'Reject', 'Accept', 'Cookie preferences', 'Privacy information', 'Close and reject'],
    fr: ['Statistiques facultatives', 'Google Analytics 4 nous aide à comprendre les visites et à améliorer LS Engineering. Aucune donnée ne lui est transmise sans votre consentement. Vous pouvez modifier votre choix.', 'Refuser', 'Accepter', 'Préférences cookies', 'Confidentialité', 'Fermer et refuser'],
    de: ['Optionale Statistiken', 'Google Analytics 4 hilft uns, Besuche zu verstehen und LS Engineering zu verbessern. Vor Ihrer Zustimmung werden keine Daten an Analytics gesendet. Ihre Wahl ist jederzeit änderbar.', 'Ablehnen', 'Akzeptieren', 'Cookie-Einstellungen', 'Datenschutz', 'Schließen und ablehnen'],
    es: ['Estadísticas opcionales', 'Usamos Google Analytics 4 para entender las visitas y mejorar LS Engineering. No se envían datos a Analytics antes de tu consentimiento. Puedes cambiar tu elección.', 'Rechazar', 'Aceptar', 'Preferencias de cookies', 'Privacidad', 'Cerrar y rechazar'],
    ru: ['Необязательная аналитика', 'Мы используем Google Analytics 4 для анализа посещений. До вашего согласия данные в Analytics не отправляются. Вы можете изменить выбор в любое время.', 'Отклонить', 'Принять', 'Настройки cookie', 'Конфиденциальность', 'Закрыть и отклонить'],
    zh: ['可选访问统计', '我们使用 Google Analytics 4 了解访问情况并改进 LS Engineering。您同意之前不会向 Analytics 发送数据。您可以随时更改选择。', '拒绝', '接受', 'Cookie 设置', '隐私信息', '关闭并拒绝'],
    ar: ['إحصاءات اختيارية', 'نستخدم Google Analytics 4 لفهم زيارات الموقع وتحسين LS Engineering. لا نرسل بيانات إلى Analytics قبل موافقتك. يمكنك تغيير اختيارك في أي وقت.', 'رفض', 'موافقة', 'تفضيلات ملفات الارتباط', 'معلومات الخصوصية', 'إغلاق ورفض']
  };
  function getLanguage() {
    var lang = (document.documentElement.lang || 'it').split('-')[0].toLowerCase();
    if (lang === 'it') {
      var sel = document.getElementById('language');
      if (sel && sel.value && translations[sel.value]) lang = sel.value;
    }
    return translations[lang] ? lang : 'en';
  }
  function getChoice() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (c && (c.v === 'accept' || c.v === 'reject') && Date.now() - c.t < AGE && c.t <= Date.now()) return c.v;
    } catch (e) {}
    return null;
  }
  function saveChoice(v) {
    try { localStorage.setItem(KEY, JSON.stringify({v:v, t:Date.now()})); } catch(e) {}
  }
  function clearAnalyticsCookies() {
    var names = document.cookie.split(';').map(function (p) { return p.trim().split('=')[0]; });
    var host = location.hostname;
    var domains = ['', host, '.' + host];
    names.forEach(function (name) {
      if (!/^_ga(?:_|$)|^_gid$|^_gat/.test(name)) return;
      domains.forEach(function (domain) {
        document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax' + (domain ? '; domain=' + domain : '');
      });
    });
  }
  var started = false;
  function startAnalytics() {
    if (started) return;
    started = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'denied', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    window.gtag('set', 'allow_google_signals', false);
    window.gtag('set', 'allow_ad_personalization_signals', false);
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID, {
      send_page_view: true, allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID);
    document.head.appendChild(script);
  }
  var style = document.createElement('style');
  style.textContent = '.ls-consent{position:fixed;left:12px;right:12px;bottom:14px;z-index:2147483600;max-width:750px;margin:auto;padding:19px 20px;color:#162d3c;background:#fff;border:2px solid #236f77;border-radius:14px;box-shadow:0 10px 32px #0006;font:14px/1.5 system-ui,-apple-system,sans-serif}.ls-consent[hidden]{display:none}.ls-consent h2{font:bold 18px/1.3 system-ui;margin:0 32px 7px 0;color:#102c40}.ls-consent p{margin:0 0 14px}.ls-consent a{text-decoration:underline;color:#095e83}.ls-consent .ls-actions{display:flex;flex-wrap:wrap;gap:10px}.ls-consent button{border:2px solid #145e70;background:#eef8f7;color:#082f3f;border-radius:8px;padding:9px 18px;cursor:pointer;font:700 14px system-ui;min-height:43px}.ls-consent button:hover,.ls-pref:hover{background:#c9f4e9}.ls-consent .ls-x{position:absolute;top:10px;right:12px;border:0;background:transparent;padding:5px;font-size:20px;min-height:25px}.ls-pref{position:fixed;left:12px;bottom:12px;z-index:2147483599;background:#fff;color:#133b45;border:1px solid #3b8b8a;border-radius:7px;padding:7px 10px;font:600 12px system-ui;cursor:pointer;box-shadow:0 2px 9px #0002}.ls-pref[hidden]{display:none}@media(max-width:520px){.ls-consent{left:6px;right:6px;bottom:5px;padding:13px}.ls-consent .ls-actions button{flex:1}}';
  document.head.appendChild(style);
  function el(tag, content, className) {
    var e = document.createElement(tag);
    if (content) e.textContent = content;
    if (className) e.className = className;
    return e;
  }
  function launch() {
    var t = translations[getLanguage()];
    var banner = el('section', '', 'ls-consent');
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', t[0]);
    banner.hidden = true;
    var close = el('button', '\u00d7', 'ls-x'); close.type = 'button';
    close.setAttribute('aria-label', t[6]); banner.appendChild(close);
    banner.appendChild(el('h2', t[0]));
    banner.appendChild(el('p', t[1]));
    var actions = el('div', '', 'ls-actions');
    var reject = el('button', t[2]); reject.type = 'button';
    var accept = el('button', t[3]); accept.type = 'button';
    var privacy = el('a', t[5]); privacy.href = '/informazioni.html#privacy-analytics';
    actions.appendChild(reject); actions.appendChild(accept); actions.appendChild(privacy);
    banner.appendChild(actions);
    var preferences = el('button', t[4], 'ls-pref');
    preferences.type = 'button';
    preferences.hidden = true;
    document.body.appendChild(banner);
    document.body.appendChild(preferences);
    function dismiss() {
      banner.hidden = true; preferences.hidden = false;
    }
    function choose(value) {
      var wasRunning = started;
      saveChoice(value);
      if (value === 'accept') startAnalytics();
      else if (wasRunning) {
        window.gtag('consent', 'update', { analytics_storage: 'denied' });
        clearAnalyticsCookies();
        location.reload(); return;
      } else clearAnalyticsCookies();
      dismiss();
    }
    reject.addEventListener('click', function () { choose('reject'); });
    accept.addEventListener('click', function () { choose('accept'); });
    close.addEventListener('click', function () {
      // A new visitor closing the dialog gets the privacy-preserving default.
      if (!getChoice()) choose('reject');
      else dismiss();
    });
    preferences.addEventListener('click', function () { banner.hidden = false; preferences.hidden = true; });
    if (getChoice() === 'accept') { startAnalytics(); preferences.hidden = false; }
    else if (getChoice() === 'reject') preferences.hidden = false;
    else banner.hidden = false;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', launch);
  else launch();
})();