/* Вече — мессенджер. Firebase (Auth + Firestore) + WebRTC. Весь код сайта в этом файле. */
(function(){
'use strict';

var CFG = window.VECH_CONFIG || {};
var root = document.getElementById('root');
var toastHost = document.getElementById('toasts');
var auth = null, fdb = null;
var FV = function(){ return firebase.firestore.FieldValue; };

/* ---------- утилиты ---------- */
function h(tag, props){
  var el = document.createElement(tag);
  if (props) {
    for (var k in props) {
      var v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  var kids = Array.prototype.slice.call(arguments, 2);
  kids.forEach(function(group){
    [].concat(group).forEach(function(kid){
      if (kid == null || kid === false) return;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    });
  });
  return el;
}

var ICONS = {
  send:'<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>',
  phone:'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  back:'<path d="M15 18l-6-6 6-6"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  'users-plus':'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  sliders:'<path d="M3 6h10M18.5 6H21M3 12h4M12 12h9M3 18h12M20.5 18H21"/><circle cx="16" cy="6" r="2.5"/><circle cx="9.5" cy="12" r="2.5"/><circle cx="18" cy="18" r="2.5"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
  smile:'<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
  trash:'<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  mic:'<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>',
  micoff:'<path d="M1 1l22 22"/><path d="M9 9v3a3 3 0 0 0 5.1 2.1M15 9.3V4a3 3 0 0 0-5.9-.8"/><path d="M19 10v2a7 7 0 0 1-.1 1.2M5 10v2a7 7 0 0 0 11.7 5.2M12 19v4M8 23h8"/>'
};
function ic(name){
  var s = document.createElementNS('http://www.w3.org/2000/svg','svg');
  s.setAttribute('viewBox','0 0 24 24');
  s.setAttribute('class','ic');
  s.setAttribute('aria-hidden','true');
  s.innerHTML = ICONS[name] || '';
  return s;
}
function iconBtn(name, label, fn){
  return h('button',{class:'icon-btn',type:'button','aria-label':label,title:label,onclick:fn}, ic(name));
}
function hex(buf){ return Array.prototype.map.call(new Uint8Array(buf), function(x){ return x.toString(16).padStart(2,'0'); }).join(''); }
function randHex(n){ var a = new Uint8Array(n); crypto.getRandomValues(a); return hex(a); }
function hue(s){ var x = 0; for (var i = 0; i < s.length; i++) x = (x*31 + s.charCodeAt(i)) >>> 0; return x % 360; }
function avatar(label, seed, size, online, grp){
  var letter = String(label || '?').replace(/^@/,'').charAt(0).toUpperCase() || '?';
  var pic = !grp && S.users && S.users[seed] && S.users[seed].avatar;
  var a = h('span',{class:'av'+(grp?' grp':''),style:'--s:'+(size||40)+'px;--h:'+hue(String(seed||label||'?'))}, pic && /^data:image\//.test(pic) ? h('img',{src:pic,alt:''}) : letter);
  if (online) a.append(h('i',{class:'dot'}));
  return a;
}
function plural(n, f){
  var a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return f[2];
  if (b > 1 && b < 5) return f[1];
  if (b === 1) return f[0];
  return f[2];
}
var tf = new Intl.DateTimeFormat('ru',{hour:'2-digit',minute:'2-digit'});
var df = new Intl.DateTimeFormat('ru',{day:'numeric',month:'long'});
var sf = new Intl.DateTimeFormat('ru',{day:'2-digit',month:'2-digit'});
function dkey(d){ return d.getFullYear()*400 + d.getMonth()*32 + d.getDate(); }
function dayLabel(ts){
  var d = new Date(ts), n = new Date();
  if (dkey(d) === dkey(n)) return 'Сегодня';
  var y = new Date(n); y.setDate(n.getDate()-1);
  if (dkey(d) === dkey(y)) return 'Вчера';
  return df.format(d) + (d.getFullYear() !== n.getFullYear() ? ' ' + d.getFullYear() : '');
}
function listTime(ts){ var d = new Date(ts); return dkey(d) === dkey(new Date()) ? tf.format(d) : sf.format(d); }
function fmtDur(ms){ var s = Math.max(0, Math.round(ms/1000)); return String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0'); }

var ls = {
  get:function(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
  set:function(k,v){ try { localStorage.setItem(k,v); } catch(e){} },
  del:function(k){ try { localStorage.removeItem(k); } catch(e){} }
};

function UErr(msg){ this.message = msg; this.user = true; }
function explain(e){
  if (e && e.user) return e.message;
  var c = (e && e.code) || '';
  if (c === 'permission-denied') return 'Нет доступа. Проверьте, что правила Firestore из файла firestore.rules опубликованы (см. README).';
  if (c === 'resource-exhausted') return 'Дневной лимит бесплатного тарифа Firebase исчерпан. Попробуйте завтра.';
  if (c === 'failed-precondition') return 'Firestore просит создать индекс. Откройте консоль браузера и нажмите на ссылку в ошибке.';
  if (c === 'unavailable' || c === 'auth/network-request-failed') return 'Нет связи с сервером. Проверьте интернет.';
  if (c === 'auth/too-many-requests') return 'Слишком много попыток. Подождите немного и повторите.';
  if (c === 'auth/weak-password') return 'Слишком простой пароль.';
  if (c === 'auth/requires-recent-login') return 'Войдите заново и повторите.';
  if (c === 'auth/operation-not-allowed') return 'В Firebase не включён вход по email и паролю (см. README).';
  if (c.indexOf('auth/') === 0) return 'Ошибка входа (' + c.slice(5) + ').';
  return 'Что-то пошло не так. Попробуйте ещё раз.';
}
function toast(msg, fn){
  var t = h('div',{class:'toast' + (fn ? ' link' : ''),role:'status',text:msg,onclick:fn ? function(){ t.remove(); fn(); } : null});
  toastHost.append(t);
  setTimeout(function(){ t.remove(); }, fn ? 7000 : 4500);
}

/* ---------- состояние ---------- */
var S = {
  view:'', me:null,
  users:{}, chats:{}, usersReady:false, chatsReady:false,
  synced:false, syncT:null,
  active:null, draft:null, msgs:[], msgsReady:false, msgUnsub:null, forceBottom:false,
  online:new Set(), peerSeen:0, peerUnsub:null, onlineT:null, beatT:null,
  query:'', modal:null, call:null,
  subs:[], read:{}, drafts:{}, el:{},
  devices:[], deviceId:null, waitUnsub:null, waitT:null, forcePw:false,
  blocksOut:new Set(), blocksIn:new Set(), seenLast:{}, startedAt:0,
  selMsg:null, delArm:null, editing:null, panelOpen:false, panelTab:'emoji',
  swReg:null, ringT:null
};
function nm(uid){ return S.users[uid] ? '@' + S.users[uid].username : '@удалён'; }
function dmId(a,b){ return 'dm_' + [a,b].sort().join('_'); }
function otherUid(c){ return c.members.filter(function(x){ return x !== S.me.uid; })[0] || S.me.uid; }
function curChat(){
  if (!S.active) return null;
  return S.chats[S.active] || (S.draft && S.draft.id === S.active ? S.draft : null);
}
function chatTitle(c){ return c.type === 'dm' ? nm(otherUid(c)) : (c.name || 'Группа'); }
function chatTs(c){ return (c.last && c.last.ts) || c.updatedAt || c.createdAt || 0; }
function avatarFor(c, size){
  if (c.type === 'dm') {
    var u = otherUid(c);
    return avatar(S.users[u] ? S.users[u].username : '?', u, size || 40, S.online.has(u));
  }
  return avatar(c.name, c.id, size || 40, false, true);
}

/* ---------- имя пользователя ---------- */
var NAME_RE = /^[a-z0-9_]{3,20}$/;
function normName(s){ return String(s || '').trim().toLowerCase().replace(/^@/,''); }
function checkName(n){ if (!NAME_RE.test(n)) throw new UErr('Имя: 3–20 символов, латинские буквы, цифры и _'); }

/* запрет матов в нике */
var LEET = {'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','8':'b'};
function leet(t){ return String(t).toLowerCase().replace(/[0134578]/g, function(c){ return LEET[c]; }); }
function squash(t){ return t.replace(/(.)\1+/g, '$1'); }
var BAD_RAW = ['nigger','nigga','faggot'];
var BAD_SUB = ['fuck','shit','bitch','whore','pizd','blyat','blyad','blya','huy','hui','huj','xuy','xui','xuj','pidor','pidar','pidr','gandon','gondon','govno','gavno','zalup','mudak','mudil','dolboeb','dolbaeb','eblan','zaeb','shlyuh','shlyux','suchar','gnida'].map(squash);
var BAD_START = ['ebat','ebal','eban','ebl','suka','chmo','cunt'].map(squash);
function hasBadWord(name){
  var s = String(name);
  var raw = leet(s.replace(/_/g, ''));
  if (BAD_RAW.some(function(w){ return raw.indexOf(w) >= 0; })) return true;
  var sq = squash(raw).replace(/shitake/g, '');
  if (BAD_SUB.some(function(w){ return sq.indexOf(w) >= 0; })) return true;
  return s.split('_').some(function(t){
    var n = squash(leet(t));
    return BAD_START.some(function(w){ return n.indexOf(w) === 0; });
  });
}
function checkClean(n){ if (hasBadWord(n)) throw new UErr('Это имя нельзя использовать: в нём есть недопустимое слово.'); }

/* ---------- регистрация, вход ---------- */
async function register(name, pw){
  checkClean(name);
  var taken = await fdb.doc('usernames/' + name).get();
  if (taken.exists) throw new UErr('Это имя уже занято.');
  var email = 'u' + randHex(8) + '@vech.chat';
  var cred = await auth.createUserWithEmailAndPassword(email, pw);
  var uid = cred.user.uid;
  try {
    await fdb.runTransaction(async function(tx){
      var ref = fdb.doc('usernames/' + name);
      var s = await tx.get(ref);
      if (s.exists) throw new UErr('Это имя уже занято.');
      tx.set(ref, {uid:uid, email:email});
    });
    await fdb.doc('users/' + uid).set({username:name, createdAt:Date.now()});
  } catch (e) {
    try { await fdb.doc('usernames/' + name).delete(); } catch (x) {}
    try { await cred.user.delete(); } catch (x) {}
    throw e;
  }
  return uid;
}
async function login(name, pw){
  var bad = new UErr('Неверное имя или пароль.');
  var u = await fdb.doc('usernames/' + name).get();
  if (!u.exists) throw bad;
  try {
    var cred = await auth.signInWithEmailAndPassword(u.data().email, pw);
    return cred.user.uid;
  } catch (e) {
    var c = e && e.code;
    if (c === 'auth/wrong-password' || c === 'auth/invalid-credential' || c === 'auth/invalid-login-credentials' || c === 'auth/user-not-found') throw bad;
    throw e;
  }
}
async function renameUser(raw){
  var nu = normName(raw);
  checkName(nu);
  checkClean(nu);
  var old = S.me.username;
  if (nu === old) throw new UErr('Это уже ваше имя.');
  var email = auth.currentUser.email;
  var newRef = fdb.doc('usernames/' + nu), oldRef = fdb.doc('usernames/' + old);
  await fdb.runTransaction(async function(tx){
    var s = await tx.get(newRef);
    if (s.exists && s.data().uid !== S.me.uid) throw new UErr('Это имя занято.');
    tx.set(newRef, {uid:S.me.uid, email:email});
    tx.delete(oldRef);
  });
  await fdb.doc('users/' + S.me.uid).update({username:nu});
  S.me.username = nu;
  if (S.users[S.me.uid]) S.users[S.me.uid].username = nu;
}
async function changePw(cur, nw){
  if (nw.length < 6) throw new UErr('Новый пароль: не короче 6 символов.');
  var user = auth.currentUser;
  var cred = firebase.auth.EmailAuthProvider.credential(user.email, cur);
  try { await user.reauthenticateWithCredential(cred); }
  catch (e) {
    var c = e && e.code;
    if (c === 'auth/wrong-password' || c === 'auth/invalid-credential' || c === 'auth/invalid-login-credentials') throw new UErr('Текущий пароль неверный.');
    throw e;
  }
  await user.updatePassword(nw);
  await fdb.doc('users/' + S.me.uid).update({mustChange:false});
}

/* ---------- аватарка ---------- */
function makeAvatar(file){
  return new Promise(function(resolve, reject){
    if (!/^image\//.test(file.type)) { reject(new UErr('Выберите файл-картинку.')); return; }
    if (file.size > 15 * 1024 * 1024) { reject(new UErr('Файл слишком большой. Максимум 15 МБ.')); return; }
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function(){
      try {
        var side = Math.min(img.naturalWidth, img.naturalHeight);
        var sx = (img.naturalWidth - side) / 2, sy = (img.naturalHeight - side) / 2;
        var c = document.createElement('canvas');
        c.width = 128; c.height = 128;
        var x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 128);
        x.drawImage(img, sx, sy, side, side, 0, 0, 128, 128);
        resolve(c.toDataURL('image/jpeg', 0.82));
      } catch (e) { reject(new UErr('Не удалось обработать картинку.')); }
      URL.revokeObjectURL(url);
    };
    img.onerror = function(){ URL.revokeObjectURL(url); reject(new UErr('Не удалось открыть картинку. Попробуйте JPG или PNG.')); };
    img.src = url;
  });
}

/* ---------- устройства и подтверждение входа ---------- */
function getDeviceId(){
  var d = ls.get('vech_device');
  if (!d || !/^[0-9a-f]{16}$/.test(d)) { d = randHex(8); ls.set('vech_device', d); }
  return d;
}
function devKey(uid){ return 'devices/' + uid + '_' + S.deviceId; }
function devInfo(){
  var ua = navigator.userAgent || '';
  var browser = 'Браузер';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/YaBrowser/.test(ua)) browser = 'Яндекс Браузер';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Safari\//.test(ua)) browser = 'Safari';
  var os = 'Неизвестная ОС';
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
  else if (/Mac OS X|Macintosh/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  var tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
  return {browser:browser, os:os, screen:(screen.width + '×' + screen.height), lang:(navigator.language || ''), tz:tz};
}
function devName(i){ return ((i && i.browser) ? i.browser : 'Браузер') + ' · ' + ((i && i.os) ? i.os : 'ОС'); }
function fmtId(id){ return String(id).slice(0, 16).toUpperCase().replace(/(.{4})(?=.)/g, '$1-'); }
function deviceCard(i, id){
  i = i || {};
  function r(k, v){ return h('div',{class:'dev-r'}, h('span',{class:'muted',text:k}), h('span',{text:String(v)})); }
  return h('div',{class:'devcard'},
    r('Устройство', devName(i)),
    r('Экран', i.screen || '—'),
    r('Язык и пояс', (i.lang || '—') + ' · ' + (i.tz || '—')),
    r('ID устройства', fmtId(id || '0000000000000000')),
    r('IP-адрес', 'недоступен для страницы'));
}
function trustDevice(uid){
  var now = Date.now();
  return fdb.doc(devKey(uid)).set({uid:uid, deviceId:S.deviceId, status:'trusted', info:devInfo(), createdAt:now, approvedAt:now});
}
async function deviceGate(uid){
  var ref = fdb.doc(devKey(uid));
  var snap = await ref.get();
  if (snap.exists) {
    var st = snap.data().status;
    if (st === 'trusted') return 'ok';
    if (st === 'denied') throw new UErr('Владелец аккаунта запретил вход с этого устройства.');
  }
  var q = await fdb.collection('devices').where('uid','==',uid).where('status','==','trusted').limit(1).get();
  if (q.empty) { await trustDevice(uid); return 'ok'; }
  var now = Date.now();
  await ref.set({uid:uid, deviceId:S.deviceId, status:'pending', info:devInfo(), createdAt:now, requestedAt:now});
  return 'pending';
}
function stopWait(){
  if (S.waitUnsub) { S.waitUnsub(); S.waitUnsub = null; }
  clearTimeout(S.waitT);
}
function setView(v){ if (S.view === v) return false; S.view = v; root.textContent = ''; return true; }
function showWaiting(uid){
  stopWait();
  setView('wait');
  var ref = fdb.doc(devKey(uid));
  var cancel = h('button',{class:'btn wide',type:'button',onclick:function(){
    stopWait();
    ref.delete().catch(function(){}).then(function(){ return auth.signOut(); }).catch(function(){}).then(showAuth);
  }}, 'Отменить вход');
  root.append(h('div',{class:'center'}, h('div',{class:'card'},
    h('div',{class:'spin'}),
    h('p',{class:'brand',text:'Вече'}),
    h('p',{class:'lead',text:'Подтвердите вход на другом устройстве'}),
    h('p',{class:'warn',text:'Откройте Вече там, где вы уже вошли, и нажмите «Это я». Запрос действует 10 минут.'}),
    deviceCard(devInfo(), S.deviceId),
    cancel)));
  S.waitT = setTimeout(function(){
    stopWait(); ref.delete().catch(function(){});
    auth.signOut().catch(function(){});
    showAuth(); toast('Время ожидания вышло. Войдите снова.');
  }, 10 * 60000);
  S.waitUnsub = ref.onSnapshot(function(s){
    if (!s.exists) return;
    var st = s.data().status;
    if (st === 'trusted') { stopWait(); startSession(uid).catch(function(e){ showAuth(); toast(explain(e)); }); }
    else if (st === 'denied') { stopWait(); auth.signOut().catch(function(){}); showAuth(); toast('Владелец аккаунта отклонил этот вход.'); }
  }, function(e){ toast(explain(e)); });
}
async function allowDevice(d){
  try { await fdb.doc('devices/' + d.id).update({status:'trusted', approvedAt:Date.now()}); }
  catch (e) { toast(explain(e)); }
}
async function denyDevice(d){
  try {
    await fdb.doc('devices/' + d.id).update({status:'denied'});
    var rest = S.devices.filter(function(x){ return x.id !== d.id && x.deviceId !== S.deviceId && (x.status === 'trusted' || x.status === 'pending'); });
    for (var i = 0; i < rest.length; i++) {
      await fdb.doc('devices/' + rest[i].id).update({status: rest[i].status === 'trusted' ? 'revoked' : 'denied'});
    }
    await fdb.doc('users/' + S.me.uid).update({mustChange:true});
    S.forcePw = true;
    renderGuard();
  } catch (e) { toast(explain(e)); }
}
function renderGuard(){
  var host = document.getElementById('guard-host');
  if (!host || !S.me) return;
  if (S.forcePw) { if (host.dataset.k !== 'pw') drawForcePw(host); return; }
  var now = Date.now();
  var pend = S.devices.filter(function(d){
    return d.status === 'pending' && d.deviceId !== S.deviceId && now - (d.requestedAt || 0) < 10 * 60000;
  }).sort(function(a,b){ return (a.requestedAt || 0) - (b.requestedAt || 0); });
  if (!pend.length) { host.textContent = ''; host.dataset.k = ''; return; }
  var d = pend[0];
  var key = 'req:' + d.id + ':' + pend.length;
  if (host.dataset.k === key) return;
  host.dataset.k = key;
  host.textContent = '';
  host.append(h('div',{class:'guard',role:'alertdialog','aria-label':'Вход с нового устройства'},
    h('div',{class:'dialog guard-card'},
      h('h2',{text:'Вход с нового устройства'}),
      h('p',{class:'muted',text:'Кто-то ввёл имя и пароль вашего аккаунта. Пока вы не ответите, он не войдёт.'}),
      deviceCard(d.info, d.deviceId),
      pend.length > 1 ? h('p',{class:'muted',text:'Ещё запросов: ' + (pend.length - 1)}) : null,
      h('div',{class:'guard-btns'},
        h('button',{class:'btn primary',type:'button',onclick:function(){ allowDevice(d); }}, 'Это я'),
        h('button',{class:'btn danger solid',type:'button',onclick:function(){ denyDevice(d); }}, 'НЕТ, ЭТО НЕ Я')))));
}
function drawForcePw(host){
  host.dataset.k = 'pw';
  host.textContent = '';
  var cur = h('input',{id:'fp-cur',type:'password',autocomplete:'current-password'});
  var nw = h('input',{id:'fp-new',type:'password',autocomplete:'new-password',placeholder:'Не короче 6 символов'});
  var nw2 = h('input',{id:'fp-new2',type:'password',autocomplete:'new-password'});
  var err = h('p',{class:'form-err',role:'alert'});
  var go = h('button',{class:'btn primary wide',type:'submit'}, 'Сменить пароль');
  var form = h('form',{class:'dialog guard-card',novalidate:true,onsubmit:async function(e){
    e.preventDefault(); err.textContent = ''; go.disabled = true;
    try {
      if (nw.value !== nw2.value) throw new UErr('Пароли не совпадают.');
      await changePw(cur.value, nw.value);
      S.forcePw = false; host.dataset.k = ''; host.textContent = '';
      toast('Пароль изменён.');
      renderGuard();
    } catch (ex) { err.textContent = explain(ex); go.disabled = false; }
  }},
    h('h2',{text:'Смените пароль'}),
    h('p',{class:'muted',text:'Мы запретили вход с неизвестного устройства и отключили остальные ваши устройства. Пароль мог попасть к посторонним, поэтому задайте новый.'}),
    field('Текущий пароль', cur), field('Новый пароль', nw), field('Повторите новый пароль', nw2),
    err, go,
    h('button',{class:'btn wide',type:'button',onclick:function(){ logout(); }}, 'Выйти'));
  host.append(h('div',{class:'guard'}, form));
  cur.focus();
}
function devicesSection(m){
  var devEl = h('div',{class:'pick-list'});
  function draw(){
    devEl.textContent = '';
    var list = S.devices.filter(function(d){ return d.status === 'trusted'; });
    if (!list.length) devEl.append(h('p',{class:'muted pad',text:'Загружаем список…'}));
    list.forEach(function(d){
      var mine = d.deviceId === S.deviceId;
      var btn = mine ? h('span',{class:'tag',text:'это устройство'}) : h('button',{class:'btn sm',type:'button',onclick:async function(){
        btn.disabled = true;
        try { await fdb.doc('devices/' + d.id).update({status:'revoked'}); }
        catch (e) { toast(explain(e)); btn.disabled = false; }
      }}, 'Выйти');
      devEl.append(h('div',{class:'pick static'},
        h('span',{class:'grow'}, h('strong',{text:devName(d.info)}), h('br'), h('span',{class:'muted',text:'ID ' + fmtId(d.deviceId || '')})),
        btn));
    });
  }
  m.refresh = draw; draw();
  return h('div',{class:'sect'}, h('h3',{text:'Устройства'}),
    h('p',{class:'muted',text:'Вход с нового устройства нужно подтвердить на одном из этих.'}), devEl);
}

/* ---------- блокировка ---------- */
function blockState(c){
  if (!c || c.type !== 'dm') return null;
  var p = otherUid(c);
  if (S.blocksOut.has(p)) return 'out';
  if (S.blocksIn.has(p)) return 'in';
  return null;
}
function blockUser(uid){ return fdb.doc('blocks/' + S.me.uid + '_' + uid).set({from:S.me.uid, to:uid, ts:Date.now()}); }
function unblockUser(uid){ return fdb.doc('blocks/' + S.me.uid + '_' + uid).delete(); }
function afterBlocks(){
  if (S.view !== 'app') return;
  renderChatHead(); renderList();
  if (S.modal && S.modal.refresh) S.modal.refresh();
  var c = S.call;
  if (c && (S.blocksOut.has(c.peer) || S.blocksIn.has(c.peer))) hangUp();
}
function applyBlockBar(c){
  var bar = S.el.blockBar, comp = S.el.composer;
  if (!bar || !comp) return;
  var st = blockState(c);
  comp.hidden = !!st; bar.hidden = !st;
  if (st && S.el.panel) closePanel();
  bar.textContent = '';
  if (st === 'in') bar.append(h('span',{text:'Вы заблокированы. Писать и звонить этому человеку нельзя.'}));
  else if (st === 'out') {
    var p = otherUid(c);
    bar.append(h('span',{text:'Вы заблокировали этого человека.'}),
      h('button',{class:'btn sm',type:'button',onclick:function(){ unblockUser(p).catch(function(e){ toast(explain(e)); }); }}, 'Разблокировать'));
  }
}

/* ---------- push: уведомления, когда сайт закрыт ---------- */
var PUSH = CFG.pushWorker ? String(CFG.pushWorker).replace(/\/+$/, '') : '';
function idbOpen(){
  return new Promise(function(res, rej){
    var r = indexedDB.open('vech', 1);
    r.onupgradeneeded = function(){ r.result.createObjectStore('kv'); };
    r.onsuccess = function(){ res(r.result); };
    r.onerror = function(){ rej(r.error); };
  });
}
function idbGet(k){
  return idbOpen().then(function(db){ return new Promise(function(res){
    var q = db.transaction('kv').objectStore('kv').get(k);
    q.onsuccess = function(){ res(q.result); }; q.onerror = function(){ res(undefined); };
  }); }).catch(function(){ return undefined; });
}
function idbPut(k, v){
  return idbOpen().then(function(db){ return new Promise(function(res, rej){
    var t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k);
    t.oncomplete = function(){ res(); }; t.onerror = function(){ rej(t.error); };
  }); });
}
function b64uToBytes(s){
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  var bin = atob(s), a = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}
async function pushFetch(path, body){
  var token = await auth.currentUser.getIdToken();
  return fetch(PUSH + path, {method:'POST', headers:{'Content-Type':'application/json', 'Authorization':'Bearer ' + token}, body:JSON.stringify(body)});
}
async function enablePush(quiet){
  if (!PUSH) throw new UErr('Сервер уведомлений не настроен (см. README, шаг 6).');
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
    throw new UErr('Этот браузер не поддерживает push. На iPhone сначала добавьте сайт на экран «Домой».');
  }
  if (Notification.permission !== 'granted') {
    if (quiet) return;
    var perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new UErr('Уведомления запрещены в браузере.');
  }
  var reg = await navigator.serviceWorker.ready;
  var v = await (await fetch(PUSH + '/vapid')).json();
  var sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try { sub = await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:b64uToBytes(v.publicKey)}); }
    catch (e) { throw new UErr('Не удалось включить push. Проверьте, что сайт открыт по https.'); }
  }
  var key = ls.get('vech_pushkey');
  if (!key) { key = randHex(16); ls.set('vech_pushkey', key); }
  var r = await pushFetch('/subscribe', {sub:sub.toJSON(), key:key});
  if (!r.ok) throw new UErr('Сервер уведомлений ответил ошибкой. Проверьте настройку Worker (README).');
  var old = await idbGet('cfg');
  await idbPut('cfg', {worker:PUSH, key:key, after:(old && old.after) || Date.now()});
  ls.set('vech_push', '1');
}
function syncPush(){
  if (!PUSH || ls.get('vech_push') !== '1') return;
  enablePush(true).catch(function(){});
}
async function unsubscribePush(){
  if (!PUSH || !auth.currentUser) return;
  try {
    var reg = await navigator.serviceWorker.ready;
    var sub = await reg.pushManager.getSubscription();
    if (sub) await pushFetch('/unsubscribe', {endpoint:sub.endpoint});
  } catch (e) {}
}
function pushNotify(to, p){
  if (!PUSH || !to || !to.length || !auth || !auth.currentUser) return;
  pushFetch('/notify', {to:to.slice(0, 20), kind:p.kind, title:p.title, body:p.body, chat:p.chat || null, callId:p.callId || null}).catch(function(){});
}
function pendingChatFromUrl(){
  try {
    var c = new URLSearchParams(location.search).get('chat');
    if (c) history.replaceState(null, '', location.pathname + location.hash);
    return c || null;
  } catch (e) { return null; }
}

/* ---------- уведомления и звук ---------- */
var actx = null;
function ac(){
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  return actx;
}
function unlockAudio(){ var a = ac(); if (a && a.state === 'suspended') a.resume().catch(function(){}); }
document.addEventListener('pointerdown', unlockAudio);
document.addEventListener('keydown', unlockAudio);
function tone(f, d, t0){
  var a = ac();
  if (!a || a.state !== 'running') return;
  try {
    var o = a.createOscillator(), g = a.createGain();
    o.frequency.value = f; o.connect(g); g.connect(a.destination);
    var t = a.currentTime + (t0 || 0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.start(t); o.stop(t + d + 0.05);
  } catch (e) {}
}
function soundOn(){ return ls.get('vech_sound') !== '0'; }
function ding(){ if (soundOn()) { tone(880, .15, 0); tone(1175, .22, .12); } }
function startRing(){
  if (S.ringT) return;
  var ring = function(){ if (soundOn()) { tone(660, .28, 0); tone(520, .28, .34); } };
  ring();
  S.ringT = setInterval(ring, 2000);
}
function stopRing(){ if (S.ringT) { clearInterval(S.ringT); S.ringT = null; } }
function sysNotify(title, body, chatId){
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !document.hidden) return;
  try {
    if (S.swReg && S.swReg.showNotification) {
      S.swReg.showNotification(title, {body:body, tag:'vech-' + (chatId || 'x'), icon:'icon.svg', data:{chat:chatId || null}}).catch(function(){});
    } else {
      var n = new Notification(title, {body:body});
      n.onclick = function(){ try { window.focus(); } catch (e) {} if (chatId) openChat(chatId); n.close(); };
    }
  } catch (e) {}
}
function registerSw(){
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').then(function(r){ S.swReg = r; }).catch(function(){});
  navigator.serviceWorker.addEventListener('message', function(ev){
    var d = ev.data;
    if (d && d.type === 'open' && d.chat && S.me && S.chats[d.chat]) openChat(d.chat);
  });
}
function maybeNotify(c){
  var l = c.last;
  if (!l || l.kind === 'sys' || l.from === S.me.uid) return;
  if (S.blocksOut.has(l.from)) return;
  if (S.active === c.id && !document.hidden) return;
  var title = c.type === 'dm' ? nm(l.from) : chatTitle(c) + ' · ' + nm(l.from);
  toast(title + ': ' + l.text, function(){ openChat(c.id); });
  ding();
  sysNotify(title, l.text, c.id);
}
function updateTitle(){
  if (!S.me) return;
  var n = Object.keys(S.chats).filter(function(k){ return isUnread(S.chats[k]); }).length;
  try { document.title = (n ? '(' + n + ') ' : '') + 'Вече'; } catch (e) {}
}
function notifSection(){
  var supported = typeof Notification !== 'undefined';
  var st = h('p',{class:'muted'});
  var btn = h('button',{class:'btn sm',type:'button',onclick:function(){
    try { Notification.requestPermission().then(draw).catch(draw); } catch (e) { draw(); }
  }}, 'Разрешить уведомления браузера');
  var cb = h('input',{type:'checkbox',id:'snd-on',checked:soundOn(),onchange:function(){ ls.set('vech_sound', cb.checked ? '1' : '0'); if (cb.checked) ding(); }});
  function draw(){
    if (!supported) { st.textContent = 'Системные уведомления в этом браузере недоступны. Новые сообщения и звонки всё равно показываются внутри Вече.'; btn.hidden = true; return; }
    var p = Notification.permission;
    btn.hidden = p !== 'default';
    st.textContent = p === 'granted' ? 'Включены. Уведомление придёт, когда вкладка с Вече в фоне.'
      : p === 'denied' ? 'Запрещены в браузере. Разрешите их в настройках сайта.'
      : 'Выключены.';
  }
  draw();
  var pushSt = h('p',{class:'muted'});
  var pushBtn = h('button',{class:'btn sm primary',type:'button',onclick:async function(){
    pushBtn.disabled = true;
    try { await enablePush(false); toast('Push включены'); }
    catch (e) { toast(explain(e)); }
    pushBtn.disabled = false; drawPush(); draw();
  }}, 'Включить push (сайт закрыт)');
  function drawPush(){
    if (!PUSH) { pushSt.textContent = 'Push при закрытом сайте не настроены. Для них нужен бесплатный сервер на Cloudflare (README, шаг 6).'; pushBtn.hidden = true; return; }
    var on = ls.get('vech_push') === '1' && typeof Notification !== 'undefined' && Notification.permission === 'granted';
    pushSt.textContent = on ? 'Push включены на этом устройстве. Сообщения и звонки придут, даже когда сайт закрыт.' : 'Push выключены на этом устройстве.';
    pushBtn.hidden = on;
  }
  drawPush();
  return h('div',{class:'sect'}, h('h3',{text:'Уведомления'}), st, h('div',{class:'row-actions'}, btn),
    pushSt, h('div',{class:'row-actions'}, pushBtn),
    h('label',{class:'pick','for':'snd-on'}, cb, h('span',{class:'grow',text:'Звук сообщений и звонков'})),
    h('p',{class:'hint',text:'Без push уведомления и звук работают, только пока Вече открыто во вкладке (можно в фоне).'}));
}

/* ---------- сеанс ---------- */
function stopSession(){
  S.subs.forEach(function(u){ try { u(); } catch(e){} });
  S.subs = [];
  if (S.msgUnsub) { S.msgUnsub(); S.msgUnsub = null; }
  if (S.peerUnsub) { S.peerUnsub(); S.peerUnsub = null; }
  clearTimeout(S.syncT); clearInterval(S.onlineT); clearInterval(S.beatT);
  endLocal();
  S.users = {}; S.chats = {}; S.usersReady = false; S.chatsReady = false; S.synced = false;
  S.active = null; S.draft = null; S.msgs = []; S.query = ''; S.drafts = {};
  S.devices = []; S.forcePw = false; stopWait();
  S.blocksOut = new Set(); S.blocksIn = new Set(); S.seenLast = {}; S.online = new Set();
  S.selMsg = null; S.editing = null; S.panelOpen = false;
  document.title = 'Вече';
  closeModal();
}
function loadRead(){ try { S.read = JSON.parse(ls.get('vech_read_' + S.me.uid) || '{}') || {}; } catch(e){ S.read = {}; } }
function saveRead(){ ls.set('vech_read_' + S.me.uid, JSON.stringify(S.read)); }
function isUnread(c){ return !!(c.last && c.last.from !== S.me.uid && c.last.kind !== 'sys' && c.last.ts > (S.read[c.id] || 0)); }
function markRead(id){
  var c = S.chats[id];
  if (!c || !c.last) return;
  if ((S.read[id] || 0) >= c.last.ts) return;
  S.read[id] = c.last.ts;
  saveRead();
}
function syncOk(snap){
  if (!snap.metadata.fromCache) {
    S.synced = true; clearTimeout(S.syncT);
    if (S.el.note) S.el.note.hidden = true;
  }
}
function onSubErr(e){
  if (S.el.note) S.el.note.hidden = false;
  toast(explain(e));
}
function beat(){
  if (!S.me) return;
  fdb.doc('presence/' + S.me.uid).set({t:FV().serverTimestamp()}).catch(function(){});
}
function tsMs(t){ return t && t.toMillis ? t.toMillis() : (typeof t === 'number' ? t : 0); }

async function startSession(uid){
  var snap = await fdb.doc('users/' + uid).get();
  if (!snap.exists) { try { await auth.signOut(); } catch (e) {} throw new UErr('Профиль не найден. Зарегистрируйтесь заново.'); }
  stopSession();
  S.me = {uid:uid, username:snap.data().username};
  S.startedAt = Date.now();
  S.pendingOpen = pendingChatFromUrl();
  loadRead();
  setView('app');
  buildShell();
  renderSideHead(); renderList();

  S.subs.push(fdb.collection('users').onSnapshot(function(s){
    var m = {};
    s.docs.forEach(function(d){ m[d.id] = d.data(); });
    S.users = m; S.usersReady = true; syncOk(s);
    if (!s.metadata.fromCache && !m[S.me.uid]) { toast('Профиль не найден. Войдите снова.'); logout(); return; }
    if (m[S.me.uid]) S.me.username = m[S.me.uid].username;
    renderSideHead(); renderList(); renderChatHead(); renderMsgs();
    if (S.modal && S.modal.refresh) S.modal.refresh();
  }, onSubErr));

  S.subs.push(fdb.collection('chats').where('members','array-contains',uid).onSnapshot(function(s){
    var m = {};
    s.docs.forEach(function(d){ m[d.id] = Object.assign({id:d.id}, d.data()); });
    var firstChats = !S.chatsReady;
    Object.keys(m).forEach(function(id){
      var c = m[id];
      if (!c.last || !c.last.ts) return;
      if (!firstChats && c.last.ts > (S.seenLast[id] || 0) && c.last.ts >= S.startedAt - 3000) maybeNotify(c);
      S.seenLast[id] = Math.max(S.seenLast[id] || 0, c.last.ts);
    });
    S.chats = m; S.chatsReady = true; syncOk(s);
    if (S.active && !m[S.active] && !(S.draft && S.draft.id === S.active)) closeChat();
    if (S.pendingOpen && m[S.pendingOpen]) { var po = S.pendingOpen; S.pendingOpen = null; openChat(po); }
    if (S.active) markRead(S.active);
    renderList(); renderChatHead();
    if (S.modal && S.modal.refresh) S.modal.refresh();
  }, onSubErr));

  S.subs.push(fdb.collection('devices').where('uid','==',uid).onSnapshot(function(s){
    S.devices = s.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); });
    renderGuard();
    if (S.modal && S.modal.refresh) S.modal.refresh();
  }, onSubErr));

  S.subs.push(fdb.collection('blocks').where('from','==',uid).onSnapshot(function(s){
    S.blocksOut = new Set(s.docs.map(function(d){ return d.data().to; }));
    afterBlocks();
  }, onSubErr));
  S.subs.push(fdb.collection('blocks').where('to','==',uid).onSnapshot(function(s){
    S.blocksIn = new Set(s.docs.map(function(d){ return d.data().from; }));
    afterBlocks();
  }, onSubErr));

  S.subs.push(fdb.doc(devKey(uid)).onSnapshot(function(s){
    if (s.metadata.fromCache) return;
    if (!s.exists || s.data().status !== 'trusted') { toast('Сеанс на этом устройстве завершён.'); logout(); }
  }, onSubErr));

  S.subs.push(fdb.collection('calls').where('to','==',uid).where('status','==','ringing').onSnapshot(function(s){
    s.docChanges().forEach(function(ch){
      if (ch.type !== 'added') return;
      var d = ch.doc.data();
      if (Date.now() - (d.createdAt || 0) > 120000) return;
      handleIncoming(ch.doc.id, d);
    });
  }, onSubErr));

  fdb.doc('users/' + uid).get().then(function(a){
    if (S.me && S.me.uid === uid && a.exists && a.data().mustChange) { S.forcePw = true; renderGuard(); }
  }).catch(function(){});

  beat();
  S.beatT = setInterval(beat, 90000);
  S.onlineT = setInterval(refreshOnline, 30000);
  syncPush();
  S.syncT = setTimeout(function(){ if (!S.synced && S.el.note) S.el.note.hidden = false; }, 10000);
}
async function logout(){
  var uid = S.me && S.me.uid;
  if (uid) { try { await fdb.doc('presence/' + uid).set({t:0}); } catch (e) {} }
  try { await unsubscribePush(); } catch (e) {}
  stopSession();
  S.me = null;
  try { await auth.signOut(); } catch (e) {}
  showAuth();
}
document.addEventListener('visibilitychange', function(){ if (!document.hidden) beat(); });
window.addEventListener('pagehide', function(){ if (S.me && fdb) fdb.doc('presence/' + S.me.uid).set({t:0}).catch(function(){}); });

