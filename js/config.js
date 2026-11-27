// js/config.js — Утилиты, анимации, переключатели и автономные модули

function checkBrowserCompatibility() {
  var isSupported = true;
  try {
    if (!window.fetch || !window.Promise || !window.localStorage || !document.querySelector) {
      isSupported = false;
    }
  } catch(e) { isSupported = false; }
  if (!isSupported) {
    var banner = document.getElementById('outdated-browser-banner');
    if (banner) banner.style.display = 'block';
  }
}
checkBrowserCompatibility();

function escapeJS(str) {
  if (!str) return '';
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function parseTime(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (val.toMillis) return val.toMillis();
  if (val.seconds) return val.seconds * 1000;
  return Number(val) || 0;
}

function cleanHtml(str) { 
  return str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''; 
}

function formatTime(ts) { 
  var t = parseTime(ts);
  return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); 
}

function formatMinutes(mins) {
  if (!mins) return '0 мин';
  if (mins < 60) return mins + ' мин';
  return Math.floor(mins / 60) + ' ч ' + (mins % 60) + ' мин';
}

function formatDuration(ts) { 
  var t = parseTime(ts);
  return formatMinutes(Math.floor((Date.now() - t) / 60000)); 
}

function formatUntil(ts) {
  var t = parseTime(ts);
  var diff = t - Date.now();
  if (diff <= 0) return 'скоро';
  var mins = Math.ceil(diff / 60000);
  if (mins < 60) return 'через ~' + mins + ' мин';
  return 'через ' + Math.floor(mins / 60) + ' ч ' + (mins % 60) + ' мин';
}

function getPlayersCountSuffix(count) {
  var m10 = count % 10, m100 = count % 100;
  if (m100 >= 11 && m100 <= 19) return 'игроков';
  if (m10 === 1) return 'игрок';
  if (m10 >= 2 && m10 <= 4) return 'игрока';
  return 'игроков';
}

function buildBlockquoteList(list, title) {
  if (!list || list.length === 0) return "";
  var items = [];
  for(var i=0; i<list.length; i++) items.push('• ' + cleanHtml(list[i].name || list[i]));
  return '\n\n<blockquote>👥 <b>' + title + ' (' + list.length + ' ' + getPlayersCountSuffix(list.length) + '):</b>\n' + items.join('\n') + '</blockquote>';
}

function getWindDirection(degrees) {
  if (degrees === undefined || degrees === null) return "";
  var directions = ["С", "СВ", "В", "ЮВ", "Ю", "ЮЗ", "З", "СЗ"];
  return directions[Math.round((degrees % 360) / 45) % 8];
}

window.__TT_DYNAMIC_BADGES = {}; // Глобальное хранилище переходящих титулов

function getCustomBadge(uid) {
  if (!uid) return '';
  var badges = [];
  
  // 1. Статические бейджи (Назначаются навсегда конкретным UID)
  if (uid === 'google_XUE0DYY6WoMfkI3TmG7o2HqPUEm1') badges.push('<span class="platform-badge badge-teacher">Учитель 🎓</span>');
  if (uid === 'tg_750209461') badges.push('<span class="platform-badge badge-temshik">Темщик 🕶️</span>');
  if (uid === 'tg_6126323287') badges.push('<span class="platform-badge badge-hockey">Хоккеист 🏒</span>');
  if (uid === 'google_qW1ZyRnvm4UvEO3tMdQpx5ltcQM2') badges.push('<span class="platform-badge badge-bot">Бот 🤖</span>');
  if (uid === 'tg_5170799634' || uid === 'google_vu6OeCWP8WXqNVUkI1hDPTD13ri1') badges.push('<span class="platform-badge badge-coach">Тренер 📋</span>');

  // 2. Динамические переходящие титулы (Выдаются на лету лидерам рейтинга)
  if (window.__TT_DYNAMIC_BADGES[uid]) {
    badges = badges.concat(window.__TT_DYNAMIC_BADGES[uid]);
  }

  return badges.join(' ');
}

