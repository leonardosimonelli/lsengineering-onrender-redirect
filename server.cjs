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

async function serve(req, res) {
  const method = req.method;
  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, {'allow':'GET, HEAD','cache-control':'no-store'});
    res.end(); return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!pathname.startsWith('/') || pathname.includes('\\') || pathname.includes('\0'))
      throw new Error('Invalid path');
  } catch {
    send(res,400,'Bad request',method); return;
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
