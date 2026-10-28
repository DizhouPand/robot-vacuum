import worker from '../worker.js';
import { once } from 'node:events';

// Vercel 的 Node 接口和本机服务共用同一个 Dify 流式处理逻辑。
export default async function handler(req, res) {
  try {
    const method = req.method || 'GET';
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    const request = new Request('http://localhost/api/generate', {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(method === 'GET' || method === 'HEAD' ? {} : { body })
    });
    const upstream = await worker.fetch(request, process.env);
    res.statusCode = upstream.status;
    upstream.headers.forEach((value, name) => res.setHeader(name, value));
    if (!upstream.body) return res.end();
    const reader = upstream.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!res.write(Buffer.from(value))) await once(res, 'drain');
      }
      res.end();
    } finally { reader.releaseLock(); }
  } catch {
    if (!res.headersSent) { res.statusCode = 502; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify({ error: '生成服务暂时不可用，请稍后重试。' })); }
    else res.destroy();
  }
}
