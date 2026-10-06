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
    
    // НАСТОЯЩАЯ ПРОВЕРКА ТЕЛЕГРАМА (Игнорируем "unknown" платформу обычного браузера)
    var isTelegram = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.platform && window.Telegram.WebApp.platform !== "unknown";
    
    if (isTelegram && window.Telegram.WebApp.HapticFeedback) {
      var tgHaptic = window.Telegram.WebApp.HapticFeedback;
      if (type === 'success') tgHaptic.notificationOccurred('success');
      else if (type === 'warning') tgHaptic.notificationOccurred('warning');
      else if (type === 'heavy') tgHaptic.impactOccurred('heavy');
      else tgHaptic.impactOccurred('light');
      return; // Завершаем, так как отработал Телеграм
    }

    // ЕСЛИ МЫ В ОБЫЧНОМ БРАУЗЕРЕ (Chrome, Яндекс, Safari)
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

/* ==========================================
   РАНДОМНЫЕ ЗВУКИ НАЖАТИЯ КНОПОК
   ========================================== */
// Массив с путями к вашим звукам (убедитесь, что названия совпадают с файлами в папке)
var buttonSounds = [
  'sound/1.mp3', 
  'sound/2.mp3', 
  'sound/3.mp3', 
  'sound/4.mp3', 
  'sound/5.mp3'
];

function playRandomClickSound() {
  try {
    var randomIndex = Math.floor(Math.random() * buttonSounds.length);
    var audio = new Audio(buttonSounds[randomIndex]);
    audio.volume = 0.4; // Громкость 40%
    
    audio.play().catch(function(e) {
      // Игнорируем ошибку, если браузер заблокировал автовоспроизведение
    }); 
  } catch (err) {}
}

// Глобальный перехватчик кликов по всему приложению
document.addEventListener('click', function(e) {
  // Проверяем, кликнули ли по кнопке, вкладке меню или сворачиваемому окну
  var isButton = e.target.closest('button, .btn, .btn-join, .btn-match-quick, .nav-item, .tab-btn, .card-top');
  
  if (isButton) {
    playRandomClickSound();
  }
});
