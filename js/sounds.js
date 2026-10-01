// ==========================================
// ЗВУКОВОЙ И ТАКТИЛЬНЫЙ ДВИЖОК
// Файл: js/sounds.js
// ==========================================

window.TTAudio = {
  soundEnabled: localStorage.getItem('tt_sound_enabled') !== 'false', 
  
  bounces: [
    new Audio('sounds/1.mp3'),
    new Audio('sounds/2.mp3'),
    new Audio('sounds/3.mp3'),
    new Audio('sounds/4.mp3'),
    new Audio('sounds/5.mp3')
  ],

  vibrate: function(type) {
    type = type || 'light';
    
    var tgHaptic = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback;
    if (tgHaptic) {
      if (type === 'success') tgHaptic.notificationOccurred('success');
      else if (type === 'warning') tgHaptic.notificationOccurred('warning');
      else if (type === 'heavy') tgHaptic.impactOccurred('heavy');
      else tgHaptic.impactOccurred('light');
      return;
    }

    if (navigator.vibrate) {
      // Чуть увеличили миллисекунды, чтобы пробить тяжелые моторчики Android
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
// ГЛОБАЛЬНЫЕ СЛУШАТЕЛИ (UI и клики)
// ==========================================

// 1. ИСПОЛЬЗУЕМ TOUCHSTART вместо pointerdown для мгновенного вибро на Android
document.addEventListener('touchstart', function(e) {
  if (e.target.closest('#main-sound-toggle')) return;

  var interactiveElement = e.target.closest('button, a, .btn, .nav-item, .quest-choice-card, .card, .action-btn');
  if (interactiveElement && window.TTAudio) {
    window.TTAudio.vibrate('light');
  }
}, { passive: true });

// 2. Слушатель кликов остается для звука
document.addEventListener('click', function(e) {
  if (e.target.closest('#main-sound-toggle')) return;

  var interactiveElement = e.target.closest('button, a, .btn, .nav-item, .quest-choice-card, .card, .action-btn');
  if (interactiveElement && window.TTAudio) {
    window.TTAudio.playRandomBounce();
  }
});

// 3. Кнопка на главной
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

window.testHardwareCapabilities = function() {
  var logBox = document.getElementById('debug-log-output');
  if (!logBox) return;
  var results = [];

  if (window.TTAudio) {
     window.TTAudio.playRandomBounce();
     results.push("🔊 Звук: Успешно вызван");
  } else {
     results.push("🔊 Звук: Ошибка (модуль не найден)");
  }

  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
     window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
     results.push("📳 Вибро: Telegram Haptic API");
  } else if (navigator.vibrate) {
     var success = navigator.vibrate([100, 50, 100]); 
     if (success) results.push("📳 Вибро: Сигнал прошел (Браузер)");
     else results.push("📳 Вибро: ЗАБЛОКИРОВАНО ОС");
  } else {
     results.push("📳 Вибро: Не поддерживается");
  }

  logBox.innerHTML = results.join('<br>');
};