/* ---------- экран входа ---------- */
function field(label, input, hint){
  return h('div',{class:'field'}, h('label',{'for':input.id,text:label}), input, hint ? h('span',{class:'hint',text:hint}) : null);
}
function showBoot(msg, isErr, detail){
  setView('boot');
  root.append(h('div',{class:'center'}, h('div',{class:'card'},
    isErr ? null : h('div',{class:'spin'}),
    h('p',{class:'brand',text:'Вече'}),
    h('p',{class:'lead',text:msg}),
    detail ? h('p',{class:'warn',text:detail}) : null)));
}
function showAuth(){
  setView('auth');
  var mode = 'login';
  var err = h('p',{class:'form-err',role:'alert'});
  var iUser = h('input',{id:'auth-user',type:'text',autocomplete:'username',autocapitalize:'none',spellcheck:'false',maxlength:'20',placeholder:'username'});
  var iPw = h('input',{id:'auth-pw',type:'password',autocomplete:'current-password',placeholder:'Не короче 6 символов'});
  var iPw2 = h('input',{id:'auth-pw2',type:'password',autocomplete:'new-password',placeholder:'Ещё раз'});
  var fPw2 = field('Повторите пароль', iPw2);
  fPw2.hidden = true;
  var go = h('button',{class:'btn primary wide',type:'submit'},'Войти');
  var tLogin = h('button',{class:'tab',type:'button',role:'tab','aria-selected':'true',onclick:function(){ setMode('login'); }},'Вход');
  var tReg = h('button',{class:'tab',type:'button',role:'tab','aria-selected':'false',onclick:function(){ setMode('register'); }},'Регистрация');
  function setMode(m){
    mode = m;
    tLogin.setAttribute('aria-selected', String(m === 'login'));
    tReg.setAttribute('aria-selected', String(m === 'register'));
    fPw2.hidden = m === 'login';
    go.textContent = m === 'login' ? 'Войти' : 'Создать аккаунт';
    iPw.setAttribute('autocomplete', m === 'login' ? 'current-password' : 'new-password');
    err.textContent = '';
  }
  var form = h('form',{class:'card',novalidate:true,onsubmit:async function(e){
    e.preventDefault();
    err.textContent = '';
    var label = go.textContent;
    go.disabled = true; go.textContent = 'Подождите…';
    try {
      var name = normName(iUser.value);
      checkName(name);
      var pw = iPw.value;
      var uid;
      if (mode === 'register') {
        if (pw.length < 6) throw new UErr('Пароль: не короче 6 символов.');
        if (pw !== iPw2.value) throw new UErr('Пароли не совпадают.');
        uid = await register(name, pw);
        await trustDevice(uid);
      } else {
        if (!pw) throw new UErr('Введите пароль.');
        uid = await login(name, pw);
        if ((await deviceGate(uid)) === 'pending') { showWaiting(uid); return; }
      }
      await startSession(uid);
    } catch (ex) {
      if (!S.me && auth.currentUser) auth.signOut().catch(function(){});
      err.textContent = explain(ex);
      go.disabled = false; go.textContent = label;
    }
  }},
    h('p',{class:'brand',text:'Вече'}),
    h('p',{class:'lead',text:'Мессенджер. Вход по имени пользователя и паролю.'}),
    h('div',{class:'tabs',role:'tablist'}, tLogin, tReg),
    field('Имя пользователя', iUser, '3–20 символов: a–z, цифры, _'),
    field('Облачный пароль', iPw),
    fPw2, err, go,
    h('p',{class:'warn',text:'Тестовая версия. Не используйте здесь пароли от настоящих аккаунтов.'}));
  root.append(h('div',{class:'center'}, form));
  iUser.focus();
}

