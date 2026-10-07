// ==========================================
// ЗВУКОВОЙ ДВИЖОК (РАНДОМНЫЕ ЗВУКИ 1-5)
// ==========================================
window.TTAudio = {
  soundEnabled: localStorage.getItem('tt_sound_enabled') !== 'false', 
  bounces: [
    new Audio('sounds/1.mp3'), new Audio('sounds/2.mp3'),
    new Audio('sounds/3.mp3'), new Audio('sounds/4.mp3'),
    new Audio('sounds/5.mp3')
  ],
  vibrate: function(type) {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(type === 'success' ? 'heavy' : 'light');
    } else if (navigator.vibrate) {
      navigator.vibrate(type === 'success' ? [40, 60, 40] : [40]); 
    }
  },
  playRandomBounce: function() {
    if (!this.soundEnabled) return; 
    var sound = this.bounces[Math.floor(Math.random() * this.bounces.length)];
    if (sound) {
      try { sound.volume = 0.7; sound.currentTime = 0; sound.play().catch(function() {}); } catch(e) {}
    }
  },
  playClick: function() { this.playRandomBounce(); },
  playPop: function() { this.playRandomBounce(); },
  playSwoosh: function() { this.playRandomBounce(); },
  playSuccess: function() { this.vibrate('success'); this.playRandomBounce(); },
  toggleSound: function() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('tt_sound_enabled', this.soundEnabled); 
    if (this.soundEnabled) this.playSuccess(); 
    else this.vibrate('warning'); 
    return this.soundEnabled;
  }
};

document.addEventListener('click', function(e) {
  if (e.target.closest('#main-sound-toggle')) return;
  var target = e.target.closest('button, .btn, .btn-info, .score-btn, .tab-btn, .nav-item, .clickable-name, .platform-badge, .card-top');
  if (target && window.TTAudio) {
    window.TTAudio.playRandomBounce();
  }
});

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
