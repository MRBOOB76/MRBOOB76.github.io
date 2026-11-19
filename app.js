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
  video:'<rect x="2" y="6" width="14" height="12" rx="2"/><path d="M22 8l-6 4 6 4z"/>',
  reply:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 6 6v3"/>',
  play:'<path d="M7 4v16l13-8z"/>',
  pause:'<path d="M7 4h4v16H7zM14 4h4v16h-4z"/>',
  stop:'<rect x="5" y="5" width="14" height="14" rx="2"/>',
  screen:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
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
  var pic = !grp && S.users && S.users[seed] && canSeeProfile(seed) && S.users[seed].avatar;
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
  swReg:null, ringT:null,
  gateCode:'', peerHidden:false,
  gcall:null, gcDocs:{}, gcDeclined:{}, gcTimer:null, gcRing:null
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

/* ---------- приватность ---------- */
/* Значения: all (все), contacts (только те, с кем есть личная переписка), none (никто). */
var PV = [['all','Все'], ['contacts','Только те, кто мне писал'], ['none','Никто']];
function pvOf(uid, key){
  var u = S.users[uid], v = u && u[key];
  return (v === 'contacts' || v === 'none') ? v : 'all';
}
function isContact(uid){ return !!(S.me && S.chats[dmId(S.me.uid, uid)]); }
function canSeeProfile(uid){
  if (!S.me || uid === S.me.uid) return true;
  var v = pvOf(uid, 'pvProfile');
  return v === 'all' || (v === 'contacts' && isContact(uid));
}
function canInvite(uid){
  var v = pvOf(uid, 'pvInvite');
  return v === 'all' || (v === 'contacts' && isContact(uid));
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
    /* «Пропуск»: база принимает его только с верным кодом доступа. */
    try { await fdb.doc('invites/' + uid).set({code:S.gateCode || ''}); }
    catch (ge) {
      if (ge && ge.code === 'permission-denied') {
        S.gateCode = ''; ls.del('vech_gate');
        throw new UErr('Неверный или устаревший код доступа. Обновите страницу и введите код заново.');
      }
      throw ge;
    }
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
/* Звуки: готовые наборы, громкость, свои файлы. Всё синтезируется в браузере. */
function tone(f, d, t0, type, vol){
  var a = ac();
  if (!a || a.state !== 'running') return;
  try {
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine';
    o.frequency.value = f; o.connect(g); g.connect(a.destination);
    var t = a.currentTime + (t0 || 0);
    var peak = Math.max(0.001, 0.2 * (vol === undefined ? sndVol() : vol));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.start(t); o.stop(t + d + 0.05);
  } catch (e) {}
}
var SND_SETS = {
  soft:   {name:'Мягкий',   type:'sine',     msg:[[880,.15,0],[1175,.22,.12]], send:[[700,.08,0]], join:[[660,.12,0],[880,.16,.1]], leave:[[880,.12,0],[660,.16,.1]], ring:[[660,.28,0],[520,.28,.34]]},
  bell:   {name:'Колокольчик', type:'triangle', msg:[[1320,.25,0],[1760,.35,.1]], send:[[1100,.1,0]], join:[[988,.14,0],[1318,.2,.12]], leave:[[1318,.14,0],[988,.2,.12]], ring:[[1046,.3,0],[1318,.3,.15],[1568,.4,.3]]},
  bubble: {name:'Пузырь',   type:'sine',     msg:[[500,.07,0],[900,.12,.07]], send:[[400,.06,0],[700,.08,.05]], join:[[400,.08,0],[600,.08,.08],[900,.12,.16]], leave:[[900,.08,0],[600,.08,.08],[400,.12,.16]], ring:[[500,.1,0],[700,.1,.14],[900,.1,.28],[700,.1,.6],[900,.1,.74],[1100,.14,.88]]},
  retro:  {name:'Ретро',    type:'square',   msg:[[740,.08,0],[988,.08,.09],[1318,.12,.18]], send:[[520,.06,0]], join:[[523,.08,0],[659,.08,.08],[784,.12,.16]], leave:[[784,.08,0],[659,.08,.08],[523,.12,.16]], ring:[[880,.12,0],[880,.12,.2],[698,.2,.5]]},
  calm:   {name:'Тихий',    type:'sine',     msg:[[523,.35,0]], send:[[392,.15,0]], join:[[392,.2,0],[523,.25,.15]], leave:[[523,.2,0],[392,.25,.15]], ring:[[392,.5,0],[330,.6,.55]]}
};
function sndSet(){ return SND_SETS[ls.get('vech_snd_set')] || SND_SETS.soft; }
function sndVol(){ var v = parseFloat(ls.get('vech_snd_vol')); return isNaN(v) ? 0.8 : Math.min(1, Math.max(0, v)); }
function soundOn(){ return ls.get('vech_sound') !== '0'; }
function sndCustom(kind){ var v = ls.get('vech_snd_c_' + kind); return v && v.indexOf('data:audio') === 0 ? v : ''; }
function playCustom(src){
  try { var a = new Audio(src); a.volume = sndVol(); var p = a.play(); if (p && p.catch) p.catch(function(){}); return a; } catch (e) { return null; }
}
function playSnd(kind, force){
  if (!force && !soundOn()) return;
  if (kind === 'msg' || kind === 'ring') { var c = sndCustom(kind); if (c) { playCustom(c); return; } }
  var set = sndSet();
  (set[kind] || []).forEach(function(n){ tone(n[0], n[1], n[2], set.type); });
}
function ding(){ playSnd('msg'); }
function startRing(){
  if (S.ringT) return;
  var ring = function(){ playSnd('ring'); };
  ring();
  S.ringT = setInterval(ring, sndCustom('ring') ? 3500 : 2000);
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
    h('p',{class:'hint',text:'Без push уведомления и звук работают, только пока Вече открыто во вкладке (можно в фоне).'}));
}