/* ---------- оболочка приложения ---------- */
var EMOJI = '😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😋 😜 🤪 😎 🤩 🥳 😏 😒 😞 😔 😢 😭 😤 😡 🤯 😱 😴 🤔 🤗 🙄 😬 🤐 😷 🤒 👍 👎 👌 ✌️ 🤞 👏 🙌 🙏 💪 👋 🤝 ❤️ 🧡 💛 💚 💙 💜 🖤 💔 🔥 ✨ 🎉 🎁 ⭐ 💯 ✅ ❌ 🐱 🐶 🦊 🐼 🐸 🍕 🍔 ☕ ⚽ 🚀 🌈 ☀️ 🌙'.split(' ');
var STICKERS = ['😂','😍','🥹','😎','🤔','😭','😡','🥳','🤯','😴','🙈','🙏','👍','👎','👏','💪','❤️','💔','🔥','🎉','🐱','🐶','🦊','🐼','🐸','🦄','🍕','🍔','☕','🍺','⚽','🚀','🌈','💩','👻','🤖'];

function buildShell(){
  var el = S.el = {};
  el.headHost = h('div',{class:'side-head'});
  el.search = h('input',{id:'search',type:'search',placeholder:'Поиск людей и чатов',autocomplete:'off',spellcheck:'false','aria-label':'Поиск',oninput:function(e){ S.query = e.target.value; renderList(); }});
  el.note = h('p',{class:'sync-note',hidden:true,text:'Нет связи с сервером. Данные могут быть устаревшими.'});
  el.list = h('div',{class:'list'});
  var side = h('aside',{class:'side'}, el.headHost, h('div',{class:'searchbox'}, ic('search'), el.search), el.note, el.list);

  el.chatHead = h('header',{class:'chat-head'});
  el.msgs = h('div',{class:'msgs',role:'log','aria-live':'polite'});
  el.input = h('textarea',{id:'msg-input',rows:'1',placeholder:'Сообщение',maxlength:'4000','aria-label':'Сообщение',
    oninput:resizeInput,
    onkeydown:function(e){
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); doSend(); }
      else if (e.key === 'Escape' && S.editing) cancelEdit();
    }});
  var sendBtn = h('button',{class:'send',type:'button','aria-label':'Отправить',onclick:doSend}, ic('send'));
  el.panelBtn = h('button',{class:'icon-btn',type:'button','aria-label':'Смайлы и стикеры',title:'Смайлы и стикеры',onclick:togglePanel}, ic('smile'));
  el.composer = h('div',{class:'composer'}, el.panelBtn, el.input, sendBtn);
  el.panel = h('div',{class:'panel',hidden:true});
  el.editBar = h('div',{class:'editbar',hidden:true}, h('span',{text:'Редактирование сообщения'}), h('button',{class:'btn sm',type:'button',onclick:cancelEdit},'Отмена'));
  el.blockBar = h('div',{class:'blockbar',hidden:true});
  el.main = h('div',{class:'chat-main',hidden:true}, el.chatHead, el.msgs, el.blockBar, el.editBar, el.panel, el.composer);
  el.empty = h('div',{class:'empty'},
    h('p',{class:'brand sm',text:'Вече'}),
    h('p',{text:'Выберите чат слева или найдите человека по имени.'}));
  var pane = h('section',{class:'chatpane'}, el.empty, el.main);
  el.app = h('div',{class:'app','data-view':'list'}, side, pane, h('div',{id:'call-host'}), h('div',{id:'modal-host'}), h('div',{id:'guard-host'}));
  root.append(el.app);
}
function resizeInput(){
  var t = S.el.input;
  t.style.height = 'auto';
  t.style.height = Math.min(t.scrollHeight, 140) + 'px';
}

