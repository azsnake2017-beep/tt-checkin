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
      if (type === 'success') navigator.vibrate([30, 50, 40]); 
      else if (type === 'warning') navigator.vibrate([50, 50, 50]); 
      else if (type === 'heavy') navigator.vibrate(40);
      else navigator.vibrate(30); 
    }
  },

  playRandomBounce: function() {
    this.vibrate('light'); 

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

// 1. Перехватчик всех кликов по интерфейсу
document.addEventListener('click', function(e) {
  // Игнорируем клик по самой кнопке звука, так как у нее своя логика и вибрация
  if (e.target.closest('#main-sound-toggle')) return;

  var interactiveElement = e.target.closest('button, a, .btn, .nav-item, .quest-choice-card, .card, .action-btn');
  if (interactiveElement && window.TTAudio) {
    window.TTAudio.playRandomBounce();
  }
});

// 2. Функция для кнопки на главной странице (вызывается из HTML)
window.toggleAppSound = function() {
  if (!window.TTAudio) return;
  var isEnabled = window.TTAudio.toggleSound();
  var btn = document.getElementById('main-sound-toggle');
  if (btn) {
    btn.innerText = isEnabled ? '🔊' : '🔇';
  }
};

// 3. Установка правильной иконки при загрузке приложения
document.addEventListener('DOMContentLoaded', function() {
  var btn = document.getElementById('main-sound-toggle');
  if (btn && window.TTAudio) {
    btn.innerText = window.TTAudio.soundEnabled ? '🔊' : '🔇';
  }
});
