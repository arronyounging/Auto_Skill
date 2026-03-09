#!/usr/bin/env node
/**
 * Seedream 5.0 Web Test UI
 * Run: node scripts/seedream-web.js
 * Open: http://localhost:3000
 */

import http from 'http';
import https from 'https';

const PORT    = 3000;
const API_KEY = process.env.ARK_API_KEY || 'b95eb586-688d-437f-8de4-4feabcb2a5cc';
const MODEL   = 'seedream-5-0-260128';
const ENDPOINT = 'https://ark.ap-southeast.bytepluses.com/api/v3/images/generations';

// ── Proxy API call ────────────────────────────────────────────────────────────
function callSeedream(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const parsed = new URL(ENDPOINT);
    const options = {
      hostname : parsed.hostname,
      path     : parsed.pathname,
      method   : 'POST',
      headers  : {
        'Content-Type'   : 'application/json',
        'Content-Length' : Buffer.byteLength(body),
        'Authorization'  : `Bearer ${API_KEY}`,
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(120_000, () => req.destroy(new Error('Timeout')));
    req.write(body);
    req.end();
  });
}

// ── HTML ──────────────────────────────────────────────────────────────────────
const HTML = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Seedream 5.0 Test</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#0f0f13;color:#e2e2e2;min-height:100vh;padding:24px}
  h1{font-size:1.4rem;font-weight:600;color:#fff;margin-bottom:4px}
  .sub{font-size:.82rem;color:#666;margin-bottom:24px}
  .card{background:#1a1a22;border:1px solid #2a2a38;border-radius:12px;padding:20px;margin-bottom:16px}
  label{display:block;font-size:.8rem;color:#888;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em}
  textarea,select,input{width:100%;background:#0f0f13;border:1px solid #2a2a38;border-radius:8px;
    color:#e2e2e2;padding:10px 12px;font-size:.9rem;font-family:inherit;resize:vertical;outline:none}
  textarea:focus,select:focus,input:focus{border-color:#5b5bf0}
  .row{display:flex;gap:12px;margin-top:12px}
  .row>div{flex:1}
  button{margin-top:16px;width:100%;padding:12px;border:none;border-radius:8px;
    background:#5b5bf0;color:#fff;font-size:1rem;font-weight:600;cursor:pointer;transition:background .2s}
  button:hover{background:#4848d0}
  button:disabled{background:#2a2a38;color:#555;cursor:not-allowed}
  .status{margin-top:14px;padding:10px 14px;border-radius:8px;font-size:.85rem;display:none}
  .status.loading{background:#1e2a1e;border:1px solid #2d4a2d;color:#7ec87e;display:block}
  .status.error  {background:#2a1e1e;border:1px solid #4a2d2d;color:#c87e7e;display:block}
  .status.ok     {background:#1e1e2a;border:1px solid #2d2d4a;color:#7e7ec8;display:block}
  .imgs{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-top:16px}
  .img-wrap{border-radius:10px;overflow:hidden;border:1px solid #2a2a38;background:#0f0f13}
  .img-wrap img{width:100%;display:block;cursor:zoom-in}
  .img-wrap a{display:block;font-size:.75rem;color:#5b5bf0;padding:8px 12px;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .json-box{background:#0f0f13;border:1px solid #2a2a38;border-radius:8px;padding:12px;
    font-family:monospace;font-size:.78rem;color:#aaa;white-space:pre-wrap;word-break:break-all;
    max-height:240px;overflow-y:auto;margin-top:14px}
  .tag{display:inline-block;background:#2a2a38;border-radius:4px;padding:2px 8px;font-size:.74rem;color:#888;margin-right:6px}
</style>
</head>
<body>
<h1>Seedream 5.0 · 海外节点测试</h1>
<p class="sub">
  <span class="tag">Model</span>${MODEL}
  <span class="tag">Endpoint</span>ark.ap-southeast.bytepluses.com
</p>

<div class="card">
  <label>Prompt</label>
  <textarea id="prompt" rows="5">Interstellar travel, a black hole, from which a nearly shattered vintage train bursts forth, visually striking, cinematic blockbuster, apocalyptic vibe, dynamic, contrasting colors, OC render, ray tracing, motion blur, depth of field, surrealism, deep blue.</textarea>

  <div class="row">
    <div>
      <label>Size</label>
      <select id="size">
        <option value="2K" selected>2K</option>
        <option value="1K">1K</option>
        <option value="4K">4K</option>
        <option value="1024x1024">1024×1024</option>
        <option value="1280x720">1280×720 (16:9)</option>
        <option value="720x1280">720×1280 (9:16)</option>
      </select>
    </div>
    <div>
      <label>Response Format</label>
      <select id="format">
        <option value="url" selected>URL</option>
        <option value="b64_json">Base64</option>
      </select>
    </div>
    <div>
      <label>Watermark</label>
      <select id="watermark">
        <option value="true" selected>On</option>
        <option value="false">Off</option>
      </select>
    </div>
  </div>

  <button id="btn" onclick="generate()">生成图片</button>
  <div class="status" id="status"></div>
</div>

<div class="card" id="result-card" style="display:none">
  <label>生成结果</label>
  <div class="imgs" id="imgs"></div>
  <div class="json-box" id="json"></div>
</div>

<script>
async function generate() {
  const btn    = document.getElementById('btn');
  const status = document.getElementById('status');
  const card   = document.getElementById('result-card');
  const imgs   = document.getElementById('imgs');
  const jsonEl = document.getElementById('json');

  btn.disabled = true;
  status.className = 'status loading';
  status.textContent = '⏳ 请求中，图片生成通常需要 10-30 秒...';
  card.style.display = 'none';

  const payload = {
    prompt    : document.getElementById('prompt').value.trim(),
    size      : document.getElementById('size').value,
    format    : document.getElementById('format').value,
    watermark : document.getElementById('watermark').value === 'true',
  };

  const start = Date.now();
  try {
    const res = await fetch('/generate', {
      method  : 'POST',
      headers : {'Content-Type':'application/json'},
      body    : JSON.stringify(payload),
    });
    const data = await res.json();
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    if (!res.ok || data.error) {
      status.className = 'status error';
      status.textContent = '❌ 请求失败 (HTTP ' + (data.httpStatus||res.status) + ') — ' + (data.error || JSON.stringify(data));
      jsonEl.textContent = JSON.stringify(data, null, 2);
      card.style.display = 'block';
      imgs.innerHTML = '';
    } else {
      status.className = 'status ok';
      status.textContent = '✅ 生成成功！耗时 ' + elapsed + 's';
      imgs.innerHTML = '';
      const list = data.data || [];
      list.forEach((item, i) => {
        const wrap = document.createElement('div');
        wrap.className = 'img-wrap';
        if (item.url) {
          wrap.innerHTML = \`<a href="\${item.url}" target="_blank"><img src="\${item.url}" alt="image \${i+1}" loading="lazy"></a>
            <a href="\${item.url}" target="_blank">\${item.url}</a>\`;
        } else if (item.b64_json) {
          const src = 'data:image/png;base64,' + item.b64_json;
          wrap.innerHTML = \`<img src="\${src}" alt="image \${i+1}"><a href="\${src}" download="seedream-\${i+1}.png">下载图片</a>\`;
        }
        imgs.appendChild(wrap);
      });
      jsonEl.textContent = JSON.stringify(data, null, 2);
      card.style.display = 'block';
    }
  } catch(e) {
    status.className = 'status error';
    status.textContent = '❌ 网络错误: ' + e.message;
  }
  btn.disabled = false;
}
</script>
</body>
</html>`;

// ── HTTP Server ────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(HTML);
  }

  if (req.method === 'POST' && req.url === '/generate') {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', async () => {
      let params;
      try { params = JSON.parse(body); } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }

      const payload = {
        model                       : MODEL,
        prompt                      : params.prompt,
        sequential_image_generation : 'disabled',
        response_format             : params.format || 'url',
        size                        : params.size   || '2K',
        stream                      : false,
        watermark                   : params.watermark ?? true,
      };

      console.log(`[${new Date().toISOString()}] generate → size=${payload.size} prompt="${payload.prompt.slice(0,60)}..."`);

      try {
        const apiRes = await callSeedream(payload);
        const parsed = JSON.parse(apiRes.body);
        res.writeHead(apiRes.status, { 'Content-Type': 'application/json' });
        res.end(apiRes.status === 200 ? apiRes.body : JSON.stringify({ ...parsed, httpStatus: apiRes.status, error: parsed?.error?.message || apiRes.body }));
      } catch (err) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n  Seedream 5.0 Web Test`);
  console.log(`  ─────────────────────────────`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Model:   ${MODEL}`);
  console.log(`  API Key: ${API_KEY.slice(0,8)}...${API_KEY.slice(-4)}\n`);
});