function renderSideHead(){
  if (!S.me || !S.el.headHost) return;
  var H = S.el.headHost;
  H.textContent = '';
  H.append(
    h('button',{class:'me',type:'button','aria-label':'Настройки профиля',onclick:openSettings},
      avatar(S.me.username, S.me.uid, 40),
      h('span',{class:'me-t'}, h('span',{class:'me-name',text:'@' + S.me.username}), h('span',{class:'me-sub',text:'Аккаунт в облаке'}))),
    iconBtn('users-plus','Новая группа',openGroupModal),
    iconBtn('sliders','Настройки',openSettings));
}
function preview(c){
  if (!c.last) return c.type === 'group' ? 'Группа создана' : 'Нет сообщений';
  var pre = '';
  if (c.last.kind !== 'sys') {
    if (c.last.from === S.me.uid) pre = 'Вы: ';
    else if (c.type === 'group' && c.last.from) pre = nm(c.last.from) + ': ';
  }
  return pre + c.last.text;
}
function chatRow(c){
  return h('button',{class:'row' + (S.active === c.id ? ' on' : ''),type:'button',onclick:function(){ openChat(c.id); }},
    avatarFor(c),
    h('span',{class:'row-main'},
      h('span',{class:'row-top'}, h('span',{class:'row-title',text:chatTitle(c)}), h('time',{class:'row-time',text:c.last ? listTime(c.last.ts) : ''})),
      h('span',{class:'row-bot'}, h('span',{class:'row-prev',text:preview(c)}), isUnread(c) ? h('i',{class:'unread','aria-label':'Есть новые сообщения'}) : null)));
}
function personRow(u){
  var on = S.online.has(u.id);
  return h('button',{class:'row',type:'button',onclick:function(){ openDm(u.id); }},
    avatar(u.username, u.id, 40, on),
    h('span',{class:'row-main'},
      h('span',{class:'row-top'}, h('span',{class:'row-title',text:'@' + u.username})),
      h('span',{class:'row-bot'}, h('span',{class:'row-prev',text:'Написать сообщение'}))));
}
function renderList(){
  var L = S.el.list;
  if (!L || !S.me) return;
  updateTitle();
  L.textContent = '';
  if (!S.chatsReady || !S.usersReady) { L.append(h('p',{class:'muted pad',text:'Загружаем…'})); return; }
  var q = S.query.trim().toLowerCase().replace(/^@/,'');
  var chats = Object.keys(S.chats).map(function(k){ return S.chats[k]; }).sort(function(a,b){ return chatTs(b) - chatTs(a); });
  var others = Object.keys(S.users).filter(function(id){ return id !== S.me.uid; }).map(function(id){ return {id:id, username:S.users[id].username}; });
  if (!q) {
    chats.forEach(function(c){ L.append(chatRow(c)); });
    var withDm = {};
    chats.filter(function(c){ return c.type === 'dm'; }).forEach(function(c){ withDm[otherUid(c)] = 1; });
    var rest = others.filter(function(u){ return !withDm[u.id]; }).slice(0, 30);
    if (rest.length) {
      L.append(h('div',{class:'sec',text:chats.length ? 'Другие люди' : 'Люди'}));
      rest.forEach(function(u){ L.append(personRow(u)); });
    }
    if (!chats.length && !rest.length) {
      L.append(h('p',{class:'muted pad',text:'Пока здесь никого нет. Позовите друга зарегистрироваться, потом найдёте его по имени.'}));
    }
    return;
  }
  var mc = chats.filter(function(c){ return chatTitle(c).toLowerCase().indexOf(q) >= 0; });
  var mp = others.filter(function(u){ return u.username.indexOf(q) >= 0; }).sort(function(a,b){
    return (b.username.indexOf(q) === 0) - (a.username.indexOf(q) === 0) || a.username.localeCompare(b.username);
  });
  if (mc.length) { L.append(h('div',{class:'sec',text:'Чаты'})); mc.forEach(function(c){ L.append(chatRow(c)); }); }
  if (mp.length) { L.append(h('div',{class:'sec',text:'Люди'})); mp.forEach(function(u){ L.append(personRow(u)); }); }
  if (!mc.length && !mp.length) L.append(h('p',{class:'muted pad',text:'Ничего не нашлось. Проверьте имя.'}));
}