/* ---------- внешний вид: тема, цвет, обои, анимации ---------- */
var ACCENTS = {
  blue:   {name:'Синий',    l:['#2748D8','#E3E9FF'], d:['#7B93FF','#1F2A4D'], bo:['#2748D8','#3A5AE8']},
  green:  {name:'Зелёный',  l:['#1B8656','#DDF3E8'], d:['#4CC68A','#16352A'], bo:['#1B8656','#23995F']},
  violet: {name:'Фиолетовый', l:['#6D3FD1','#EBE3FB'], d:['#A78BFA','#2A2147'], bo:['#6D3FD1','#7C4FE0']},
  rose:   {name:'Розовый',  l:['#C2185B','#FBE1EC'], d:['#F472A8','#3D1A2C'], bo:['#C2185B','#D42A6E']},
  orange: {name:'Оранжевый', l:['#C2570C','#FCE8D6'], d:['#F59E55','#3A2410'], bo:['#C2570C','#D9661A']},
  teal:   {name:'Бирюзовый', l:['#0F7C8A','#D9F2F5'], d:['#44C2D1','#12343A'], bo:['#0F7C8A','#178E9D']}
};
var WALLS = {
  none:   {name:'Без обоев', css:'none'},
  dawn:   {name:'Рассвет',  css:'linear-gradient(160deg,#FDE2C8,#F9B7C9 55%,#B9A6F2)'},
  ocean:  {name:'Океан',    css:'linear-gradient(160deg,#BEE6F5,#7DB4EA 55%,#4F6FD8)'},
  forest: {name:'Лес',      css:'linear-gradient(160deg,#D3EBC9,#7CC49A 55%,#2E8B6F)'},
  night:  {name:'Ночь',     css:'linear-gradient(160deg,#2B2F5B,#1A1D3E 55%,#0B0D22)'},
  dots:   {name:'Точки',    css:'radial-gradient(circle at 1px 1px,rgba(120,130,150,.35) 1.2px,transparent 1.4px)', size:'18px 18px'},
  waves:  {name:'Волны',    css:'repeating-linear-gradient(135deg,rgba(120,130,150,.14) 0 2px,transparent 2px 16px)', size:'auto'}
};
function isDarkNow(){
  var t = ls.get('vech_theme');
  if (t === 'dark') return true;
  if (t === 'light') return false;
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}
function applyAppearance(){
  var r = document.documentElement, t = ls.get('vech_theme');
  if (t === 'dark' || t === 'light') r.setAttribute('data-theme', t); else r.removeAttribute('data-theme');
  var dark = isDarkNow();
  var a = ACCENTS[ls.get('vech_accent')];
  ['--accent','--accent-soft','--bubble-out'].forEach(function(k){ r.style.removeProperty(k); });
  if (a && ls.get('vech_accent') !== 'blue') {
    var c = dark ? a.d : a.l;
    r.style.setProperty('--accent', c[0]); r.style.setProperty('--accent-soft', c[1]);
    r.style.setProperty('--bubble-out', a.bo[dark ? 1 : 0]);
    if (dark) r.style.setProperty('--accent-ink', '#0B1020'); else r.style.setProperty('--accent-ink', '#FFFFFF');
  } else r.style.removeProperty('--accent-ink');
  var w = ls.get('vech_wall') || 'none', css = 'none', size = 'cover';
  if (w === 'custom') { var cu = ls.get('vech_wall_img'); if (cu) css = 'url("' + cu + '")'; }
  else if (WALLS[w]) { css = WALLS[w].css; size = WALLS[w].size || 'cover'; }
  r.style.setProperty('--wall', css); r.style.setProperty('--wall-size', size);
  var dim = parseFloat(ls.get('vech_wall_dim')); r.style.setProperty('--wall-dim', String(isNaN(dim) ? 0 : dim));
  S.animOn = ls.get('vech_anim') !== '0';
  r.classList.toggle('noanim', !S.animOn);
  var m = document.querySelector('meta[name=theme-color]');
  if (m) m.setAttribute('content', dark ? '#161D26' : (a ? a.l[0] : '#2748D8'));
}
try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyAppearance); } catch (e) {}
function shrinkImage(file, max){
  return new Promise(function(res, rej){
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function(){
      var k = Math.min(1, max / Math.max(img.width, img.height));
      var c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = function(){ URL.revokeObjectURL(url); rej(new UErr('Не удалось открыть картинку.')); };
    img.src = url;
  });
}
function appearanceSection(){
  var box = h('div',{class:'sect'}, h('h3',{text:'Оформление'}));
  function draw(){
    box.textContent = ''; box.append(h('h3',{text:'Оформление'}));
    var th = ls.get('vech_theme') || 'auto';
    function seg(id, label){ return h('button',{class:'btn sm' + (th === id ? ' primary' : ''),type:'button','data-theme-opt':id,onclick:function(){ if (id === 'auto') ls.del('vech_theme'); else ls.set('vech_theme', id); applyAppearance(); draw(); }}, label); }
    box.append(h('div',{class:'seg'}, seg('auto','Как в системе'), seg('light','Светлая'), seg('dark','Тёмная')));
    var cur = ls.get('vech_accent') || 'blue';
    box.append(h('p',{class:'muted',text:'Цвет'}), h('div',{class:'sw'}, Object.keys(ACCENTS).map(function(k){
      return h('button',{class:'swatch' + (cur === k ? ' on' : ''),type:'button','aria-label':ACCENTS[k].name,title:ACCENTS[k].name,style:'background:' + ACCENTS[k].l[0],'data-accent':k,
        onclick:function(){ ls.set('vech_accent', k); applyAppearance(); draw(); }});
    })));
    var w = ls.get('vech_wall') || 'none';
    var wl = Object.keys(WALLS).map(function(k){
      var bg = WALLS[k].css === 'none' ? 'var(--surface-2)' : WALLS[k].css + (WALLS[k].size ? ' 0 0/' + WALLS[k].size : '');
      return h('button',{class:'wall' + (w === k ? ' on' : ''),type:'button','aria-label':'Обои: ' + WALLS[k].name,title:WALLS[k].name,'data-wall':k,
        style:'background:' + bg + (WALLS[k].css !== 'none' ? ',var(--surface-2)' : ''),onclick:function(){ ls.set('vech_wall', k); applyAppearance(); draw(); }}, k === 'none' ? '—' : '');
    });
    var file = h('input',{type:'file',accept:'image/*',hidden:true,onchange:async function(){
      var f = file.files && file.files[0]; file.value = '';
      if (!f) return;
      try {
        var d = await shrinkImage(f, 1280);
        try { localStorage.setItem('vech_wall_img', d); } catch (e) { toast('Картинка не поместилась в память браузера. Возьмите поменьше.'); return; }
        ls.set('vech_wall', 'custom'); applyAppearance(); draw();
      } catch (e) { toast(explain(e)); }
    }});
    wl.push(h('button',{class:'wall' + (w === 'custom' ? ' on' : ''),type:'button','aria-label':'Своя картинка',title:'Своя картинка',onclick:function(){ file.click(); }}, '＋'));
    var dim = h('input',{type:'range',min:0,max:70,value:Math.round((parseFloat(ls.get('vech_wall_dim')) || 0) * 100),'aria-label':'Затемнение обоев',
      oninput:function(){ ls.set('vech_wall_dim', String(dim.value / 100)); applyAppearance(); }});
    var an = h('input',{type:'checkbox',id:'anim-on',checked:S.animOn !== false,onchange:function(){ ls.set('vech_anim', an.checked ? '1' : '0'); applyAppearance(); }});
    box.append(h('p',{class:'muted',text:'Обои чата'}), h('div',{class:'sw'}, wl, file),
      h('div',{class:'field'}, h('label',{text:'Затемнение обоев'}), dim),
      h('label',{class:'pick','for':'anim-on'}, an, h('span',{class:'grow',text:'Плавные анимации'})));
  }
  draw();
  return box;
}

/* ---------- браузер и установка приложения ---------- */
var deferredInstall = null;
window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); deferredInstall = e; });
window.addEventListener('appinstalled', function(){ deferredInstall = null; toast('Вече установлено'); });
function isStandalone(){ return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
function inAppBrowser(){ return /FBAN|FBAV|Instagram|Telegram|VKAndroidApp|VK\/|Line\/|MicroMessenger|; wv\)|Snapchat|TikTok/i.test(navigator.userAgent); }
function platformName(){
  var u = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(u)) return 'ios';
  if (/Android/.test(u)) return 'android';
  if (/Mac/.test(u) && navigator.maxTouchPoints > 1) return 'ios';
  return 'desktop';
}
function capList(){
  var md = navigator.mediaDevices;
  return [
    ['Звонки и микрофон', !!(md && md.getUserMedia && typeof RTCPeerConnection !== 'undefined')],
    ['Показ экрана', !!(md && md.getDisplayMedia)],
    ['Голосовые и видеосообщения', typeof MediaRecorder !== 'undefined'],
    ['Уведомления', typeof Notification !== 'undefined'],
    ['Push при закрытом сайте', 'serviceWorker' in navigator && typeof PushManager !== 'undefined']
  ];
}
function appSection(){
  var plat = platformName();
  var box = h('div',{class:'sect'}, h('h3',{text:'Приложение и браузер'}));
  if (inAppBrowser()) box.append(h('div',{class:'warnbox',text:'Вы открыли Вече внутри другого приложения. Звонки и запись здесь часто не работают. Откройте ссылку в Chrome, Edge или Firefox (меню ⋮ → «Открыть в браузере»).'}));
  box.append(h('div',{class:'capl'}, capList().map(function(c){ return h('span',{class:c[1] ? 'ok' : 'bad',text:(c[1] ? '✓ ' : '✗ ') + c[0]}); })));
  box.append(h('p',{class:'hint',text:'Лучше всего работает: Chrome и Edge (компьютер и Android), Firefox (компьютер). Safari на iPhone: Вече нужно сначала добавить на экран «Домой», только тогда придут уведомления. Показ экрана есть только на компьютере.'}));
  var st = h('p',{class:'muted'});
  var btn = h('button',{class:'btn primary',type:'button',onclick:async function(){
    if (!deferredInstall) return;
    deferredInstall.prompt();
    try { await deferredInstall.userChoice; } catch (e) {}
    deferredInstall = null; drawI();
  }}, 'Установить Вече как приложение');
  function drawI(){
    if (isStandalone()) { st.textContent = 'Вече уже установлено и открыто как приложение.'; btn.hidden = true; return; }
    if (deferredInstall) { st.textContent = 'Нажмите кнопку: Вече появится в меню «Пуск» или на экране телефона и откроется в своём окне.'; btn.hidden = false; return; }
    btn.hidden = true;
    st.textContent = plat === 'ios' ? 'iPhone/iPad: в Safari нажмите «Поделиться» → «На экран Домой». Откройте Вече оттуда и включите push.'
      : plat === 'android' ? 'Android: в Chrome нажмите ⋮ → «Установить приложение» (или «Добавить на главный экран»).'
      : 'Компьютер: в Chrome или Edge нажмите значок установки справа в адресной строке (или ⋮ → «Установить Вече»).';
  }
  drawI();
  box.append(st, h('div',{class:'row-actions'}, btn),
    h('p',{class:'hint',text:'Звонок, когда сайт закрыт, приходит как push-уведомление: нажмите на него, и Вече откроется на экране звонка. Для этого включите push в разделе «Уведомления». Настоящего приложения из магазина тут нет, это установка прямо из браузера.'}));
  return box;
}

function soundSection(){
  var cb = h('input',{type:'checkbox',id:'snd-on',checked:soundOn(),onchange:function(){ ls.set('vech_sound', cb.checked ? '1' : '0'); if (cb.checked) playSnd('msg', true); }});
  var sel = h('select',{id:'snd-set','aria-label':'Набор звуков',onchange:function(){ ls.set('vech_snd_set', sel.value); playSnd('msg', true); }},
    Object.keys(SND_SETS).map(function(k){ return h('option',{value:k,selected:(ls.get('vech_snd_set') || 'soft') === k}, SND_SETS[k].name); }));
  var vol = h('input',{type:'range',id:'snd-vol',min:0,max:100,value:Math.round(sndVol() * 100),'aria-label':'Громкость',
    oninput:function(){ ls.set('vech_snd_vol', String(vol.value / 100)); },
    onchange:function(){ playSnd('msg', true); }});
  function prev(kind, label){ return h('button',{class:'btn sm',type:'button',onclick:function(){ playSnd(kind, true); }}, label); }
  function customRow(kind, title){
    var st = h('span',{class:'muted',text:sndCustom(kind) ? 'свой файл' : 'из набора'});
    var file = h('input',{type:'file',accept:'audio/*',hidden:true,onchange:function(){
      var f = file.files && file.files[0]; file.value = '';
      if (!f) return;
      if (f.size > 350 * 1024) { toast('Файл слишком большой. Нужен звук до 350 КБ (короткий).'); return; }
      var r = new FileReader();
      r.onload = function(){
        if (String(r.result).indexOf('data:audio') !== 0) { toast('Это не звуковой файл.'); return; }
        try { localStorage.setItem('vech_snd_c_' + kind, r.result); } catch (e) { toast('Не удалось сохранить звук (мало места).'); return; }
        st.textContent = 'свой файл'; playSnd(kind, true);
      };
      r.readAsDataURL(f);
    }});
    return h('div',{class:'snd-row'}, h('span',{class:'grow',text:title}), st,
      h('button',{class:'btn sm',type:'button',onclick:function(){ file.click(); }}, 'Загрузить'),
      h('button',{class:'btn sm',type:'button',onclick:function(){ try { localStorage.removeItem('vech_snd_c_' + kind); } catch (e) {} st.textContent = 'из набора'; }}, 'Сбросить'),
      file);
  }
  return h('div',{class:'sect'}, h('h3',{text:'Звуки'}),
    h('label',{class:'pick','for':'snd-on'}, cb, h('span',{class:'grow',text:'Звук сообщений и звонков'})),
    h('div',{class:'field'}, h('label',{'for':'snd-set',text:'Набор звуков'}), sel),
    h('div',{class:'field'}, h('label',{'for':'snd-vol',text:'Громкость'}), vol),
    h('div',{class:'row-actions'}, prev('msg','Сообщение'), prev('send','Отправка'), prev('ring','Звонок'), prev('join','Вход'), prev('leave','Выход')),
    customRow('msg','Свой звук сообщения'), customRow('ring','Своя мелодия звонка'),
    h('p',{class:'hint',text:'Свой звук хранится только на этом устройстве. Подойдёт короткий mp3 или wav до 350 КБ.'}));
}

