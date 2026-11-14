/*
  Вече: сервер push-уведомлений на Cloudflare Workers (бесплатно).
  Он делает одно: когда вам пишут или звонят, а сайт закрыт, будит ваше устройство.

  Нужно в настройках Worker:
    - привязка KV:        имя переменной  VECH
    - переменная:         FIREBASE_PROJECT_ID = ваш projectId из Firebase
    - (по желанию)        ALLOW_ORIGIN = https://ВАШ-ЛОГИН.github.io
    - (по желанию)        VAPID_SUBJECT = mailto:ваша-почта@example.com
*/

const enc = new TextEncoder();

function b64uEnc(buf){
  let s = '';
  const a = new Uint8Array(buf);
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64uDec(str){
  str = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}
async function sha(text){
  const d = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return Array.from(new Uint8Array(d)).map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 24);
}
function corsHeaders(env){
  return {
    'Access-Control-Allow-Origin': env.ALLOW_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'authorization,content-type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Max-Age': '86400'
  };
}
function json(env, obj, status){
  return new Response(JSON.stringify(obj), {status: status || 200, headers: Object.assign({'Content-Type': 'application/json'}, corsHeaders(env))});
}

/* ---- проверка входа: токен Firebase ---- */
let jwksCache = null, jwksAt = 0;
async function getJwks(){
  if (jwksCache && Date.now() - jwksAt < 3600e3) return jwksCache;
  const r = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
  jwksCache = (await r.json()).keys || [];
  jwksAt = Date.now();
  return jwksCache;
}
async function verifyToken(token, env){
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('bad token');
  const header = JSON.parse(new TextDecoder().decode(b64uDec(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(b64uDec(parts[1])));
  if (header.alg !== 'RS256') throw new Error('alg');
  const pid = env.FIREBASE_PROJECT_ID;
  if (!pid) throw new Error('FIREBASE_PROJECT_ID is not set');
  if (payload.aud !== pid || payload.iss !== 'https://securetoken.google.com/' + pid) throw new Error('aud/iss');
  if (!payload.exp || payload.exp * 1000 < Date.now()) throw new Error('expired');
  if (!payload.sub) throw new Error('sub');
  const jwk = (await getJwks()).find(k => k.kid === header.kid);
  if (!jwk) throw new Error('kid');
  const key = await crypto.subtle.importKey('jwk', jwk, {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'}, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64uDec(parts[2]), enc.encode(parts[0] + '.' + parts[1]));
  if (!ok) throw new Error('signature');
  return payload.sub;
}
async function authUid(request, env){
  const h = request.headers.get('Authorization') || '';
  const m = /^Bearer (.+)$/.exec(h);
  if (!m) throw new Error('no token');
  return verifyToken(m[1], env);
}

/* ---- ключи VAPID: создаются сами при первом запросе ---- */
async function getVapid(env){
  let v = await env.VECH.get('vapid', 'json');
  if (v) return v;
  const kp = await crypto.subtle.generateKey({name: 'ECDSA', namedCurve: 'P-256'}, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  const x = b64uDec(jwk.x), y = b64uDec(jwk.y);
  const raw = new Uint8Array(65);
  raw[0] = 4; raw.set(x, 1); raw.set(y, 33);
  v = {jwk: {kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d}, pub: b64uEnc(raw)};
  await env.VECH.put('vapid', JSON.stringify(v));
  return v;
}
async function vapidHeader(endpoint, vapid, env){
  const aud = new URL(endpoint).origin;
  const head = b64uEnc(enc.encode(JSON.stringify({typ: 'JWT', alg: 'ES256'})));
  const claims = b64uEnc(enc.encode(JSON.stringify({aud: aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || 'mailto:admin@example.com'})));
  const key = await crypto.subtle.importKey('jwk', vapid.jwk, {name: 'ECDSA', namedCurve: 'P-256'}, false, ['sign']);
  const sig = await crypto.subtle.sign({name: 'ECDSA', hash: 'SHA-256'}, key, enc.encode(head + '.' + claims));
  return 'vapid t=' + head + '.' + claims + '.' + b64uEnc(sig) + ', k=' + vapid.pub;
}
/* Пустой push: он только будит устройство. Текст устройство забирает через /pull. */
async function sendWake(sub, vapid, env){
  const r = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {'Authorization': await vapidHeader(sub.endpoint, vapid, env), 'TTL': '120', 'Urgency': 'high', 'Content-Length': '0'}
  });
  return r.status;
}

const clip = (s, n) => String(s == null ? '' : s).slice(0, n);

async function handle(request, env){
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: corsHeaders(env)});

  if (path === '/' ) return json(env, {ok: true, name: 'vech-push'});

  if (path === '/vapid' && request.method === 'GET') {
    const v = await getVapid(env);
    return json(env, {publicKey: v.pub});
  }

  if (path === '/pull' && request.method === 'GET') {
    const k = url.searchParams.get('k') || '';
    const after = Number(url.searchParams.get('after') || 0);
    if (!/^[0-9a-f]{16,64}$/.test(k)) return json(env, {items: []});
    const hash = await env.VECH.get('key:' + k);
    if (!hash) return json(env, {items: []});
    const q = (await env.VECH.get('q:' + hash, 'json')) || [];
    const now = Date.now();
    const items = q.filter(i => i.ts > after && (i.kind !== 'call' || now - i.ts < 120000));
    return json(env, {items: items});
  }

  let uid;
  try { uid = await authUid(request, env); }
  catch (e) { return json(env, {error: 'unauthorized'}, 401); }

  let body = {};
  try { body = await request.json(); } catch (e) {}

  if (path === '/subscribe' && request.method === 'POST') {
    const sub = body.sub, key = body.key;
    if (!sub || typeof sub.endpoint !== 'string' || !sub.endpoint.startsWith('https://')) return json(env, {error: 'bad sub'}, 400);
    if (!/^[0-9a-f]{16,64}$/.test(String(key))) return json(env, {error: 'bad key'}, 400);
    const hash = await sha(sub.endpoint);
    let list = (await env.VECH.get('subs:' + uid, 'json')) || [];
    list = list.filter(s => s.hash !== hash);
    list.push({sub: {endpoint: sub.endpoint, keys: sub.keys || {}}, key: key, hash: hash});
    list = list.slice(-5);
    await env.VECH.put('subs:' + uid, JSON.stringify(list));
    await env.VECH.put('key:' + key, hash);
    return json(env, {ok: true});
  }

  if (path === '/unsubscribe' && request.method === 'POST') {
    if (typeof body.endpoint !== 'string') return json(env, {error: 'bad'}, 400);
    const hash = await sha(body.endpoint);
    const list = ((await env.VECH.get('subs:' + uid, 'json')) || []).filter(s => s.hash !== hash);
    await env.VECH.put('subs:' + uid, JSON.stringify(list));
    return json(env, {ok: true});
  }

  if (path === '/notify' && request.method === 'POST') {
    const to = Array.isArray(body.to) ? body.to.filter(x => typeof x === 'string').slice(0, 20) : [];
    const item = {
      id: crypto.randomUUID().slice(0, 8),
      ts: Date.now(),
      kind: body.kind === 'call' ? 'call' : 'msg',
      title: clip(body.title, 80),
      body: clip(body.body, 140),
      chat: body.chat ? clip(body.chat, 80) : null,
      callId: body.callId ? clip(body.callId, 40) : null
    };
    const vapid = await getVapid(env);
    let sent = 0;
    for (const target of to) {
      if (target === uid) continue;
      const list = (await env.VECH.get('subs:' + target, 'json')) || [];
      const keep = [];
      for (const s of list) {
        const q = ((await env.VECH.get('q:' + s.hash, 'json')) || []).filter(i => item.ts - i.ts < 600000);
        q.push(item);
        await env.VECH.put('q:' + s.hash, JSON.stringify(q.slice(-10)), {expirationTtl: 900});
        let status = 0;
        try { status = await sendWake(s.sub, vapid, env); } catch (e) {}
        if (status === 404 || status === 410) { await env.VECH.delete('key:' + s.key); continue; }
        if (status >= 200 && status < 300) sent++;
        keep.push(s);
      }
      if (keep.length !== list.length) await env.VECH.put('subs:' + target, JSON.stringify(keep));
    }
    return json(env, {ok: true, sent: sent});
  }

  return json(env, {error: 'not found'}, 404);
}

export default {
  async fetch(request, env){
    try { return await handle(request, env); }
    catch (e) { return json(env, {error: 'server error'}, 500); }
  }
};