/* ---------- присутствие собеседника ---------- */
function refreshOnline(){
  var c = curChat();
  if (!c || c.type !== 'dm') return;
  var p = otherUid(c);
  var on = Date.now() - S.peerSeen < 200000;
  if (on !== S.online.has(p)) {
    S.online = on ? new Set([p]) : new Set();
    renderChatHead(); renderList();
  }
}
function watchPeer(c){
  if (S.peerUnsub) { S.peerUnsub(); S.peerUnsub = null; }
  S.online = new Set(); S.peerSeen = 0;
  if (!c || c.type !== 'dm') return;
  var p = otherUid(c);
  S.peerUnsub = fdb.doc('presence/' + p).onSnapshot(function(s){
    S.peerSeen = s.exists ? tsMs(s.data().t) : 0;
    S.online = (Date.now() - S.peerSeen < 200000) ? new Set([p]) : new Set();
    renderChatHead(); renderList();
  }, function(){});
}

/* ---------- чат ---------- */
function openDm(uid){
  var id = dmId(S.me.uid, uid);
  if (S.chats[id]) openChat(id);
  else openChat(id, {id:id, type:'dm', members:[S.me.uid, uid].sort()});
}
function saveDraftText(){ if (S.active && S.el.input && !S.editing) S.drafts[S.active] = S.el.input.value; }
function openChat(id, draft){
  saveDraftText();
  if (S.msgUnsub) { S.msgUnsub(); S.msgUnsub = null; }
  S.active = id; S.draft = draft || null; S.msgs = []; S.msgsReady = false; S.forceBottom = true;
  S.selMsg = null; S.delArm = null; S.editing = null; S.el.editBar.hidden = true;
  closePanel();
  S.el.app.dataset.view = 'chat';
  S.el.main.hidden = false; S.el.empty.hidden = true;
  S.el.input.value = S.drafts[id] || '';
  resizeInput();
  watchPeer(curChat());
  S.msgUnsub = fdb.collection('chats/' + id + '/messages').orderBy('ts','desc').limit(200).onSnapshot(function(s){
    S.msgs = s.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); }).reverse();
    S.msgsReady = true;
    renderMsgs();
    markRead(id);
  }, function(e){ toast(explain(e)); });
  markRead(id);
  renderList(); renderChatHead(); renderMsgs();
  if (!window.matchMedia('(pointer:coarse)').matches) S.el.input.focus();
}
function closeChat(){
  saveDraftText();
  if (S.msgUnsub) { S.msgUnsub(); S.msgUnsub = null; }
  if (S.peerUnsub) { S.peerUnsub(); S.peerUnsub = null; }
  S.active = null; S.draft = null; S.msgs = []; S.online = new Set(); S.editing = null; S.selMsg = null;
  if (!S.el.app) return;
  S.el.app.dataset.view = 'list';
  S.el.main.hidden = true; S.el.empty.hidden = false;
  renderList();
}
function renderChatHead(){
  var H = S.el.chatHead;
  if (!H) return;
  H.textContent = '';
  var c = curChat();
  if (!c) return;
  var dm = c.type === 'dm';
  var peer = dm ? otherUid(c) : null;
  var on = dm && S.online.has(peer);
  var sub = dm ? (on ? 'в сети' : (S.peerSeen ? 'был(а) в сети ' + listTime(S.peerSeen) : 'не в сети')) : (c.members.length + ' ' + plural(c.members.length, ['участник','участника','участников']));
  H.append(
    h('button',{class:'icon-btn back',type:'button','aria-label':'К списку чатов',onclick:closeChat}, ic('back')),
    h('button',{class:'chat-who',type:'button',onclick:openInfo},
      avatarFor(c),
      h('span',{class:'chat-t'}, h('span',{class:'chat-name',text:chatTitle(c)}), h('span',{class:'chat-sub' + (on ? ' on' : ''),text:sub}))),
    dm && !blockState(c) ? iconBtn('phone','Позвонить',startCall) : null,
    iconBtn('info','О чате',openInfo));
  applyBlockBar(c);
}
function sysText(m){
  var a = nm(m.actor), t = nm(m.target);
  if (m.ev === 'created') return a + ' создал(а) группу';
  if (m.ev === 'added') return a + ' добавил(а) ' + t;
  if (m.ev === 'left') return a + ' вышел(а) из группы';
  if (m.ev === 'renamed') return a + ' переименовал(а) группу: «' + (m.name || '') + '»';
  return '';
}
function selectMsg(id){ S.selMsg = S.selMsg === id ? null : id; S.delArm = null; renderMsgs(); }
function renderMsgs(){
  var E = S.el.msgs;
  if (!E || !S.active) return;
  var near = E.scrollHeight - E.scrollTop - E.clientHeight < 100;
  E.textContent = '';
  var c = curChat();
  if (!S.msgsReady) {
    E.append(h('p',{class:'sys',text:'Загружаем сообщения…'}));
  } else if (!S.msgs.length) {
    E.append(h('p',{class:'sys',text:c && c.type === 'dm' ? 'Сообщений пока нет. Напишите первым.' : 'Сообщений пока нет.'}));
  } else {
    var prev = null, prevDay = '';
    S.msgs.forEach(function(m){
      var dk = dkey(new Date(m.ts));
      if (dk !== prevDay) { E.append(h('div',{class:'day',text:dayLabel(m.ts)})); prevDay = dk; prev = null; }
      if (m.kind === 'sys') { E.append(h('div',{class:'sys',text:sysText(m)})); prev = null; return; }
      if (m.kind === 'call') { E.append(h('div',{class:'callmsg'}, ic('phone'), h('span',{text:m.text}), h('time',{class:'muted',text:tf.format(new Date(m.ts))}))); prev = null; return; }
      var mine = m.from === S.me.uid;
      var first = !prev || prev.from !== m.from || (m.ts - prev.ts) > 5 * 60000;
      var sel = S.selMsg === m.id;
      var who = (first && !mine && c && c.type === 'group')
        ? h('span',{class:'who'}, nm(m.from), c.owner === m.from ? h('span',{class:'tag own',text:'создатель'}) : null)
        : null;
      var timeEl = h('time',{text:(m.edited ? 'изм. ' : '') + tf.format(new Date(m.ts))});
      if (m.kind === 'sticker') {
        E.append(h('div',{class:'sticker-msg' + (mine ? ' mine' : '') + (first ? ' first' : ''),onclick:function(){ selectMsg(m.id); }},
          who, h('span',{class:'stk',text:m.text}), timeEl));
      } else {
        var b = h('div',{class:'msg' + (mine ? ' mine' : '') + (first ? ' first' : '') + (sel ? ' sel' : ''),onclick:function(){ selectMsg(m.id); }});
        if (who) b.append(who);
        b.append(h('span',{text:m.text}), timeEl);
        E.append(b);
      }
      if (sel) {
        var canDel = mine || (c && c.type === 'group' && c.owner === S.me.uid);
        var acts = h('div',{class:'macts' + (mine ? ' mine' : '')});
        if (mine && m.kind !== 'sticker') acts.append(h('button',{class:'btn sm',type:'button',onclick:function(){ startEdit(m); }}, ic('edit'), 'Изменить'));
        if (canDel) {
          var armed = S.delArm === m.id;
          acts.append(h('button',{class:'btn sm danger',type:'button',onclick:async function(){
            if (S.delArm !== m.id) { S.delArm = m.id; renderMsgs(); return; }
            try { await deleteMsg(m); } catch (e) { toast(explain(e)); }
          }}, ic('trash'), armed ? 'Удалить для всех?' : 'Удалить'));
        }
        if (acts.childNodes.length) E.append(acts);
      }
      prev = m;
    });
  }
  if (S.forceBottom || near) E.scrollTop = E.scrollHeight;
  if (S.msgsReady) S.forceBottom = false;
}
function lastOf(m){
  if (m.kind === 'sys') return {from:m.actor, text:sysText(m).slice(0,120), ts:m.ts, kind:'sys'};
  if (m.kind === 'sticker') return {from:m.from, text:'Стикер ' + m.text, ts:m.ts};
  return {from:m.from, text:String(m.text || '').slice(0,120), ts:m.ts};
}
async function deleteMsg(m){
  var id = S.active, c = curChat();
  await fdb.doc('chats/' + id + '/messages/' + m.id).delete();
  S.selMsg = null; S.delArm = null;
  if (c && c.last && c.last.ts === m.ts && S.chats[id]) {
    var rest = S.msgs.filter(function(x){ return x.id !== m.id; });
    var pm = rest[rest.length - 1];
    await fdb.doc('chats/' + id).update({last: pm ? lastOf(pm) : null});
  }
  renderMsgs();
}
function startEdit(m){
  S.editing = {id:m.id}; S.selMsg = null; S.delArm = null;
  S.el.editBar.hidden = false;
  S.el.input.value = m.text; resizeInput(); S.el.input.focus();
  renderMsgs();
}
function cancelEdit(){
  S.editing = null;
  if (!S.el.editBar) return;
  S.el.editBar.hidden = true;
  S.el.input.value = S.drafts[S.active] || ''; resizeInput();
}
async function saveEdit(text){
  var id = S.active, e = S.editing;
  var m = S.msgs.filter(function(x){ return x.id === e.id; })[0];
  if (!m || text === m.text) { cancelEdit(); return; }
  try {
    await fdb.doc('chats/' + id + '/messages/' + m.id).update({text:text, edited:true});
    var c = S.chats[id];
    if (c && c.last && c.last.ts === m.ts) await fdb.doc('chats/' + id).update({'last.text':text.slice(0,120)});
    cancelEdit();
  } catch (ex) { toast(explain(ex)); }
}

