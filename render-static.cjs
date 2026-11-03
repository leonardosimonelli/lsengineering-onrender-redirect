'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, 'site');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'};
const native = http.createServer;
http.createServer = function() {
  return native.call(this, (req,res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405,{allow:'GET, HEAD'}).end(); return; }
    let route;
    try {
      route = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (route.includes(' ') || route.includes(' 0')) throw Error();
    } catch (_) { res.writeHead(400).end('Bad request'); return; }
    if (route === '/robots.txt') {
      res.writeHead(200,{'content-type':'text/plain','cache-control':'public, max-age=3600'});
      res.end(req.method === 'HEAD' ? '' : 'User-agent: * Allow: / ');
      return;
    }
    const target = path.resolve(root, '.' + (route.endsWith('/') ? route + 'index.html' : route));
    if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.stat(target, (err, stat) => {
      if (err || !stat.isFile()) { res.writeHead(404,{'x-robots-tag':'noindex, follow'}).end('Not found'); return; }
      const ext = path.extname(target).toLowerCase();
      res.writeHead(200,{
        'content-type': mime[ext] || 'application/octet-stream',
        'content-length':stat.size,
        'cache-control':'public, max-age=900',
        'x-robots-tag':'noindex, follow',
        'x-content-type-options':'nosniff'
      });
      if (req.method === 'HEAD') res.end();
      else fs.createReadStream(target).on('error',()=>res.destroy()).pipe(res);
    });
  });
};
