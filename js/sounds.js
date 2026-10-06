// ==========================================
// ЗВУКОВОЙ И ТАКТИЛЬНЫЙ ДВИЖОК (60 FPS OPTIMIZED)
// Файл: js/sounds.js
// ==========================================

window.TTAudio = {
  soundEnabled: localStorage.getItem('tt_sound_enabled') !== 'false', 
  
  // Базовые звуки отскоков (можно добавлять свои)
  bounces: [
    new Audio('sound/1.mp3'),
    new Audio('sound/2.mp3'),
    new Audio('sound/3.mp3'),
    new Audio('sound/4.mp3'),
    new Audio('sound/5.mp3')
  ],

  // Универсальная система тактильного отклика (вибрация)
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

  // Случайный отскок (Используется для основных действий)
  playRandomBounce: function() {
    if (!this.soundEnabled) return; 
    var sound = this.bounces[Math.floor(Math.random() * this.bounces.length)];
    if (sound) {
      try { 
        sound.volume = 1.0; 
        sound.currentTime = 0; 
        sound.play().catch(function() {}); 
      } catch(e) {}
    }
  },

  // --- UI ЗВУКИ (ЭФФЕКТЫ ИНТЕРФЕЙСА) ---
  // Сейчас они используют твои mp3 отскоков с разной громкостью. 
  // Если загрузишь click.mp3 или swoosh.mp3, просто замени new Audio() здесь.

  playClick: function() {
    if (!this.soundEnabled) return;
    var sound = this.bounces[0]; // Берем 1.mp3 для кликов
    if (sound) {
      try { 
        sound.volume = 0.3; // Тихий, аккуратный клик
        sound.currentTime = 0; 
        sound.play().catch(function(){}); 
      } catch(e) {}
    }
  },

  playPop: function() {
    if (!this.soundEnabled) return;
    var sound = this.bounces[1]; // Берем 2.mp3 для всплывающих окон
    if (sound) {
      try { 
        sound.volume = 0.6; 
        sound.currentTime = 0; 
        sound.play().catch(function(){}); 
      } catch(e) {}
    }
  },

  playSwoosh: function() {
    if (!this.soundEnabled) return;
    var sound = this.bounces[2]; // Берем 3.mp3 для смахивания (закрытия)
    if (sound) {
      try { 
        sound.volume = 0.4; 
        sound.currentTime = 0; 
        sound.play().catch(function(){}); 
      } catch(e) {}
    }
  },

  playSuccess: function() {
    if (!this.soundEnabled) return;
    this.vibrate('success');
    this.playRandomBounce(); // Громкий отскок для успеха
  },

  toggleSound: function() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('tt_sound_enabled', this.soundEnabled); 
    
    if (this.soundEnabled) {
       this.playSuccess(); 
    } else {
       this.vibrate('warning');
    }
    return this.soundEnabled;
  }
};

// ==========================================
// ГЛОБАЛЬНЫЕ СЛУШАТЕЛИ (ПЕРЕХВАТЧИК ИНТЕРФЕЙСА)
// ==========================================

// 1. Моментальная вибрация на любые тапы
document.addEventListener('touchstart', function(e) {
  if (e.target.closest('#main-sound-toggle')) return;
  var interactive = e.target.closest('button, a, .btn, .nav-item, .quest-choice-card, .card, .action-btn, .platform-badge, .clickable-name, .leader-row, .tour-match-row');
  if (interactive && window.TTAudio) {
    window.TTAudio.vibrate('light');
  }
}, { passive: true });

// 2. Умная озвучка кликов (Без просадки FPS)
document.addEventListener('click', function(e) {
  if (e.target.closest('#main-sound-toggle')) return;

  var target = e.target.closest('.btn, .btn-info, .btn-opt, .score-btn, .tab-btn, .nav-item, .clickable-name, .platform-badge, .quest-choice-card, .medal-item, .club-header-top, .card-top');
  
  if (target && window.TTAudio) {
    if (target.classList.contains('btn-cancel-modal') || target.closest('.close-btn')) {
       window.TTAudio.playSwoosh(); // Закрытие / Отмена
    } 
    else if (target.classList.contains('btn-join') || target.innerText.includes('Сохранить')) {
       window.TTAudio.playSuccess(); // Успех / Запись
    }
    else {
       window.TTAudio.playClick(); // Дефолтный клик (вкладки, плашки)
    }
  }
});

// 3. Автоматическая озвучка модальных окон (всплытие и закрытие)
document.addEventListener('DOMContentLoaded', function() {
  
  // Перехватываем открытие из app.js
  if (window.openModalSmoothly) {
    var _originalOpenModal = window.openModalSmoothly;
    window.openModalSmoothly = function(modalId) {
      if (window.TTAudio) window.TTAudio.playPop();
      _originalOpenModal(modalId);
    };
  }

  // Перехватываем закрытие из app.js
  if (window.closeModalSmoothly) {
    var _originalCloseModal = window.closeModalSmoothly;
    window.closeModalSmoothly = function(modalId) {
      if (window.TTAudio) window.TTAudio.playSwoosh();
      _originalCloseModal(modalId);
    };
  }

  // Перехватываем алерты
  if (window.customAlert) {
    var _originalCustomAlert = window.customAlert;
    window.customAlert = function(msg) {
      if (window.TTAudio) window.TTAudio.playPop();
      _originalCustomAlert(msg);
    };
  }

  // Синхронизируем кнопку в шапке
  var btn = document.getElementById('main-sound-toggle');
  if (btn && window.TTAudio) {
    btn.innerText = window.TTAudio.soundEnabled ? '🔊' : '🔇';
  }
});

window.toggleAppSound = function() {
  if (!window.TTAudio) return;
  var isEnabled = window.TTAudio.toggleSound();
  var btn = document.getElementById('main-sound-toggle');
  if (btn) btn.innerText = isEnabled ? '🔊' : '🔇';
};