/* смайлы и стикеры */
function togglePanel(){ if (S.panelOpen) closePanel(); else openPanel(); }
function closePanel(){ S.panelOpen = false; if (S.el.panel) S.el.panel.hidden = true; }
function openPanel(){ S.panelOpen = true; S.el.panel.hidden = false; drawPanel(); }
function drawPanel(){
  var P = S.el.panel;
  P.textContent = '';
  var tab = S.panelTab;
  function tb(id, label){ return h('button',{class:'btn sm' + (tab === id ? ' primary' : ''),type:'button',onclick:function(){ S.panelTab = id; drawPanel(); }}, label); }
  var grid = h('div',{class:'pgrid' + (tab === 'stickers' ? ' st' : '')});
  (tab === 'stickers' ? STICKERS : EMOJI).forEach(function(e){
    grid.append(h('button',{class:'pcell',type:'button','aria-label':e,onclick:function(){
      if (tab === 'stickers') { closePanel(); sendSticker(e); }
      else {
        var t = S.el.input, a = t.selectionStart == null ? t.value.length : t.selectionStart, z = t.selectionEnd == null ? a : t.selectionEnd;
        t.value = t.value.slice(0, a) + e + t.value.slice(z);
        t.focus(); t.selectionStart = t.selectionEnd = a + e.length; resizeInput();
      }
    }}, e));
  });
  P.append(h('div',{class:'panel-tabs'}, tb('emoji','Смайлы'), tb('stickers','Стикеры')), grid);
}

async function ensureChat(id, chat){
  var ref = fdb.doc('chats/' + id);
  var s = await ref.get();
  if (s.exists) return;
  var now = Date.now();
  var body = {type:chat.type, members:chat.members, createdAt:now, updatedAt:now};
  if (chat.name) { body.name = chat.name; body.owner = chat.owner || S.me.uid; }
  await ref.set(body);
}
async function postMsg(chatId, chatLike, payload, prevText){
  if (!S.chats[chatId]) await ensureChat(chatId, chatLike);
  var ts = Date.now();
  var body = Object.assign({}, payload, {ts:ts});
  await fdb.doc('chats/' + chatId + '/messages/' + ts.toString(36) + randHex(2)).set(body);
  var last = {from:payload.from || payload.actor || S.me.uid, text:String(prevText || '').slice(0,120), ts:ts};
  if (payload.kind === 'sys') last.kind = 'sys';
  await fdb.doc('chats/' + chatId).update({updatedAt:ts, last:last});
  if (payload.kind !== 'sys' && payload.kind !== 'call') {
    var cc = S.chats[chatId] || chatLike;
    var others = (cc.members || []).filter(function(u){ return u !== S.me.uid; });
    pushNotify(others, {
      kind:'msg', chat:chatId,
      title: cc.type === 'dm' ? nm(S.me.uid) : (cc.name || 'Группа') + ' · ' + nm(S.me.uid),
      body: payload.kind === 'sticker' ? 'Стикер ' + payload.text : String(payload.text || '').slice(0, 140)
    });
  }
}
function blockMsg(bs){ return bs === 'in' ? 'Вы заблокированы. Писать этому человеку нельзя.' : 'Вы заблокировали этого человека. Разблокируйте, чтобы писать.'; }
async function doSend(){
  if (!S.active) return;
  var ta = S.el.input;
  var text = ta.value.trim();
  if (!text) return;
  var id = S.active, c = curChat();
  if (!c) return;
  var bs = blockState(c);
  if (bs) { toast(blockMsg(bs)); return; }
  if (S.editing) { await saveEdit(text); return; }
  ta.value = ''; resizeInput(); S.drafts[id] = '';
  S.forceBottom = true;
  closePanel();
  try {
    await postMsg(id, c, {from:S.me.uid, text:text}, text);
  } catch (e) {
    if (S.active === id) { ta.value = text; resizeInput(); }
    toast(explain(e));
  }
}
async function sendSticker(emoji){
  var id = S.active, c = curChat();
  if (!c) return;
  var bs = blockState(c);
  if (bs) { toast(blockMsg(bs)); return; }
  S.forceBottom = true;
  try { await postMsg(id, c, {kind:'sticker', from:S.me.uid, text:emoji}, 'Стикер ' + emoji); }
  catch (e) { toast(explain(e)); }
}
async function clearChat(id){
  var snap = await fdb.collection('chats/' + id + '/messages').get();
  var docs = snap.docs;
  for (var i = 0; i < docs.length; i += 15) {
    var b = fdb.batch();
    docs.slice(i, i + 15).forEach(function(d){ b.delete(d.ref); });
    await b.commit();
  }
  await fdb.doc('chats/' + id).update({last:null, updatedAt:Date.now()});
}

/* ---------- окна ---------- */
function openModal(title, build){
  closeModal();
  var host = document.getElementById('modal-host');
  if (!host) return;
  var body = h('div',{class:'dlg-body'});
  var dlg = h('div',{class:'dialog',role:'dialog','aria-modal':'true','aria-label':title},
    h('div',{class:'dlg-head'}, h('h2',{text:title}), iconBtn('x','Закрыть',closeModal)), body);
  var scrim = h('div',{class:'scrim',onmousedown:function(e){ if (e.target === scrim) closeModal(); }}, dlg);
  host.append(scrim);
  S.modal = {refresh:null};
  build(body, S.modal);
  var f = dlg.querySelector('input,textarea,button.primary');
  if (f && !window.matchMedia('(pointer:coarse)').matches) f.focus();
}
function closeModal(){
  var host = document.getElementById('modal-host');
  if (host) host.textContent = '';
  S.modal = null;
}
document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && S.modal) closeModal(); });

function confirmBtn(label, confirmLabel, fn){
  var armed = false, t = null;
  var b = h('button',{class:'btn danger wide',type:'button',onclick:async function(){
    if (!armed) {
      armed = true; b.textContent = confirmLabel;
      t = setTimeout(function(){ armed = false; b.textContent = label; }, 4000);
      return;
    }
    clearTimeout(t); armed = false; b.textContent = label; b.disabled = true;
    try { await fn(); } catch (e) { toast(explain(e)); }
    b.disabled = false;
  }}, label);
  return b;
}

function openSettings(){
  openModal('Настройки', function(b, m){
    var un = h('input',{id:'set-name',type:'text',value:S.me.username,maxlength:'20',autocapitalize:'none',spellcheck:'false',autocomplete:'off'});
    var unErr = h('p',{class:'form-err',role:'alert'});
    var unBtn = h('button',{class:'btn primary',type:'button',onclick:async function(){
      unErr.textContent = ''; unBtn.disabled = true;
      try { await renameUser(un.value); un.value = S.me.username; renderSideHead(); toast('Имя изменено: @' + S.me.username); }
      catch (e) { unErr.textContent = explain(e); }
      unBtn.disabled = false;
    }}, 'Сохранить имя');

    var pCur = h('input',{id:'set-pw-cur',type:'password',autocomplete:'current-password'});
    var pNew = h('input',{id:'set-pw-new',type:'password',autocomplete:'new-password',placeholder:'Не короче 6 символов'});
    var pErr = h('p',{class:'form-err',role:'alert'});
    var pBtn = h('button',{class:'btn primary',type:'button',onclick:async function(){
      pErr.textContent = ''; pBtn.disabled = true;
      try { await changePw(pCur.value, pNew.value); pCur.value = ''; pNew.value = ''; toast('Пароль изменён'); }
      catch (e) { pErr.textContent = explain(e); }
      pBtn.disabled = false;
    }}, 'Сменить пароль');

    var avHost = h('div');
    function drawAv(){ avHost.textContent = ''; avHost.append(avatar(S.me.username, S.me.uid, 72)); }
    drawAv();
    var avErr = h('p',{class:'form-err',role:'alert'});
    var file = h('input',{id:'av-file',type:'file',accept:'image/*',hidden:true,onchange:async function(){
      var f = file.files && file.files[0];
      file.value = '';
      if (!f) return;
      avErr.textContent = '';
      upBtn.disabled = true;
      try {
        var url = await makeAvatar(f);
        await fdb.doc('users/' + S.me.uid).update({avatar:url});
        toast('Аватарка обновлена');
      } catch (e) { avErr.textContent = explain(e); }
      upBtn.disabled = false;
    }});
    var upBtn = h('button',{class:'btn sm',type:'button',onclick:function(){ file.click(); }}, 'Выбрать фото');
    var rmBtn = h('button',{class:'btn sm',type:'button',onclick:async function(){
      avErr.textContent = '';
      try { await fdb.doc('users/' + S.me.uid).update({avatar:''}); toast('Аватарка удалена'); }
      catch (e) { avErr.textContent = explain(e); }
    }}, 'Удалить');

    b.append(
      h('div',{class:'profile'}, avHost, h('div',{class:'av-edit'}, h('div',{class:'profile-t'}, h('strong',{text:'@' + S.me.username}), h('span',{class:'muted',text:'Это имя и фото видят все'})), h('div',{class:'row-actions'}, upBtn, rmBtn, file), avErr)),
      h('div',{class:'sect'}, h('h3',{text:'Имя пользователя'}), field('Новое имя', un, '3–20 символов: a–z, цифры, _'), unErr, h('div',{class:'row-actions'}, unBtn)),
      h('div',{class:'sect'}, h('h3',{text:'Облачный пароль'}),
        h('p',{class:'muted',text:'Аккаунт, чаты и сообщения хранятся в облаке. Чтобы войти с другого устройства, понадобятся имя и этот пароль.'}),
        field('Текущий пароль', pCur), field('Новый пароль', pNew), pErr, h('div',{class:'row-actions'}, pBtn)),
      notifSection(),
      devicesSection(m),
      h('div',{class:'sect'}, h('button',{class:'btn wide',type:'button',onclick:function(){ closeModal(); logout(); }}, ic('logout'), 'Выйти из аккаунта')));
    var prevRefresh = m.refresh;
    m.refresh = function(){ if (prevRefresh) prevRefresh(); drawAv(); };
  });
}

