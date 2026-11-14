/* Служебный скрипт Вече: получает push, показывает уведомления, открывает нужный чат. */

function idb(){
  return new Promise(function(res, rej){
    var r = indexedDB.open('vech', 1);
    r.onupgradeneeded = function(){ r.result.createObjectStore('kv'); };
    r.onsuccess = function(){ res(r.result); };
    r.onerror = function(){ rej(r.error); };
  });
}
function idbGet(k){
  return idb().then(function(db){ return new Promise(function(res){
    var q = db.transaction('kv').objectStore('kv').get(k);
    q.onsuccess = function(){ res(q.result); }; q.onerror = function(){ res(undefined); };
  }); }).catch(function(){ return undefined; });
}
function idbPut(k, v){
  return idb().then(function(db){ return new Promise(function(res){
    var t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k);
    t.oncomplete = function(){ res(); }; t.onerror = function(){ res(); };
  }); }).catch(function(){});
}

self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function(e){ e.waitUntil(onPush()); });

async function onPush(){
  var cfg = await idbGet('cfg');
  var items = [];
  if (cfg && cfg.worker && cfg.key) {
    try {
      var r = await fetch(cfg.worker + '/pull?k=' + encodeURIComponent(cfg.key) + '&after=' + (cfg.after || 0));
      var j = await r.json();
      items = (j && j.items) || [];
    } catch (err) {}
  }
  if (items.length) {
    cfg.after = Math.max.apply(null, items.map(function(i){ return i.ts || 0; }).concat([cfg.after || 0]));
    await idbPut('cfg', cfg);
  }
  var wins = await self.clients.matchAll({type:'window', includeUncontrolled:true});
  var visible = wins.some(function(w){ return w.visibilityState === 'visible'; });
  if (visible) return; // сайт открыт и виден: он сам покажет плашку
  if (!items.length) items = [{title:'Вече', body:'Новое уведомление', kind:'msg'}];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var call = it.kind === 'call';
    await self.registration.showNotification(it.title || 'Вече', {
      body: it.body || '',
      tag: call ? 'vech-call' : 'vech-' + (it.chat || 'x'),
      renotify: true,
      requireInteraction: call,
      vibrate: call ? [300, 150, 300, 150, 300, 150, 300] : [120],
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      data: {chat: it.chat || null}
    });
  }
}

self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var chat = e.notification.data && e.notification.data.chat;
  e.waitUntil(self.clients.matchAll({type:'window', includeUncontrolled:true}).then(function(list){
    var c = list[0];
    if (c) {
      c.focus();
      if (chat) c.postMessage({type:'open', chat:chat});
      return;
    }
    return self.clients.openWindow('./' + (chat ? '?chat=' + encodeURIComponent(chat) : ''));
  }));
});