function getPlayerStatusInfo(elo) {
  var e = parseInt(elo, 10) || 1000;
  if (e <= 1000) return { label: "Новичок", icon: "icon-rank-novice", color: "#10b981" };
  if (e <= 1200) return { label: "Ученик", icon: "icon-rank-student", color: "#38bdf8" };
  if (e <= 1400) return { label: "Любитель", icon: "icon-rank-amateur", color: "#818cf8" };
  if (e <= 1600) return { label: "Игрок основы", icon: "icon-rank-base", color: "#22d3ee" };
  if (e <= 1800) return { label: "Третий разряд", icon: "icon-rank-shield", color: "#d97706" };
  if (e <= 2000) return { label: "Второй разряд", icon: "icon-rank-shield", color: "#cbd5e1" };
  if (e <= 2200) return { label: "Первый разряд", icon: "icon-rank-shield", color: "#fbbf24" };
  if (e <= 2400) return { label: "КМС", icon: "icon-rank-master", color: "#a855f7" };
  if (e <= 2600) return { label: "Мастер спорта", icon: "icon-nav-ratings", color: "#fbbf24" };
  if (e <= 2800) return { label: "Элитный игрок", icon: "icon-rank-master", color: "#f59e0b" };
  if (e <= 3000) return { label: "Мастер атаки", icon: "icon-flame", color: "#f43f5e" };
  if (e <= 3200) return { label: "Гроссмейстер", icon: "icon-rank-master", color: "#ec4899" };
  if (e <= 3400) return { label: "Чемпион клуба", icon: "icon-crown", color: "#fbbf24" };
  if (e <= 3600) return { label: "Гранд-мастер", icon: "icon-rank-master", color: "#38bdf8" };
  if (e <= 3800) return { label: "Снайпер", icon: "icon-nav-quests", color: "#f43f5e" };
  if (e <= 4000) return { label: "Легенда клуба", icon: "icon-loc-vostok", color: "#a78bfa" };
  if (e <= 4200) return { label: "Премьер-лига", icon: "icon-rank-base", color: "#10b981" };
  if (e <= 4400) return { label: "Гранд-чемпион", icon: "icon-crown", color: "#f59e0b" };
  if (e <= 4600) return { label: "Властелин стола", icon: "icon-crown", color: "#ec4899" };
  if (e <= 4800) return { label: "Феномен", icon: "icon-flame", color: "#22d3ee" };
  return { label: "Легенда спорта", icon: "icon-crown", color: "#fbbf24" };
}

function getPlayerStatus(elo) {
  return getPlayerStatusInfo(elo).label;
}

window.getPlayerStatusHtml = function(elo) {
  var info = getPlayerStatusInfo(elo);
  var ico = typeof ttIcon === 'function' ? ttIcon(info.icon, 'rank-svg-icon') : '';
  return '<span class="rank-status-inline" style="color:' + info.color + ';">' + ico + '</span><span>' + info.label + '</span>';
};

var confirmActionCallback = null;
function openConfirmModal(msg, action) {
  document.getElementById('confirm-modal-text').innerText = msg;
  confirmActionCallback = action;
  document.getElementById('confirm-modal').style.display = 'flex';
}
function closeConfirmModal() {
  closeModalSmoothly('confirm-modal');
  confirmActionCallback = null;
}
function executeConfirm() {
  if (confirmActionCallback) confirmActionCallback();
  closeConfirmModal();
}

function customAlert(msg) {
  var el = document.getElementById('custom-alert-modal');
  var txt = document.getElementById('custom-alert-text');
  if (txt) txt.innerText = msg;
  if (el) el.style.display = 'flex';
}
function closeCustomAlert() { 
  closeModalSmoothly('custom-alert-modal');
}

