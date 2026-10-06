// ==========================================
// ЗВУКОВОЙ И ТАКТИЛЬНЫЙ ДВИЖОК
// Файл: js/sounds.js
// ==========================================

window.TTAudio = {
  soundEnabled: localStorage.getItem('tt_sound_enabled') !== 'false', 
  
  bounces: [
    new Audio('sound/1.mp3'),
    new Audio('sound/2.mp3'),
    new Audio('sound/3.mp3'),
    new Audio('sound/4.mp3'),
    new Audio('sound/5.mp3')
  ],

  vibrate: function(type) {
    type = type || 'light';
    
    var isTelegram = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.platform && window.Telegram.WebApp.platform !== "unknown";
    
    if (isTelegram && window.Telegram.WebApp.HapticFeedback) {
      var tgHaptic = window.Telegram.WebApp.HapticFeedback;
      if (type === 'success') tgHaptic.notificationOccurred('success');
      else if (type === 'warning') tgHaptic.notificationOccurred('warning');
      else if (type === 'heavy') tgHaptic.impactOccurred('heavy');
      else tgHaptic.impactOccurred('light');
      return;
    }

    if (navigator.vibrate) {
      if (type === 'success') navigator.vibrate([40, 60, 40]); 
      else if (type === 'warning') navigator.vibrate([60, 60, 60]); 
      else if (type === 'heavy') navigator.vibrate([50]); 
      else navigator.vibrate([40]); 
    }
  },

  playRandomBounce: function() {
    if (!this.soundEnabled) return; 
    
    var randomIndex = Math.floor(Math.random() * this.bounces.length);
    var sound = this.bounces[randomIndex];
    if (sound) {
      try {
        sound.currentTime = 0;
        sound.play().catch(function() {});
      } catch(e) {}
    }
  },

  toggleSound: function() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('tt_sound_enabled', this.soundEnabled); 
    
    if (this.soundEnabled) {
       this.playRandomBounce(); 
       this.vibrate('success'); 
    } else {
       this.vibrate('warning');
    }
    
    return this.soundEnabled;
  }
};

// ==========================================
// ГЛОБАЛЬНЫЕ СЛУШАТЕЛИ (ВИБРАЦИЯ ВЕЗДЕ, ЗВУК ТОЛЬКО ДЛЯ ДЕЙСТВИЙ)
// ==========================================

// 1. Легкая тактильная вибрация срабатывает при тапе на любой интерактивный элемент
document.addEventListener('touchstart', function(e) {
  if (e.target.closest('#main-sound-toggle')) return;

  var interactiveElement = e.target.closest('button, a, .btn, .nav-item, .quest-choice-card, .card, .action-btn');
  if (interactiveElement && window.TTAudio) {
    window.TTAudio.vibrate('light');
  }
}, { passive: true });

// 2. Стук мяча звучит ТОЛЬКО при нажатии на ключевые кнопки (участие, матчи, квесты, админка)
document.addEventListener('click', function(e) {
  if (e.target.closest('#main-sound-toggle')) return;

  // Проверяем, что кликнули именно по важной целевой кнопке
  var isActionTrigger = e.target.closest('.btn-join, .btn-match-quick, .btn-match, .quest-choice-card button, .btn-edit, .badge-admin-btn');
  
  if (isActionTrigger && window.TTAudio) {
    window.TTAudio.playRandomBounce();
  }
});

// Кнопка переключения звука в шапке
window.toggleAppSound = function() {
  if (!window.TTAudio) return;
  var isEnabled = window.TTAudio.toggleSound();
  var btn = document.getElementById('main-sound-toggle');
  if (btn) {
    btn.innerText = isEnabled ? '🔊' : '🔇';
  }
};

document.addEventListener('DOMContentLoaded', function() {
  var btn = document.getElementById('main-sound-toggle');
  if (btn && window.TTAudio) {
    btn.innerText = window.TTAudio.soundEnabled ? '🔊' : '🔇';
  }
});
