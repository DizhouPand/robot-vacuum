import { normalizeOutputs } from './lib/workflow-result.js';

const products = ['T20 Pro 月白', 'T20 Pro 曜石黑', 'T10 月白', 'S1 Max 标准版', 'S1 Max 上下水版'];
const wants = ['只要文案', '文案 + 配图', '文案 + 配图 + 视频'];
const fail = (status, error) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path !== '/api/generate') return path.startsWith('/api/') ? new Response('Not Found', { status: 404 }) : env.ASSETS.fetch(request);
    if (request.method !== 'POST') return fail(405, '请使用正确的请求方式。');
    if (Number(request.headers.get('content-length')) > 10000) return fail(413, '请求内容过长。');
    let body;
    try { const raw = await request.text(); if (raw.length > 10000) return fail(413, '请求内容过长。'); body = JSON.parse(raw); } catch { return fail(400, '请求内容不正确。'); }
    const { product, campaign, audience, want, shot = '' } = body || {};
    if (!products.includes(product) || !wants.includes(want) || typeof campaign !== 'string' || !campaign.trim() || campaign.length > 20 || typeof audience !== 'string' || !audience.trim() || audience.length > 60 || typeof shot !== 'string' || shot.length > 500) return fail(400, '请检查产品、主题、目标人群和镜头要求。');
    const base = env.DIFY_API_BASE?.trim().replace(/\/+$/, '');
    const key = env.DIFY_API_KEY?.trim();
    if (!base || !key) return fail(503, '服务尚未配置完成，请联系管理员。');
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 590 * 1000);
    let upstream;
    try {
      upstream = await fetch(`${base}/workflows/run`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ inputs: { product, campaign: campaign.trim(), audience: audience.trim(), want, shot: shot.trim() }, response_mode: 'streaming', user: 'robot-creative-web' }), signal: abort.signal });
      if (!upstream.ok || !upstream.body || !upstream.headers.get('content-type')?.includes('text/event-stream')) { clearTimeout(timeout); abort.abort(); return fail(502, '生成服务暂时不可用，请稍后重试。'); }
    } catch { clearTimeout(timeout); return fail(502, '生成服务暂时不可用，请稍后重试。'); }
    const encoder = new TextEncoder();
    let reader;
    const stream = new ReadableStream({
      async start(controller) {
        const send = value => controller.enqueue(encoder.encode(JSON.stringify(value)));
        const keepAlive = () => controller.enqueue(encoder.encode(' '));
        let heartbeat;
        try {
          keepAlive();
          heartbeat = setInterval(() => { try { keepAlive(); } catch { abort.abort(); } }, 15000);
          reader = upstream.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '', finished = false;
          const consume = eventText => {
            const data = eventText.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
            if (!data) return;
            const event = JSON.parse(data);
            if (event.event === 'workflow_finished') {
              finished = true;
              if (event.data?.status !== 'succeeded') send({ error: '工作流未完成，请稍后重试。' });
              else send(normalizeOutputs(event.data.outputs, key));
            } else if (event.event === 'error' || event.event === 'workflow_paused') {
              finished = true; send({ error: '工作流未完成，请在 Dify 中检查运行状态。' });
            }
          };
          while (!finished) {
            const { value, done } = await reader.read();
            buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
            if (buffer.length > 2_000_000) throw new Error('Event too large');
            let match;
            while ((match = /\r?\n\r?\n/.exec(buffer))) { const eventText = buffer.slice(0, match.index); buffer = buffer.slice(match.index + match[0].length); consume(eventText); if (finished) break; }
            if (done) { if (buffer.trim() && !finished) consume(buffer); break; }
          }
          if (!finished) send({ error: '连接已中断，请先到 Dify 日志查看本次运行结果。' });
        } catch { try { send({ error: '连接已中断或等待超时，请先到 Dify 日志查看本次运行结果。' }); } catch {} }
        finally { clearInterval(heartbeat); clearTimeout(timeout); try { await reader?.cancel(); } catch {} try { controller.close(); } catch {} }
      },
      cancel() { clearTimeout(timeout); abort.abort(); reader?.cancel().catch(() => {}); }
    });
    return new Response(stream, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } });
  }
};
