export function normalizeOutputs(outputs, key) {
  // Dify 可能返回对象、JSON 字符串，或包有 result 的 JSON 字符串。
  const decode = value => { for (let i = 0; i < 3 && typeof value === 'string'; i++) value = JSON.parse(value); return value; };
  const outer = decode(outputs);
  if (!outer || typeof outer !== 'object' || Array.isArray(outer)) throw new Error('Invalid output');
  let parsed = outer;
  for (let i = 0; i < 3 && parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.result != null; i++) parsed = decode(parsed.result);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid output');
  const text = value => typeof value === 'string' ? value.split(key).join('[已隐藏]') : '';
  const url = value => { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.href.includes(key) ? u.href : ''; } catch { return ''; } };
  return { result: { verdict: text(parsed.verdict || outer.verdict), reason: text(parsed.reason), error: text(parsed.error), xhs: { title: text(parsed.xhs?.title), body: text(parsed.xhs?.body), tags: Array.isArray(parsed.xhs?.tags) ? parsed.xhs.tags.filter(x => typeof x === 'string').map(text).join(' ') : text(parsed.xhs?.tags) }, douyin: { script: text(parsed.douyin?.script) }, detail: { headline: text(parsed.detail?.headline), points: Array.isArray(parsed.detail?.points) ? parsed.detail.points.filter(x => typeof x === 'string').map(text) : [], price: text(parsed.detail?.price) }, image_url: url(parsed.image_url || outer.image_url), video_url: url(parsed.video_url || outer.video_url), video_desc: text(parsed.video_desc) } };
}
