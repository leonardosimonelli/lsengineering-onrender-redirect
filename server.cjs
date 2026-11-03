'use strict';

// LS Engineering: serve the mirrored website directly from Render.
// The private Google-authenticated admin routes are installed first.
require('./admin.cjs');

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, 'site');
const MIME = {
  '.html':'text/html; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.xml':'application/xml; charset=utf-8',
  '.txt':'text/plain; charset=utf-8',
  '.svg':'image/svg+xml',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.webp':'image/webp',
  '.gif':'image/gif',
  '.ico':'image/x-icon',
  '.woff':'font/woff',
  '.woff2':'font/woff2',
  '.pdf':'application/pdf'
};

function send(res, status, msg, method) {
  const body=method==='HEAD'?'':msg;
  res.writeHead(status, {
    'content-type':'text/plain; charset=utf-8',
    'cache-control':'no-store',
    'x-content-type-options':'nosniff',
    'x-frame-options':'DENY'
  });
  res.end(body);
}


const SITE_ORIGIN='https://lsengineering.onrender.com';
const M30_UPSTREAM='https://ijdjyketecwwplvqcqpd.supabase.co/functions/v1/';
const M30_ENDPOINTS={
  '/api/m30/status': {method:'GET',slug:'reverse-m30-checkout'},
  '/api/m30/checkout': {method:'POST',slug:'reverse-m30-checkout'},
  '/api/m30/delivery': {method:'POST',slug:'reverse-m30-delivery'},
  '/shop/m30/status': {method:'GET',slug:'reverse-m30-checkout'},
  '/shop/m30/checkout': {method:'POST',slug:'reverse-m30-checkout'},
  '/shop/m30/delivery': {method:'POST',slug:'reverse-m30-delivery'}
};
function respondJson(res, status, value) {
  res.writeHead(status, {
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store',
    'x-content-type-options':'nosniff',
    'referrer-policy':'no-referrer'
  });
  res.end(JSON.stringify(value));
}
async function proxyM30(req,res,pathname) {
  const endpoint=M30_ENDPOINTS[pathname];
  if (!endpoint) return false;
  if (req.method!==endpoint.method) {
    res.writeHead(405,{'allow':endpoint.method,'cache-control':'no-store'}).end();
    return true;
  }
  let body;
  if (req.method==='POST') {
    if (req.headers.origin && req.headers.origin!==SITE_ORIGIN) {
      respondJson(res,403,{error:'Origine non autorizzata'});return true;
    }
    if (!(req.headers['content-type']||'').startsWith('application/json')) {
      respondJson(res,415,{error:'È richiesto JSON'});return true;
    }
    const chunks=[];
    let size=0;
    for await (const chunk of req) {
      size+=chunk.length;
      if (size>1024) {
        respondJson(res,413,{error:'Richiesta troppo grande'});return true;
      }
      chunks.push(chunk);
    }
    body=Buffer.concat(chunks).toString('utf8');
  }
  try {
    const upstream=await fetch(M30_UPSTREAM+endpoint.slug,{
      method:req.method,
      headers:{'origin':SITE_ORIGIN,'content-type':'application/json','accept':'application/json'},
      ...(body===undefined?{}:{body}),
      signal:AbortSignal.timeout(25000)
    });
    const content=await upstream.text();
    if (content.length>100000 || !(upstream.headers.get('content-type')||'').includes('application/json')) {
      respondJson(res,502,{error:'Risposta server non valida'});return true;
    }
    res.writeHead(upstream.status,{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store',
      'x-content-type-options':'nosniff',
      'referrer-policy':'no-referrer'
    });
    res.end(content);
  } catch {
    respondJson(res,502,{error:'Servizio di pagamento temporaneamente non raggiungibile'});
  }
  return true;
}


async function serve(req, res) {
  let pathname;
  try {
    pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(!pathname.startsWith('/')||pathname.includes(String.fromCharCode(92))||pathname.includes(String.fromCharCode(0))) throw new Error('Invalid path');
  } catch {
    send(res,400,'Bad request',req.method);return;
  }
  if(pathname==='/shop/m30/health') {
    console.log('M30 health probe');
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end('<!doctype html><html lang="it"><title>LS M30 Health</title><body><main><h1>LS Engineering M30 proxy attivo</h1></main></body></html>');
    return;
  }
  if (pathname.startsWith('/shop/m30/')||pathname.startsWith('/api/m30/')) {
    console.log('M30 storefront route',req.method,pathname);
  }
  if (await proxyM30(req,res,pathname)) return;
  const method=req.method;
  if (method!=='GET'&&method!=='HEAD') {
    res.writeHead(405,{'allow':'GET, HEAD','cache-control':'no-store'});
    res.end();return;
  }
  let requestPath = pathname.endsWith('/') ? pathname + 'index.html' : pathname;
  let target = path.resolve(root, '.' + requestPath);
  if (!target.startsWith(root + path.sep)) {
    send(res,403,'Forbidden',method); return;
  }

  let stat;
  try { stat = await fs.promises.stat(target); } catch {}
  if ((!stat || !stat.isFile()) && !path.extname(target)) {
    const alternate=target+'.html';
    try {
      const s=await fs.promises.stat(alternate);
      if (s.isFile()) {target=alternate;stat=s;}
    } catch {}
  }
  if (!stat || !stat.isFile()) {
    send(res,404,'Page not found',method); return;
  }

  const ext=path.extname(target).toLowerCase();
  res.writeHead(200, {
    'content-type': MIME[ext] || 'application/octet-stream',
    'content-length': stat.size,
    'cache-control': ext === '.html' ? 'public, max-age=60' : 'public, max-age=300',
    'x-content-type-options':'nosniff',
    'referrer-policy':'strict-origin-when-cross-origin'
  });
  if(method === 'HEAD') {res.end();return;}
  const stream = fs.createReadStream(target);
  stream.on('error',()=>res.destroy());
  stream.pipe(res);
}

const port = Number(process.env.PORT) || 10000;
http.createServer((req,res)=>{
  Promise.resolve(serve(req,res)).catch(()=>{
    if(!res.headersSent)send(res,500,'Server error',req.method);
    else res.destroy();
  });
}).listen(port,'0.0.0.0',()=>{
  console.log('LS Engineering server listening on port '+port);
});