function initTheme() {
  var savedTheme = localStorage.getItem('tt_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}
function toggleTheme() {
  var root = document.documentElement;
  var newTheme = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  root.setAttribute('data-theme', newTheme);
  localStorage.setItem('tt_theme', newTheme);
  updateThemeIcon(newTheme);
}
window.ttIcon = function(id, cls) {
  var c = cls ? (' ' + cls) : '';
  return '<svg class="tt-icon' + c + '" aria-hidden="true"><use href="#' + id + '"></use></svg>';
};

function updateThemeIcon(theme) {
  var btn = document.getElementById('btn-theme');
  if (btn) btn.innerHTML = ttIcon(theme === 'dark' ? 'icon-theme-sun' : 'icon-theme-moon');
  var metaTheme = document.getElementById('meta-theme-color');
  if (metaTheme) metaTheme.setAttribute('content', theme === 'dark' ? '#0b1120' : '#f1f5f9');
}

function switchNavTab(tabId) {
  vibrate('light');
  var views = document.querySelectorAll('.main-view'); for(var i=0; i<views.length; i++) views[i].classList.remove('active');
  var items = document.querySelectorAll('.nav-item'); for(var j=0; j<items.length; j++) items[j].classList.remove('active');
  var viewEl = document.getElementById('view-' + tabId);
  var navEl = document.getElementById('nav-' + tabId);
  if(viewEl) viewEl.classList.add('active');
  if(navEl) navEl.classList.add('active');
  window.scrollTo(0, 0); 
  
  sessionStorage.setItem('tt_session_tab', tabId);
  
  if (tabId === 'radar' && typeof updateAdminControls === 'function') {
    updateAdminControls();
  }

  if (tabId === 'quests' && typeof renderQuestBoard === 'function') {
    renderQuestBoard();
  }
}

function initNavTab() {
  var savedTab = sessionStorage.getItem('tt_session_tab') || 'profile';
  switchNavTab(savedTab);
}

function switchTab(tab) {
  var tabRating = document.getElementById('tab-btn-rating');
  var tabTime = document.getElementById('tab-btn-time');
  var viewRating = document.getElementById('view-rating-content');
  var viewTime = document.getElementById('view-time-content');

  if (tab === 'rating') {
    if (tabRating) tabRating.classList.add('active'); 
    if (tabTime) tabTime.classList.remove('active');
    if (viewRating) viewRating.style.display = 'flex'; 
    if (viewTime) viewTime.style.display = 'none';
  } else {
    if (tabTime) tabTime.classList.add('active'); 
    if (tabRating) tabRating.classList.remove('active');
    if (viewTime) viewTime.style.display = 'flex'; 
    if (viewRating) viewRating.style.display = 'none';
  }
}

// ==========================================
// ГОРОДСКОЙ РЕЕСТР ЛОКАЦИЙ ЧЕЛЯБИНСКА
// ==========================================
var ALL_LOCATIONS = ['park', 'vostok', 'tttop', 'olimp', 'chemk'];
var HALL_LOCATIONS = ['vostok', 'tttop', 'olimp', 'chemk']; // Крытые площадки с анонсами встреч

var LOCATIONS_CONFIG = {
  park:   { name: "Парк им. Тищенко", desc: "Столы на свежем воздухе", type: "park", logo: "assets/locations/loc_park.jpg" },
  vostok: { name: "ДК «Восток»", desc: "ул. Сталеваров, 5а", type: "hall", logo: "assets/locations/loc_vostok.jpg" },
  tttop:  { name: "Клуб «ТТ Топ»", desc: "пр. Победы, 348 ст. 1 (2 этаж)", type: "hall", logo: "assets/locations/loc_tttop.jpg" },
  olimp:  { name: "СОК МУ «Олимп»", desc: "с. Долгодеревенское, ул. 1 Мая, 120А/1", type: "hall", logo: "assets/locations/loc_olimp.jpg" },
  chemk:  { name: "ДС «ЧЭМК»", desc: "ул. Российская, 36", type: "hall", logo: "assets/locations/loc_chemk.jpg" }
};

var LOCATION_NAMES = {
  park:   "в Парке им. Тищенко 🌳",
  vostok: "в ДК «Восток» 🏛",
  tttop:  "в клубе «ТТ Топ» (пр. Победы, 348) 🏓",
  olimp:  "в СОК «Олимп» (Долгодеревенское) 🏅",
  chemk:  "в ДС «ЧЭМК» (Российская, 36) ⚡"
};

var locationsData = {
  park:   { players: [], plans: [] },
  vostok: { players: [], plans: [] },
  tttop:  { players: [], plans: [] },
  olimp:  { players: [], plans: [] },
  chemk:  { players: [], plans: [] }
};

var announcementsData = {
  vostok: null,
  tttop:  null,
  olimp:  null,
  chemk:  null
};

// Плавное переключение шторки карточек с памятью состояния
function toggleCard(loc) { 
  if (typeof vibrate === 'function') vibrate('medium');
  var c = document.getElementById('card-' + loc);
  if (!c) return;
  var isExpanded = c.classList.toggle('expanded');
  localStorage.setItem('tt_card_' + loc, isExpanded ? '1' : '0');
}

// Восстановление состояния шторки для ВСЕХ локаций при запуске
function restoreCardStates() {
  ALL_LOCATIONS.forEach(function(loc) {
    var c = document.getElementById('card-' + loc);
    if (!c) return;
    var savedState = localStorage.getItem('tt_card_' + loc);
    if (savedState === '1') {
      c.classList.add('expanded');
    } else {
      c.classList.remove('expanded');
    }
  });
}

var GOOGLE_GATEWAY_URL = "https://script.google.com/macros/s/AKfycbzr4o4qbDEuLjQFeqJQzkmRfdjipM9MW4fZJJkGkhbqnnLkSap8O-ZTFae8MiMYvl3Xjg/exec";
var TELEGRAM_BOT_USERNAME = "tennis_club_chmz_bot";
var TELEGRAM_CHAT_URL = "https://t.me/ttchmz";
var MAX_CHAT_URL = "https://max.ru/join/2OpbO_PiUa9Q0AeQBpOXu4IoeA7IcxfCqi3Dldpan-E";
var DEFAULT_LIMIT_MS = 120 * 60 * 1000;
var REMIND_BEFORE_MS = 15 * 60 * 1000;
var ANTI_SPAM_COOLDOWN = 20 * 1000;

var ADMIN_UIDS = ['tg_153650895', 'tg_azsnake'];

var currentUserProfile = { uid: null, name: "", totalMinutes: 0 };
var activePlanningLoc = null;
var currentUserActiveLoc = null;
var currentUserActivePlayer = null;
var hasTriggeredPush = false;
var currentModalUrl = "";
var currentUserLeaderboardUnsubscribe = null;
var currentEditingTourId = null;
var currentMatchModalType = 'singles';

var firebaseConfig = {
  apiKey: "AIzaSyA4NIFGbC0xhhykyW0QosrWFJj5eU4bOuY",
  authDomain: "tt-chmz.firebaseapp.com",
  projectId: "tt-chmz",
  storageBucket: "tt-chmz.firebasestorage.app",
  messagingSenderId: "763705864834",
  appId: "1:763705864834:web:d9035408eaf3e31d0efa9b"
};

if (!firebase.apps.length) { 
  firebase.initializeApp(firebaseConfig); 
}
var db = firebase.firestore();

db.enablePersistence().catch(function(err) {
    console.log('Кэш:', err);
});

window.recentTgAlerts = {};
window.lastTableAlertTime = 0;

function canSendTgAlert(actionType) {
  var now = Date.now();
  var lastTime = localStorage.getItem('tt_last_alert_' + actionType);
  if (lastTime && (now - parseInt(lastTime, 10)) < ANTI_SPAM_COOLDOWN) return false;
  localStorage.setItem('tt_last_alert_' + actionType, now.toString());
  return true;
}

function sendTelegramAlert(text) {
  if (!GOOGLE_GATEWAY_URL || !text) return;

  var now = Date.now();
  var textSignature = text.substring(0, 40).replace(/[^a-zA-Zа-яА-Я0-9]/g, '');
  var lastSentSign = localStorage.getItem('tt_last_msg_sign');
  var lastSentTime = parseInt(localStorage.getItem('tt_last_msg_time') || '0', 10);

  if (lastSentSign === textSignature && (now - lastSentTime < 60000)) {
    console.log("Анти-спам: точный дубль заблокирован.");
    return; 
  }

  var isTableAlert = text.indexOf('уже у стола') !== -1 || text.indexOf('покинул стол') !== -1;
  if (isTableAlert) {
     var lastTableTime = parseInt(localStorage.getItem('tt_last_table_alert') || '0', 10);
     if (now - lastTableTime < 60000) {
        console.log("Анти-спам: блокировка частой смены столов");
        return;
     }
     localStorage.setItem('tt_last_table_alert', now.toString());
  }

  localStorage.setItem('tt_last_msg_sign', textSignature);
  localStorage.setItem('tt_last_msg_time', now.toString());

  var targetUrl = GOOGLE_GATEWAY_URL + '?text=' + encodeURIComponent(text);
  
  if (window.fetch) {
    fetch(targetUrl, { mode: 'no-cors' }).catch(function(e) { console.log('TG alert muted error'); });
  } else {
    var s = document.createElement('script');
    s.src = targetUrl;
    document.body.appendChild(s);
    setTimeout(function() { if (s.parentNode) s.parentNode.removeChild(s); }, 3000);
  }
}

function sendDevicePushNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification(title, { body: body, icon: 'logo.webp', badge: 'logo.webp', vibrate: [200, 100, 200] }); } catch (e) {}
  }
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback && window.Telegram.WebApp.HapticFeedback.notificationOccurred) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
  }
}

