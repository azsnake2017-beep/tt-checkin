// ==========================================
// ЗВУКОВОЙ И ТАКТИЛЬНЫЙ ДВИЖОК
// ==========================================

window.TTAudio = {
  // Считываем настройку из памяти (по умолчанию звук включен)
  soundEnabled: localStorage.getItem('tt_sound_enabled') !== 'false', 
  
  bounces: [
    new Audio('sounds/1.mp3'),
    new Audio('sounds/2.mp3'),
    new Audio('sounds/3.mp3'),
    new Audio('sounds/4.mp3'),
    new Audio('sounds/5.mp3')
  ],

  // Универсальный тактильный отклик (работает и в Telegram, и в Chrome/Яндекс)
  vibrate: function(type) {
    type = type || 'light';
    
    // 1. Если открыто внутри Telegram
    var tgHaptic = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback;
    if (tgHaptic) {
      if (type === 'success') tgHaptic.notificationOccurred('success');
      else if (type === 'warning') tgHaptic.notificationOccurred('warning');
      else if (type === 'heavy') tgHaptic.impactOccurred('heavy');
      else tgHaptic.impactOccurred('light');
      return;
    }

    // 2. Если открыто в обычном браузере на Android
    if (navigator.vibrate) {
      if (type === 'success') navigator.vibrate([30, 50, 40]); // Тройной победный отклик
      else if (type === 'warning') navigator.vibrate([50, 50, 50]); // Двойной жесткий отклик
      else if (type === 'heavy') navigator.vibrate(40);
      else navigator.vibrate(12); // Легкий отклик для обычных кнопок
    }
  },

  // Воспроизведение обычного клика (Звук + Вибро)
  playRandomBounce: function() {
    this.vibrate('light'); // Легкая вибрация при каждом клике по интерфейсу

    if (!this.soundEnabled) return; // Если звук выключен - прерываем
    
    var randomIndex = Math.floor(Math.random() * this.bounces.length);
    var sound = this.bounces[randomIndex];
    if (sound) {
      try {
        sound.currentTime = 0;
        sound.play().catch(function() {});
      } catch(e) {}
    }
  },

  // Функция переключения звука для нашей кнопки
  toggleSound: function() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('tt_sound_enabled', this.soundEnabled); // Запоминаем выбор
    
    // Даем тактильную обратную связь при переключении
    if (this.soundEnabled) {
       this.vibrate('success'); 
    } else {
       this.vibrate('warning');
    }
    
    return this.soundEnabled;
  }
};

// Глобальный перехватчик всех кликов по кнопкам и меню
document.addEventListener('click', function(e) {
  var interactiveElement = e.target.closest('button, a, .btn, .nav-item, .quest-choice-card, .card, .action-btn');
  if (interactiveElement && window.TTAudio) {
    window.TTAudio.playRandomBounce();
  }
});
