import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from './api/generate.js';

const root = fileURLToPath(new URL('.', import.meta.url));
try {
  const env = await readFile(resolve(root, 'local.env'), 'utf8');
  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^\s*(DIFY_API_BASE|DIFY_API_KEY)\s*=(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim();
  }
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const build = spawnSync(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), 'build'], { cwd: root, stdio: 'inherit' });
if (build.error || build.status !== 0) { console.error('网页构建失败，请先安装项目依赖。'); process.exit(1); }
const dist = resolve(root, 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/api/generate') {
    let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 10000) { res.writeHead(413); res.end(); return; } }
    req.body = body; res.status = code => { res.statusCode = code; return res; }; res.json = data => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(data)); }; return handler(req, res);
  }
  try {
    const file = resolve(dist, '.' + (path === '/' ? '/index.html' : decodeURIComponent(path)));
    if (!file.startsWith(dist + sep)) throw new Error('Invalid path');
    const data = await readFile(file); res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }); res.end(data);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('页面不存在，请先执行 npm run build。'); }
}).listen(3003, '127.0.0.1', () => console.log('本机试运行：http://localhost:3003'));