function shareModalUrl() {
  if (!currentModalUrl) return;
  var shareText = "Присоединяйся к клубу любителей настольного тенниса Челябинска!";
  if (navigator.share) { 
      navigator.share({ title: 'Настольный теннис Челябинск', text: shareText, url: currentModalUrl }).catch(function(){}); 
  } else { 
      navigator.clipboard.writeText(shareText + ' ' + currentModalUrl).then(function() { customAlert("📋 Ссылка скопирована!"); }); 
  }
}

function openQrModal(type) {
  var targetUrl = "https://azsnake2017-beep.github.io/tt-checkin/";
  var title = "QR-код приложения";
  var desc = "Покажите этот QR-код друзьям для быстрого доступа:";
  
  if (type === 'tg') { 
    targetUrl = TELEGRAM_CHAT_URL; 
    title = "QR-код Telegram чата"; 
    desc = "Отсканируйте, чтобы присоединиться к Telegram-чату клуба:"; 
  } else if (type === 'max') { 
    targetUrl = MAX_CHAT_URL; 
    title = "QR-код МАКС чата"; 
    desc = "Отсканируйте, чтобы присоединиться к МАКС-чату клуба:"; 
  }

  currentModalUrl = targetUrl;
  document.getElementById('qr-modal-title').innerText = "📷 " + title;
  document.getElementById('qr-modal-desc').innerText = desc;
  document.getElementById('qr-url-text').innerText = targetUrl;

  var container = document.getElementById('qr-canvas-container');
  if(container) {
    container.innerHTML = '';
    if (window.QRCode) {
      new QRCode(container, {
        text: targetUrl,
        width: 180,
        height: 180,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.M
      });
    } else {
      container.innerHTML = '<i>Библиотека QR не загружена</i>';
    }
  }

  document.getElementById('qr-modal').style.display = 'flex';
}