function openGroupModal(){
  openModal('Новая группа', function(b){
    var sel = {};
    var count = function(){ return Object.keys(sel).length; };
    var nameIn = h('input',{id:'grp-name',type:'text',maxlength:'40',placeholder:'Например, Друзья',autocomplete:'off',oninput:upd});
    var filter = h('input',{id:'grp-filter',type:'search',placeholder:'Найти человека',autocomplete:'off',oninput:draw});
    var listEl = h('div',{class:'pick-list'});
    var err = h('p',{class:'form-err',role:'alert'});
    var cnt = h('span',{class:'muted',text:'Выбрано: 0'});
    var create = h('button',{class:'btn primary',type:'button',disabled:true,onclick:doCreate},'Создать группу');
    function upd(){ create.disabled = !(nameIn.value.trim() && count()); cnt.textContent = 'Выбрано: ' + count(); }
    function draw(){
      var q = filter.value.trim().toLowerCase().replace(/^@/,'');
      listEl.textContent = '';
      var rows = Object.keys(S.users).filter(function(id){ return id !== S.me.uid && S.users[id].username.indexOf(q) >= 0; });
      if (!rows.length) {
        listEl.append(h('p',{class:'muted pad',text:Object.keys(S.users).length < 2 ? 'Других людей пока нет.' : 'Никого не нашли.'}));
        return;
      }
      rows.forEach(function(id){
        var u = S.users[id];
        var cb = h('input',{type:'checkbox',id:'pk-' + id,checked:!!sel[id],onchange:function(){ if (cb.checked) sel[id] = 1; else delete sel[id]; upd(); }});
        listEl.append(h('label',{class:'pick','for':'pk-' + id}, cb, avatar(u.username, id, 32), h('span',{class:'grow',text:'@' + u.username})));
      });
    }
    async function doCreate(){
      err.textContent = ''; create.disabled = true;
      try {
        var name = nameIn.value.trim();
        var gid = 'g_' + randHex(6);
        var ts = Date.now();
        var chat = {id:gid, type:'group', name:name, owner:S.me.uid, members:[S.me.uid].concat(Object.keys(sel)), createdAt:ts, updatedAt:ts};
        var body = Object.assign({}, chat); delete body.id;
        await fdb.doc('chats/' + gid).set(body);
        await postMsg(gid, chat, {kind:'sys', ev:'created', actor:S.me.uid}, nm(S.me.uid) + ' создал(а) группу');
        closeModal();
        openChat(gid, chat);
      } catch (e) { err.textContent = explain(e); create.disabled = false; }
    }
    b.append(field('Название', nameIn), field('Участники', filter), listEl, err, h('div',{class:'row-actions'}, create, cnt));
    draw(); upd();
  });
}

function openInfo(){
  var c = curChat();
  if (!c) return;
  if (c.type === 'dm') openDmInfo(c); else openGroupInfo(c.id);
}
function openDmInfo(c){
  var peer = otherUid(c);
  var u = S.users[peer];
  var on = S.online.has(peer);
  openModal('Чат', function(b){
    b.append(
      h('div',{class:'profile'}, avatar(u ? u.username : '?', peer, 64, on), h('div',{class:'profile-t'}, h('strong',{text:nm(peer)}), h('span',{class:'muted',text:on ? 'в сети' : 'не в сети'}))),
      h('button',{class:'btn primary wide',type:'button',onclick:function(){ closeModal(); startCall(); }}, ic('phone'), 'Позвонить'),
      h('button',{class:'btn wide' + (S.blocksOut.has(peer) ? '' : ' danger'),type:'button',onclick:async function(){
        try { if (S.blocksOut.has(peer)) await unblockUser(peer); else await blockUser(peer); closeModal(); }
        catch (e) { toast(explain(e)); }
      }}, S.blocksOut.has(peer) ? 'Разблокировать' : 'Заблокировать'));
    if (S.chats[c.id]) {
      b.append(h('div',{class:'sect'}, confirmBtn('Очистить переписку', 'Да, очистить для обоих', async function(){ await clearChat(c.id); closeModal(); toast('Переписка очищена'); })));
    }
  });
}
function openGroupInfo(id){
  openModal('Группа', function(b, m){
    var c0 = S.chats[id];
    if (!c0) { closeModal(); return; }
    var nameIn = h('input',{id:'grp-rename',type:'text',maxlength:'40',value:c0.name || '',autocomplete:'off'});
    var nameErr = h('p',{class:'form-err',role:'alert'});
    var saveBtn = h('button',{class:'btn',type:'button',onclick:async function(){
      var v = nameIn.value.trim();
      var c = S.chats[id];
      nameErr.textContent = '';
      if (!v) { nameErr.textContent = 'Введите название.'; return; }
      if (!c || v === c.name) return;
      saveBtn.disabled = true;
      try {
        await fdb.doc('chats/' + id).update({name:v});
        await postMsg(id, c, {kind:'sys', ev:'renamed', actor:S.me.uid, name:v}, nm(S.me.uid) + ' переименовал(а) группу');
        toast('Название изменено');
      } catch (e) { nameErr.textContent = explain(e); }
      saveBtn.disabled = false;
    }}, 'Переименовать');
    var membersEl = h('div',{class:'pick-list'});
    var addEl = h('div',{class:'pick-list'});
    function draw(){
      var c = S.chats[id];
      if (!c) { closeModal(); return; }
      membersEl.textContent = '';
      c.members.forEach(function(u){
        membersEl.append(h('div',{class:'pick static'},
          avatar(S.users[u] ? S.users[u].username : '?', u, 32),
          h('span',{class:'grow',text:nm(u) + (u === S.me.uid ? ' (вы)' : '')}),
          u === c.owner ? h('span',{class:'tag',text:'создатель'}) : null));
      });
      addEl.textContent = '';
      var cand = Object.keys(S.users).filter(function(u){ return c.members.indexOf(u) < 0; });
      if (!cand.length) addEl.append(h('p',{class:'muted pad',text:'Все, кто зарегистрирован, уже в группе.'}));
      cand.forEach(function(u){
        var btn = h('button',{class:'btn sm',type:'button',onclick:async function(){
          btn.disabled = true;
          try {
            var cc = S.chats[id];
            await fdb.doc('chats/' + id).update({members:cc.members.concat([u])});
            await postMsg(id, cc, {kind:'sys', ev:'added', actor:S.me.uid, target:u}, nm(S.me.uid) + ' добавил(а) ' + nm(u));
          } catch (e) { toast(explain(e)); btn.disabled = false; }
        }}, 'Добавить');
        addEl.append(h('div',{class:'pick static'}, avatar(S.users[u].username, u, 32), h('span',{class:'grow',text:'@' + S.users[u].username}), btn));
      });
    }
    m.refresh = draw;
    var isOwner = c0.owner === S.me.uid;
    b.append(
      h('p',{class:'muted',text:'Создатель группы: ' + nm(c0.owner)}),
      field('Название', nameIn), nameErr, h('div',{class:'row-actions'}, saveBtn),
      h('div',{class:'sect'}, h('h3',{text:'Участники'}), membersEl),
      h('div',{class:'sect'}, h('h3',{text:'Добавить людей'}), addEl),
      h('div',{class:'sect'},
        isOwner ? confirmBtn('Очистить переписку', 'Да, очистить для всех', async function(){ await clearChat(id); toast('Переписка очищена'); }) : null,
        confirmBtn('Выйти из группы', 'Да, выйти', async function(){
          var c = S.chats[id];
          await postMsg(id, c, {kind:'sys', ev:'left', actor:S.me.uid}, nm(S.me.uid) + ' вышел(а) из группы');
          await fdb.doc('chats/' + id).update({members:c.members.filter(function(x){ return x !== S.me.uid; })});
          closeModal(); closeChat();
        })));
    draw();
  });
}

/* ---------- звонки: WebRTC, сигнализация через Firestore ---------- */
var ICE = (CFG.iceServers && CFG.iceServers.length) ? CFG.iceServers : [
  {urls:'stun:stun.l.google.com:19302'},
  {urls:'stun:stun.cloudflare.com:3478'},
  {urls:'stun:global.stun.twilio.com:3478'}
];
function micError(e){
  var n = e && e.name;
  if (n === 'NotAllowedError' || n === 'SecurityError') return 'Разрешите доступ к микрофону в браузере и повторите.';
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'Микрофон не найден.';
  if (e && e.user) return e.message;
  return 'Не удалось включить микрофон.';
}
async function getMic(){
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof RTCPeerConnection === 'undefined') {
    throw new UErr('Этот браузер не поддерживает звонки. Нужен HTTPS и современный браузер.');
  }
  return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true}});
}
function makePc(call){
  var pc = new RTCPeerConnection({iceServers:ICE});
  call.pending = []; call.myIce = [];
  pc.onicecandidate = function(e){
    if (!e.candidate) return;
    fdb.collection('calls/' + call.id + '/ice').add({from:S.me.uid, cand:JSON.stringify(e.candidate.toJSON())})
      .then(function(r){ call.myIce.push(r); }).catch(function(){});
  };
  pc.ontrack = function(e){
    if (!call.audio) { call.audio = new Audio(); call.audio.autoplay = true; }
    call.audio.srcObject = e.streams[0];
    var p = call.audio.play(); if (p && p.catch) p.catch(function(){});
  };
  pc.onconnectionstatechange = function(){
    if (S.call !== call) return;
    var st = pc.connectionState;
    if (st === 'connected' && !call.connected) {
      call.connected = true; call.startedAt = Date.now(); renderCall();
    } else if (st === 'failed') {
      toast('Не удалось соединиться. Возможно, нужен TURN-сервер (см. README).');
      hangUp();
    } else if (st === 'disconnected') {
      clearTimeout(call.dropT);
      call.dropT = setTimeout(function(){ if (S.call === call && pc.connectionState === 'disconnected') finishCall('lost'); }, 8000);
    }
  };
  return pc;
}
function applyIce(call, cand){
  if (call.pc && call.pc.remoteDescription) call.pc.addIceCandidate(cand).catch(function(){});
  else call.pending.push(cand);
}
function flushIce(call){
  var p = call.pending || []; call.pending = [];
  p.forEach(function(c){ call.pc.addIceCandidate(c).catch(function(){}); });
}
function listenIce(call){
  return fdb.collection('calls/' + call.id + '/ice').onSnapshot(function(s){
    s.docChanges().forEach(function(ch){
      if (ch.type !== 'added') return;
      var d = ch.doc.data();
      if (d.from === S.me.uid) return;
      try { applyIce(call, JSON.parse(d.cand)); } catch (e) {}
    });
  }, function(){});
}

