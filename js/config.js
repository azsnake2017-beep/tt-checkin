// js/config.js — Базовые настройки, утилиты и константы

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

function getCustomBadge(uid) {
  if (!uid) return '';
  if (uid === 'google_XUE0DYY6WoMfkI3TmG7o2HqPUEm1') return '<span class="platform-badge badge-teacher">Учитель 🎓</span>';
  if (uid === 'tg_750209461') return '<span class="platform-badge badge-temshik">Темщик 🕶️</span>';
  if (uid === 'tg_6126323287') return '<span class="platform-badge badge-hockey">Хоккеист 🏒</span>';
  if (uid === 'google_qW1ZyRnvm4UvEO3tMdQpx5ltcQM2') return '<span class="platform-badge badge-bot">Бот 🤖</span>';
  if (uid === 'tg_5170799634' || uid === 'google_vu6OeCWP8WXqNVUkI1hDPTD13ri1') return '<span class="platform-badge badge-coach">Тренер 📋</span>';
  return '';
}

function getPlayerStatus(elo) {
  var e = parseInt(elo, 10) || 1000;
  if (e <= 1000) return "Новичок 🟢"; if (e <= 1200) return "Ученик 📘"; if (e <= 1400) return "Любитель 👟";
  if (e <= 1600) return "Игрок основы 🏃‍♂️"; if (e <= 1800) return "Третий разряд 🥉"; if (e <= 2000) return "Второй разряд 🥈";
  if (e <= 2200) return "Первый разряд 🥇"; if (e <= 2400) return "КМС 🏅"; if (e <= 2600) return "Мастер спорта 🏆";
  if (e <= 2800) return "Элитный игрок ⭐"; if (e <= 3000) return "Мастер атаки 🔥"; if (e <= 3200) return "Гроссмейстер ♟️";
  if (e <= 3400) return "Чемпион клуба 👑"; if (e <= 3600) return "Гранд-мастер 🎖️"; if (e <= 3800) return "Снайпер 🎯";
  if (e <= 4000) return "Легенда клуба 🏛️"; if (e <= 4200) return "Премьер-лига 📈"; if (e <= 4400) return "Гранд-чемпион 🔥🏆";
  if (e <= 4600) return "Властелин стола 👑🏓"; if (e <= 4800) return "Феномен 🌠"; return "Легенда спорта 🌟🏆";
}

var confirmActionCallback = null;
function openConfirmModal(msg, action) {
  document.getElementById('confirm-modal-text').innerText = msg;
  confirmActionCallback = action;
  document.getElementById('confirm-modal').style.display = 'flex';
}
function closeConfirmModal() {
  document.getElementById('confirm-modal').style.display = 'none';
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
  var el = document.getElementById('custom-alert-modal');
  if (el) el.style.display = 'none'; 
}

function initTheme() {
  var savedTheme = localStorage.getItem('tt_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}
function toggleTheme() {
  var currentTheme = document.documentElement.getAttribute('data-theme');
  var newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('tt_theme', newTheme);
  updateThemeIcon(newTheme);
}
function updateThemeIcon(theme) {
  var btn = document.getElementById('btn-theme');
  if (btn) btn.innerText = theme === 'dark' ? '☀️' : '🌙';
  var metaTheme = document.getElementById('meta-theme-color');
  if (metaTheme) metaTheme.setAttribute('content', theme === 'dark' ? '#0b1120' : '#f1f5f9');
}

function switchNavTab(tabId) {
  var views = document.querySelectorAll('.main-view'); for(var i=0; i<views.length; i++) views[i].classList.remove('active');
  var items = document.querySelectorAll('.nav-item'); for(var j=0; j<items.length; j++) items[j].classList.remove('active');
  var viewEl = document.getElementById('view-' + tabId);
  var navEl = document.getElementById('nav-' + tabId);
  if(viewEl) viewEl.classList.add('active');
  if(navEl) navEl.classList.add('active');
  window.scrollTo(0, 0); 
  localStorage.setItem('tt_active_tab', tabId);
}
function initNavTab() {
  var savedTab = localStorage.getItem('tt_active_tab') || 'profile';
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

function toggleCard(loc) { 
  var c = document.getElementById('card-' + loc);
  if (c) c.classList.toggle('expanded'); 
}

var GOOGLE_GATEWAY_URL = "https://script.google.com/macros/s/AKfycbzr4o4qbDEuLjQFeqJQzkmRfdjipM9MW4fZJJkGkhbqnnLkSap8O-ZTFae8MiMYvl3Xjg/exec";
var TELEGRAM_BOT_USERNAME = "tennis_club_chmz_bot";
var TELEGRAM_CHAT_URL = "https://t.me/ttchmz";
var MAX_CHAT_URL = "https://max.ru/join/2OpbO_PiUa9Q0AeQBpOXu4IoeA7IcxfCqi3Dldpan-E";
var LOCATION_NAMES = { park: "в Парке им. Тищенко 🌳", vostok: "в ДК «Восток» 🏛" };
var DEFAULT_LIMIT_MS = 120 * 60 * 1000;
var REMIND_BEFORE_MS = 15 * 60 * 1000;
var ANTI_SPAM_COOLDOWN = 20 * 1000;

var ADMIN_UIDS = ['tg_153650895', 'tg_azsnake'];

var locationsData = { park: { players: [], plans: [] }, vostok: { players: [], plans: [] } };
var currentUserProfile = { uid: null, name: "", totalMinutes: 0 };
var activePlanningLoc = null;
var currentUserActiveLoc = null;
var currentUserActivePlayer = null;
var hasTriggeredPush = false;
var announcementsData = { park: null, vostok: null };
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

try {
  db.settings({ experimentalForceLongPolling: true });
} catch(e) {}

function canSendTgAlert(actionType) {
  var now = Date.now();
  var lastTime = localStorage.getItem('tt_last_alert_' + actionType);
  if (lastTime && (now - parseInt(lastTime, 10)) < ANTI_SPAM_COOLDOWN) return false;
  localStorage.setItem('tt_last_alert_' + actionType, now.toString());
  return true;
}

function sendTelegramAlert(text) {
  if (!GOOGLE_GATEWAY_URL) return;
  var targetUrl = GOOGLE_GATEWAY_URL + '?text=' + encodeURIComponent(text);
  if (window.fetch) {
    fetch(targetUrl, { mode: 'no-cors' }).catch(function() {
      var s = document.createElement('script');
      s.src = targetUrl;
      document.body.appendChild(s);
      setTimeout(function() { if (s.parentNode) s.parentNode.removeChild(s); }, 3000);
    });
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
  var shareText = "Присоединяйся к клубу любителей настольного тенниса ЧМЗ";
  if (navigator.share) { 
      navigator.share({ title: 'Клуб ЧМЗ', text: shareText, url: currentModalUrl }).catch(function(){}); 
  } else { 
      navigator.clipboard.writeText(shareText + ': ' + currentModalUrl).then(function() { customAlert("📋 Ссылка скопирована!"); }); 
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

  var img = document.getElementById('qr-code-img');
  if (img) {
    img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(targetUrl);
    img.onerror = function() {
      this.onerror = null;
      this.src = 'https://quickchart.io/qr?text=' + encodeURIComponent(targetUrl) + '&size=180';
    };
  }

  document.getElementById('qr-modal').style.display = 'flex';
}

function closeQrModal() { 
  document.getElementById('qr-modal').style.display = 'none'; 
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
