import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = process.argv[2], T = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.mp4':'video/mp4','.png':'image/png','.jpeg':'image/jpeg','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf'};
http.createServer((q, s) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p === '/tonton') p = '/tonton.html'; if (p === '/' || p.startsWith('/uji/')) p = '/index.html'; const f = path.join(root, p);
  if (!f.startsWith(path.resolve(root)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end('404'); }
  const size = fs.statSync(f).size, h = {'content-type': T[path.extname(f)] || 'application/octet-stream', 'accept-ranges': 'bytes'}; const m = /bytes=(\d*)-(\d*)/.exec(q.headers.range || '');
  if (m) { const a = m[1] ? +m[1] : size - +m[2], b = m[1] && m[2] ? +m[2] : size - 1; s.writeHead(206, {...h, 'content-range': `bytes ${a}-${b}/${size}`, 'content-length': b - a + 1}); return fs.createReadStream(f, {start: a, end: b}).pipe(s); }
  s.writeHead(200, {...h, 'content-length': size}); fs.createReadStream(f).pipe(s); }).listen(+process.argv[3] || 8093, () => console.log('siap'));
