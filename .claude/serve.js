// Minimal static server for previewing the course locally (no deps).
// node .claude/serve.js [port] [base]  e.g. `8766 /anja-study/` serves under a sub-path like GitHub Pages,
// so a relative path that climbs above the site root shows up as a 404 here too.
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const port = +process.argv[2] || 8765, base = process.argv[3] || '/';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url + '/' === base) { res.writeHead(301, { Location: base }); return res.end(); }
  if (!url.startsWith(base)) { res.writeHead(404); return res.end('not found (outside ' + base + ')'); }
  let p = path.join(root, decodeURIComponent(url.slice(base.length)));
  if (!p.startsWith(root)) { res.writeHead(403); return res.end('forbidden'); }
  if (p.endsWith(path.sep) || p === root) p = path.join(p, 'index.html');
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, () => console.log('serving', root, 'on http://localhost:' + port + base));
