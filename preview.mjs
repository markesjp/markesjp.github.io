import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep, extname } from 'node:path';
const root = resolve(fileURLToPath(new URL('./', import.meta.url)));
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8'};
createServer(async (req,res) => {
  try {
    const target = resolve(root, '.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if (target !== root && !target.startsWith(root + sep)) {res.writeHead(403);res.end();return;}
    const file = target === root ? resolve(root,'index.html') : target;
    const data = await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file)] || 'application/octet-stream','Cache-Control':'no-store'});res.end(data);
  } catch {res.writeHead(404);res.end('Página não encontrada');}
}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