async function startCall(){
  var c = curChat();
  if (!c || c.type !== 'dm' || S.call) return;
  var bs = blockState(c);
  if (bs) { toast(bs === 'in' ? 'Вы заблокированы. Позвонить этому человеку нельзя.' : 'Вы заблокировали этого человека. Разблокируйте, чтобы позвонить.'); return; }
  var peer = otherUid(c);
  if (!S.online.has(peer) && !PUSH) { toast(nm(peer) + ' сейчас не в сети. Позвонить можно, когда человек открыл Вече.'); return; }
  var call = {id:'c' + randHex(8), peer:peer, role:'out', status:'ringing', unsubs:[], pending:[], myIce:[]};
  S.call = call;
  renderCall();
  try {
    call.stream = await getMic();
    call.pc = makePc(call);
    call.stream.getTracks().forEach(function(t){ call.pc.addTrack(t, call.stream); });
    var offer = await call.pc.createOffer();
    await fdb.doc('calls/' + call.id).set({from:S.me.uid, to:peer, status:'ringing', offer:{type:offer.type, sdp:offer.sdp}, createdAt:Date.now()});
    await call.pc.setLocalDescription(offer);
    pushNotify([peer], {kind:'call', chat:dmId(S.me.uid, peer), callId:call.id, title:'Входящий звонок', body:nm(S.me.uid) + ' звонит вам'});
  } catch (e) {
    if (S.call === call) endLocal();
    toast(micError(e) === 'Не удалось включить микрофон.' ? explain(e) : micError(e));
    return;
  }
  if (S.call !== call) return;
  call.unsubs.push(fdb.doc('calls/' + call.id).onSnapshot(function(s){ onCallDoc(call, s); }, function(){}));
  call.unsubs.push(listenIce(call));
  call.timeout = setTimeout(function(){
    if (S.call === call && call.status === 'ringing') {
      fdb.doc('calls/' + call.id).update({status:'missed'}).catch(function(){});
      finishCall('missed');
    }
  }, 60000);
}
function handleIncoming(id, d){
  if (S.blocksOut.has(d.from) || S.blocksIn.has(d.from)) return;
  if (S.call) {
    if (S.call.id !== id) fdb.doc('calls/' + id).update({status:'busy'}).catch(function(){});
    return;
  }
  var call = {id:id, peer:d.from, role:'in', status:'ringing', offer:d.offer, unsubs:[], pending:[], myIce:[]};
  S.call = call;
  call.timeout = setTimeout(function(){ if (S.call === call && call.status === 'ringing') endLocal(); }, 70000);
  call.unsubs.push(fdb.doc('calls/' + id).onSnapshot(function(s){ onCallDoc(call, s); }, function(){}));
  renderCall();
  sysNotify('Входящий звонок', nm(d.from) + ' звонит вам', dmId(S.me.uid, d.from));
}
function onCallDoc(call, snap){
  if (S.call !== call) return;
  if (!snap.exists) {
    if (call.role === 'in' && call.status === 'ringing') { endLocal(); toast('Пропущенный звонок от ' + nm(call.peer) + '.'); }
    else if (call.status === 'active') finishCall('ended');
    return;
  }
  var d = snap.data();
  if (call.role === 'out') {
    if (d.status === 'active' && d.answer && !call.answered) {
      call.answered = true; call.status = 'active';
      clearTimeout(call.timeout);
      call.pc.setRemoteDescription(d.answer).then(function(){ flushIce(call); }).catch(function(){ finishCall('lost'); });
      renderCall();
    } else if (d.status === 'declined') { finishCall('declined'); toast(nm(call.peer) + ' отклонил(а) звонок.'); }
    else if (d.status === 'busy') { finishCall('busy'); toast(nm(call.peer) + ' сейчас занят(а).'); }
    else if (d.status === 'ended' && call.status === 'active') finishCall('ended');
  } else {
    if (call.status === 'ringing') {
      if (d.status === 'cancelled' || d.status === 'missed') { var who = nm(call.peer); endLocal(); toast('Пропущенный звонок от ' + who + '.'); }
      else if (d.status === 'active') { endLocal(); toast('Звонок принят на другом устройстве.'); }
    } else if (d.status === 'ended') finishCall('ended');
  }
}
async function acceptCall(){
  var call = S.call;
  if (!call || call.role !== 'in' || call.status !== 'ringing') return;
  clearTimeout(call.timeout);
  call.status = 'connecting';
  renderCall();
  try {
    call.stream = await getMic();
    call.pc = makePc(call);
    call.stream.getTracks().forEach(function(t){ call.pc.addTrack(t, call.stream); });
    await call.pc.setRemoteDescription(call.offer);
    call.unsubs.push(listenIce(call));
    flushIce(call);
    var ans = await call.pc.createAnswer();
    await call.pc.setLocalDescription(ans);
    await fdb.doc('calls/' + call.id).update({status:'active', answer:{type:ans.type, sdp:ans.sdp}});
    if (S.call !== call) return;
    call.status = 'active';
    renderCall();
  } catch (e) {
    fdb.doc('calls/' + call.id).update({status:'declined'}).catch(function(){});
    if (S.call === call) endLocal();
    toast(micError(e) === 'Не удалось включить микрофон.' ? explain(e) : micError(e));
  }
}
function hangUp(){
  var c = S.call;
  if (!c) return;
  var ref = fdb.doc('calls/' + c.id);
  if (c.status === 'active' || c.status === 'connecting') { ref.update({status:'ended'}).catch(function(){}); finishCall('ended'); }
  else if (c.role === 'out') { ref.update({status:'cancelled'}).catch(function(){}); finishCall('cancel'); }
  else { ref.update({status:'declined'}).catch(function(){}); endLocal(); }
}
function endLocal(){
  var c = S.call;
  S.call = null;
  if (c) {
    clearTimeout(c.timeout); clearTimeout(c.dropT);
    (c.unsubs || []).forEach(function(u){ try { u(); } catch (e) {} });
    try { if (c.pc) c.pc.close(); } catch (e) {}
    try { if (c.stream) c.stream.getTracks().forEach(function(t){ t.stop(); }); } catch (e) {}
    try { if (c.audio) { c.audio.pause(); c.audio.srcObject = null; } } catch (e) {}
    (c.myIce || []).forEach(function(r){ r.delete().catch(function(){}); });
    if (c.role === 'out') setTimeout(function(){ fdb.doc('calls/' + c.id).delete().catch(function(){}); }, 5000);
  }
  clearInterval(S.tickT); S.tickT = null; S.timeEl = null;
  renderCall();
}
function finishCall(reason){
  var c = S.call;
  if (!c) return;
  var wasActive = c.status === 'active';
  var dur = c.connected && c.startedAt ? Date.now() - c.startedAt : 0;
  var connected = !!c.connected;
  endLocal();
  if (reason === 'lost') toast('Связь с собеседником потеряна.');
  if (c.role !== 'out' || !S.me) return;
  var t = null;
  if (wasActive && connected) t = 'Звонок · ' + fmtDur(dur);
  else if (wasActive) t = 'Звонок не соединился';
  else if (reason === 'declined') t = 'Звонок отклонён';
  else if (reason === 'busy') t = 'Собеседник занят';
  else if (reason === 'missed') t = 'Пропущенный звонок';
  else if (reason === 'cancel') t = 'Звонок отменён';
  if (!t) return;
  var chatId = dmId(S.me.uid, c.peer);
  postMsg(chatId, {type:'dm', members:[S.me.uid, c.peer].sort()}, {kind:'call', from:S.me.uid, text:t}, t).catch(function(){});
}
function toggleMute(){
  var c = S.call;
  if (!c || !c.stream) return;
  c.muted = !c.muted;
  c.stream.getAudioTracks().forEach(function(t){ t.enabled = !c.muted; });
  renderCall();
}
function renderCall(){
  var host = document.getElementById('call-host');
  if (!host) return;
  host.textContent = '';
  S.timeEl = null;
  var c = S.call;
  var ringing = !!c && c.role === 'in' && c.status === 'ringing';
  if (ringing) startRing(); else stopRing();
  if (!c) return;
  var u = S.users[c.peer];
  var text = ringing ? 'Входящий звонок' : (c.status === 'ringing' ? 'Вызываем…' : (c.connected ? fmtDur(Date.now() - c.startedAt) : 'Соединяем…'));
  var status = h('p',{class:'call-status',text:text});
  clearInterval(S.tickT);
  if (c.connected) {
    S.timeEl = status;
    S.tickT = setInterval(function(){ if (S.timeEl && S.call && S.call.startedAt) S.timeEl.textContent = fmtDur(Date.now() - S.call.startedAt); }, 1000);
  }
  var btns = ringing
    ? [h('button',{class:'cbtn no',type:'button','aria-label':'Отклонить',onclick:hangUp}, ic('phone')),
       h('button',{class:'cbtn ok',type:'button','aria-label':'Принять',onclick:acceptCall}, ic('phone'))]
    : [c.stream ? h('button',{class:'cbtn mute',type:'button','aria-label':c.muted ? 'Включить микрофон' : 'Выключить микрофон',onclick:toggleMute}, ic(c.muted ? 'micoff' : 'mic')) : null,
       h('button',{class:'cbtn no',type:'button','aria-label':'Завершить звонок',onclick:hangUp}, ic('phone'))];
  host.append(h('div',{class:'call',role:'alertdialog','aria-label':'Звонок'},
    h('div',{class:'call-card' + (c.status === 'ringing' ? ' ring' : '')},
      avatar(u ? u.username : '?', c.peer, 96),
      h('p',{class:'call-name',text:nm(c.peer)}),
      status,
      h('div',{class:'call-btns'}, btns),
      h('p',{class:'call-note',text:'Голосовой звонок через интернет. Браузер попросит доступ к микрофону.'}))));
}

/* ---------- запуск ---------- */
async function boot(){
  showBoot('Подключаемся…');
  var key = CFG.firebase && CFG.firebase.apiKey;
  if (!key || /ВСТАВЬ|YOUR_|XXXX/i.test(key)) {
    showBoot('Нужна настройка.', true, 'Откройте файл config.js и вставьте ключи вашего проекта Firebase. Пошаговая инструкция в README.md.');
    return;
  }
  if (typeof firebase === 'undefined') {
    showBoot('Не загрузился Firebase.', true, 'Файлы Firebase (gstatic.com) не открылись. Проверьте интернет и блокировки.');
    return;
  }
  try {
    firebase.initializeApp(CFG.firebase);
    auth = firebase.auth();
    fdb = firebase.firestore();
    fdb.settings({experimentalAutoDetectLongPolling:true, ignoreUndefinedProperties:true});
  } catch (e) {
    showBoot('Не удалось запустить Firebase.', true, 'Проверьте ключи в config.js.');
    return;
  }
  S.deviceId = getDeviceId();
  registerSw();
  var user = await new Promise(function(res){
    var un = auth.onAuthStateChanged(function(u){ un(); res(u); }, function(){ res(null); });
  });
  if (!user) { showAuth(); return; }
  try {
    var ds = await fdb.doc(devKey(user.uid)).get();
    var st = ds.exists ? ds.data().status : '';
    if (st === 'trusted') { await startSession(user.uid); return; }
    if (st === 'pending') { showWaiting(user.uid); return; }
  } catch (e) { toast(explain(e)); }
  try { await auth.signOut(); } catch (e) {}
  showAuth();
}
boot();
})();