function closeQrModal() { 
  closeModalSmoothly('qr-modal'); 
  setTimeout(function() {
    var container = document.getElementById('qr-canvas-container');
    if (container) container.innerHTML = '';
  }, 300);
}

function openExternalLink(url) {
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openLink) { 
      window.Telegram.WebApp.openLink(url); 
  } else { 
      window.open(url, '_blank'); 
  }
}

function getInventoryRowHtml(icon, label, value, searchPrefix) {
  if (!value) return '';
  var query = encodeURIComponent(searchPrefix + ' ' + value);
  var url = 'https://www.google.com/search?q=' + query;
  return '<div class="inventory-item"><div class="inventory-item-left"><span>' + icon + '</span> <span style="color: var(--text-muted);">' + label + '</span> <span class="inventory-value">' + cleanHtml(value) + '</span></div><button class="btn-info" style="width: 22px; height: 22px; font-size: 11px; padding: 0;" onclick="openExternalLink(\'' + url + '\')">i</button></div>';
}

// ==========================================
// СИСТЕМА ДОСТИЖЕНИЙ И КОНФЕТТИ
// ==========================================
function triggerConfetti() {
  if (typeof confetti !== 'function') return;
  
  var duration = 3000;
  var end = Date.now() + duration;

  (function frame() {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.8 },
      colors: ['#f59e0b', '#3b82f6', '#10b981']
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.8 },
      colors: ['#f59e0b', '#3b82f6', '#10b981']
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }());
}

function showAchievement(title, icon, name, desc) {
  document.getElementById('ach-title').innerText = title;
  document.getElementById('ach-icon').innerText = icon;
  document.getElementById('ach-name').innerText = name;
  document.getElementById('ach-desc').innerText = desc;
  
  var modal = document.getElementById('achievement-modal');
  if (modal) modal.style.display = 'flex';
  
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
  }
  
  triggerConfetti();
}

function closeAchievementModal() {
  closeModalSmoothly('achievement-modal');
}
