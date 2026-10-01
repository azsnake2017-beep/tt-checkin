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
    
    // 1. Проверка Telegram WebApp
    var tgHaptic = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback;
    if (tgHaptic) {
      if (type === 'success') tgHaptic.notificationOccurred('success');
      else if (type === 'warning') tgHaptic.notificationOccurred('warning');
      else if (type === 'heavy') tgHaptic.impactOccurred('heavy');
      else tgHaptic.impactOccurred('light');
      return;
    }

    // 2. Проверка стандартного браузера
    if (navigator.vibrate) {
      if (type === 'success') navigator.vibrate([30, 50, 40]); 
      else if (type === 'warning') navigator.vibrate([50, 50, 50]); 
      else if (type === 'heavy') navigator.vibrate([40]); 
      else navigator.vibrate([30]); 
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
       this.playRandomBounce(); // Даем тестовый звук при включении
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

// 1. Перехватчик касаний (pointerdown) - для мгновенной ВИБРАЦИИ
document.addEventListener('pointerdown', function(e) {
  if (e.target.closest('#main-sound-toggle')) return;

  var interactiveElement = e.target.closest('button, a, .btn, .nav-item, .quest-choice-card, .card, .action-btn');
  if (interactiveElement && window.TTAudio) {
    window.TTAudio.vibrate('light');
  }
});

// 2. Перехватчик полноценных кликов (click) - для ЗВУКА
document.addEventListener('click', function(e) {
  if (e.target.closest('#main-sound-toggle')) return;

  var interactiveElement = e.target.closest('button, a, .btn, .nav-item, .quest-choice-card, .card, .action-btn');
  if (interactiveElement && window.TTAudio) {
    window.TTAudio.playRandomBounce();
  }
});

// 3. Функция для кнопки на главной странице (вызывается из HTML)
window.toggleAppSound = function() {
  if (!window.TTAudio) return;
  var isEnabled = window.TTAudio.toggleSound();
  var btn = document.getElementById('main-sound-toggle');
  if (btn) {
    btn.innerText = isEnabled ? '🔊' : '🔇';
  }
};

// 4. Установка правильной иконки при загрузке приложения
document.addEventListener('DOMContentLoaded', function() {
  var btn = document.getElementById('main-sound-toggle');
  if (btn && window.TTAudio) {
    btn.innerText = window.TTAudio.soundEnabled ? '🔊' : '🔇';
  }
});