/* ---------- сеанс ---------- */
function stopSession(){
  S.subs.forEach(function(u){ try { u(); } catch(e){} });
  S.subs = [];
  if (S.msgUnsub) { S.msgUnsub(); S.msgUnsub = null; }
  if (S.peerUnsub) { S.peerUnsub(); S.peerUnsub = null; }
  clearTimeout(S.syncT); clearInterval(S.onlineT); clearInterval(S.beatT); clearInterval(S.gcTimer);
  leaveGroupCall(true);
  S.gcDocs = {}; S.gcDeclined = {}; S.gcRing = null;
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
  var ref = fdb.doc('presence/' + S.me.uid);
  ref.set({t:FV().serverTimestamp()}).then(function(){ return ref.get(); }).then(function(sn){
    /* сверяем часы с сервером: порядок сообщений не должен зависеть от часов на телефоне или ПК */
    var v = sn && sn.exists ? tsMs(sn.data().t) : 0;
    if (v) S.clockOff = v - Date.now();
  }).catch(function(){});
}
function nowSrv(){ return Date.now() + (S.clockOff || 0); }
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
    syncPeerWatch();
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
    syncPeerWatch();
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

  /* Групповые звонки: видим только звонки групп, где мы участники. Свежесть проверяем на устройстве. */
  S.subs.push(fdb.collection('groupCalls').where('members','array-contains',uid).onSnapshot(function(s){
    var m = {};
    s.docs.forEach(function(d){ m[d.id] = Object.assign({id:d.id}, d.data()); });
    S.gcDocs = m;
    gcCheck();
  }, function(){}));
  clearInterval(S.gcTimer);
  S.gcTimer = setInterval(gcCheck, 8000);

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
/* Первый экран: код доступа. Верный код знает только база (правила), на сайте его нет. */
function showGate(){
  setView('gate');
  var err = h('p',{class:'form-err',role:'alert'});
  var inp = h('input',{id:'gate-code',type:'password',inputmode:'numeric',autocomplete:'off',maxlength:'32',placeholder:'Код'});
  var go = h('button',{class:'btn primary wide',type:'submit'},'Продолжить');
  var form = h('form',{class:'card',novalidate:true,onsubmit:async function(e){
    e.preventDefault();
    err.textContent = '';
    var code = inp.value.trim();
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(code)) { err.textContent = 'Неверный код.'; return; }
    go.disabled = true; go.textContent = 'Проверяем…';
    try {
      await fdb.doc('gate/' + code).get();
      S.gateCode = code; ls.set('vech_gate', code);
      showAuth();
    } catch (ex) {
      err.textContent = (ex && ex.code === 'permission-denied') ? 'Неверный код.' : explain(ex);
      go.disabled = false; go.textContent = 'Продолжить';
    }
  }},
    h('p',{class:'brand',text:'Вече'}),
    h('p',{class:'lead',text:'Вход только по коду. Его вам дал тот, кто пригласил вас сюда.'}),
    field('Код доступа', inp), err, go);
  root.append(h('div',{class:'center'}, form));
  inp.focus();
}
function showAuth(){
  if (!S.gateCode) S.gateCode = ls.get('vech_gate') || '';
  if (!S.gateCode) { showGate(); return; }
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
      if (!S.gateCode) { showGate(); toast(explain(ex)); return; }
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
  el.micBtn = h('button',{class:'icon-btn',type:'button','aria-label':'Голосовое сообщение',title:'Голосовое сообщение',onclick:function(){ startRec('voice'); }}, ic('mic'));
  el.vidBtn = h('button',{class:'icon-btn',type:'button','aria-label':'Видеосообщение',title:'Видеосообщение (кружок)',onclick:function(){ startRec('video'); }}, ic('video'));
  el.composer = h('div',{class:'composer'}, el.panelBtn, el.input, el.micBtn, el.vidBtn, sendBtn);
  el.replyBar = h('div',{class:'editbar replybar',hidden:true});
  el.recBar = h('div',{class:'recbar',hidden:true});
  el.panel = h('div',{class:'panel',hidden:true});
  el.editBar = h('div',{class:'editbar',hidden:true}, h('span',{text:'Редактирование сообщения'}), h('button',{class:'btn sm',type:'button',onclick:cancelEdit},'Отмена'));
  el.blockBar = h('div',{class:'blockbar',hidden:true});
  el.gcBar = h('div',{class:'cbanner',hidden:true});
  el.main = h('div',{class:'chat-main',hidden:true}, el.chatHead, el.gcBar, el.msgs, el.blockBar, el.editBar, el.replyBar, el.recBar, el.panel, el.composer);
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
  if (!c || c.type !== 'dm' || S.peerHidden) return;
  var p = otherUid(c);
  var on = Date.now() - S.peerSeen < 200000;
  if (on !== S.online.has(p)) {
    S.online = on ? new Set([p]) : new Set();
    renderChatHead(); renderList();
  }
}
/* Если человек поменял приватность, подписку на его «в сети» нужно включить или выключить. */
function syncPeerWatch(){
  var c = curChat();
  if (!c || c.type !== 'dm' || !S.me) return;
  var hidden = !canSeeProfile(otherUid(c));
  if (hidden !== !!S.peerHidden) watchPeer(c);
}
function watchPeer(c){
  if (S.peerUnsub) { S.peerUnsub(); S.peerUnsub = null; }
  S.online = new Set(); S.peerSeen = 0; S.peerHidden = false;
  if (!c || c.type !== 'dm') return;
  var p = otherUid(c);
  /* Человек скрыл статус: не подписываемся на «в сети». */
  if (!canSeeProfile(p)) { S.peerHidden = true; return; }
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
  S.active = id; S.draft = draft || null; S.msgs = []; S.msgsReady = false; S.forceBottom = true; S.seen = null;
  S.selMsg = null; S.delArm = null; S.editing = null; S.el.editBar.hidden = true;
  cancelRec(); setReply(null);
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
  cancelRec(); setReply(null);
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
  var sub = dm ? (S.peerHidden ? 'статус скрыт' : (on ? 'в сети' : (S.peerSeen ? 'был(а) в сети ' + listTime(S.peerSeen) : 'не в сети'))) : (c.members.length + ' ' + plural(c.members.length, ['участник','участника','участников']));
  [
    h('button',{class:'icon-btn back',type:'button','aria-label':'К списку чатов',onclick:closeChat}, ic('back')),
    h('button',{class:'chat-who',type:'button',onclick:openInfo},
      avatarFor(c),
      h('span',{class:'chat-t'}, h('span',{class:'chat-name',text:chatTitle(c)}), h('span',{class:'chat-sub' + (on ? ' on' : ''),text:sub}))),
    dm && !blockState(c) ? iconBtn('phone','Позвонить',startCall) : null,
    !dm && S.chats[c.id] ? iconBtn('phone','Групповой звонок',function(){ startGroupCall(c.id); }) : null,
    iconBtn('info','О чате',openInfo)
  ].forEach(function(n){ if (n) H.append(n); });
  applyBlockBar(c);
  renderGcBanner(c);
}
function sysText(m){
  var a = nm(m.actor), t = nm(m.target);
  if (m.ev === 'created') return a + ' создал(а) группу';
  if (m.ev === 'added') return a + ' добавил(а) ' + t;
  if (m.ev === 'left') return a + ' вышел(а) из группы';
  if (m.ev === 'renamed') return a + ' переименовал(а) группу: «' + (m.name || '') + '»';
  if (m.ev === 'gcall') return a + ' начал(а) групповой звонок';
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
      var isNew = S.seen && !S.seen[m.id];
      if (S.seen) S.seen[m.id] = 1;
      var fresh = isNew && S.msgsReady && S.animOn !== false ? ' enter' : '';
      var node;
      if (m.kind === 'sticker') {
        node = h('div',{class:'sticker-msg' + (mine ? ' mine' : '') + (first ? ' first' : '') + fresh,onclick:function(){ selectMsg(m.id); }},
          who, h('span',{class:'stk',text:m.text}), timeEl);
      } else if (m.kind === 'video') {
        node = h('div',{class:'vid-msg' + (mine ? ' mine' : '') + (first ? ' first' : '') + fresh}, who, videoBubble(m), timeEl);
        node.addEventListener('click', function(e){ if (e.target === node) selectMsg(m.id); });
      } else {
        node = h('div',{class:'msg' + (mine ? ' mine' : '') + (first ? ' first' : '') + (sel ? ' sel' : '') + fresh,onclick:function(){ selectMsg(m.id); }});
        if (who) node.append(who);
        if (m.reply) node.append(h('div',{class:'quote'}, h('b',{text:nm(m.reply.from)}), h('span',{text:m.reply.text})));
        if (m.kind === 'voice') node.append(voiceBubble(m)); else node.append(h('span',{text:m.text}));
        node.append(timeEl);
      }
      E.append(node);
      var rx = reactChips(m, mine);
      if (rx) E.append(rx);
      if (sel) {
        var canDel = mine || (c && c.type === 'group' && c.owner === S.me.uid);
        var acts = h('div',{class:'macts' + (mine ? ' mine' : '')});
        var quick = h('div',{class:'quick' + (mine ? ' mine' : '')}, REACT_SET.map(function(e){
          return h('button',{class:'qbtn' + ((m.reacts || {})[S.me.uid] === e ? ' on' : ''),type:'button','aria-label':'Реакция ' + e,onclick:function(ev){ ev.stopPropagation(); toggleReact(m, e); }}, e);
        }));
        E.append(quick);
        acts.append(h('button',{class:'btn sm',type:'button',onclick:function(){ setReply(m); }}, ic('reply'), 'Ответить'));
        if (mine && m.kind !== 'sticker' && m.kind !== 'voice' && m.kind !== 'video') acts.append(h('button',{class:'btn sm',type:'button',onclick:function(){ startEdit(m); }}, ic('edit'), 'Изменить'));
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
  if (S.msgsReady && !S.seen) { S.seen = {}; S.msgs.forEach(function(m){ S.seen[m.id] = 1; }); }
}
function lastOf(m){
  if (m.kind === 'sys') return {from:m.actor, text:sysText(m).slice(0,120), ts:m.ts, kind:'sys'};
  if (m.kind === 'sticker') return {from:m.from, text:'Стикер ' + m.text, ts:m.ts};
  if (m.kind === 'voice') return {from:m.from, text:'Голосовое сообщение', ts:m.ts};
  if (m.kind === 'video') return {from:m.from, text:'Видеосообщение', ts:m.ts};
  return {from:m.from, text:String(m.text || '').slice(0,120), ts:m.ts};
}
async function deleteMsg(m){
  var id = S.active, c = curChat();
  await fdb.doc('chats/' + id + '/messages/' + m.id).delete();
  if (m.mid) fdb.doc('chats/' + id + '/media/' + m.mid).delete().catch(function(){});
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


/* ---------- ответы и реакции ---------- */
var REACT_SET = ['👍','❤️','😂','😮','😢','🔥'];
function setReply(m){
  var bar = S.el && S.el.replyBar;
  if (!m) { S.reply = null; if (bar) bar.hidden = true; return; }
  var t = m.kind === 'voice' ? 'Голосовое сообщение' : m.kind === 'video' ? 'Видеосообщение' : m.kind === 'sticker' ? 'Стикер ' + m.text : String(m.text || '');
  S.reply = {id:m.id, from:m.from, text:t.slice(0, 80)};
  S.selMsg = null; S.delArm = null;
  bar.textContent = '';
  bar.append(ic('reply'), h('span',{class:'grow ell',text:'Ответ для ' + nm(m.from) + ': ' + S.reply.text}),
    h('button',{class:'btn sm',type:'button',onclick:function(){ setReply(null); }}, 'Отмена'));
  bar.hidden = false;
  renderMsgs();
  S.el.input.focus();
}
async function toggleReact(m, emoji){
  var id = S.active;
  var cur = (m.reacts || {})[S.me.uid];
  var patch = {}; patch['reacts.' + S.me.uid] = cur === emoji ? '' : emoji;
  S.selMsg = null;
  try { await fdb.doc('chats/' + id + '/messages/' + m.id).update(patch); }
  catch (e) { toast(explain(e)); }
}
function reactChips(m, mine){
  var r = m.reacts; if (!r) return null;
  var by = {};
  Object.keys(r).forEach(function(u){ if (r[u]) (by[r[u]] = by[r[u]] || []).push(u); });
  var keys = Object.keys(by);
  if (!keys.length) return null;
  return h('div',{class:'reacts' + (mine ? ' mine' : '')}, keys.map(function(e){
    var mineR = by[e].indexOf(S.me.uid) >= 0;
    return h('button',{class:'rchip' + (mineR ? ' on' : ''),type:'button','aria-label':e + ' ' + by[e].length,title:by[e].map(nm).join(', '),onclick:function(){ toggleReact(m, e); }}, e + (by[e].length > 1 ? ' ' + by[e].length : ''));
  }));
}

/* ---------- голосовые и видеосообщения ---------- */
/* Файлы хранятся в базе (Storage у Firebase платный), поэтому они короткие и сжатые. */
var REC_MAX = {voice:180, video:20};          /* секунд */
var REC_BYTES = 700 * 1024;                    /* предел документа Firestore ~1 МБ с запасом */
var mediaCache = {};
function recMime(kind){
  if (typeof MediaRecorder === 'undefined') return null;
  var list = kind === 'video'
    ? ['video/webm;codecs=vp8,opus','video/webm','video/mp4']
    : ['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus'];
  for (var i = 0; i < list.length; i++) { try { if (MediaRecorder.isTypeSupported(list[i])) return list[i]; } catch (e) {} }
  return '';
}
function blobToB64(blob){
  return new Promise(function(res, rej){
    var r = new FileReader();
    r.onload = function(){ res(String(r.result).split(',')[1] || ''); };
    r.onerror = function(){ rej(new Error('read')); };
    r.readAsDataURL(blob);
  });
}
function b64ToBlob(b64, mime){
  var bin = atob(b64), n = bin.length, u = new Uint8Array(n);
  for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
  return new Blob([u], {type:mime});
}
async function startRec(kind){
  if (S.rec || !S.active) return;
  var c = curChat(); if (!c) return;
  var bs = blockState(c);
  if (bs) { toast(blockMsg(bs)); return; }
  if (S.call || S.gcall) { toast('Во время звонка записать нельзя: занят микрофон.'); return; }
  var mime = recMime(kind);
  if (mime === null || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('Этот браузер не умеет записывать. Попробуйте Chrome, Edge или Firefox.'); return; }
  var rec = {kind:kind, chunks:[], t0:0, chat:S.active};
  S.rec = rec;
  try {
    rec.stream = await navigator.mediaDevices.getUserMedia(kind === 'video'
      ? {audio:{echoCancellation:true, noiseSuppression:true}, video:{facingMode:'user', width:{ideal:320}, height:{ideal:320}, frameRate:{ideal:20, max:24}}}
      : {audio:{echoCancellation:true, noiseSuppression:true}});
  } catch (e) {
    S.rec = null;
    toast(kind === 'video' ? 'Нужен доступ к камере и микрофону.' : micError(e));
    return;
  }
  if (S.rec !== rec) { rec.stream.getTracks().forEach(function(t){ t.stop(); }); return; }
  try {
    var opts = kind === 'video' ? {videoBitsPerSecond:200000, audioBitsPerSecond:32000} : {audioBitsPerSecond:24000};
    if (mime) opts.mimeType = mime;
    rec.mr = new MediaRecorder(rec.stream, opts);
  } catch (e) { cancelRec(); toast('Не удалось начать запись.'); return; }
  rec.mime = (rec.mr.mimeType || mime || (kind === 'video' ? 'video/webm' : 'audio/webm')).split(';')[0];
  rec.mr.ondataavailable = function(ev){ if (ev.data && ev.data.size) rec.chunks.push(ev.data); };
  rec.mr.start(500);
  rec.t0 = Date.now();
  drawRec();
  rec.tick = setInterval(function(){
    var s = (Date.now() - rec.t0) / 1000;
    if (rec.timeEl) rec.timeEl.textContent = fmtDur(s * 1000) + ' / ' + fmtDur(REC_MAX[kind] * 1000);
    if (s >= REC_MAX[kind]) finishRec(true);
  }, 250);
}
function drawRec(){
  var rec = S.rec, bar = S.el.recBar;
  bar.textContent = '';
  if (!rec) { bar.hidden = true; S.el.composer.hidden = false; return; }
  S.el.composer.hidden = true;
  rec.timeEl = h('span',{class:'rec-t',text:'00:00 / ' + fmtDur(REC_MAX[rec.kind] * 1000)});
  var items = [];
  if (rec.kind === 'video') {
    var v = h('video',{class:'rec-v',muted:true,playsinline:true,autoplay:true});
    v.muted = true; v.srcObject = rec.stream;
    var pp = v.play(); if (pp && pp.catch) pp.catch(function(){});
    rec.preview = v;
    items.push(h('div',{class:'rec-circle'}, v));
  }
  items.push(h('div',{class:'rec-row'},
    h('i',{class:'rec-dot','aria-hidden':'true'}), rec.timeEl, h('span',{class:'grow'}),
    h('button',{class:'btn sm',type:'button',onclick:cancelRec}, 'Отмена'),
    h('button',{class:'btn sm primary',type:'button','aria-label':'Отправить запись',onclick:function(){ finishRec(false); }}, ic('send'), 'Отправить')));
  bar.append.apply(bar, items);
  bar.hidden = false;
}
function stopRecStream(rec){
  clearInterval(rec.tick);
  try { rec.stream.getTracks().forEach(function(t){ t.stop(); }); } catch (e) {}
}
function cancelRec(){
  var rec = S.rec;
  if (!rec) return;
  S.rec = null;
  try { if (rec.mr && rec.mr.state !== 'inactive') { rec.mr.ondataavailable = null; rec.mr.stop(); } } catch (e) {}
  if (rec.stream) stopRecStream(rec);
  if (S.el && S.el.recBar) drawRec();
}
function grabPoster(blobUrl){
  /* маленькая картинка-обложка для кружка */
  return new Promise(function(res){
    var v = document.createElement('video'); v.muted = true; v.playsInline = true; v.src = blobUrl;
    var done = false;
    function fin(x){ if (!done) { done = true; res(x); } }
    setTimeout(function(){ fin(''); }, 2500);
    v.onloadeddata = function(){ try { v.currentTime = 0.1; } catch (e) { fin(''); } };
    v.onseeked = function(){
      try {
        var c = document.createElement('canvas'); c.width = 72; c.height = 72;
        var g = c.getContext('2d'), w = v.videoWidth || 72, hh = v.videoHeight || 72, sz = Math.min(w, hh);
        g.drawImage(v, (w - sz) / 2, (hh - sz) / 2, sz, sz, 0, 0, 72, 72);
        fin(c.toDataURL('image/jpeg', 0.5));
      } catch (e) { fin(''); }
    };
    v.onerror = function(){ fin(''); };
  });
}
async function finishRec(auto){
  var rec = S.rec;
  if (!rec || rec.sending) return;
  rec.sending = true;
  var dur = Math.round((Date.now() - rec.t0) / 1000);
  await new Promise(function(res){
    rec.mr.onstop = res;
    try { rec.mr.requestData(); } catch (e) {}
    try { rec.mr.stop(); } catch (e) { res(); }
  });
  stopRecStream(rec);
  S.rec = null; drawRec();
  if (dur < 1) { toast('Запись слишком короткая.'); return; }
  var blob = new Blob(rec.chunks, {type:rec.mime});
  if (blob.size > REC_BYTES) { toast('Запись получилась слишком тяжёлой. Запишите покороче.'); return; }
  var id = rec.chat, c = S.chats[id];
  if (!c) return;
  try {
    var data = await blobToB64(blob);
    var poster = rec.kind === 'video' ? await grabPoster(URL.createObjectURL(blob)) : '';
    var mid = 'm' + Date.now().toString(36) + randHex(3);
    await fdb.doc('chats/' + id + '/media/' + mid).set({from:S.me.uid, mime:rec.mime, data:data, size:blob.size, ts:Date.now()});
    var pl = {kind:rec.kind, from:S.me.uid, dur:dur, mid:mid, mime:rec.mime};
    if (poster) pl.poster = poster;
    if (S.reply && S.active === id) pl.reply = S.reply;
    S.forceBottom = true; setReply(null);
    await postMsg(id, c, pl, rec.kind === 'voice' ? 'Голосовое сообщение' : 'Видеосообщение');
    playSnd('send');
    if (auto) toast('Достигнут предел записи, сообщение отправлено.');
  } catch (e) { toast(explain(e)); }
}
async function loadMedia(m){
  var key = m.mid;
  if (mediaCache[key]) return mediaCache[key];
  var chat = S.active;
  var snap = await fdb.doc('chats/' + chat + '/media/' + m.mid).get();
  if (!snap.exists) throw new UErr('Файл удалён или недоступен.');
  var d = snap.data();
  var url = URL.createObjectURL(b64ToBlob(d.data, d.mime || m.mime));
  mediaCache[key] = url;
  return url;
}
function voiceBubble(m){
  var btn = h('button',{class:'vplay',type:'button','aria-label':'Воспроизвести'}, ic('play'));
  var bar = h('i',{class:'vbar-fill'});
  var track = h('span',{class:'vbar'}, bar);
  var lab = h('span',{class:'vdur',text:fmtDur((m.dur || 0) * 1000)});
  var audio = null;
  function setIcon(p){ btn.textContent = ''; btn.append(ic(p ? 'pause' : 'play')); btn.setAttribute('aria-label', p ? 'Пауза' : 'Воспроизвести'); }
  btn.addEventListener('click', async function(e){
    e.stopPropagation();
    try {
      if (!audio) {
        btn.disabled = true;
        var url = await loadMedia(m);
        audio = new Audio(url);
        audio.ontimeupdate = function(){
          var d = audio.duration && isFinite(audio.duration) ? audio.duration : (m.dur || 1);
          bar.style.width = Math.min(100, audio.currentTime / d * 100) + '%';
          lab.textContent = fmtDur(audio.currentTime * 1000);
        };
        audio.onended = function(){ setIcon(false); bar.style.width = '0'; lab.textContent = fmtDur((m.dur || 0) * 1000); };
        audio.onpause = function(){ setIcon(false); };
        audio.onplay = function(){ setIcon(true); };
        btn.disabled = false;
      }
      if (audio.paused) { var p = audio.play(); if (p && p.catch) p.catch(function(){ toast('Не удалось воспроизвести.'); }); } else audio.pause();
    } catch (ex) { btn.disabled = false; toast(explain(ex)); }
  });
  return h('div',{class:'voice'}, btn, track, lab);
}
function videoBubble(m){
  var wrap = h('div',{class:'vcircle',role:'button',tabindex:'0','aria-label':'Видеосообщение, ' + fmtDur((m.dur || 0) * 1000)});
  var poster = m.poster ? h('img',{src:m.poster,alt:''}) : null;
  var ov = h('span',{class:'vov'}, ic('play'), h('span',{class:'vdur',text:fmtDur((m.dur || 0) * 1000)}));
  var vid = null;
  if (poster) wrap.append(poster);
  wrap.append(ov);
  async function toggle(e){
    if (e) { e.stopPropagation(); if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return; if (e.type === 'keydown') e.preventDefault(); }
    try {
      if (!vid) {
        wrap.classList.add('loading');
        var url = await loadMedia(m);
        vid = h('video',{playsinline:true,preload:'auto'});
        vid.src = url;
        vid.onended = function(){ wrap.classList.remove('playing'); };
        vid.onpause = function(){ wrap.classList.remove('playing'); };
        vid.onplay = function(){ wrap.classList.add('playing'); };
        wrap.insertBefore(vid, wrap.firstChild);
        wrap.classList.remove('loading');
      }
      if (vid.paused) { var p = vid.play(); if (p && p.catch) p.catch(function(){ toast('Не удалось воспроизвести.'); }); } else vid.pause();
    } catch (ex) { wrap.classList.remove('loading'); toast(explain(ex)); }
  }
  wrap.addEventListener('click', toggle);
  wrap.addEventListener('keydown', toggle);
  return wrap;
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
  /* время по серверу, и строго позже всего, что мы уже видели в этом чате: моё сообщение всегда встаёт после чужого, которое я прочитал */
  var known = (S.chats[chatId] && S.chats[chatId].last ? S.chats[chatId].last.ts || 0 : 0);
  if (S.active === chatId && S.msgs.length) known = Math.max(known, S.msgs[S.msgs.length - 1].ts || 0);
  var ts = Math.max(nowSrv(), known + 1);
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
      body: payload.kind === 'sticker' ? 'Стикер ' + payload.text : payload.kind === 'voice' ? 'Голосовое сообщение' : payload.kind === 'video' ? 'Видеосообщение' : String(payload.text || '').slice(0, 140)
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
    var pl = {from:S.me.uid, text:text};
    if (S.reply) pl.reply = S.reply;
    setReply(null);
    await postMsg(id, c, pl, text);
    playSnd('send');
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
  try { var ms = await fdb.collection('chats/' + id + '/media').get(); docs = docs.concat(ms.docs); } catch (e) {}
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

function pvField(id, label, key, hint){
  var cur = pvOf(S.me.uid, key);
  var s = h('select',{id:id}, PV.map(function(o){ return h('option',{value:o[0],selected:o[0] === cur,text:o[1]}); }));
  s.addEventListener('change', async function(){
    var patch = {}; patch[key] = s.value;
    try { await fdb.doc('users/' + S.me.uid).update(patch); toast('Сохранено'); }
    catch (e) { toast(explain(e)); s.value = pvOf(S.me.uid, key); }
  });
  return field(label, s, hint);
}
function privacySection(){
  return h('div',{class:'sect'}, h('h3',{text:'Приватность'}),
    pvField('pv-profile', 'Кто видит моё фото и «в сети»', 'pvProfile', 'Имя @' + S.me.username + ' видно всегда: иначе вас не найдут.'),
    pvField('pv-invite', 'Кто может звать меня в группы', 'pvInvite', '«Только те, кто мне писал» значит: у нас уже есть личная переписка.'),
    h('p',{class:'hint',text:'Это настройки сайта: обычные пользователи их соблюдают. Не храните здесь то, что нельзя показывать.'}));
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
      privacySection(),
      notifSection(),
      soundSection(),
      appearanceSection(),
      appSection(),
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
        var ok = canInvite(id);
        if (!ok) delete sel[id];
        var cb = h('input',{type:'checkbox',id:'pk-' + id,checked:!!sel[id],disabled:!ok,onchange:function(){ if (cb.checked) sel[id] = 1; else delete sel[id]; upd(); }});
        listEl.append(h('label',{class:'pick' + (ok ? '' : ' off'),'for':'pk-' + id}, cb, avatar(u.username, id, 32), h('span',{class:'grow',text:'@' + u.username}), ok ? null : h('span',{class:'tag',text:'не принимает приглашения'})));
      });
    }
    async function doCreate(){
      err.textContent = ''; create.disabled = true;
      try {
        var name = nameIn.value.trim();
        var gid = 'g_' + randHex(6);
        var ts = Date.now();
        var who = Object.keys(sel).filter(canInvite);
        if (!who.length) { err.textContent = 'Выберите хотя бы одного человека, который принимает приглашения.'; create.disabled = false; return; }
        var chat = {id:gid, type:'group', name:name, owner:S.me.uid, members:[S.me.uid].concat(who), createdAt:ts, updatedAt:ts};
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
      h('div',{class:'profile'}, avatar(u ? u.username : '?', peer, 64, on), h('div',{class:'profile-t'}, h('strong',{text:nm(peer)}), h('span',{class:'muted',text:S.peerHidden ? 'статус скрыт' : (on ? 'в сети' : 'не в сети')}))),
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
        var okInv = canInvite(u);
        var btn = h('button',{class:'btn sm',type:'button',disabled:!okInv,onclick:async function(){
          if (!canInvite(u)) { toast(nm(u) + ' не принимает приглашения в группы.'); return; }
          btn.disabled = true;
          try {
            var cc = S.chats[id];
            await fdb.doc('chats/' + id).update({members:cc.members.concat([u])});
            await postMsg(id, cc, {kind:'sys', ev:'added', actor:S.me.uid, target:u}, nm(S.me.uid) + ' добавил(а) ' + nm(u));
          } catch (e) { toast(explain(e)); btn.disabled = false; }
        }}, 'Добавить');
        addEl.append(h('div',{class:'pick static'}, avatar(S.users[u].username, u, 32), h('span',{class:'grow',text:'@' + S.users[u].username}), okInv ? null : h('span',{class:'tag',text:'не принимает приглашения'}), btn));
      });
    }
    m.refresh = draw;
    var isOwner = c0.owner === S.me.uid;
    b.append(
      h('p',{class:'muted',text:'Создатель группы: ' + nm(c0.owner)}),
      h('button',{class:'btn primary wide',type:'button',onclick:function(){ closeModal(); startGroupCall(id); }}, ic('phone'), 'Групповой звонок'),
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
var CALL_KICK = 300000; /* 5 минут без связи — отключаем */
function makePc(call){
  var pc = new RTCPeerConnection({iceServers:ICE});
  call.pending = []; call.myIce = [];
  pc.onicecandidate = function(e){
    if (!e.candidate) return;
    fdb.collection('calls/' + call.id + '/ice').add({from:S.me.uid, cand:JSON.stringify(e.candidate.toJSON())})
      .then(function(r){ call.myIce.push(r); }).catch(function(){});
  };
  pc.ontrack = function(e){
    if (e.track.kind === 'video') { call.vstream = new MediaStream([e.track]); if (S.call === call) renderCall(); return; }
    if (!call.audio) { call.audio = new Audio(); call.audio.autoplay = true; }
    call.audio.srcObject = (e.streams && e.streams[0]) || new MediaStream([e.track]);
    var p = call.audio.play(); if (p && p.catch) p.catch(function(){});
  };
  pc.onconnectionstatechange = function(){
    if (S.call !== call) return;
    var st = pc.connectionState;
    if (st === 'connected' && !call.connected) {
      call.connected = true; call.startedAt = Date.now(); renderCall();
      clearTimeout(call.dropT);
    } else if (st === 'failed' && !call.connected) {
      toast('Не удалось соединиться. Возможно, нужен TURN-сервер (см. README).');
      hangUp();
    } else if (st === 'failed' || st === 'disconnected') {
      /* связь пропала: ждём до 5 минут (при «failed» — 30 секунд), потом отключаем */
      clearTimeout(call.dropT);
      call.lostAt = Date.now(); renderCall();
      call.dropT = setTimeout(function(){
        if (S.call === call && pc.connectionState !== 'connected') finishCall('lost5');
      }, st === 'failed' ? 30000 : CALL_KICK);
    }
    if (st === 'connected' && call.lostAt) { call.lostAt = 0; renderCall(); }
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
  if (S.gcall) { toast('Сначала выйдите из группового звонка.'); return; }
  var bs = blockState(c);
  if (bs) { toast(bs === 'in' ? 'Вы заблокированы. Позвонить этому человеку нельзя.' : 'Вы заблокировали этого человека. Разблокируйте, чтобы позвонить.'); return; }
  var peer = otherUid(c);
  if (!S.online.has(peer) && !PUSH && !S.peerHidden) { toast(nm(peer) + ' сейчас не в сети. Позвонить можно, когда человек открыл Вече.'); return; }
  var call = {id:'c' + randHex(8), peer:peer, role:'out', status:'ringing', unsubs:[], pending:[], myIce:[]};
  S.call = call;
  renderCall();
  try {
    call.stream = await getMic();
    call.pc = makePc(call);
    call.stream.getTracks().forEach(function(t){ call.pc.addTrack(t, call.stream); });
    /* Место под показ экрана: договариваемся о видео заранее, потом просто подставляем картинку. */
    call.vt = call.pc.addTransceiver('video', {direction:'sendrecv'});
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
  if (S.call || S.gcall) {
    if (!S.call || S.call.id !== id) fdb.doc('calls/' + id).update({status:'busy'}).catch(function(){});
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
  var sh = !!d['shr_' + call.peer];
  if (sh !== !!call.peerSharing) { call.peerSharing = sh; renderCall(); }
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
    call.pc.getTransceivers().forEach(function(t){
      if (t.receiver && t.receiver.track && t.receiver.track.kind === 'video') { try { t.direction = 'sendrecv'; } catch (e) {} call.vt = t; }
    });
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
    try { if (c.screen) c.screen.getTracks().forEach(function(t){ t.stop(); }); } catch (e) {}
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
  if (reason === 'lost5') toast('Нет связи 5 минут — звонок завершён.');
  if (c.role !== 'out' || !S.me) return;
  var t = null;
  if (wasActive && connected) t = 'Звонок · ' + fmtDur(dur);
  else if (wasActive) t = 'Звонок не соединился';
  if (reason === 'lost5' && connected) t = 'Звонок · ' + fmtDur(dur) + ' (связь потеряна)';
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
  var gring = !c && !S.gcall && !!S.gcRing;
  if (ringing || gring) startRing(); else stopRing();
  if (!c) { clearInterval(S.tickT); S.tickT = null; renderGroupUi(host); return; }
  var u = S.users[c.peer];
  var text = ringing ? 'Входящий звонок' : (c.status === 'ringing' ? 'Вызываем…' : (c.connected ? (c.lostAt ? 'Нет связи… ждём' : fmtDur(Date.now() - c.startedAt)) : 'Соединяем…'));
  var status = h('p',{class:'call-status',text:text});
  clearInterval(S.tickT);
  if (c.connected) {
    S.timeEl = status;
    S.tickT = setInterval(function(){ if (S.timeEl && S.call && S.call.startedAt && !S.call.lostAt) S.timeEl.textContent = fmtDur(Date.now() - S.call.startedAt); }, 1000);
  }
  var btns = ringing
    ? [h('button',{class:'cbtn no',type:'button','aria-label':'Отклонить',onclick:hangUp}, ic('phone')),
       h('button',{class:'cbtn ok',type:'button','aria-label':'Принять',onclick:acceptCall}, ic('phone'))]
    : [c.stream ? h('button',{class:'cbtn mute',type:'button','aria-label':c.muted ? 'Включить микрофон' : 'Выключить микрофон',onclick:toggleMute}, ic(c.muted ? 'micoff' : 'mic')) : null,
       (c.vt && c.status === 'active' && canShare()) ? h('button',{class:'cbtn share' + (c.sharing ? ' on' : ''),type:'button','aria-label':c.sharing ? 'Остановить показ экрана' : 'Показать экран',title:c.sharing ? 'Остановить показ экрана' : 'Показать экран',onclick:toggleShare}, ic('screen')) : null,
       h('button',{class:'cbtn no',type:'button','aria-label':'Завершить звонок',onclick:hangUp}, ic('phone'))];
  var shot = null;
  if (c.peerSharing && c.vstream) shot = shotBox(c.vstream, 'Экран: ' + nm(c.peer));
  host.append(h('div',{class:'call',role:'alertdialog','aria-label':'Звонок'},
    h('div',{class:'call-card' + (c.status === 'ringing' ? ' ring' : '') + (shot ? ' wide' : '')},
      shot,
      avatar(u ? u.username : '?', c.peer, shot ? 56 : 96),
      h('p',{class:'call-name',text:nm(c.peer)}),
      status,
      c.sharing ? h('p',{class:'call-note',text:'Вы показываете свой экран.'}) : null,
      h('div',{class:'call-btns'}, btns),
      h('p',{class:'call-note',text:'Голосовой звонок через интернет. Браузер попросит доступ к микрофону.'}))));
}

/* ---------- показ экрана ---------- */
function canShare(){ return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia); }
async function getScreen(){
  if (!canShare()) throw new UErr('Показ экрана работает в Chrome, Edge и Firefox на компьютере. В этом браузере его нет.');
  return navigator.mediaDevices.getDisplayMedia({video:true, audio:false});
}
function shareErr(e){
  if (e && e.user) return e.message;
  if (e && (e.name === 'NotAllowedError' || e.name === 'AbortError')) return 'Показ экрана отменён.';
  return 'Не удалось показать экран.';
}
function shotBox(stream, label){
  var v = h('video',{autoplay:true,playsinline:true,title:'Двойной щелчок: на весь экран'});
  v.muted = true; v.srcObject = stream;
  v.addEventListener('dblclick', function(){ try { if (v.requestFullscreen) v.requestFullscreen(); } catch (e) {} });
  var p = v.play(); if (p && p.catch) p.catch(function(){});
  return h('div',{class:'shotbox'}, v, h('span',{class:'shotlabel',text:label}));
}
async function toggleShare(){
  var c = S.call;
  if (!c || !c.vt) return;
  if (c.sharing) { stopShare1(c); return; }
  try {
    var s = await getScreen();
    if (S.call !== c) { s.getTracks().forEach(function(t){ t.stop(); }); return; }
    var t = s.getVideoTracks()[0];
    await c.vt.sender.replaceTrack(t);
    c.screen = s; c.sharing = true;
    t.onended = function(){ if (S.call === c && c.sharing) stopShare1(c); };
    var patch = {}; patch['shr_' + S.me.uid] = true;
    fdb.doc('calls/' + c.id).update(patch).catch(function(){});
    renderCall();
  } catch (e) { toast(shareErr(e)); }
}
function stopShare1(c){
  c.sharing = false;
  try { if (c.screen) c.screen.getTracks().forEach(function(t){ t.stop(); }); } catch (e) {}
  c.screen = null;
  try { if (c.vt) c.vt.sender.replaceTrack(null).catch(function(){}); } catch (e) {}
  var patch = {}; patch['shr_' + S.me.uid] = false;
  fdb.doc('calls/' + c.id).update(patch).catch(function(){});
  if (S.call === c) renderCall();
}

/* ---------- групповые звонки (сетка «каждый с каждым», до 8 человек) ---------- */
var GC_MAX = 8;
var GC_KICK = 300000;  /* 5 минут без сигнала — убираем из звонка */
var GC_STALE = 50000;  /* дольше этого — показываем «нет связи» */
function gcFresh(d){ return !!d && !d.ended && Date.now() - (d.beat || d.createdAt || 0) < 75000; }
function gcLive(chatId){
  var best = null;
  Object.keys(S.gcDocs).forEach(function(id){
    var d = S.gcDocs[id];
    if (d.chat === chatId && gcFresh(d) && (!best || d.createdAt > best.createdAt)) best = d;
  });
  return best;
}
function gcName(d){ var c = S.chats[d.chat]; return c ? chatTitle(c) : 'группа'; }
function gcIOffer(myJ, me, hisJ, his){ return myJ > hisJ || (myJ === hisJ && me > his); }
function gcPart(g, uid){ return 'groupCalls/' + g.id + '/parts/' + uid; }
function gcSigPath(g, sid){ return 'groupCalls/' + g.id + '/sig/' + sid; }
function gcIceCol(g, sid){ return gcSigPath(g, sid) + '/ice'; }

/* Раз в несколько секунд и при каждом изменении: кто-то начал звонок? Звонок ещё идёт? */
function gcCheck(){
  if (!S.me) return;
  var ring = null;
  if (!S.call && !S.gcall) {
    Object.keys(S.gcDocs).forEach(function(id){
      var d = S.gcDocs[id];
      if (!gcFresh(d) || d.host === S.me.uid || S.gcDeclined[id]) return;
      if (Date.now() - (d.createdAt || 0) > 60000) return;
      if (!ring || d.createdAt > ring.createdAt) ring = d;
    });
  }
  var prev = S.gcRing ? S.gcRing.id : '';
  S.gcRing = ring;
  if ((ring ? ring.id : '') !== prev) {
    renderCall();
    if (ring) sysNotify('Групповой звонок', nm(ring.host) + ' звонит в «' + gcName(ring) + '»', ring.chat);
  }
  var c = curChat();
  if (c && c.type !== 'dm') renderGcBanner(c);
  gcSweep();
}
/* Кик: свою неактивность и чужую проверяем раз в 8 секунд. */
function gcSweep(){
  var g = S.gcall;
  if (!g || !g.joinedAt) return;
  var now = Date.now();
  if (g.offSince && now - g.offSince > GC_KICK) { gcKicked(g, 'Вы были без сети 5 минут — вас отключили от звонка.'); return; }
  var changed = false;
  Object.keys(g.parts).forEach(function(uid){
    if (uid === S.me.uid) return;
    var age = now - (g.parts[uid].ts || 0);
    if (age > GC_KICK) { fdb.doc(gcPart(g, uid)).delete().catch(function(){}); delete g.parts[uid]; gcDropPeer(g, uid); changed = true; }
    else if ((age > GC_STALE) !== !!g.parts[uid]._stale) { g.parts[uid]._stale = age > GC_STALE; changed = true; }
  });
  if (changed) renderCall();
}
function gcKicked(g, msg){
  if (S.gcall !== g) return;
  leaveGroupCall(false);
  toast(msg || 'Вас отключили от звонка.');
}
function gcNetOff(){ var g = S.gcall; if (g && !g.offSince) g.offSince = Date.now(); }
function gcNetOn(){
  var g = S.gcall; if (!g) return;
  var was = g.offSince; g.offSince = 0;
  if (was && Date.now() - was > GC_KICK) { gcKicked(g, 'Вы были без сети 5 минут — вас отключили от звонка.'); return; }
  fdb.doc(gcPart(g, S.me.uid)).update({ts:Date.now()}).catch(function(e){ if (e && e.code === 'not-found') gcKicked(g, 'Вас отключили от звонка.'); });
}
function renderGcBanner(c){
  var bar = S.el && S.el.gcBar;
  if (!bar) return;
  bar.textContent = '';
  var live = c && c.type !== 'dm' ? gcLive(c.id) : null;
  if (!live || S.gcall) { bar.hidden = true; return; }
  bar.hidden = false;
  bar.append(ic('phone'), h('span',{text:'Идёт групповой звонок'}),
    h('button',{class:'btn sm primary',type:'button',onclick:function(){ joinGroupCall(live.id); }}, 'Присоединиться'));
}

async function startGroupCall(chatId){
  var c = S.chats[chatId];
  if (!c || c.type === 'dm') return;
  if (S.call || S.gcall) { toast('Сначала завершите текущий звонок.'); return; }
  var live = gcLive(chatId);
  if (live) { joinGroupCall(live.id); return; }
  var id = 'gc' + randHex(8), ts = Date.now();
  try {
    await fdb.doc('groupCalls/' + id).set({chat:chatId, host:S.me.uid, members:c.members.slice(), createdAt:ts, beat:ts, ended:false});
  } catch (e) { toast(explain(e)); return; }
  S.gcDocs[id] = {id:id, chat:chatId, host:S.me.uid, members:c.members.slice(), createdAt:ts, beat:ts, ended:false};
  postMsg(chatId, c, {kind:'sys', ev:'gcall', actor:S.me.uid}, nm(S.me.uid) + ' начал(а) групповой звонок').catch(function(){});
  pushNotify(c.members.filter(function(u){ return u !== S.me.uid; }), {kind:'call', chat:chatId, callId:id, title:'Групповой звонок', body:nm(S.me.uid) + ' звонит в «' + chatTitle(c) + '»'});
  joinGroupCall(id);
}

async function joinGroupCall(id){
  if (S.call || S.gcall) return;
  var d = S.gcDocs[id];
  if (!d || !gcFresh(d)) { toast('Этот звонок уже закончился.'); return; }
  var g = {id:id, chat:d.chat, peers:{}, parts:{}, unsubs:[], muted:false, sharing:false, screen:null, startedAt:0, joinedAt:0};
  S.gcall = g; S.gcRing = null; S.gcDeclined[id] = 1;
  renderCall();
  try { g.stream = await getMic(); }
  catch (e) { if (S.gcall === g) { S.gcall = null; renderCall(); } toast(micError(e) === 'Не удалось включить микрофон.' ? explain(e) : micError(e)); return; }
  if (S.gcall !== g) { g.stream.getTracks().forEach(function(t){ t.stop(); }); return; }
  try {
    var existing = await fdb.collection('groupCalls/' + id + '/parts').get();
    var now = Date.now(), n = 0;
    existing.docs.forEach(function(x){ if (now - (x.data().ts || 0) < GC_KICK && x.id !== S.me.uid) n++; });
    if (n >= GC_MAX - 1) throw new UErr('В звонке уже ' + GC_MAX + ' человек. Больше нельзя.');
    g.joinedAt = Date.now();
    await fdb.doc(gcPart(g, S.me.uid)).set({ts:g.joinedAt, joinedAt:g.joinedAt, sharing:false, muted:false});
  } catch (e) {
    if (S.gcall === g) { g.stream.getTracks().forEach(function(t){ t.stop(); }); S.gcall = null; renderCall(); }
    toast(explain(e));
    return;
  }
  if (S.gcall !== g) { fdb.doc(gcPart(g, S.me.uid)).delete().catch(function(){}); return; }
  g.startedAt = Date.now();
  g.unsubs.push(fdb.collection('groupCalls/' + id + '/parts').onSnapshot(function(s){ gcOnParts(g, s); }, function(){}));
  g.unsubs.push(fdb.collection('groupCalls/' + id + '/sig').where('to','==',S.me.uid).onSnapshot(function(s){ gcOnSigIn(g, s); }, function(){}));
  g.unsubs.push(fdb.collection('groupCalls/' + id + '/sig').where('from','==',S.me.uid).onSnapshot(function(s){ gcOnSigOut(g, s); }, function(){}));
  g.beatT = setInterval(function(){
    var t = Date.now();
    fdb.doc('groupCalls/' + id).update({beat:t}).catch(function(){});
    if (g.offSince || navigator.onLine === false) { gcNetOff(); return; }
    fdb.doc(gcPart(g, S.me.uid)).update({ts:t}).catch(function(e){ if (e && e.code === 'not-found') gcKicked(g, 'Вас отключили от звонка.'); });
  }, 25000);
  window.addEventListener('offline', gcNetOff); window.addEventListener('online', gcNetOn);
  renderCall();
}

function gcOnParts(g, snap){
  if (S.gcall !== g) return;
  var now = Date.now(), parts = {};
  snap.docs.forEach(function(x){
    var d = x.data();
    if (x.id === S.me.uid || now - (d.ts || 0) < GC_KICK) parts[x.id] = d;
  });
  var before = g.parts || {};
  g.parts = parts;
  if (g.joinedSeen) {
    Object.keys(parts).forEach(function(u){ if (u !== S.me.uid && !before[u]) playSnd('join'); });
    Object.keys(before).forEach(function(u){ if (u !== S.me.uid && !parts[u]) playSnd('leave'); });
  } else if (parts[S.me.uid]) g.joinedSeen = true;
  Object.keys(parts).forEach(function(uid){
    if (uid === S.me.uid) return;
    var p = parts[uid], peer = g.peers[uid];
    if (peer && peer.joinedAt !== undefined && peer.joinedAt !== p.joinedAt) { gcDropPeer(g, uid); peer = null; }
    if (!peer) {
      peer = gcMakePeer(g, uid);
      peer.joinedAt = p.joinedAt;
      peer.iOffer = gcIOffer(g.joinedAt, S.me.uid, p.joinedAt || 0, uid);
      if (peer.iOffer) gcOffer(g, peer);
    } else if (peer.joinedAt === undefined) peer.joinedAt = p.joinedAt;
  });
  Object.keys(g.peers).forEach(function(uid){ if (!parts[uid]) gcDropPeer(g, uid); });
  renderCall();
}

function gcMakePeer(g, uid){
  var pc = new RTCPeerConnection({iceServers:ICE});
  var peer = {uid:uid, pc:pc, pending:[], sid:null, connected:false, unsubs:[], myIce:[], iOffer:false};
  g.peers[uid] = peer;
  g.stream.getTracks().forEach(function(t){ pc.addTrack(t, g.stream); });
  pc.ontrack = function(e){
    if (e.track.kind === 'video') { peer.vstream = new MediaStream([e.track]); if (S.gcall === g) renderCall(); return; }
    if (!peer.audio) { peer.audio = new Audio(); peer.audio.autoplay = true; }
    peer.audio.srcObject = (e.streams && e.streams[0]) || new MediaStream([e.track]);
    var pr = peer.audio.play(); if (pr && pr.catch) pr.catch(function(){});
  };
  pc.onicecandidate = function(e){
    if (!e.candidate || !peer.sid) return;
    fdb.collection(gcIceCol(g, peer.sid)).add({from:S.me.uid, cand:JSON.stringify(e.candidate.toJSON())})
      .then(function(r){ peer.myIce.push(r); }).catch(function(){});
  };
  pc.onconnectionstatechange = function(){
    if (S.gcall !== g || g.peers[uid] !== peer) return;
    var st = pc.connectionState;
    peer.connected = (st === 'connected');
    if (st === 'failed') toast('Не удалось соединиться с ' + nm(uid) + '. Возможно, нужен TURN-сервер (см. README).');
    renderCall();
  };
  return peer;
}
function gcAttachShare(g, peer){
  if (!g.sharing || !g.screen || !peer.vt) return;
  var t = g.screen.getVideoTracks()[0];
  if (t) peer.vt.sender.replaceTrack(t).catch(function(){});
}
async function gcOffer(g, peer){
  try {
    peer.vt = peer.pc.addTransceiver('video', {direction:'sendrecv'});
    gcAttachShare(g, peer);
    var sid = 's' + randHex(6);
    peer.sid = sid; peer.offJ = g.joinedAt;
    var offer = await peer.pc.createOffer();
    await fdb.doc(gcSigPath(g, sid)).set({from:S.me.uid, to:peer.uid, sid:sid, offJ:g.joinedAt,
      ansJ:(g.parts[peer.uid] || {}).joinedAt || 0, offer:{type:offer.type, sdp:offer.sdp}, ts:Date.now()});
    await peer.pc.setLocalDescription(offer);
    peer.unsubs.push(gcListenIce(g, peer));
  } catch (e) { if (S.gcall === g) toast('Не удалось начать соединение с ' + nm(peer.uid) + '.'); }
}
function gcOnSigIn(g, snap){
  if (S.gcall !== g) return;
  snap.docChanges().forEach(function(ch){
    if (ch.type === 'removed') return;
    var d = ch.doc.data();
    if (!d.offer || d.ansJ !== g.joinedAt) return;
    var peer = g.peers[d.from];
    if (peer && peer.sid && peer.sid !== d.sid) {
      if ((d.offJ || 0) > (peer.offJ || 0)) { gcDropPeer(g, d.from); peer = null; } else return;
    }
    if (peer && peer.sid === d.sid) return;
    if (!peer) peer = gcMakePeer(g, d.from);
    peer.sid = d.sid; peer.offJ = d.offJ; peer.iOffer = false;
    gcAnswer(g, peer, d);
  });
}
async function gcAnswer(g, peer, d){
  try {
    await peer.pc.setRemoteDescription(d.offer);
    peer.pc.getTransceivers().forEach(function(t){
      if (t.receiver && t.receiver.track && t.receiver.track.kind === 'video') { try { t.direction = 'sendrecv'; } catch (e) {} peer.vt = t; }
    });
    gcAttachShare(g, peer);
    peer.unsubs.push(gcListenIce(g, peer));
    gcFlushIce(peer);
    var ans = await peer.pc.createAnswer();
    await peer.pc.setLocalDescription(ans);
    await fdb.doc(gcSigPath(g, peer.sid)).update({answer:{type:ans.type, sdp:ans.sdp}});
  } catch (e) { if (S.gcall === g) toast('Не удалось соединиться с ' + nm(peer.uid) + '.'); }
}
function gcOnSigOut(g, snap){
  if (S.gcall !== g) return;
  snap.docChanges().forEach(function(ch){
    if (ch.type === 'removed') return;
    var d = ch.doc.data();
    var peer = g.peers[d.to];
    if (!peer || peer.sid !== d.sid || !d.answer || peer.gotAnswer) return;
    peer.gotAnswer = true;
    peer.pc.setRemoteDescription(d.answer).then(function(){ gcFlushIce(peer); }).catch(function(){});
  });
}
function gcApplyIce(peer, cand){
  if (peer.pc.remoteDescription) peer.pc.addIceCandidate(cand).catch(function(){});
  else peer.pending.push(cand);
}
function gcFlushIce(peer){
  var p = peer.pending; peer.pending = [];
  p.forEach(function(c){ peer.pc.addIceCandidate(c).catch(function(){}); });
}
function gcListenIce(g, peer){
  return fdb.collection(gcIceCol(g, peer.sid)).onSnapshot(function(s){
    s.docChanges().forEach(function(ch){
      if (ch.type !== 'added') return;
      var d = ch.doc.data();
      if (d.from === S.me.uid) return;
      try { gcApplyIce(peer, JSON.parse(d.cand)); } catch (e) {}
    });
  }, function(){});
}
function gcDropPeer(g, uid){
  var p = g.peers[uid];
  if (!p) return;
  delete g.peers[uid];
  p.unsubs.forEach(function(u){ try { u(); } catch (e) {} });
  try { p.pc.close(); } catch (e) {}
  try { if (p.audio) { p.audio.pause(); p.audio.srcObject = null; } } catch (e) {}
  p.myIce.forEach(function(r){ r.delete().catch(function(){}); });
  if (p.sid && p.iOffer) fdb.doc(gcSigPath(g, p.sid)).delete().catch(function(){});
}
function leaveGroupCall(silent){
  var g = S.gcall;
  if (!g) return;
  S.gcall = null;
  clearInterval(g.beatT);
  window.removeEventListener('offline', gcNetOff); window.removeEventListener('online', gcNetOn);
  g.unsubs.forEach(function(u){ try { u(); } catch (e) {} });
  var others = Object.keys(g.parts).filter(function(u){ return u !== S.me.uid; }).length;
  Object.keys(g.peers).forEach(function(uid){ gcDropPeer(g, uid); });
  try { if (g.stream) g.stream.getTracks().forEach(function(t){ t.stop(); }); } catch (e) {}
  try { if (g.screen) g.screen.getTracks().forEach(function(t){ t.stop(); }); } catch (e) {}
  if (S.me && g.joinedAt) {
    fdb.doc(gcPart(g, S.me.uid)).delete().catch(function(){});
    if (!others) {
      fdb.doc('groupCalls/' + g.id).update({ended:true}).catch(function(){});
      setTimeout(function(){ fdb.doc('groupCalls/' + g.id).delete().catch(function(){}); }, 4000);
    }
  }
  if (S.gcDocs[g.id] && !others) S.gcDocs[g.id].ended = true;
  clearInterval(S.tickT); S.tickT = null; S.timeEl = null;
  if (!silent) { renderCall(); var c = curChat(); if (c) renderGcBanner(c); }
}
function toggleGroupMute(){
  var g = S.gcall;
  if (!g || !g.stream) return;
  g.muted = !g.muted;
  g.stream.getAudioTracks().forEach(function(t){ t.enabled = !g.muted; });
  fdb.doc(gcPart(g, S.me.uid)).update({muted:g.muted}).catch(function(){});
  renderCall();
}
async function toggleGroupShare(){
  var g = S.gcall;
  if (!g) return;
  if (g.sharing) { gcStopShare(g); return; }
  try {
    var s = await getScreen();
    if (S.gcall !== g) { s.getTracks().forEach(function(t){ t.stop(); }); return; }
    var t = s.getVideoTracks()[0];
    g.screen = s; g.sharing = true;
    t.onended = function(){ if (S.gcall === g && g.sharing) gcStopShare(g); };
    Object.keys(g.peers).forEach(function(uid){ gcAttachShare(g, g.peers[uid]); });
    fdb.doc(gcPart(g, S.me.uid)).update({sharing:true}).catch(function(){});
    renderCall();
  } catch (e) { toast(shareErr(e)); }
}
function gcStopShare(g){
  g.sharing = false;
  try { if (g.screen) g.screen.getTracks().forEach(function(t){ t.stop(); }); } catch (e) {}
  g.screen = null;
  Object.keys(g.peers).forEach(function(uid){ var p = g.peers[uid]; if (p.vt) p.vt.sender.replaceTrack(null).catch(function(){}); });
  fdb.doc(gcPart(g, S.me.uid)).update({sharing:false}).catch(function(){});
  if (S.gcall === g) renderCall();
}

function renderGroupUi(host){
  var g = S.gcall;
  if (g) return drawGroupCall(host, g);
  var r = S.gcRing;
  if (!r) return;
  host.append(h('div',{class:'call',role:'alertdialog','aria-label':'Групповой звонок'},
    h('div',{class:'call-card ring'},
      avatar(gcName(r), r.chat, 96, false, true),
      h('p',{class:'call-name',text:gcName(r)}),
      h('p',{class:'call-status',text:'Групповой звонок · ' + nm(r.host)}),
      h('div',{class:'call-btns'},
        h('button',{class:'cbtn no',type:'button','aria-label':'Отклонить',onclick:function(){ S.gcDeclined[r.id] = 1; gcCheck(); }}, ic('phone')),
        h('button',{class:'cbtn ok',type:'button','aria-label':'Принять',onclick:function(){ joinGroupCall(r.id); }}, ic('phone'))))));
}
function drawGroupCall(host, g){
  var c = S.chats[g.chat];
  var shots = [];
  Object.keys(g.parts).sort().forEach(function(uid){
    var p = g.parts[uid], peer = g.peers[uid];
    if (uid !== S.me.uid && p.sharing && peer && peer.vstream) shots.push(h('div',{class:'gtile share'}, shotBox(peer.vstream, 'Экран: ' + nm(uid))));
  });
  var tiles = h('div',{class:'gtiles'}, shots);
  var ids = Object.keys(g.parts);
  if (ids.indexOf(S.me.uid) < 0) ids.unshift(S.me.uid);
  ids.sort().forEach(function(uid){
    var p = g.parts[uid] || {}, peer = g.peers[uid], me = uid === S.me.uid;
    var st = me ? (g.muted ? 'вы · микрофон выключен' : 'вы') : (p.muted ? 'микрофон выключен' : (p._stale ? 'нет связи…' : (peer && peer.connected ? 'на связи' : 'соединяем…')));
    if (p.sharing) st += ' · показывает экран';
    tiles.append(h('div',{class:'gtile'}, avatar(S.users[uid] ? S.users[uid].username : '?', uid, 56),
      h('span',{class:'nm',text:nm(uid)}), h('span',{class:'st',text:st})));
  });
  var time = h('p',{class:'gcall-sub',text:'Соединяем…'});
  var anyConn = Object.keys(g.peers).some(function(u){ return g.peers[u].connected; });
  clearInterval(S.tickT); S.timeEl = null;
  var n = ids.length;
  if (anyConn || n > 1) {
    var upd = function(){ time.textContent = n + ' ' + plural(n, ['участник','участника','участников']) + (S.gcall && S.gcall.startedAt ? ' · ' + fmtDur(Date.now() - S.gcall.startedAt) : ''); };
    upd();
    S.tickT = setInterval(function(){ if (S.gcall) { n = Object.keys(S.gcall.parts).length || n; upd(); } }, 1000);
  } else time.textContent = 'Ждём остальных…';
  host.append(h('div',{class:'call wide',role:'alertdialog','aria-label':'Групповой звонок'},
    h('div',{class:'gcall'},
      h('div',{class:'gcall-top'}, h('p',{class:'gcall-title',text:c ? chatTitle(c) : 'Групповой звонок'}), time),
      tiles,
      h('div',{class:'gbar'},
        g.stream ? h('button',{class:'cbtn mute',type:'button','aria-label':g.muted ? 'Включить микрофон' : 'Выключить микрофон',onclick:toggleGroupMute}, ic(g.muted ? 'micoff' : 'mic')) : null,
        (g.stream && canShare()) ? h('button',{class:'cbtn share' + (g.sharing ? ' on' : ''),type:'button','aria-label':g.sharing ? 'Остановить показ экрана' : 'Показать экран',title:g.sharing ? 'Остановить показ экрана' : 'Показать экран',onclick:toggleGroupShare}, ic('screen')) : null,
        h('button',{class:'cbtn no',type:'button','aria-label':'Выйти из звонка',onclick:function(){ leaveGroupCall(); }}, ic('phone'))))));
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
applyAppearance();
window.__vech = {S:S, kick:function(a,b){ GC_KICK = a; GC_STALE = b; }};
boot();
if (inAppBrowser()) setTimeout(function(){ toast("Вы внутри другого приложения. Звонки лучше открыть в Chrome или Edge."); }, 1500);
})();
