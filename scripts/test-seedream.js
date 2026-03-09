#!/usr/bin/env node
/**
 * Seedream 5.0 Image Generation Test
 * Tests the BytePlus overseas node: ark.ap-southeast.bytepluses.com
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────────────────────
const API_KEY   = process.env.ARK_API_KEY || 'b95eb586-688d-437f-8de4-4feabcb2a5cc';
const ENDPOINT  = 'https://ark.ap-southeast.bytepluses.com/api/v3/images/generations';
const MODEL     = 'seedream-5-0-260128';

const DEFAULT_PROMPT = `Interstellar travel, a black hole, from which a nearly shattered vintage train bursts forth, \
visually striking, cinematic blockbuster, apocalyptic vibe, dynamic, contrasting colors, OC render, ray tracing, \
motion blur, depth of field, surrealism, deep blue. The image uses delicate and rich color layers to shape the \
subject and scene, with realistic textures. The dark style background's light and shadow effects create an \
atmospheric mood, blending artistic fantasy with an exaggerated wide-angle perspective, lens flare, reflections, \
extreme light and shadow, intense gravitational pull, devouring.`;

// ── Helpers ──────────────────────────────────────────────────────────────────
function log(tag, msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${tag}] ${msg}`);
}

function postJson(url, payload, headers) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const parsed = new URL(url);

    const options = {
      hostname : parsed.hostname,
      path     : parsed.pathname + parsed.search,
      method   : 'POST',
      headers  : {
        'Content-Type'   : 'application/json',
        'Content-Length' : Buffer.byteLength(body),
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    });

    req.on('error', reject);
    req.setTimeout(60_000, () => {
      req.destroy(new Error('Request timed out after 60s'));
    });

    req.write(body);
    req.end();
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function generateImage(options = {}) {
  const prompt  = options.prompt  ?? DEFAULT_PROMPT;
  const size    = options.size    ?? '2K';

  log('INFO', `Model   : ${MODEL}`);
  log('INFO', `Endpoint: ${ENDPOINT}`);
  log('INFO', `Size    : ${size}`);
  log('INFO', `Prompt  : ${prompt.slice(0, 80)}...`);
  log('INFO', 'Sending request...');

  const startMs = Date.now();

  const payload = {
    model                       : MODEL,
    prompt,
    sequential_image_generation : 'disabled',
    response_format             : 'url',
    size,
    stream                      : false,
    watermark                   : true,
  };

  let res;
  try {
    res = await postJson(ENDPOINT, payload, {
      Authorization: `Bearer ${API_KEY}`,
    });
  } catch (err) {
    log('ERROR', `Network error: ${err.message}`);
    process.exit(1);
  }

  const elapsed = ((Date.now() - startMs) / 1000).toFixed(2);
  log('INFO', `Response: HTTP ${res.statusCode}  (${elapsed}s)`);

  // ── Parse response ──────────────────────────────────────────────────────
  let parsed;
  try {
    parsed = JSON.parse(res.body);
  } catch {
    log('ERROR', 'Failed to parse JSON response');
    console.error('Raw body:', res.body);
    process.exit(1);
  }

  if (res.statusCode !== 200) {
    log('ERROR', `API error: ${JSON.stringify(parsed, null, 2)}`);
    process.exit(1);
  }

  // ── Print result ────────────────────────────────────────────────────────
  log('OK', 'Image generation succeeded!');
  console.log('\n─── Response ───────────────────────────────────────────────');
  console.log(JSON.stringify(parsed, null, 2));

  const images = parsed?.data ?? [];
  if (images.length > 0) {
    console.log('\n─── Image URLs ─────────────────────────────────────────────');
    images.forEach((img, i) => {
      console.log(`  [${i + 1}] ${img.url}`);
    });

    // Save URLs to file for convenience
    const outFile = path.join(__dirname, '..', 'output', 'seedream-test-result.json');
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify({ prompt, size, model: MODEL, elapsed_s: elapsed, images }, null, 2));
    log('INFO', `Result saved to: output/seedream-test-result.json`);
  }
}

// ── CLI entry ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const userPrompt = args.join(' ').trim() || undefined;

generateImage({ prompt: userPrompt }).catch(err => {
  console.error(err);
  process.exit(1);
});
