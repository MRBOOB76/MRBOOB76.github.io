/*
  Настройки сайта. Вставьте сюда ключи из Firebase (шаг 3 в README.md).
  Это не секретные пароли: они нужны браузеру, чтобы подключиться к вашему проекту.
  Защищают данные правила из файла firestore.rules.
*/
window.VECH_CONFIG = {
  firebase: {
    apiKey: "AIzaSyC1tdeO16ck2ID77hpWcRhhO6FNSCDfyCo",
    authDomain: "vece-8b434.firebaseapp.com",
    projectId: "vece-8b434",
    storageBucket: "vece-8b434.firebasestorage.app",
    messagingSenderId: "632194275484",
    appId: "1:632194275484:web:a937fd2f2026de6c90b559"
  },

  pushWorker: "",

  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:global.stun.twilio.com:3478" }
  ]
};
