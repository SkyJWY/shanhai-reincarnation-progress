/* Scoped resumable engine download. No global fetch or user-storage changes. */
window.QinglanDownload = async function (manifest, options = {}) {
  const bases = options.bases || ['./', 'https://cdn.jsdelivr.net/gh/SkyJWY/shanhai-reincarnation-progress@17cc2fafa09730d1fa6786fe615243fb82186f63/game/qinglan/', 'https://fastly.jsdelivr.net/gh/SkyJWY/shanhai-reincarnation-progress@17cc2fafa09730d1fa6786fe615243fb82186f63/game/qinglan/'];
  const report = options.onProgress || (() => {});
  const idleMs = options.idleMs || 5000, deadlineMs = options.deadlineMs || 20000;
  let cache; try { cache = await caches.open('qinglan-shards-v1-' + new URL('.', location.href).pathname); } catch {}
  const sha = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), x => x.toString(16).padStart(2, '0')).join('');
  let completed = 0, networkBytes = 0, cachedBytes = 0;
  const started = performance.now(), chunks = [];
  const emit = (phase, active = 0) => report({phase, completed, active, total: manifest.compressedBytes, networkBytes, cachedBytes, bytesPerSecond: networkBytes / Math.max(.001, (performance.now() - started) / 1000)});
  for (const shard of manifest.shards) {
    const key = new URL(shard.file, location.href).href;
    let bytes;
    try {
      const hit = await cache?.match(key);
      if (hit) {
        const candidate = await hit.arrayBuffer();
        if (candidate.byteLength === shard.bytes && await sha(candidate) === shard.sha256) {
          bytes = candidate; cachedBytes += bytes.byteLength;
          (window.__cacheHits ||= []).push(shard.file);
        }
      }
    } catch {}
    if (!bytes) {
      const controllers = bases.map(() => new AbortController()), active = bases.map(() => 0);
      const attempts = bases.map(async (base, i) => {
        const controller = controllers[i];
        // Hedge slow first-byte/transfer sources without exceeding three requests.
        await new Promise(r => setTimeout(r, i * (options.hedgeMs ?? 750)));
        if (controller.signal.aborted) throw Error('superseded');
        let idle, deadline;
        const stop = () => controller.abort();
        const reset = () => { clearTimeout(idle); idle = setTimeout(stop, idleMs); };
        try {
          reset(); deadline = setTimeout(stop, deadlineMs);
          const response = await fetch(new URL(shard.file, new URL(base, location.href)), {signal: controller.signal, cache: 'no-store'});
          if (!response.ok || !response.body) throw Error('HTTP ' + response.status);
          const reader = response.body.getReader(), parts = []; let count = 0;
          for (;;) {
            const {done, value} = await reader.read(); if (done) break;
            reset(); count += value.byteLength; networkBytes += value.byteLength;
            if (count > shard.bytes) throw Error('分片长度错误');
            parts.push(value); active[i] = count; emit('download', Math.max(...active));
          }
          const result = new Uint8Array(count); let offset = 0;
          for (const part of parts) { result.set(part, offset); offset += part.length; }
          if (count !== shard.bytes || await sha(result) !== shard.sha256) throw Error('分片校验失败');
          return result.buffer;
        } finally { clearTimeout(idle); clearTimeout(deadline); controller.abort(); active[i] = 0; }
      });
      try { bytes = await Promise.any(attempts); }
      catch { throw Error('所有下载线路暂时不可用；已完成分片已保存，请重试。'); }
      finally { controllers.forEach(c => c.abort()); }
      try { await cache?.put(key, new Response(bytes)); } catch {}
    }
    chunks.push(bytes); completed += bytes.byteLength; emit('download');
  }
  emit('verify');
  const raw = await new Response(new Blob(chunks).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  if (raw.byteLength !== manifest.wasmBytes || await sha(raw) !== manifest.wasmSha256) throw Error('引擎完整 SHA-256 校验失败，未启动。');
  emit('initialize');
  return raw;
};
