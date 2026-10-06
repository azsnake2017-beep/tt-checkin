// ==========================================
// ЗВУКОВОЙ И ТАКТИЛЬНЫЙ ДВИЖОК (РАНДОМНЫЕ ЗВУКИ 1-5)
// Файл: js/sounds.js
// ==========================================

window.TTAudio = {
  soundEnabled: localStorage.getItem('tt_sound_enabled') !== 'false', 
  
  // Твои кастомные звуки отскоков
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

  // Главная функция рандомного выбора звука 1-5
  playRandomBounce: function() {
    if (!this.soundEnabled) return; 
    var sound = this.bounces[Math.floor(Math.random() * this.bounces.length)];
    if (sound) {
      try { 
        sound.volume = 0.7; // Сбалансированная громкость для интерфейса
        sound.currentTime = 0; 
        sound.play().catch(function() {}); 
      } catch(e) {}
    }
  },

  // Псевдонимы, чтобы старые вызовы в коде тоже запускали рандом
  playClick: function() { this.playRandomBounce(); },
  playPop: function() { this.playRandomBounce(); },
  playSwoosh: function() { this.playRandomBounce(); },
  playSuccess: function() { 
    this.vibrate('success');
    this.playRandomBounce(); 
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
// ГЛОБАЛЬНЫЕ СЛУШАТЕЛИ КЛИКОВ И ТАПОВ
// ==========================================
document.addEventListener('click', function(e) {
  if (e.target.closest('#main-sound-toggle')) return;
  var target = e.target.closest('button, .btn, .btn-info, .btn-opt, .score-btn, .tab-btn, .nav-item, .clickable-name, .platform-badge, .quest-choice-card, .medal-item, .card-top');
  
  if (target && window.TTAudio) {
    window.TTAudio.playRandomBounce();
  }
});

document.addEventListener('touchstart', function(e) {
  if (e.target.closest('#main-sound-toggle')) return;
  var interactive = e.target.closest('button, a, .btn, .nav-item, .quest-choice-card, .card, .action-btn, .platform-badge, .clickable-name');
  if (interactive && window.TTAudio) {
    window.TTAudio.vibrate('light');
  }
}, { passive: true });

window.toggleAppSound = function() {
  if (!window.TTAudio) return;
  var isEnabled = window.TTAudio.toggleSound();
  var btn = document.getElementById('main-sound-toggle');
  if (btn) btn.innerText = isEnabled ? '🔊' : '🔇';
};

document.addEventListener('DOMContentLoaded', function() {
  var btn = document.getElementById('main-sound-toggle');
  if (btn && window.TTAudio) {
    btn.innerText = window.TTAudio.soundEnabled ? '🔊' : '🔇';
  }
});
