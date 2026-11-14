/*
  Настройки сайта. Вставьте сюда ключи из Firebase (шаг 3 в README.md).
  Это не секретные пароли: они нужны браузеру, чтобы подключиться к вашему проекту.
  Защищают данные правила из файла firestore.rules.
*/
window.VECH_CONFIG = {
  firebase: {
    apiKey: "ВСТАВЬТЕ_apiKey",
    authDomain: "ВСТАВЬТЕ-project.firebaseapp.com",
    projectId: "ВСТАВЬТЕ-project",
    storageBucket: "ВСТАВЬТЕ-project.appspot.com",
    messagingSenderId: "ВСТАВЬТЕ",
    appId: "ВСТАВЬТЕ"
  },

  /*
    Адрес сервера push-уведомлений (README, шаг 6). Пока не настроили, оставьте пустым:
    сайт будет работать, но уведомления и звонки придут только когда сайт открыт.
    Пример: "https://vech-push.ВАШ-ЛОГИН.workers.dev"
  */
  pushWorker: "",

  /*
    Серверы для голосовых звонков. По умолчанию только бесплатные STUN:
    этого хватает, когда оба человека на домашнем интернете или Wi-Fi.
    Если звонок «не соединяется» (часто на мобильном интернете),
    нужен TURN-сервер. Пример, как его добавить (см. README, раздел «Звонки»):
      { urls: "turn:адрес:3478", username: "логин", credential: "пароль" }
  */
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:global.stun.twilio.com:3478" }
  ]
};
